import { initComponent } from '@fr0st/ui';
import Editor from './editor.js';
import icons from './icons.js';
import plugins from './plugins.js';
import popovers from './popovers.js';
import { buttons, colors, fonts, fontSizes, styles } from './values.js';
import { _events, _eventsDrop, _eventsEditor, _eventsPopover, _eventsResize, _eventsSource, _eventsToolbar } from './prototype/events.js';
import { _checkEmpty, _execCommand, _focusEditor, _refreshCursor, _refreshDisabled, _refreshLineNumbers, _refreshToolbar, _resetDropText, _showDropTarget, _showEditor, _showSource, _updateValue } from './prototype/helpers.js';
import { _addHistory, _getSelectionData, _restoreHistory } from './prototype/history.js';
import { _removeModal, _showImageModal, _showLinkModal, _showVideoModal } from './prototype/modals.js';
import { _insertNode, _normalize, _updateTable } from './prototype/nodes.js';
import { _highlightImage, _refreshPopover, _removePopover } from './prototype/popovers.js';
import { _render, _renderButton, _renderDrop, _renderEditor, _renderResize, _renderSource } from './prototype/render.js';
import { _colorDropdown, _fontDropdown, _fontSizeDropdown, _styleDropdown, _tableDropdown } from './prototype/render-dropdowns.js';
import { _renderPopover, _renderPopoverItem, _renderPopoverItems } from './prototype/render-popover.js';
import { _renderToolbar, _renderToolbarButton, _renderToolbarDropdown, _setToolbarData } from './prototype/render-toolbar.js';
import { _createCheckbox, _createFileInput, _createInput, _createModal } from './static/modals.js';

// Editor defaults
Editor.defaults = {
    buttons: null,
    popovers: {
        image: [
            ['imageFull', 'imageHalf', 'imageQuarter', 'imageOriginal'],
            ['floatLeft', 'floatRight', 'floatNone'],
            ['imageRemove'],
        ],
        link: [
            'link',
            ['linkEdit'],
            ['unlink'],
        ],
        table: [
            ['tableRowAfter', 'tableRowBefore', 'tableColumnBefore', 'tableColumnAfter'],
            ['tableRowRemove', 'tableColumnRemove', 'tableRemove'],
        ],
    },
    imageUpload(files) {
        const promises = [];

        for (const file of files) {
            promises.push(new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (_) => {
                    resolve(reader.result);
                };
                reader.onerror = (_) => {
                    reject(new Error('Unable to read file'));
                };
                reader.readAsDataURL(file);
            }));
        }

        Promise.allSettled(promises)
            .then((results) => {
                for (const result of results) {
                    if (result.status !== 'fulfilled') {
                        continue;
                    }

                    this.insertImage(result.value);
                }
            });
    },
    keyDown(e) {
        if (!e.ctrlKey) {
            return;
        }

        let action;
        switch (e.key) {
            case 'b':
                action = 'bold';
                break;
            case 'i':
                action = 'italic';
                break;
            case 'u':
                action = 'underline';
                break;
            case 'y':
                action = 'redo';
                break;
            case 'z':
                action = 'undo';
                break;
            default:
                return;
        }

        e.preventDefault();

        this[action]();
    },
    defaultFont: 'Arial',
    fonts: null,
    height: 'auto',
    resizable: true,
    historyLimit: 1000,
};

