/** @import { EditorOptions, EditorHistoryEntry, EditorSelectionData, EditorPlugin, EditorPopover, EditorInputOptions, EditorInputElements, EditorModalOptions } from './types.js'; */
import $ from '@fr0st/query';
import { BaseComponent, Modal } from '@fr0st/ui';
import { changeIndent } from './commands.js';
import { classes, defaults, lang } from './config.js';
import * as content from './content.js';
import * as events from './events.js';
import { loadValue } from './form.js';
import { addEditor, removeEditor } from './helpers.js';
import * as history from './history.js';
import icons from './icons.js';
import * as modals from './modals.js';
import plugins from './plugins.js';
import popovers from './popovers.js';
import * as positioning from './positioning.js';
import * as dropdowns from './render/dropdowns.js';
import * as render from './render/editor.js';
import * as popover from './render/popover.js';
import * as toolbar from './render/toolbar.js';
import { isSafeURL } from './sanitize.js';
import { getRange, selectRange } from './selection.js';
import { buttons, colors, fonts, fontSizes, styles } from './values.js';

/**
 * A customizable WYSIWYG editor backed by a native textarea.
 * @augments {BaseComponent<EditorOptions>}
 * @fires Editor#init.ui.editor
 * @fires Editor#change.ui.editor
 */
export default class Editor extends BaseComponent {
    static buttons = buttons;
    static classes = classes;
    static colors = colors;
    static defaults = defaults;
    static fonts = fonts;
    static fontSizes = fontSizes;
    static icons = icons;
    static lang = lang;
    /** @type {Record<string, EditorPlugin>} */
    static plugins = plugins;
    /** @type {Record<string, EditorPopover>} */
    static popovers = popovers;
    static styles = styles;

    /** @type {Array<{button: HTMLElement, data: EditorPlugin, type?: string}>} */
    _buttons = [];
    /** @type {EditorHistoryEntry[]} */
    _history = [];
    /** @type {EditorHistoryEntry[]} */
    _redoHistory = [];

    /** @type {Array<() => void>} */
    #cleanups = [];
    /** @type {Set<BaseComponent>} */
    #components = new Set();
    #disposing = false;
    /** @type {Set<HTMLImageElement>} */
    #images = new Set();
    #observationDepth = 0;
    /** @type {MutationObserver|null} */
    #observer = null;
    /** @type {Map<string, string|null>} */
    #originalAttributes = new Map();
    /** @type {[number, number, 'forward'|'backward'|'none']|null} */
    #originalSelection = null;
    #pendingMutation = false;
    /** @type {Set<FileReader>} */
    #readers = new Set();

    /**
     * Create a form checkbox.
     * @param {EditorInputOptions} options Options for the checkbox.
     * @returns {EditorInputElements} The form elements.
     */
    static _createCheckbox(options) {
        return modals.createCheckbox(this, options);
    }

    /**
     * Create a form file input.
     * @param {EditorInputOptions} options Options for the file input.
     * @returns {EditorInputElements} The form elements.
     */
    static _createFileInput(options) {
        return modals.createFileInput(this, options);
    }

    /**
     * Create a form text input.
     * @param {EditorInputOptions} options Options for the text input.
     * @returns {EditorInputElements} The form elements.
     */
    static _createInput(options) {
        return modals.createInput(this, options);
    }

    /**
     * Create a modal.
     * @param {EditorModalOptions} options Options for the modal.
     * @returns {HTMLElement} The modal element.
     */
    static _createModal(options) {
        return modals.createModal(this, options);
    }

    /**
     * New Editor constructor.
     * @param {HTMLElement} node The input node.
     * @param {EditorOptions} [options] The options to create the Editor with.
     * @throws {TypeError} When the input is not a textarea.
     */
    constructor(node, options) {
        if (!$._isElement(node) || !$.is(node, 'textarea')) {
            throw new TypeError('Editor must be created on a textarea element.');
        }
        super(node, options);

        this.#originalAttributes = new Map(['style', 'tabindex', 'hidden', 'aria-hidden']
            .map((name) => [name, node.getAttribute(name)]));
        this.#originalSelection = [node.selectionStart, node.selectionEnd, node.selectionDirection];
        const active = document.activeElement;
        const originalRange = getRange()?.cloneRange();