// Editor classes
Editor.classes = {
    btn: 'btn btn-editor btn-sm fs-6 lh-1',
    btnGroup: 'btn-group me-1 mb-1',
    btnIcon: 'pe-none',
    checkbox: 'input-check',
    checkboxContainer: 'form-check',
    color: 'editor-color flex-grow-1 d-block border-0',
    colorBtnContent: 'fw-bold d-inline-block px-1 pe-none',
    colorContainerRow: 'row g-0',
    colorContainerColumn: 'col-6',
    colorDefaultBtn: 'btn btn-outline-editor btn-sm d-block w-100 py-0',
    colorLabel: 'd-block text-center',
    colorLabelContainer: 'p-2',
    colorRow: 'd-flex flex-row px-2',
    container: 'card shadow-sm',
    dropdown: 'dropdown-menu',
    dropdownButtons: 'pt-2 pe-1 pb-1 ps-2 text-nowrap',
    dropdownGroup: 'btn-group',
    dropdownItem: 'dropdown-item',
    dropdownItemDisabled: 'disabled',
    dropdownToggle: 'dropdown-toggle',
    dropHover: 'text-primary',
    dropTarget: 'editor-drop-target position-absolute w-100 text-center rounded',
    dropText: 'position-absolute top-50 translate-middle h5 pe-none',
    editor: 'editor w-100 p-2 outline-0',
    editorBody: 'card-body d-flex p-0',
    editorContainer: 'editor-container position-relative',
    editorDisabled: 'bg-body-tertiary pe-none',
    editorScroll: 'editor-scroll d-block w-100 overflow-auto',
    formError: 'form-error',
    formGroup: 'mb-2',
    imgCursor: 'editor-img-cursor position-absolute translate-middle pe-none',
    imgHighlight: 'editor-img-highlight position-absolute pe-none',
    imgResize: 'editor-img-resize position-absolute top-100 start-100 translate-middle pe-auto',
    imgSize: 'editor-img-size position-absolute bottom-0 end-0 text-end me-2 mb-2 py-1 px-3 rounded',
    input: 'input-filled',
    inputContainer: 'form-input',
    inputRipple: 'ripple-line',
    invalidFeedback: 'invalid-feedback',
    linkUrl: 'editor-link-url d-inline-block text-truncate me-1',
    modal: 'modal',
    modalBody: 'modal-body',
    modalBtnClose: 'btn-close',
    modalBtnPrimary: 'btn btn-primary ripple mb-0',
    modalBtnSecondary: 'btn btn-secondary ripple mb-0',
    modalContent: 'modal-content shadow',
    modalDialog: 'modal-dialog',
    modalFooter: 'modal-footer',
    modalFullscreen: 'modal-fullscreen',
    modalHeader: 'modal-header',
    modalTitle: 'modal-title',
    popover: 'editor-popover popover',
    popoverArrow: 'popover-arrow',
    popoverBody: 'popover-body mb-n1 ms-n2 me-n3',
    resizeBar: 'editor-resize card-footer',
    source: 'editor-source font-monospace outline-0 border-0 p-2 mb-0 w-100',
    sourceContainer: 'd-flex h-100',
    sourceLines: 'font-monospace bg-body-secondary p-2 mb-0 border-end',
    sourceOuter: 'w-100 overflow-hidden',
    sourceScroll: 'd-flex w-100',
    styleContent: 'mb-1',
    table: 'table table-bordered',
    tableCell: 'flex-column',
    tableDropdown: 'p-2',
    tableHover: 'bg-primary',
    tableInfo: 'text-muted',
    tableLink: 'editor-table-link d-block border border-dark p-2 rounded-0',
    tableRow: 'd-flex flex-row',
    toolbar: 'card-header pt-1 pe-0 pb-0 ps-1',
    toolbarButtons: 'btn-toolbar',
};

// Editor lang
Editor.lang = {
    drop: {
        drop: 'Drop image or text',
        dropHere: 'Drop image or text here',
    },
    dropdowns: {
        colorBackground: 'Background Color',
        colorDefault: 'Use Default',
        colorForeground: 'Foreground Color',
        colorTransparent: 'Use Transparent',
    },
    modals: {
        cancel: 'Cancel',
        close: 'Close',
        imageFile: 'Select Files',
        imageUrl: 'Image URL',
        insertImage: 'Insert Image',
        insertLink: 'Insert Link',
        insertVideo: 'Insert Video',
        linkNewWindow: 'Open in new window',
        linkText: 'Link Text',
        linkUrl: 'Link URL',
        videoUrl: 'Video URL',
        videoUrlInvalid: 'Invalid video URL.',
    },
    plugins: {
        alignCenter: 'Align Center',
        alignJustify: 'Justify Full',
        alignLeft: 'Align Left',
        alignRight: 'Align Right',
        bold: 'Bold',
        color: 'Font Color',
        font: 'Font Family',
        fontSize: 'Font Size',
        fullScreen: 'Full Screen',
        hr: 'Horizontal Rule',
        image: 'Image',
        indent: 'Indent',
        italic: 'Italic',
        link: 'Link',
        orderedList: 'Ordered List',
        outdent: 'Outdent',
        paragraph: 'Paragraph',
        redo: 'Redo',
        removeFormat: 'Remove Formatting',
        source: 'View Source',
        strikethrough: 'Strikethrough',
        style: 'Style',
        subscript: 'Subscript',
        superscript: 'Superscript',
        table: 'Table',
        underline: 'Underline',
        undo: 'Undo',
        unlink: 'Unlink',
        unorderedList: 'Unordered List',
        video: 'Video',
    },
    popovers: {
        imageFull: 'Full Size',
        imageHalf: 'Half Size',
        imageOriginal: 'Original Size',
        imageQuarter: 'Quarter Size',
        imageRemove: 'Remove Image',
        floatLeft: 'Float Left',
        floatNone: 'Remove Float',
        floatRight: 'Float Right',
        linkEdit: 'Edit Link',
        tableColumnAfter: 'Add Column After',
        tableColumnBefore: 'Add Column Before',
        tableColumnRemove: 'Remove Column',
        tableRemove: 'Remove Table',
        tableRowAfter: 'Add Row After',
        tableRowBefore: 'Add Row Before',
        tableRowRemove: 'Remove Row',
        unlink: 'Remove Link',
    },
    styles: {
        p: 'Paragraph',
        blockquote: 'Quote',
        pre: 'Code',
        h1: 'Header 1',
        h2: 'Header 2',
        h3: 'Header 3',
        h4: 'Header 4',
        h5: 'Header 5',
        h6: 'Header 6',
    },
};

// Editor static
Editor.buttons = buttons;
Editor.colors = colors;
Editor.fonts = fonts;
Editor.fontSizes = fontSizes;
Editor.icons = icons;
Editor.plugins = plugins;
Editor.popovers = popovers;
Editor.styles = styles;

Editor._createCheckbox = _createCheckbox;
Editor._createFileInput = _createFileInput;
Editor._createInput = _createInput;
Editor._createModal = _createModal;

// Editor prototype
const proto = Editor.prototype;

proto._addHistory = _addHistory;
proto._checkEmpty = _checkEmpty;
proto._colorDropdown = _colorDropdown;
proto._events = _events;
proto._eventsDrop = _eventsDrop;
proto._eventsEditor = _eventsEditor;
proto._eventsPopover = _eventsPopover;
proto._eventsResize = _eventsResize;
proto._eventsSource = _eventsSource;
proto._eventsToolbar = _eventsToolbar;
proto._execCommand = _execCommand;
proto._focusEditor = _focusEditor;
proto._fontDropdown = _fontDropdown;
proto._fontSizeDropdown = _fontSizeDropdown;
proto._getSelectionData = _getSelectionData;
proto._highlightImage = _highlightImage;
proto._insertNode = _insertNode;
proto._normalize = _normalize;
proto._refreshCursor = _refreshCursor;
proto._refreshDisabled = _refreshDisabled;
proto._refreshLineNumbers = _refreshLineNumbers;
proto._refreshPopover = _refreshPopover;
proto._refreshToolbar = _refreshToolbar;
proto._removeModal = _removeModal;
proto._removePopover = _removePopover;
proto._render = _render;
proto._renderButton = _renderButton;
proto._renderDrop = _renderDrop;
proto._renderEditor = _renderEditor;
proto._renderPopover = _renderPopover;
proto._renderPopoverItem = _renderPopoverItem;
proto._renderPopoverItems = _renderPopoverItems;
proto._renderResize = _renderResize;
proto._renderSource = _renderSource;
proto._renderToolbar = _renderToolbar;
proto._renderToolbarButton = _renderToolbarButton;
proto._renderToolbarDropdown = _renderToolbarDropdown;
proto._resetDropText = _resetDropText;
proto._restoreHistory = _restoreHistory;
proto._setToolbarData = _setToolbarData;
proto._showDropTarget = _showDropTarget;
proto._showEditor = _showEditor;
proto._showImageModal = _showImageModal;
proto._showLinkModal = _showLinkModal;
proto._showSource = _showSource;
proto._showVideoModal = _showVideoModal;
proto._styleDropdown = _styleDropdown;
proto._tableDropdown = _tableDropdown;
proto._updateTable = _updateTable;
proto._updateValue = _updateValue;

// Editor init
initComponent('editor', Editor);

export default Editor;