        try {
            this._toolbarButtons = this.options.buttons || this.constructor.buttons;
            this._fonts = (this.options.fonts || this.constructor.fonts)
                .filter((font) => document.fonts.check(`12px ${font}`));
            this._defaultFont = this._fonts.includes(this.options.defaultFont) ?
                this.options.defaultFont : this._fonts[0] || 'sans-serif';
            this._render();
            $.setHtml(this._editor, this.options.sanitize($.getValue(node)));
            this._refreshDisabled();
            this._checkEmpty();
            this._events();
            this._normalize();
            this._updateValue();
            if (!this.node) {
                return;
            }
            this._refreshToolbar();
            addEditor(this);

            if (active === node) {
                this._focusEditor();
            } else {
                if (active instanceof HTMLElement && active.isConnected && document.activeElement !== active) {
                    active.focus({ preventScroll: true });
                }
                selectRange(originalRange);
            }
            if (this.node) {
                $.triggerEvent(node, 'init.ui.editor');
            }
        } catch (error) {
            try {
                this.dispose();
            } catch {
                // Preserve the initialization error after completing cleanup.
            }
            throw error;
        }
    }

    /**
     * Add an item to the history.
     * @param {EditorHistoryEntry} data The history snapshot.
     */
    _addHistory(data) {
        history.addHistory(this, data);
    }

    /**
     * Check if the editor is empty and populate base markup.
     */
    _checkEmpty() {
        content.checkEmpty(this);
    }

    /**
     * Render a color dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    _colorDropdown(dropdown) {
        dropdowns.colorDropdown(this, dropdown);
    }

    /**
     * Creates a deferred callback that cannot run after disposal.
     * @param {Function} callback The callback to defer.
     * @returns {Function} The guarded callback.
     */
    _debounce(callback) {
        return $.debounce((...args) => {
            if (this.node) {
                callback(...args);
            }
        });
    }

    /**
     * Attach events for the Editor.
     */
    _events() {
        events.events(this);
    }

    /**
     * Attach drop events.
     */
    _eventsDrop() {
        events.eventsDrop(this);
    }

    /**
     * Attach editor events.
     */
    _eventsEditor() {
        events.eventsEditor(this);
    }

    /**
     * Attach popover events.
     */
    _eventsPopover() {
        events.eventsPopover(this);
    }

    /**
     * Attach resize events.
     */
    _eventsResize() {
        events.eventsResize(this);
    }

    /**
     * Attach source events.
     */
    _eventsSource() {
        events.eventsSource(this);
    }

    /**
     * Attach toolbar events.
     */
    _eventsToolbar() {
        events.eventsToolbar(this);
    }

    /**
     * Execute a command.
     * @param {string} command The command.
     * @param {boolean | string} [value] The command argument.
     */
    _execCommand(command, value) {
        content.execCommand(this, command, value);
    }

    /**
     * Ensure the editor element has focus.
     */
    _focusEditor() {
        content.focusEditor(this);
    }

    /**
     * Render a font dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    _fontDropdown(dropdown) {
        dropdowns.fontDropdown(this, dropdown);
    }

    /**
     * Render a font size dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    _fontSizeDropdown(dropdown) {
        dropdowns.fontSizeDropdown(this, dropdown);
    }

    /**
     * Get selection data for history.
     * @returns {EditorSelectionData|null} The selection data.
     */
    _getSelectionData() {
        return history.getSelectionData(this);
    }

    /**
     * Highlight an image.
     * @param {HTMLElement} image The image element.
     */
    _highlightImage(image) {
        positioning.highlightImage(this, image);
    }

    /**
     * Insert a (cloned) node into the editor.
     * @param {HTMLElement} node The node to insert.
     * @returns {HTMLElement} The new node.
     */
    _insertNode(node) {
        return content.insertNode(this, node);
    }

    /**
     * Normalize the editor.
     */
    _normalize() {
        content.normalize(this);
    }

    /**
     * Suspends or resumes content observation with balanced nested calls.
     * @param {boolean} [observe=true] Whether to resume observation.
     */
    _observe(observe = true) {
        if (!this.node || !this.#observer) {
            return;
        }
        if (!observe) {
            if (this.#observationDepth++ === 0) {
                this.#pendingMutation ||= this.#observer.takeRecords().some((record) => record.type !== 'attributes' || record.target !== this._editor);
                this.#observer.disconnect();
            }
            return;
        }
        this.#observationDepth = Math.max(0, this.#observationDepth - 1);
        if (this.#observationDepth === 0) {
            this.#observer.observe(this._editor, { attributes: true, childList: true, characterData: true, subtree: true });
            if (this.#pendingMutation) {
                this.#pendingMutation = false;
                this._debounce(() => {
                    if ($.isVisible(this._sourceContainer)) {
                        return;
                    }
                    this._normalize();
                    this._checkEmpty();
                    this._updateValue();
                })();
            }
        }
    }

    /**
     * Registers cleanup for resources created by an extension or rendering helper.
     * @param {Function} callback The cleanup callback.
     */
    _onDispose(callback) {
        if (this.node) {
            this.#cleanups.push(callback);
        } else {
            callback();
        }
    }

    /**
     * Owns a child UI component until disposal.
     * @template {BaseComponent} T
     * @param {T} component The child component.
     * @returns {T} The child component.
     */
    _ownComponent(component) {
        if (!this.node) {
            component.dispose();
            return component;
        }
        for (const owned of this.#components) {
            if (!owned.node) {
                this.#components.delete(owned);
            }
        }
        this.#components.add(component);
        return component;
    }

    /**
     * Reads an uploaded file and aborts the read when this editor is disposed.
     * @param {File} file The uploaded file.
     * @returns {Promise<string>} The file data URL.
     */
    _readImage(file) {
        return new Promise((resolve, reject) => {
            if (!this.node) {
                reject(new Error('Editor is disposed.'));
                return;
            }
            const reader = new FileReader();
            this.#readers.add(reader);
            const finish = () => {
                this.#readers.delete(reader);
                reader.onload = null;
                reader.onerror = null;
                reader.onabort = null;
            };
            reader.onload = () => {
                const value = reader.result;
                finish();
                resolve(value);
            };
            reader.onerror = () => {
                finish();
                reject(new Error('Unable to read file.'));
            };
            reader.onabort = () => {
                finish();
                reject(new Error('File read was canceled.'));
            };
            try {
                reader.readAsDataURL(file);
            } catch (error) {
                finish();
                reject(error);
            }
        });
    }

    /**
     * Refresh the popover at cursor.
     */
    _refreshCursor() {
        content.refreshCursor(this);
    }

    /**
     * Refresh the editor disabled.
     */
    _refreshDisabled() {
        content.refreshDisabled(this);
    }

    /**
     * Refresh the source line numbers.
     */
    _refreshLineNumbers() {
        content.refreshLineNumbers(this);
    }

    /**
     * Refresh the popover.
     * @param {HTMLElement} currentNode The current selected node.
     * @param {Event} [event] The current event.
     */
    _refreshPopover(currentNode, event) {
        positioning.refreshPopover(this, currentNode, event);
    }

    /**
     * Refresh the toolbar.
     */
    _refreshToolbar() {
        content.refreshToolbar(this);
    }

    /**
     * Remove the modal.
     */
    _removeModal() {
        modals.removeModal(this);
    }

    /**
     * Remove the popover.
     */
    _removePopover() {
        positioning.removePopover(this);
    }

    /**
     * Render the editor.
     */
    _render() {
        render.render(this);
    }

    /**
     * Render a button
     * @param {object} data The button data.
     * @returns {HTMLElement} The button.
     */
    _renderButton(data) {
        return render.renderButton(this, data);
    }

    /**
     * Render the drop elements.
     */
    _renderDrop() {
        render.renderDrop(this);
    }

    /**
     * Render the editor elements.
     */
    _renderEditor() {
        render.renderEditor(this);
    }

    /**
     * Render the popover elements.
     */
    _renderPopover() {
        popover.renderPopover(this);
    }

    /**
     * Render a popover item.
     * @param {string} type The item type.
     * @param {HTMLElement} parent The parent element.
     */
    _renderPopoverItem(type, parent) {
        popover.renderPopoverItem(this, type, parent);
    }

    /**
     * Render popover items.
     * @param {Array} items The items to render.
     */
    _renderPopoverItems(items) {
        popover.renderPopoverItems(this, items);
    }

    /**
     * Render the resize bar.
     */
    _renderResize() {
        render.renderResize(this);
    }

    /**
     * Render the source elements.
     */
    _renderSource() {
        render.renderSource(this);
    }

    /**
     * Render the toolbar.
     */
    _renderToolbar() {
        toolbar.renderToolbar(this);
    }

    /**
     * Render a toolbar button.
     * @param {string} type The button type.
     * @param {HTMLElement} parent The parent element.
     */
    _renderToolbarButton(type, parent) {
        toolbar.renderToolbarButton(this, type, parent);
    }

    /**
     * Render a toolbar dropdown.
     * @param {HTMLElement} buttonGroup The button group element.
     * @param {HTMLElement} button The button element.
     * @param {Array|Function} dropdownContent The dropdown content.
     */
    _renderToolbarDropdown(buttonGroup, button, dropdownContent) {
        toolbar.renderToolbarDropdown(this, buttonGroup, button, dropdownContent);
    }

    /**
     * Reset the drop text.
     */
    _resetDropText() {
        content.resetDropText(this);
    }

    /**
     * Restore an item from history.
     * @param {EditorHistoryEntry} data The history snapshot.
     */
    _restoreHistory(data) {
        history.restoreHistory(this, data);
    }

    /**
     * Set data for a toolbar action.
     * @param {HTMLElement} node The action node.
     * @param {object} data The data to set.
     * @param {string} [type] The action type.
     */
    _setToolbarData(node, data, type) {
        toolbar.setToolbarData(this, node, data, type);
    }

    /**
     * Show the drop target.
     */
    _showDropTarget() {
        content.showDropTarget(this);
    }

    /**
     * Show the editor.
     */
    _showEditor() {
        content.showEditor(this);
    }

    /**
     * Show the image modal.
     */
    _showImageModal() {
        modals.showImageModal(this);
    }

    /**
     * Show the link modal.
     * @param {HTMLElement} [link] The current link.
     */
    _showLinkModal(link) {
        modals.showLinkModal(this, link);
    }

    /**
     * Show the source.
     */
    _showSource() {
        content.showSource(this);
    }

    /**
     * Show the video modal.
     */
    _showVideoModal() {
        modals.showVideoModal(this);
    }

    /**
     * Render a style dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    _styleDropdown(dropdown) {
        dropdowns.styleDropdown(this, dropdown);
    }

    /**
     * Render a table dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    _tableDropdown(dropdown) {
        dropdowns.tableDropdown(this, dropdown);
    }

    /**
     * Update a table element.
     * @param {HTMLElement} td The td element.
     * @param {Function} callback The callback.
     */
    _updateTable(td, callback) {
        content.updateTable(this, td, callback);
    }

    /**
     * Update the input value.
     */
    _updateValue() {
        content.updateValue(this);
    }

    /**
     * Starts observing content changes owned by this editor.
     */
    _watchContent() {
        const changed = this._debounce(() => {
            if ($.isVisible(this._sourceContainer)) {
                return;
            }
            this._normalize();
            this._checkEmpty();
            this._updateValue();
        });
        this.#observer = new MutationObserver((records) => {
            if (records.some((record) => record.type !== 'attributes' || record.target !== this._editor)) {
                changed();
            }
        });
        this._observe();
    }

    /**
     * Set the background color.
     * @param {string} value The background color.
     */
    backColor(value) {
        this._execCommand('backColor', value);
    }

    /**
     * Toggle bold state.
     */
    bold() {
        this._execCommand('bold');
    }

    /**
     * Disable the Editor.
     */
    disable() {
        $.setAttribute(this.node, { disabled: true });
        this._refreshDisabled();
        this._refreshToolbar();
    }

    /**
     * Dispose the Editor.
     */
    dispose() {
        if (!this.node || this.#disposing) {
            return;
        }
        this.#disposing = true;
        const node = this.node;
        const active = document.activeElement;
        const restoreFocus = this._container?.contains(active) ||
            this._modal?.contains(active) || this._fullScreen?.contains(active);
        removeEditor(this);
        this.#observer?.disconnect();
        this.#observer = null;
        super.dispose();

        let failure;
        const release = (callback) => {
            try {
                callback();
            } catch (error) {
                failure ||= error;
            }
        };
        for (const reader of this.#readers) {
            release(() => reader.abort());
        }
        this.#readers.clear();
        for (const image of this.#images) {
            image.onload = null;
            image.onerror = null;
            image.src = '';
        }
        this.#images.clear();
        for (const cleanup of this.#cleanups.splice(0).reverse()) {
            release(cleanup);
        }
        for (const component of this.#components) {
            release(() => component.dispose());
        }
        this.#components.clear();
        release(() => this._popper?.dispose());
        for (const modal of [this._modal, this._fullScreen]) {
            if (modal) {
                release(() => Modal.init(modal).dispose());
                $.remove(modal);
            }
        }
        if (this._container) {
            $.remove(this._container);
        }
        for (const [name, value] of this.#originalAttributes) {
            if (value === null) {
                node.removeAttribute(name);
            } else {
                node.setAttribute(name, value);
            }
        }
        if (restoreFocus && node.isConnected && !node.hidden) {
            node.focus({ preventScroll: true });
            node.setSelectionRange(...this.#originalSelection);
        }
        for (const key of ['_container', '_toolbar', '_editorBody', '_editorContainer', '_editorScroll',
            '_editor', '_imgHighlight', '_imgCursor', '_imgResize', '_imgSize', '_sourceOuter',
            '_sourceContainer', '_sourceScroll', '_lineNumbers', '_source', '_popover', '_popoverArrow',
            '_popoverBody', '_dropTarget', '_dropText', '_resizeBar', '_currentNode', '_lastRange',
            '_history', '_redoHistory', '_buttons', '_modal', '_fullScreen', '_popper']) {
            this[key] = null;
        }
        if (failure) {
            throw failure;
        }
    }

    /**
     * Enable the Editor.
     */
    enable() {
        $.removeAttribute(this.node, 'disabled');
        this._refreshDisabled();
        this._refreshToolbar();
    }

    /**
     * Set the font family.
     * @param {string} value The font family.
     */
    fontName(value) {
        this._execCommand('fontName', value);
    }

    /**
     * Set the font size.
     * @param {number|string} value The font size in pixels.
     */
    fontSize(value) {
        value = Object.keys(this.constructor.fontSizes)
            .find((key) => this.constructor.fontSizes[key] === Number(value));

        this._execCommand('fontSize', value);
    }

    /**
     * Set the foreground color.
     * @param {string} value The foreground color.
     */
    foreColor(value) {
        this._execCommand('foreColor', value);
    }

    /**
     * Format the selected block level element.
     * @param {string} value The tag name.
     */
    formatBlock(value) {
        this._execCommand('formatBlock', value);
    }

    /**
     * Indent the selection.
     */
    indent() {
        changeIndent(this, false);
    }

    /**
     * Insert a horizontal rule.
     */
    insertHorizontalRule() {
        this._execCommand('insertHorizontalRule');
    }

    /**
     * Insert a HTML string.
     * @param {string} value The HTML string.
     */
    insertHTML(value) {
        if (!this.node || this.node.matches(':disabled') || this.node.readOnly) {
            return;
        }
        this._execCommand('insertHTML', this.options.sanitize(value));
    }

    /**
     * Insert an image.
     * @param {string} src The image src.
     */
    insertImage(src) {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly) {
            return;
        }
        if (!isSafeURL(src, 'image')) {
            return;
        }
        const img = $.create('img', { attributes: { src } });
        const newImg = this._insertNode(img);
        if (!newImg) {
            return;
        }
        const image = new Image();
        this.#images.add(image);
        const finish = () => {
            this.#images.delete(image);
            image.onload = null;
            image.onerror = null;
        };
        image.onload = () => {
            if (this.node && this._editor.contains(newImg)) {
                const maxWidth = $.width(this._editor, { boxSize: $.CONTENT_BOX });
                $.setStyle(newImg, { width: `${Math.min(image.width, maxWidth)}px` });
            }
            finish();
        };
        image.onerror = finish;
        image.src = src;
    }

    /**
     * Insert a link.
     * @param {string} href The link href.
     * @param {string} text The link text.
     * @param {boolean} [newWindow] Whether to open the link in a new window.
     */
    insertLink(href, text, newWindow) {
        if (!isSafeURL(href)) {
            return;
        }
        const link = $.create('a', {
            text,
            attributes: {
                href,
            },
        });

        if (newWindow) {
            $.setAttribute(link, { target: '_blank', rel: 'noopener noreferrer' });
        }

        this._insertNode(link);
    }

    /**
     * Create an ordered list for the selection.
     */
    insertOrderedList() {
        this._execCommand('insertOrderedList');
    }

    /**
     * Insert a text string.
     * @param {string} value The text.
     */
    insertText(value) {
        this._execCommand('insertText', value);
    }

    /**
     * Create an unordered list for the selection.
     */
    insertUnorderedList() {
        this._execCommand('insertUnorderedList');
    }

    /**
     * Toggle italic state.
     */
    italic() {
        this._execCommand('italic');
    }

    /**
     * Center the selection.
     */
    justifyCenter() {
        this._execCommand('justifyCenter');
    }

    /**
     * Justify the selection.
     */
    justifyFull() {
        this._execCommand('justifyFull');
    }

    /**
     * Align the selection to the left.
     */
    justifyLeft() {
        this._execCommand('justifyLeft');
    }

    /**
     * Align the selection to the right.
     */
    justifyRight() {
        this._execCommand('justifyRight');
    }

    /**
     * Outdent the selection.
     */
    outdent() {
        changeIndent(this, true);
    }

    /**
     * Perform a redo.
     */
    redo() {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly || !this._redoHistory.length) {
            return;
        }

        const current = this._redoHistory.pop();

        this._addHistory(current);
        this._restoreHistory(current);
    }

    /**
     * Reload a programmatically assigned textarea value and state.
     */
    refresh() {
        if (this.node) {
            loadValue(this);
        }
    }

    /**
     * Remove all formatting from the selection.
     */
    removeFormat() {
        this._execCommand('removeFormat');
    }

    /**
     * Toggle strikethrough state.
     */
    strikethrough() {
        this._execCommand('strikethrough');
    }

    /**
     * Toggle subscript state.
     */
    subscript() {
        this._execCommand('subscript');
    }

    /**
     * Toggle superscript state.
     */
    superscript() {
        this._execCommand('superscript');
    }

    /**
     * Toggle underline state.
     */
    underline() {
        this._execCommand('underline');
    }

    /**
     * Perform an undo.
     */
    undo() {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly || this._history.length <= 1) {
            return;
        }

        const next = this._history.pop();
        this._redoHistory.push(next);

        const current = this._history.at(-1);

        this._restoreHistory(current);
    }

    /**
     * Remove the selected anchor element.
     */
    unlink() {
        this._execCommand('unlink');
    }
}
