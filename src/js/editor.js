/** @import { EditorOptions, EditorHistoryEntry, EditorPlugin, EditorPopover, EditorDropdownCallback } from './types.js'; */

import $ from '@fr0st/query';
import { BaseComponent, Dropdown, generateId, Modal, Popper, Tooltip } from '@fr0st/ui';
import { getSelectedBlocks, indentBlocks, outdentBlocks } from './commands.js';
import { classes, lang } from './config.js';
import { containsNode } from './helpers.js';
import { getSelectionData, restoreSelectionData } from './history.js';
import icons from './icons.js';
import { createCheckbox, createFileInput, createInput, createModal } from './modals.js';
import { isPhrasingContent, joinAdjacentNodes, normalizePhrasing, normalizeSpans, normalizeStyles } from './normalize.js';
import { getRange, normalizeText, restoreSelection, saveSelection, selectNode, selectRange } from './selection.js';
import { addEditor, removeEditor, resetDragCount } from './shared-events.js';
import { buttons, colors, fonts, fontSizes, styles } from './values.js';

const document = $.getContext();
const window = $.getWindow();

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
    /** @type {EditorOptions} */
    static defaults = {
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
        /**
         * Reads images owned by this editor and inserts successful results.
         * @this {Editor}
         * @param {FileList|File[]} files The files to read.
         * @returns {Promise<void>} Completion after every file has settled.
         */
        async imageUpload(files) {
            const results = await Promise.allSettled([...files].map((file) => this.#readImage(file)));

            if (!this.node) {
                return;
            }

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    this.insertImage(result.value);
                }
            }
        },
        /**
         * Handles the default formatting and history shortcuts.
         * @this {Editor}
         * @param {KeyboardEvent} event The keyboard event.
         */
        keyDown(event) {
            if ((!event.ctrlKey && !event.metaKey) || event.altKey) {
                return;
            }

            let action;

            switch (event.key.toLowerCase()) {
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
                    action = event.shiftKey ? 'redo' : 'undo';
                    break;
                default:
                    return;
            }

            event.preventDefault();

            this[action]();
        },
        defaultFont: 'Arial',
        fonts: null,
        height: 'auto',
        resizable: true,
        historyLimit: 1000,
    };
    static fonts = fonts;
    static fontSizes = fontSizes;
    static icons = icons;
    static lang = lang;
    /** @type {Record<string, EditorPlugin>} */
    static plugins = {
        alignCenter: {
            command: 'justifyCenter',
        },
        alignJustify: {
            command: 'justifyFull',
        },
        alignLeft: {
            command: 'justifyLeft',
        },
        alignRight: {
            command: 'justifyRight',
        },
        bold: {
            command: 'bold',
        },
        color: {
            setContent() {
                const backColor = document.queryCommandValue('backColor');
                const foreColor = document.queryCommandValue('foreColor');

                const span = $.create('span', {
                    text: 'A',
                    class: this.constructor.classes.colorBtnContent,
                    style: {
                        color: foreColor,
                        backgroundColor: backColor,
                    },
                });

                return $.getProperty(span, 'outerHTML');
            },
            dropdown(dropdown) {
                this.#colorDropdown(dropdown);
            },
        },
        font: {
            setContent() {
                const fontName = document.queryCommandValue('fontName').replace(/"/g, '');

                return this.#fonts.includes(fontName) ?
                    fontName :
                    this.#defaultFont;
            },
            dropdown(dropdown) {
                this.#fontDropdown(dropdown);
            },
        },
        fontSize: {
            setContent() {
                const size = document.queryCommandValue('fontSize');

                if (size) {
                    return this.constructor.fontSizes[size];
                }

                const fontSizePx = $.css(this.#editor, 'fontSize');
                const fontSize = parseFloat(fontSizePx);

                return Math.round(fontSize);
            },
            dropdown(dropdown) {
                this.#fontSizeDropdown(dropdown);
            },
        },
        fullScreen: {
            action() {
                if (this.#fullScreen) {
                    Modal.init(this.#fullScreen).hide();

                    return;
                }

                this.#fullScreen = createModal(this.constructor, {
                    content: this.#container,
                    fullScreen: true,
                    onShown: () => {
                        if ($.isVisible(this.#sourceContainer)) {
                            $.focus(this.#source);
                        } else {
                            $.focus(this.#editor);
                        }
                    },
                    onHide: () => {
                        $.insertBefore(this.#container, this.node);
                        this.#fullScreen = null;
                    },
                });
                this.#ownComponent(Modal.init(this.#fullScreen));
            },
        },
        hr: {
            command: 'insertHorizontalRule',
        },
        image: {
            action() {
                this.#showImageModal();
            },
        },
        indent: {
            command: 'indent',
        },
        italic: {
            command: 'italic',
        },
        link: {
            action() {
                this.#showLinkModal();
            },
        },
        orderedList: {
            command: 'insertOrderedList',
        },
        outdent: {
            command: 'outdent',
        },
        paragraph: {
            dropdown: [
                ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
                ['indent', 'outdent'],
            ],
        },
        redo: {
            command: 'redo',
            disableCheck() {
                return !this.#redoHistory.length;
            },
        },
        removeFormat: {
            command: 'removeFormat',
        },
        source: {
            action() {
                const value = $.getValue(this.node);

                if ($.isVisible(this.#sourceContainer)) {
                    this.#observe(false);

                    try {
                        $.setHtml(this.#editor, value);
                        this.#normalize();
                        this.#checkEmpty();

                        const html = $.getHtml(this.#editor);

                        if (this.#history.at(-1)?.html !== html) {
                            this.#redoHistory = [];
                            this.#addHistory({ html });
                        }

                        this.#updateValue();
                    } finally {
                        this.#observe();
                    }

                    if (!this.node) {
                        return;
                    }

                    this.#showEditor();
                    this.#focusEditor();
                } else {
                    $.setValue(this.#source, value);
                    this.#showSource();
                    $.focus(this.#source);
                }

                this.#refreshToolbar();
            },
        },
        strikethrough: {
            command: 'strikethrough',
        },
        style: {
            dropdown(dropdown) {
                this.#styleDropdown(dropdown);
            },
        },
        subscript: {
            command: 'subscript',
        },
        superscript: {
            command: 'superscript',
        },
        table: {
            dropdown(dropdown) {
                this.#tableDropdown(dropdown);
            },
        },
        underline: {
            command: 'underline',
        },
        undo: {
            command: 'undo',
            disableCheck() {
                return !this.#history.length;
            },
        },
        unlink: {
            command: 'unlink',
        },
        unorderedList: {
            command: 'insertUnorderedList',
        },
        video: {
            action() {
                this.#showVideoModal();
            },
        },
    };
    /** @type {Record<string, EditorPopover>} */
    static popovers = {
        floatLeft: {
            action(node) {
                $.setStyle(node, { float: 'left' });
            },
        },
        floatRight: {
            action(node) {
                $.setStyle(node, { float: 'right' });
            },
        },
        floatNone: {
            action(node) {
                $.removeStyle(node, 'float');
            },
        },
        imageFull: {
            content: '100%',
            action(node) {
                $.setStyle(node, { width: '100%' });
            },
        },
        imageHalf: {
            content: '50%',
            action(node) {
                $.setStyle(node, { width: '50%' });
            },
        },
        imageQuarter: {
            content: '25%',
            action(node) {
                $.setStyle(node, { width: '25%' });
            },
        },
        imageOriginal: {
            action(node) {
                $.removeStyle(node, 'width');
            },
        },
        imageRemove: {
            action(node) {
                $.detach(node);

                this.#removePopover();
            },
        },
        link: {
            render(node) {
                const href = $.getAttribute(node, 'href');

                return $.create('a', {
                    text: href,
                    class: this.constructor.classes.linkUrl,
                    attributes: {
                        href,
                        target: '_blank',
                    },
                });
            },
        },
        linkEdit: {
            action(node) {
                this.#showLinkModal(node);
            },
        },
        tableColumnAfter: {
            action(node) {
                this.#updateTable(node, (td, _, table) => {
                    const index = $.index(td);
                    const rows = $.find(':scope > thead > tr, :scope > tbody > tr', table);

                    this.#observe(false);

                    for (const row of rows) {
                        const newTd = $.create('td', {
                            html: '<br>',
                        });
                        const cells = $.children(row, 'th, td');

                        $.after(cells[index], newTd);
                    }

                    this.#observe();
                    this.#updateValue();
                });
            },
        },
        tableColumnBefore: {
            action(node) {
                this.#updateTable(node, (td, _, table) => {
                    const index = $.index(td);
                    const rows = $.find(':scope > thead > tr, :scope > tbody > tr', table);

                    this.#observe(false);

                    for (const row of rows) {
                        const newTd = $.create('td', {
                            html: '<br>',
                        });
                        const cells = $.children(row, 'th, td');

                        $.before(cells[index], newTd);
                    }

                    this.#observe();
                    this.#updateValue();
                });
            },
        },
        tableColumnRemove: {
            action(node) {
                this.#updateTable(node, (td, _, table) => {
                    const index = $.index(td);
                    const rows = $.find(':scope > thead > tr, :scope > tbody > tr', table);

                    this.#observe(false);

                    for (const row of rows) {
                        const cells = $.children(row, 'th, td');

                        $.remove(cells[index]);
                    }

                    this.#observe();
                    this.#updateValue();
                    this.#removePopover();
                });
            },
        },
        tableRemove: {
            action(node) {
                const table = $.closest(node, 'table', this.#editor).shift();

                $.detach(table);

                this.#removePopover();
            },
        },
        tableRowAfter: {
            action(node) {
                this.#updateTable(node, (_, tr) => {
                    const columns = $.children(tr).length;
                    const newTr = $.create('tr');

                    for (let i = 0; i < columns; i++) {
                        const newTd = $.create('td', {
                            html: '<br>',
                        });

                        $.append(newTr, newTd);
                    }

                    $.after(tr, newTr);
                });
            },
        },
        tableRowBefore: {
            action(node) {
                this.#updateTable(node, (_, tr) => {
                    const columns = $.children(tr).length;
                    const newTr = $.create('tr');

                    for (let i = 0; i < columns; i++) {
                        const newTd = $.create('td', {
                            html: '<br>',
                        });

                        $.append(newTr, newTd);
                    }

                    $.before(tr, newTr);
                });
            },
        },
        tableRowRemove: {
            action(node) {
                this.#updateTable(node, (_, tr) => {
                    $.remove(tr);

                    this.#removePopover();
                });
            },
        },
        unlink: {
            action(node) {
                $.select(node);
                this.unlink();

                const range = getRange();

                range.collapse();
            },
        },
    };
    static styles = styles;

    /** @type {Array<{button: HTMLElement, data: EditorPlugin, type?: string}>} */
    #buttons = [];
    /** @type {Array<() => void>} */
    #cleanups = [];
    /** @type {Set<BaseComponent>} */
    #components = new Set();
    /** @type {HTMLElement|null} */
    #container = null;
    /** @type {HTMLElement|null} */
    #currentNode = null;
    /** @type {string} */
    #defaultFont = 'sans-serif';
    #disposing = false;
    /** @type {HTMLElement|null} */
    #dropTarget = null;
    /** @type {HTMLElement|null} */
    #dropText = null;
    /** @type {HTMLElement|null} */
    #editor = null;
    /** @type {HTMLElement|null} */
    #editorBody = null;
    /** @type {HTMLElement|null} */
    #editorContainer = null;
    /** @type {HTMLElement|null} */
    #editorScroll = null;
    /** @type {string[]} */
    #fonts = [];
    /** @type {HTMLElement|null} */
    #fullScreen = null;
    /** @type {EditorHistoryEntry[]} */
    #history = [];
    /** @type {Set<HTMLImageElement>} */
    #images = new Set();
    /** @type {HTMLElement|null} */
    #imgCursor = null;
    /** @type {HTMLElement|null} */
    #imgHighlight = null;
    /** @type {HTMLElement|null} */
    #imgResize = null;
    /** @type {HTMLElement|null} */
    #imgSize = null;
    /** @type {string|null} */
    #labelledBy = null;
    /** @type {Range|null} */
    #lastRange = null;
    /** @type {HTMLElement|null} */
    #lineNumbers = null;
    /** @type {HTMLElement|null} */
    #modal = null;
    #observationDepth = 0;
    /** @type {MutationObserver|null} */
    #observer = null;
    /** @type {Map<string, string|null>} */
    #originalAttributes = new Map();
    /** @type {[number, number, 'forward'|'backward'|'none']|null} */
    #originalSelection = null;
    #originalStyle = false;
    #pendingMutation = false;
    /** @type {HTMLElement|null} */
    #popover = null;
    /** @type {HTMLElement|null} */
    #popoverArrow = null;
    /** @type {HTMLElement|null} */
    #popoverBody = null;
    /** @type {Popper|null} */
    #popper = null;
    /** @type {Set<FileReader>} */
    #readers = new Set();
    /** @type {EditorHistoryEntry[]} */
    #redoHistory = [];
    #releaseDisplay = null;
    /** @type {HTMLElement|null} */
    #resizeBar = null;
    /** @type {HTMLTextAreaElement|null} */
    #source = null;
    /** @type {HTMLElement|null} */
    #sourceContainer = null;
    /** @type {HTMLElement|null} */
    #sourceOuter = null;
    /** @type {HTMLElement|null} */
    #sourceScroll = null;
    /** @type {HTMLElement|null} */
    #toolbar = null;
    /** @type {string[][]|null} */
    #toolbarButtons = null;

    /**
     * Creates an Editor.
     * @param {HTMLTextAreaElement} node The native textarea.
     * @param {EditorOptions} [options] The options to create the Editor with.
     * @throws {TypeError} When the input is not a textarea.
     */
    constructor(node, options) {
        if (!$._isElement(node) || !$.is(node, 'textarea')) {
            throw new TypeError('Editor must be created on a textarea element.');
        }

        super(node, options);

        this.#originalStyle = $.hasAttribute(node, 'style');
        this.#originalAttributes = new Map(['tabindex', 'hidden', 'aria-hidden']
            .map((name) => [name, $.getAttribute(node, name)]));
        this.#originalSelection = [node.selectionStart, node.selectionEnd, node.selectionDirection];

        const active = document.activeElement;
        const originalRange = getRange()?.cloneRange();

        try {
            this.#toolbarButtons = this.options.buttons || this.constructor.buttons;
            this.#fonts = (this.options.fonts || this.constructor.fonts)
                .filter((font) => document.fonts.check(`12px ${font}`));
            this.#defaultFont = this.#fonts.includes(this.options.defaultFont) ?
                this.options.defaultFont : this.#fonts[0] || 'sans-serif';
            this.#render();
            $.setHtml(this.#editor, $.getValue(node));
            this.#refreshDisabled();
            this.#checkEmpty();
            this.#events();
            this.#normalize();
            this.#updateValue();

            if (!this.node) {
                return;
            }

            this.#refreshToolbar();
            this.#eventsShared();

            if (active === node) {
                this.#focusEditor();
            } else {
                if (active instanceof window.HTMLElement && active.isConnected && document.activeElement !== active) {
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
     * Sets the background color.
     * @param {string} value The background color.
     */
    backColor(value) {
        this.#execCommand('backColor', value);
    }

    /**
     * Toggles bold state.
     */
    bold() {
        this.#execCommand('bold');
    }

    /**
     * Disables the Editor.
     */
    disable() {
        $.setAttribute(this.node, { disabled: true });
        this.#refreshDisabled();
        this.#refreshToolbar();
    }

    /** @inheritdoc */
    dispose() {
        if (!this.node || this.#disposing) {
            return;
        }

        this.#disposing = true;

        const node = this.node;
        const active = document.activeElement;
        const restoreFocus = containsNode(this.#container, active) ||
                containsNode(this.#modal, active) || containsNode(this.#fullScreen, active);

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
        release(() => this.#popper?.dispose());

        for (const modal of [this.#modal, this.#fullScreen]) {
            if (modal) {
                release(() => Modal.init(modal).dispose());
                $.remove(modal);
            }
        }

        if (this.#container) {
            $.remove(this.#container);
        }

        this.#releaseDisplay?.();
        this.#releaseDisplay = null;

        if (!this.#originalStyle && !$.getAttribute(node, 'style')) {
            $.removeAttribute(node, 'style');
        }

        for (const [name, value] of this.#originalAttributes) {
            if (value === null) {
                $.removeAttribute(node, name);
            } else {
                $.setAttribute(node, name, value);
            }
        }

        if (restoreFocus && node.isConnected && !node.hidden) {
            node.focus({ preventScroll: true });
            node.setSelectionRange(...this.#originalSelection);
        }

        this.#container = null;
        this.#toolbar = null;
        this.#editorBody = null;
        this.#editorContainer = null;
        this.#editorScroll = null;
        this.#editor = null;
        this.#imgHighlight = null;
        this.#imgCursor = null;
        this.#imgResize = null;
        this.#imgSize = null;
        this.#sourceOuter = null;
        this.#sourceContainer = null;
        this.#sourceScroll = null;
        this.#lineNumbers = null;
        this.#source = null;
        this.#popover = null;
        this.#popoverArrow = null;
        this.#popoverBody = null;
        this.#dropTarget = null;
        this.#dropText = null;
        this.#resizeBar = null;
        this.#currentNode = null;
        this.#lastRange = null;
        this.#history = null;
        this.#redoHistory = null;
        this.#buttons = null;
        this.#modal = null;
        this.#fullScreen = null;
        this.#popper = null;

        if (failure) {
            throw failure;
        }
    }

    /**
     * Enables the Editor.
     */
    enable() {
        $.removeAttribute(this.node, 'disabled');
        this.#refreshDisabled();
        this.#refreshToolbar();
    }

    /**
     * Sets the font family.
     * @param {string} value The font family.
     */
    fontName(value) {
        this.#execCommand('fontName', value);
    }

    /**
     * Sets the font size.
     * @param {number|string} value The font size in pixels.
     */
    fontSize(value) {
        value = Object.keys(this.constructor.fontSizes)
                .find((key) => this.constructor.fontSizes[key] === Number(value));

        this.#execCommand('fontSize', value);
    }

    /**
     * Sets the foreground color.
     * @param {string} value The foreground color.
     */
    foreColor(value) {
        this.#execCommand('foreColor', value);
    }

    /**
     * Format the selected block level element.
     * @param {string} value The tag name.
     */
    formatBlock(value) {
        this.#execCommand('formatBlock', value);
    }

    /**
     * Indent the selection.
     */
    indent() {
        this.#changeIndent(false);
    }

    /**
     * Inserts a horizontal rule.
     */
    insertHorizontalRule() {
        this.#execCommand('insertHorizontalRule');
    }

    /**
     * Inserts a HTML string.
     * @param {string} value The HTML string.
     */
    insertHtml(value) {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly) {
            return;
        }

        this.#execCommand('insertHTML', value);
    }

    /**
     * Inserts an image.
     * @param {string} src The image src.
     */
    insertImage(src) {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly) {
            return;
        }

        const img = $.create('img', { attributes: { src } });
        const newImg = this.insertNode(img);

        if (!newImg) {
            return;
        }

        const image = new window.Image();

        this.#images.add(image);

        const finish = () => {
            this.#images.delete(image);
            image.onload = null;
            image.onerror = null;
        };

        image.onload = () => {
            if (this.node && containsNode(this.#editor, newImg)) {
                const maxWidth = $.width(this.#editor, { boxSize: $.CONTENT_BOX });

                $.setStyle(newImg, { width: `${Math.min(image.width, maxWidth)}px` });
            }

            finish();
        };

        image.onerror = finish;
        image.src = src;
    }

    /**
     * Inserts a link.
     * @param {string} href The link href.
     * @param {string} text The link text.
     * @param {boolean} [newWindow] Whether to open the link in a new window.
     */
    insertLink(href, text, newWindow) {
        const link = $.create('a', {
            text,
            attributes: {
                href,
            },
        });

        if (newWindow) {
            $.setAttribute(link, { target: '_blank' });
        }

        this.insertNode(link);
    }

    /**
     * Inserts a trusted DOM element at the current selection.
     * @param {HTMLElement} node The node to insert.
     * @returns {HTMLElement|null} The inserted element, or null when editing is unavailable.
     */
    insertNode(node) {
        if (!this.node || ($.is(this.node, ':disabled') || this.node.readOnly)) {
            return null;
        }

        this.#focusEditor();

        if (!this.node) {
            return null;
        }

        const range = getRange(this.#editor);

        if (!range) {
            return null;
        }

        this.#addHistory({ html: $.getHtml(this.#editor), selectionData: getSelectionData(this.#editor) });
        this.#observe(false);

        try {
            range.deleteContents();
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            selectRange(range);
            this.#normalize();
            this.#updateValue();
        } finally {
            this.#observe();
        }

        return node;
    }

    /**
     * Creates an ordered list for the selection.
     */
    insertOrderedList() {
        this.#execCommand('insertOrderedList');
    }

    /**
     * Inserts a text string.
     * @param {string} value The text.
     */
    insertText(value) {
        this.#execCommand('insertText', value);
    }

    /**
     * Creates an unordered list for the selection.
     */
    insertUnorderedList() {
        this.#execCommand('insertUnorderedList');
    }

    /**
     * Toggles italic state.
     */
    italic() {
        this.#execCommand('italic');
    }

    /**
     * Center the selection.
     */
    justifyCenter() {
        this.#execCommand('justifyCenter');
    }

    /**
     * Justify the selection.
     */
    justifyFull() {
        this.#execCommand('justifyFull');
    }

    /**
     * Align the selection to the left.
     */
    justifyLeft() {
        this.#execCommand('justifyLeft');
    }

    /**
     * Align the selection to the right.
     */
    justifyRight() {
        this.#execCommand('justifyRight');
    }

    /**
     * Registers cleanup for resources created by an extension or rendering helper.
     * @param {() => void} callback The cleanup callback.
     */
    onDispose(callback) {
        if (this.node) {
            this.#cleanups.push(callback);
        } else {
            callback();
        }
    }

    /**
     * Outdent the selection.
     */
    outdent() {
        this.#changeIndent(true);
    }

    /**
     * Restores the next history snapshot.
     */
    redo() {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly || !this.#redoHistory.length) {
            return;
        }

        const current = this.#redoHistory.pop();

        this.#addHistory(current);
        this.#restoreHistory(current);
    }

    /**
     * Reload a programmatically assigned textarea value and state.
     */
    refresh() {
        if (this.node) {
            this.#loadValue();
        }
    }

    /**
     * Removes all formatting from the selection.
     */
    removeFormat() {
        this.#execCommand('removeFormat');
    }

    /**
     * Toggles strikethrough state.
     */
    strikethrough() {
        this.#execCommand('strikethrough');
    }

    /**
     * Toggles subscript state.
     */
    subscript() {
        this.#execCommand('subscript');
    }

    /**
     * Toggles superscript state.
     */
    superscript() {
        this.#execCommand('superscript');
    }

    /**
     * Toggles underline state.
     */
    underline() {
        this.#execCommand('underline');
    }

    /**
     * Restores the previous history snapshot.
     */
    undo() {
        if (!this.node || $.is(this.node, ':disabled') || this.node.readOnly || this.#history.length <= 1) {
            return;
        }

        const next = this.#history.pop();

        this.#redoHistory.push(next);

        const current = this.#history.at(-1);

        this.#restoreHistory(current);
    }

    /**
     * Removes the selected anchor element.
     */
    unlink() {
        this.#execCommand('unlink');
    }

    /**
     * Adds a content snapshot, coalescing repeated HTML and bounding history safely.
     * @param {EditorHistoryEntry} data The snapshot.
     */
    #addHistory({ html, selectionData = null }) {
        if (this.#history.at(-1)?.html === html) {
            this.#history.at(-1).selectionData = selectionData;

            return;
        }

        this.#history.push({ html, selectionData });

        const requested = Number(this.options.historyLimit);
        const limit = Number.isFinite(requested) ? Math.max(1, Math.trunc(requested)) : 1000;

        if (this.#history.length > limit) {
            this.#history.splice(0, this.#history.length - limit);
        }
    }

    /**
     * Binds a drag whose global listeners and active state are owned by the editor.
     * @param {HTMLElement} handle The drag handle.
     * @param {(event: PointerEvent) => boolean|void} down The start callback; false cancels the drag.
     * @param {(event: PointerEvent) => void} move The move callback.
     * @param {(event?: PointerEvent) => void} up The finish callback; window blur supplies no event.
     */
    #bindDrag(handle, down, move, up) {
        let pointer = null;

        this.onDispose(() => {
            pointer = null;
        });
        this.listen(handle, 'pointerdown.ui.editor', (event) => {
            if (event.button !== 0 || pointer !== null || ($.is(this.node, ':disabled') || this.node.readOnly) || down(event) === false) {
                return;
            }

            event.preventDefault();
            pointer = event.pointerId;
        });
        this.listen(window, 'pointermove.ui.editor', (event) => {
            if (event.pointerId === pointer) {
                event.preventDefault();
                move(event);
            }
        }, { passive: false });
        this.listen(window, 'blur.ui.editor', () => {
            if (pointer !== null) {
                pointer = null;
                up();
            }
        });
        this.listen(window, 'pointerup.ui.editor pointercancel.ui.editor', (event) => {
            if (event.pointerId === pointer) {
                pointer = null;
                up(event);
            }
        });
    }

    /**
     * Changes indentation as a single history operation with selection preservation.
     * @param {boolean} outdent Whether to remove one indentation level.
     */
    #changeIndent(outdent) {
        if (!this.node || ($.is(this.node, ':disabled') || this.node.readOnly)) {
            return;
        }

        this.#focusEditor();

        if (!this.node) {
            return;
        }

        const range = getRange(this.#editor);

        if (!range) {
            return;
        }

        let blocks = getSelectedBlocks(this.#editor, range);

        if (outdent && !blocks.length) {
            return;
        }

        this.#addHistory({ html: $.getHtml(this.#editor), selectionData: getSelectionData(this.#editor) });
        this.#observe(false);

        const markers = saveSelection(this.#editor);

        try {
            if (!blocks.length) {
                const paragraph = $.create('p');
                let first = markers.start;

                while (first.parentNode !== this.#editor) {
                    first = first.parentNode;
                }

                while (first.previousSibling && isPhrasingContent(first.previousSibling)) {
                    first = first.previousSibling;
                }

                const inline = [];

                for (let node = first; node && isPhrasingContent(node); node = node.nextSibling) {
                    inline.push(node);
                }

                if (inline.length) {
                    $.before(inline[0], paragraph);
                    $.append(paragraph, inline);
                    blocks = [paragraph];
                }
            }

            while (blocks.length) {
                const group = [blocks.shift()];

                while (blocks.length && group.at(-1).nextElementSibling === blocks[0]) {
                    group.push(blocks.shift());
                }

                if (outdent) {
                    outdentBlocks(group, this.#editor);
                } else {
                    indentBlocks(group);
                }
            }
        } finally {
            restoreSelection(markers);
            this.#normalize();
            this.#updateValue();
            this.#observe();
        }
    }

    /**
     * Checks whether the editor is empty and populates base markup.
     */
    #checkEmpty() {
        if (this.node && !$.getHtml(this.#editor).trim()) {
            $.setHtml(this.#editor, '<p><br></p>');
        }
    }

    /**
     * Renders a color dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    #colorDropdown(dropdown) {
        const container = $.create('div', {
            class: this.constructor.classes.colorContainerRow,
        });

        const col1 = $.create('div', {
            class: this.constructor.classes.colorContainerColumn,
        });

        const col2 = $.create('div', {
            class: this.constructor.classes.colorContainerColumn,
        });

        const foreLabel = $.create('small', {
            text: this.constructor.lang.dropdowns.colorForeground,
            class: this.constructor.classes.colorLabel,
        });

        const backLabel = $.create('small', {
            text: this.constructor.lang.dropdowns.colorBackground,
            class: this.constructor.classes.colorLabel,
        });

        $.append(col1, foreLabel);
        $.append(col2, backLabel);

        const foreDefaultContainer = $.create('div', {
            class: this.constructor.classes.colorLabelContainer,
        });

        $.append(col1, foreDefaultContainer);

        const backDefaultContainer = $.create('div', {
            class: this.constructor.classes.colorLabelContainer,
        });

        $.append(col2, backDefaultContainer);

        const foreDefault = $.create('button', {
            text: this.constructor.lang.dropdowns.colorDefault,
            class: this.constructor.classes.colorDefaultBtn,
            attributes: {
                type: 'button',
            },
        });

        $.append(foreDefaultContainer, foreDefault);

        this.#setToolbarData(foreDefault, {
            command: 'foreColor',
            value: 'initial',
        });

        const backDefault = $.create('button', {
            text: this.constructor.lang.dropdowns.colorTransparent,
            class: this.constructor.classes.colorDefaultBtn,
            attributes: {
                type: 'button',
            },
        });

        $.append(backDefaultContainer, backDefault);

        this.#setToolbarData(backDefault, {
            command: 'backColor',
            value: 'initial',
        });

        for (const colorRow of this.constructor.colors) {
            const foreRow = $.create('div', {
                class: this.constructor.classes.colorRow,
            });

            $.append(col1, foreRow);

            const backRow = $.create('div', {
                class: this.constructor.classes.colorRow,
            });

            $.append(col2, backRow);

            for (const [colorName, color] of Object.entries(colorRow)) {
                const foreLink = $.create('button', {
                    class: this.constructor.classes.color,
                    style: {
                        backgroundColor: color,
                    },
                    attributes: {
                        'data-ui-title': colorName,
                        'type': 'button',
                        'aria-label': colorName,
                    },
                });

                $.append(foreRow, foreLink);

                this.#ownComponent(Tooltip.init(foreLink, {
                    appendTo: document.body,
                    placement: 'bottom',
                }));

                this.#setToolbarData(foreLink, {
                    command: 'foreColor',
                    value: color,
                });

                const backLink = $.create('button', {
                    class: this.constructor.classes.color,
                    style: {
                        backgroundColor: color,
                    },
                    attributes: {
                        'data-ui-title': colorName,
                        'type': 'button',
                        'aria-label': colorName,
                    },
                });

                $.append(backRow, backLink);

                this.#ownComponent(Tooltip.init(backLink, {
                    appendTo: document.body,
                    placement: 'bottom',
                }));

                this.#setToolbarData(backLink, {
                    command: 'backColor',
                    value: color,
                });
            }
        }

        $.append(container, col1);
        $.append(container, col2);

        $.setStyle(dropdown, { minInlineSize: 'min(350px, calc(100vw - 2rem))' });
        $.append(dropdown, container);
    }

    /**
     * Creates a deferred callback that cannot run after disposal.
     * @param {() => void} callback The callback to defer.
     * @returns {ReturnType<typeof $.debounce>} The guarded callback.
     */
    #debounce(callback) {
        return $.debounce((...args) => {
            if (this.node) {
                callback(...args);
            }
        });
    }

    /**
     * Attaches events for the Editor.
     */
    #events() {
        this.#eventsForm();
        this.#eventsToolbar();
        this.#eventsEditor();
        this.#eventsPopover();
        this.#eventsSource();
        this.#eventsDrop();

        // Escape followed by Tab leaves either editing surface without indenting.
        let tabNavigation = false;

        this.listen(this.#container, 'keydown.ui.editor', (event) => {
            if (![this.#editor, this.#source].includes(event.target)) {
                tabNavigation = false;

                return;
            }

            if (event.code === 'Escape' && !this.#currentNode && !this.#fullScreen) {
                tabNavigation = true;
            } else if (event.code === 'Tab' && tabNavigation) {
                tabNavigation = false;
                event.stopPropagation();
            } else if (!['ShiftLeft', 'ShiftRight'].includes(event.code)) {
                tabNavigation = false;
            }
        }, { capture: true });
        this.listen(this.#container, 'focusout.ui.editor', () => {
            tabNavigation = false;
        });
        this.listen(this.#container, 'keydown.ui.editor', (event) => {
            if (event.code === 'Escape' && this.#currentNode && !this.#modal) {
                event.preventDefault();
                this.#removePopover();
                this.#focusEditor();
            }
        });

        if (this.options.resizable) {
            this.#eventsResize();
        }
    }

    /**
     * Attaches drop events.
     */
    #eventsDrop() {
        this.listen(this.#editor, 'dragstart.ui.editor', (event) => {
            event.preventDefault();
        }, { delegate: 'img' });

        this.listen(this.#dropTarget, 'dragenter.ui.editor', () => {
            $.addClass(this.#dropText, this.constructor.classes.dropHover);
            $.setText(this.#dropText, this.constructor.lang.drop.drop);
            $.show(this.#dropTarget);
        });

        this.listen(this.#dropTarget, 'dragleave.ui.editor', () => {
            this.#resetDropText();
        });

        this.listen(this.#dropTarget, 'dragover.ui.editor', (event) => {
            event.preventDefault();
        });

        this.listen(this.#dropTarget, 'drop.ui.editor', (event) => {
            event.preventDefault();

            resetDragCount();

            this.#resetDropText();
            $.hide(this.#dropTarget);

            if (event.dataTransfer.files.length) {
                this.options.imageUpload.call(this, event.dataTransfer.files);
            } else {
                const text = event.dataTransfer.getData('text');

                this.insertText(text);
            }
        });
    }

    /**
     * Attaches editor events.
     */
    #eventsEditor() {
        this.listen(this.#editor, 'paste.ui.editor', (event) => {
            event.preventDefault();

            if (event.clipboardData) {
                const html = event.clipboardData.getData('text/html');

                if (html) {
                    this.insertHtml(html);
                } else {
                    this.insertText(event.clipboardData.getData('text/plain'));
                }
            }
        });

        this.listen(this.#editor, 'focus.ui.editor', () => {
            document.execCommand('defaultParagraphSeparator', false, 'p');
            $.triggerEvent(this.node, 'focus.ui.editor');
        });

        this.listen(this.#editor, 'blur.ui.editor', () => {
            $.triggerEvent(this.node, 'blur.ui.editor');
        });

        this.listen(this.#editor, 'beforeinput.ui.editor', (event) => {
            if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
                if (event.cancelable) {
                    event.preventDefault();
                    this[event.inputType === 'historyUndo' ? 'undo' : 'redo']();
                }
            } else if (this.#history.length) {
                this.#history.at(-1).selectionData = getSelectionData(this.#editor);
            }
        });

        this.listen(this.#editor, 'input.ui.editor', (event) => {
            switch (event.inputType) {
                case 'historyUndo':
                    if (!$.isSame(document.activeElement, this.#editor)) {
                        return;
                    }

                    this.undo();

                    return;
                case 'historyRedo':
                    if (!$.isSame(document.activeElement, this.#editor)) {
                        return;
                    }

                    this.redo();

                    return;
            }

            if (event.inputType !== 'insertText') {
                this.#normalize();
            }

            this.#checkEmpty();
            this.#updateValue();
        });

        this.listen(this.#editor, 'keydown.ui.editor', (event) => {
            if (this.options.keyDown) {
                this.options.keyDown.call(this, event);
            }

            if (event.defaultPrevented || !this.node) {
                return;
            }

            const selection = window.getSelection();

            const isIndented = (node) => {
                return [node, ...$.parents(node, null, this.#editor)].some((ancestor) => $.is(ancestor, 'li') ||
                    parseFloat($.getStyle(ancestor, 'marginInlineStart') || $.getStyle(ancestor, 'marginLeft')) > 0);
            };

            switch (event.code) {
                case 'Backspace':
                    if (
                        selection.isCollapsed &&
                        $.isSame(selection.anchorNode, selection.focusNode) &&
                        (
                            (
                                $._isElement(selection.anchorNode) &&
                                $.getText(selection.anchorNode) === '' &&
                                isIndented(selection.anchorNode)
                            ) ||
                            (
                                $._isText(selection.anchorNode) &&
                                selection.anchorOffset === 0 &&
                                isIndented($.parent(selection.anchorNode))
                            )
                        )
                    ) {
                        event.preventDefault();

                        this.outdent();
                    } else if ($.contents(this.#editor).length <= 1 && $.getText(this.#editor) === '') {
                        event.preventDefault();
                    }

                    break;
                case 'Delete':
                    if (
                        selection.isCollapsed &&
                        $.isSame(selection.anchorNode, selection.focusNode) &&
                        $.getText(selection.anchorNode) === ''
                    ) {
                        const nodes = [selection.anchorNode, ...$.parents(selection.anchorNode, null, this.#editor)];

                        if (nodes.every((node) => $.contents(node).length <= 1)) {
                            const lastParent = nodes.pop();
                            const nextParent = $.next(lastParent).shift();

                            let formatElement = 'p';

                            if (nextParent && $.is(nextParent, 'h1, h2, h3, h4, h5, h6, pre')) {
                                formatElement = $.tagName(nextParent);
                            }

                            this.#observe(false);
                            this.#execCommand('formatBlock', formatElement);
                            this.#observe();
                        }
                    }

                    break;
                case 'Tab':
                    if (!event.ctrlKey && !event.metaKey && !event.altKey && !this.node.readOnly && !$.is(this.node, ':disabled')) {
                        event.preventDefault();

                        if (event.shiftKey) {
                            this.outdent();
                        } else {
                            this.indent();
                        }
                    }

                    break;
            }
        });

        this.listen(this.#editorContainer, 'click.ui.editor', () => {
            $.focus(this.#editor);
        });

        this.listen(this.#editor, 'click.ui.editor', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if ($.is(this.node, ':disabled') || this.node.readOnly) {
                return;
            }

            if ($.is(event.currentTarget, 'img')) {
                selectNode(event.currentTarget);
            }

            this.#refreshPopover(event.currentTarget, event);
            this.#refreshToolbar();
        }, { delegate: 'a, td, th, img', capture: true });

        this.#watchContent();
    }

    /**
     * Attaches native form, label, validation, and state synchronization.
     */
    #eventsForm() {
        const focus = () => {
            if (this.node && !$.is(this.node, ':disabled')) {
                $.focus($.isVisible(this.#sourceContainer) ? this.#source : this.#editor);
            }
        };

        const labels = [...this.node.labels];
        const generated = [];

        for (const label of labels) {
            if (!label.id) {
                label.id = generateId('editor-label');
                generated.push([label, label.id]);
            }

            this.listen(label, 'click.ui.editor', (event) => {
                if (event.target === label || !$.closest(event.target, 'a, button, input, select, textarea')[0]) {
                    event.preventDefault();
                    focus();
                }
            });
        }

        this.#labelledBy = labels.map((label) => label.id).join(' ');
        this.#refreshDisabled();
        this.listen(this.node, 'focus.ui.editor', (event) => {
            if (event.target === document.activeElement) {
                focus();
            }
        });
        this.listen(this.node, 'invalid.ui.editor', (event) => {
            event.preventDefault();
            $.setAttribute(this.#editor, 'aria-invalid', 'true');
            $.setAttribute(this.#source, 'aria-invalid', 'true');
            focus();
        });
        this.listen(this.node, 'input.ui.editor change.ui.editor', (event) => {
            if (!event.skipUpdate) {
                this.#loadValue();
            }
        });

        const timers = new Set();

        this.listen(this.node.ownerDocument, 'reset.ui.editor', (event) => {
            if (event.target !== this.node.form) {
                return;
            }

            const timer = window.setTimeout(() => {
                timers.delete(timer);

                if (this.node && !event.defaultPrevented) {
                    this.#removePopover();
                    this.#loadValue(true);
                }
            }, 0);

            timers.add(timer);
        });

        const observer = new window.MutationObserver(() => {
            if (this.node) {
                this.#refreshDisabled();
                this.#refreshToolbar();
            }
        });

        observer.observe(this.node, { attributes: true });

        for (const fieldset of $.parents(this.node, 'fieldset')) {
            observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
        }

        this.onDispose(() => {
            observer.disconnect();

            for (const timer of timers) {
                window.clearTimeout(timer);
            }

            for (const [label, id] of generated) {
                if (label.id === id) {
                    $.removeAttribute(label, 'id');
                }
            }
        });
    }

    /**
     * Attaches popover events.
     */
    #eventsPopover() {
        this.listen(this.#popover, 'click.ui.editor', (event) => {
            if ($.is(this.node, ':disabled') || this.node.readOnly) {
                return;
            }

            const action = $.getDataset(event.currentTarget, 'uiAction');

            if (!(action in this.constructor.popovers)) {
                throw new Error(`Unknown action ${action}`);
            }

            event.preventDefault();
            event.stopPropagation();

            this.constructor.popovers[action].action.call(this, this.#currentNode);
            this.#refreshPopover(this.#currentNode);
        }, { delegate: '[data-ui-action]' });

        const downEvent = (event) => {
            if (!this.#currentNode || !$.is(this.#currentNode, 'img')) {
                return false;
            }

            event.stopPropagation();

            $.hide(this.#imgCursor);
            $.hide(this.#popover);

            this.#observe(false);
        };

        const moveEvent = (event) => {
            const imgRect = $.rect(this.#currentNode, { offset: true });
            const ratio = imgRect.width / imgRect.height;
            const width = Math.max(
                event.pageX - imgRect.x,
                (event.pageY - imgRect.y) * ratio,
                1,
            );

            $.setStyle(this.#currentNode, { width: `${Math.round(width)}px` });
            this.#highlightImage(this.#currentNode);
        };

        const upEvent = () => {
            if (this.#currentNode?.isConnected && containsNode(this.#editor, this.#currentNode)) {
                const range = selectNode(this.#currentNode);

                range.collapse(false);
            }

            this.#updateValue();
            this.#observe();
        };

        this.#bindDrag(this.#imgResize, downEvent, moveEvent, upEvent);
        this.listen(this.#imgResize, 'keydown.ui.editor', (event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.code) || !this.#currentNode || $.is(this.node, ':disabled') || this.node.readOnly) {
                return;
            }

            event.preventDefault();

            const width = Math.max(1, $.rect(this.#currentNode).width + (event.code === 'ArrowRight' ? 10 : -10));

            $.setStyle(this.#currentNode, 'width', `${width}px`);
            this.#highlightImage(this.#currentNode);
            this.#updateValue();
        });

        this.listen(this.#editorBody, 'scroll.ui.editor', () => {
            this.#removePopover();
        });
    }

    /**
     * Attaches resize events.
     */
    #eventsResize() {
        let resizeOffset = 0;

        const downEvent = (event) => {
            const barPosition = $.position(this.#resizeBar, { offset: true });

            resizeOffset = event.pageY - barPosition.y;

            this.#removePopover();
        };

        const moveEvent = (event) => {
            const editorPosition = $.position(this.#editorBody, { offset: true });

            const height = Math.max(0, event.pageY - editorPosition.y - resizeOffset);

            $.setStyle(this.#editorBody, { height: `${height}px` });
            $.setAttribute(this.#resizeBar, 'aria-valuenow', String(Math.round(height)));
        };

        const upEvent = () => {
            resizeOffset = 0;
        };

        this.#bindDrag(this.#resizeBar, downEvent, moveEvent, upEvent);
        this.listen(this.#resizeBar, 'keydown.ui.editor', (event) => {
            if (!['ArrowUp', 'ArrowDown'].includes(event.code) || $.is(this.node, ':disabled') || this.node.readOnly) {
                return;
            }

            event.preventDefault();

            const height = Math.max(40, $.rect(this.#editorBody).height + (event.code === 'ArrowDown' ? 10 : -10));

            $.setStyle(this.#editorBody, 'height', `${height}px`);
            $.setAttribute(this.#resizeBar, 'aria-valuenow', String(Math.round(height)));
        });
    }

    /**
     * Registers this instance's callbacks for the shared document listeners.
     */
    #eventsShared() {
        addEditor(this, {
            showDropTarget: () => this.#showDropTarget(),
            resetDropTarget: () => {
                this.#resetDropText();
                $.hide(this.#dropTarget);
            },
            removePopover: () => this.#removePopover(),
            selectionChange: (range) => {
                if (!range || !containsNode(this.#editor, range.startContainer) || !containsNode(this.#editor, range.endContainer)) {
                    this.#removePopover();

                    return;
                }

                this.#lastRange = range.cloneRange();
                this.#refreshCursor();
                this.#refreshToolbar();
            },
            resize: () => {
                if ($.is(this.#currentNode, 'img')) {
                    this.#highlightImage(this.#currentNode);
                }

                this.#refreshLineNumbers();
            },
        });
    }

    /**
     * Attaches source events.
     */
    #eventsSource() {
        this.listen(this.#source, 'focus.ui.editor', () => $.triggerEvent(this.node, 'focus.ui.editor'));
        this.listen(this.#source, 'blur.ui.editor', () => $.triggerEvent(this.node, 'blur.ui.editor'));

        const refreshLineNumbersDebounced = this.#debounce(() => {
            this.#refreshLineNumbers();
        });

        this.listen(this.#source, 'input.ui.editor change.ui.editor', () => {
            if ($.is(this.node, ':disabled') || this.node.readOnly) {
                return;
            }

            refreshLineNumbersDebounced();

            const html = $.getValue(this.#source);

            if ($.getValue(this.node) !== html) {
                $.setValue(this.node, html);

                if (this.node.validity.valid && !$.hasAttribute(this.node, 'aria-invalid')) {
                    $.removeAttribute(this.#source, 'aria-invalid');
                    $.removeAttribute(this.#editor, 'aria-invalid');
                }

                $.triggerEvent(this.node, 'change.ui.editor', { data: { skipUpdate: true } });
            }
        });

        this.listen(this.#source, 'keydown.ui.editor', (event) => {
            if (event.code !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey || this.node.readOnly || $.is(this.node, ':disabled')) {
                return;
            }

            event.preventDefault();

            const start = $.getProperty(this.#source, 'selectionStart');
            const end = $.getProperty(this.#source, 'selectionEnd');
            const value = $.getValue(this.#source);
            const lines = value.split('\n');

            const startLine = value.substring(0, start).split('\n').length - 1;
            const endLine = value.substring(0, end).split('\n').length - 1;

            const lineStarts = [];
            let offset = 0;

            for (const line of lines) {
                lineStarts.push(offset);
                offset += line.length + 1;
            }

            const lastLine = end > start && end === lineStarts[endLine] ? endLine - 1 : endLine;
            const tab = '\t';

            let newStart = start;
            let newEnd = end;
            let newValue;

            if (event.shiftKey) {
                for (const [i, line] of lines.entries()) {
                    if (i >= startLine && i <= lastLine && line.startsWith(tab)) {
                        lines[i] = line.substring(1);

                        if (lineStarts[i] < start) {
                            newStart--;
                        }

                        if (lineStarts[i] < end) {
                            newEnd--;
                        }
                    }
                }

                newValue = lines.join('\n');
            } else if (startLine !== endLine) {
                for (const [i, line] of lines.entries()) {
                    if (i >= startLine && i <= lastLine) {
                        lines[i] = tab + line;

                        if (lineStarts[i] < start) {
                            newStart++;
                        }

                        newEnd++;
                    }
                }

                newValue = lines.join('\n');
            } else {
                newValue = value.substring(0, start) + '\t' + value.substring(end);

                newStart++;

                if (start === end) {
                    newEnd++;
                } else {
                    newEnd = newStart;
                }
            }

            $.select(this.#source);
            document.execCommand('insertText', false, newValue);
            this.#source.setSelectionRange(newStart, newEnd);
        });

        this.listen(this.#source, 'scroll.ui.editor', this.#debounce(() => {
            const scrollY = $.getScrollY(this.#source);

            $.setStyle(this.#lineNumbers, { marginTop: `${-scrollY}px` });
        }));
    }

    /**
     * Attaches toolbar events.
     */
    #eventsToolbar() {
        this.listen(this.#toolbar, 'click.ui.editor', (event) => {
            const action = $.getDataset(event.currentTarget, 'uiAction');

            if (!(action in this.constructor.plugins)) {
                throw new Error(`Unknown action ${action}`);
            }

            event.preventDefault();
            event.stopPropagation();

            if ($.is(this.node, ':disabled') || (this.node.readOnly && !['source', 'fullScreen'].includes(action)) || $.is(event.currentTarget, '[aria-disabled="true"]')) {
                return;
            }

            if (this.#lastRange && containsNode(this.#editor, this.#lastRange.startContainer) && containsNode(this.#editor, this.#lastRange.endContainer)) {
                const selection = window.getSelection();

                selection.removeAllRanges();
                selection.addRange(this.#lastRange);
            }

            this.constructor.plugins[action].action.call(this);
        }, { delegate: '[data-ui-action]' });

        this.listen(this.#toolbar, 'click.ui.editor', (event) => {
            if ($.is(this.node, ':disabled') || this.node.readOnly || $.is(event.currentTarget, '[aria-disabled="true"]')) {
                return;
            }

            const command = $.getDataset(event.currentTarget, 'uiCommand');

            if (!(command in this)) {
                throw new Error(`Unknown command ${command}`);
            }

            event.preventDefault();

            if (this.#lastRange) {
                const selection = window.getSelection();

                selection.removeAllRanges();
                selection.addRange(this.#lastRange);
            }

            const value = $.getDataset(event.currentTarget, 'uiValue');

            this[command](value);

            this.#refreshToolbar();
        }, { delegate: '[data-ui-command]' });
    }

    /**
     * Executes a command.
     * @param {string} command The command.
     * @param {boolean | string} [value] The command argument.
     */
    #execCommand(command, value) {
        if (!this.node || ($.is(this.node, ':disabled') || this.node.readOnly)) {
            return;
        }

        this.#focusEditor();

        if (!this.node) {
            return;
        }

        this.#addHistory({ html: $.getHtml(this.#editor), selectionData: getSelectionData(this.#editor) });
        this.#observe(false);

        try {
            document.execCommand('styleWithCSS', false, !['bold', 'indent', 'italic', 'outdent', 'strikethrough', 'subscript', 'superscript', 'underline'].includes(command));
            document.execCommand(command, false, value);
            this.#normalize();
            this.#checkEmpty();
            this.#updateValue();
        } finally {
            this.#observe();
        }
    }

    /**
     * Ensures the editor element has focus.
     */
    #focusEditor() {
        if (!this.node || $.is(this.node, ':disabled')) {
            return;
        }

        if (document.activeElement === this.#editor && getRange(this.#editor)) {
            return;
        }

        const current = getRange(this.#editor)?.cloneRange();
        const selection = window.getSelection();
        const backward = current && !current.collapsed && selection.anchorNode === current.endContainer && selection.anchorOffset === current.endOffset;
        const saved = this.#lastRange;

        $.focus(this.#editor);

        if (!this.node) {
            return;
        }

        if (current) {
            selectRange(current, backward);
        } else if (saved && containsNode(this.#editor, saved.startContainer) && containsNode(this.#editor, saved.endContainer)) {
            selectRange(saved);
        } else {
            const range = $.createRange();
            let target = this.#editor;
            const opaque = (node) => $.is(node, 'br, img, hr, iframe, input, video, audio, svg');

            while (target.lastChild && !opaque(target)) {
                target = target.lastChild;
            }

            if (opaque(target)) {
                if ($.is(target, 'br')) {
                    range.setStartBefore(target);
                } else {
                    range.setStartAfter(target);
                }
            } else {
                range.selectNodeContents(target);
            }

            range.collapse(false);
            selectRange(range);
        }
    }

    /**
     * Renders a font dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    #fontDropdown(dropdown) {
        const fonts = this.#fonts.sort();

        for (const font of fonts) {
            const button = $.create('button', {
                text: font,
                class: this.constructor.classes.dropdownItem,
                style: {
                    fontFamily: font,
                },
                attributes: {
                    'type': 'button',
                    'aria-label': font,
                },
            });

            const data = {
                command: 'fontName',
                value: font,
            };

            this.#buttons.push({ button, data });

            this.#setToolbarData(button, data);

            $.append(dropdown, button);
        }
    }

    /**
     * Renders a font size dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    #fontSizeDropdown(dropdown) {
        const sizes = Object.values(this.constructor.fontSizes);

        for (const size of sizes) {
            const button = $.create('button', {
                text: size,
                class: this.constructor.classes.dropdownItem,
                attributes: {
                    'type': 'button',
                    'aria-label': size,
                },
            });

            const data = {
                command: 'fontSize',
                value: size,
            };

            this.#buttons.push({ button, data });

            this.#setToolbarData(button, data);

            $.append(dropdown, button);
        }
    }

    /**
     * Highlights an image.
     * @param {HTMLElement} image The image element.
     */
    #highlightImage(image) {
        $.hide(this.#imgHighlight);
        $.hide(this.#imgCursor);

        const imgRect = $.rect(image, { offset: true });
        const editorPos = $.position(this.#editor, { offset: true });
        const scrollX = $.getScrollX(this.#editorScroll);
        const scrollY = $.getScrollY(this.#editorScroll);
        const imgX = Math.round(imgRect.x);
        const imgY = Math.round(imgRect.y);
        const imgWidth = Math.round(imgRect.width);
        const imgHeight = Math.round(imgRect.height);

        $.setStyle(this.#imgHighlight, {
            top: `${imgY - editorPos.y + scrollY - 2}px`,
            left: `${imgX - editorPos.x + scrollX - 2}px`,
            width: `${imgWidth + 2}px`,
            height: `${imgHeight + 2}px`,
        });

        $.setAttribute(this.#imgResize, 'aria-valuenow', String(imgWidth));
        $.setText(this.#imgSize, `${imgWidth}x${imgHeight}`);

        if (imgWidth < 100 || imgHeight < 50) {
            $.hide(this.#imgSize);
        } else {
            $.show(this.#imgSize);
        }

        $.show(this.#imgHighlight);
        $.show(this.#imgCursor);
    }

    /**
     * Loads an external value and starts a fresh history after native reset.
     * @param {boolean} [reset=false] Whether to clear history.
     */
    #loadValue(reset = false) {
        this.#observe(false);

        try {
            $.setHtml(this.#editor, $.getValue(this.node));
            this.#normalize();
            this.#checkEmpty();
            $.setValue(this.node, $.getHtml(this.#editor));
            $.setValue(this.#source, $.getValue(this.node));
            this.#lastRange = null;

            if (reset) {
                this.#history = [];
                this.#redoHistory = [];
            }

            if (this.#history.at(-1)?.html !== $.getHtml(this.#editor)) {
                this.#redoHistory = [];
            }

            this.#addHistory({ html: $.getHtml(this.#editor) });
            this.#refreshDisabled();
            this.#refreshToolbar();
            this.#refreshLineNumbers();
        } finally {
            this.#observe();
        }
    }

    /**
     * Normalizes the editor.
     */
    #normalize() {
        if (!this.node) {
            return;
        }

        const active = document.activeElement;

        this.#observe(false);
        normalizeText(this.#editor);

        const markers = saveSelection(this.#editor);

        try {
            normalizeStyles(this.#editor);
            normalizeSpans(this.#editor);
            normalizePhrasing(this.#editor);
            joinAdjacentNodes(this.#editor, markers);
        } finally {
            restoreSelection(markers);
            normalizeText(this.#editor);
            this.#observe();

            if (active instanceof window.HTMLElement && active !== document.body && active.isConnected && !containsNode(this.#editor, active) && document.activeElement !== active) {
                active.focus({ preventScroll: true });
            }
        }
    }

    /**
     * Suspends or resumes content observation with balanced nested calls.
     * @param {boolean} [observe=true] Whether to resume observation.
     */
    #observe(observe = true) {
        if (!this.node || !this.#observer) {
            return;
        }

        if (!observe) {
            if (this.#observationDepth++ === 0) {
                this.#pendingMutation ||= this.#observer.takeRecords().some((record) => record.type !== 'attributes' || record.target !== this.#editor);
                this.#observer.disconnect();
            }

            return;
        }

        this.#observationDepth = Math.max(0, this.#observationDepth - 1);

        if (this.#observationDepth === 0) {
            this.#observer.observe(this.#editor, { attributes: true, childList: true, characterData: true, subtree: true });

            if (this.#pendingMutation) {
                this.#pendingMutation = false;
                this.#debounce(() => {
                    if ($.isVisible(this.#sourceContainer)) {
                        return;
                    }

                    this.#normalize();
                    this.#checkEmpty();
                    this.#updateValue();
                })();
            }
        }
    }

    /**
     * Owns a child UI component until disposal.
     * @template {BaseComponent} T
     * @param {T} component The child component.
     * @returns {T} The child component.
     */
    #ownComponent(component) {
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
    #readImage(file) {
        return new Promise((resolve, reject) => {
            if (!this.node) {
                reject(new Error('Editor is disposed.'));

                return;
            }

            const reader = new window.FileReader();

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
     * Refreshes the popover at the cursor.
     */
    #refreshCursor() {
        const selection = window.getSelection();
        const baseNode = selection.anchorNode;

        if (!$.hasDescendent(this.#editor, baseNode)) {
            this.#removePopover();

            return;
        }

        const range = getRange(this.#editor);

        if (this.#currentNode && range && (!range.collapsed && range.intersectsNode(this.#currentNode) || containsNode(this.#currentNode, baseNode))) {
            return;
        }

        const currentNode = $.is(baseNode, 'a') ?
            baseNode :
            $.closest(baseNode, 'a', this.#editor).shift();

        if (!currentNode) {
            this.#removePopover();

            return;
        }

        this.#refreshPopover(currentNode);
    }

    /**
     * Synchronizes disabled, readonly, and accessible state.
     */
    #refreshDisabled() {
        const disabled = $.is(this.node, ':disabled');
        const readOnly = this.node.readOnly;

        if (disabled) {
            $.addClass(this.#editor, this.constructor.classes.editorDisabled);
        } else {
            $.removeClass(this.#editor, this.constructor.classes.editorDisabled);
        }

        $.setAttribute(this.#editor, 'contenteditable', String(!disabled && !readOnly));
        $.setAttribute(this.#editor, 'tabindex', disabled ? '-1' : ($.getAttribute(this.node, 'tabindex') || '0'));
        this.#source.disabled = disabled;
        this.#source.readOnly = readOnly;

        for (const handle of [this.#imgResize, this.#resizeBar].filter(Boolean)) {
            $.setAttribute(handle, 'tabindex', disabled || readOnly ? '-1' : '0');
            $.setAttribute(handle, 'aria-disabled', String(disabled || readOnly));
        }

        for (const surface of [this.#editor, this.#source]) {
            $.setAttribute(surface, 'aria-disabled', String(disabled));
            $.setAttribute(surface, 'aria-readonly', String(readOnly));
            $.setAttribute(surface, 'aria-required', String(this.node.required));

            for (const name of ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-errormessage', 'aria-invalid', 'dir', 'lang']) {
                const value = $.getAttribute(this.node, name) || (name === 'aria-labelledby' && !$.hasAttribute(this.node, 'aria-label') ? this.#labelledBy : null);

                if (value) {
                    $.setAttribute(surface, name, value);
                } else {
                    $.removeAttribute(surface, name);
                }
            }
        }

        $[$.hasClass(this.node, 'form-error') ? 'addClass' : 'removeClass'](this.#container, 'form-error');

        if (disabled || readOnly) {
            this.#removePopover();

            for (const toggle of $.find('[data-ui-toggle="dropdown"]', this.#toolbar)) {
                Dropdown.init(toggle).hide();
            }
        }
    }

    /**
     * Refreshes the source line numbers.
     */
    #refreshLineNumbers() {
        if (!this.node) {
            return;
        }

        if (!$.isVisible(this.#sourceContainer)) {
            return;
        }

        const lineNumbers = $.contents(this.#lineNumbers);

        const html = $.getValue(this.#source);
        const lines = html.split('\n');

        const test = $.create('div', {
            style: {
                width: $.width(this.#source, { boxSize: $.CONTENT_BOX }),
                padding: 0,
                border: 0,
                font: $.css(this.#source, 'font'),
                letterSpacing: $.css(this.#source, 'letterSpacing'),
                whiteSpace: $.css(this.#source, 'whiteSpace'),
                wordBreak: $.css(this.#source, 'wordBreak'),
                wordSpacing: $.css(this.#source, 'wordSpacing'),
                wordWrap: $.css(this.#source, 'wordWrap'),
            },
        });

        $.append(document.body, test);

        for (const [i, line] of lines.entries()) {
            let lineNumber;

            if (i < lineNumbers.length) {
                lineNumber = lineNumbers[i];
            } else {
                lineNumber = $.create('div', {
                    text: i + 1,
                });
                $.append(this.#lineNumbers, lineNumber);
            }

            $.setText(test, line || ' ');

            const { height } = $.rect(test);

            $.setStyle(lineNumber, {
                height: `${height}px`,
            });
        }

        $.detach(test);

        if (lineNumbers.length > lines.length) {
            $.detach(lineNumbers.slice(lines.length));
        }
    }

    /**
     * Refreshes the popover.
     * @param {HTMLElement} currentNode The current selected node.
     * @param {Event} [event] The current event.
     */
    #refreshPopover(currentNode, event) {
        if (!this.node) {
            return;
        }

        if ($.isSame(currentNode, this.#currentNode)) {
            if ($.is(currentNode, 'img')) {
                this.#highlightImage(currentNode);
            }

            this.#popper?.update();
            return;
        }

        this.#removePopover();

        this.#currentNode = currentNode;

        if (!this.#currentNode) {
            return;
        }

        const tagName = $.tagName(this.#currentNode);

        let reference = this.#currentNode;

        if (event && tagName === 'img') {
            const editorPos = $.position(this.#editor, { offset: true });
            const scrollX = $.getScrollX(this.#editorScroll);
            const scrollY = $.getScrollY(this.#editorScroll);

            $.setStyle(this.#imgCursor, {
                top: `${event.pageY - editorPos.y + scrollY}px`,
                left: `${event.pageX - editorPos.x + scrollX}px`,
            });
            reference = this.#imgCursor;
        }

        const originalPlacement = $.getAttribute(reference, 'data-ui-placement');

        this.#popper = new Popper(
            this.#popover,
            {
                reference,
                arrow: this.#popoverArrow,
                container: this.#editor,
                placement: 'bottom',
                position: 'start',
                minContact: 0,
                afterUpdate: (_, anchor) => {
                    // Positioning metadata belongs to the UI, not the submitted content.
                    if (containsNode(this.#editor, anchor)) {
                        if (originalPlacement === null) {
                            $.removeAttribute(anchor, 'data-ui-placement');
                        } else {
                            $.setAttribute(anchor, 'data-ui-placement', originalPlacement);
                        }
                    }
                },
            },
        );

        $.addClass(this.#popover, this.constructor.classes.popoverShow);
        $.show(this.#popover);

        switch (tagName) {
            case 'a':
                this.#renderPopoverItems(this.options.popovers.link);
                break;
            case 'img':
                this.#renderPopoverItems(this.options.popovers.image);
                this.#highlightImage(this.#currentNode);
                $.show(this.#imgHighlight);
                break;
            case 'td':
            case 'th':
                this.#renderPopoverItems(this.options.popovers.table);
                break;
        }

        this.#popper.update();
    }

    /**
     * Refreshes the toolbar.
     */
    #refreshToolbar() {
        if (!this.node) {
            return;
        }

        const isDisabled = $.is(this.node, ':disabled');
        const isSource = $.isVisible(this.#sourceContainer);

        for (const { button, data, type } of this.#buttons) {
            if ('setContent' in data) {
                const content = data.setContent.call(this);

                $.setHtml(button, content);
            }

            let enabled = false;

            if ('command' in data) {
                enabled = 'value' in data ?
                    document.queryCommandValue(data.command) === data.value :
                    document.queryCommandState(data.command);
            }

            if (enabled) {
                $.addClass(button, 'active');
                $.setAttribute(button, { 'aria-pressed': true });
            } else {
                $.removeClass(button, 'active');
                $.removeAttribute(button, 'aria-pressed');
            }

            if (
                isDisabled ||
                (this.node.readOnly && !['source', 'fullScreen'].includes(type)) ||
                (isSource && !['source', 'fullScreen'].includes(type)) ||
                ('disableCheck' in data && data.disableCheck.call(this))
            ) {
                $.addClass(button, 'disabled');
                $.setAttribute(button, { 'aria-disabled': true, 'disabled': true });
            } else {
                $.removeClass(button, 'disabled');
                $.removeAttribute(button, 'aria-disabled');
                $.removeAttribute(button, 'disabled');
            }
        }
    }

    /**
     * Removes the modal.
     */
    #removeModal() {
        if (!this.#modal) {
            return;
        }

        Modal.init(this.#modal).dispose();
        $.remove(this.#modal);
        this.#modal = null;
    }

    /**
     * Removes the popover.
     */
    #removePopover() {
        if (!this.#currentNode) {
            return;
        }

        $.hide(this.#imgHighlight);
        $.hide(this.#imgCursor);
        $.removeClass(this.#popover, this.constructor.classes.popoverShow);
        $.hide(this.#popover);
        $.empty(this.#popoverBody);

        this.#popper.dispose();
        this.#popper = null;
        this.#currentNode = null;
    }

    /**
     * Renders the editor.
     */
    #render() {
        this.#container = $.create('div', {
            class: this.constructor.classes.container,
        });

        this.#renderToolbar();

        this.#editorBody = $.create('div', {
            class: this.constructor.classes.editorBody,
            style: {
                height: this.options.height,
            },
        });

        $.append(this.#container, this.#editorBody);

        this.#renderEditor();
        this.#renderSource();
        this.#renderPopover();
        this.#renderDrop();

        if (this.options.resizable) {
            this.#renderResize();
        }

        // hide the input node
        this.#releaseDisplay = $.setStyleLock(this.node, 'display', 'none', { important: true });
        $.setAttribute(this.node, { 'aria-hidden': true });

        $.insertBefore(this.#container, this.node);

        if (this.#resizeBar) {
            $.setAttribute(this.#resizeBar, 'aria-valuenow', String(Math.round($.rect(this.#editorBody).height)));
        }
    }

    /**
     * Renders a button.
     * @param {EditorPlugin|EditorPopover} data The button configuration.
     * @returns {HTMLButtonElement} The button.
     */
    #renderButton(data) {
        const button = $.create('button', {
            class: this.constructor.classes.btn,
            attributes: { type: 'button' },
        });

        if (data.setTitle) {
            data.title = data.setTitle.call(this);
        }

        if (data.title) {
            $.setAttribute(button, {
                'title': data.title,
                'aria-label': data.title,
            });

            const tooltip = this.#ownComponent(Tooltip.init(button, {
                appendTo: document.body,
                placement: 'bottom',
            }));

            this.listen(button, 'click.ui.editor', () => tooltip.hide());
        }

        if ('content' in data) {
            $.setHtml(button, data.content);
        } else {
            const content = $.parseHtml(this.constructor.icons[data.icon]);

            $.addClass(content, this.constructor.classes.btnIcon);
            $.append(button, content);
        }

        return button;
    }

    /**
     * Renders the drop elements.
     */
    #renderDrop() {
        this.#dropTarget = $.create('div', {
            class: this.constructor.classes.dropTarget,
        });

        this.#dropText = $.create('span', {
            text: this.constructor.lang.drop.dropHere,
            class: this.constructor.classes.dropText,
        });

        $.append(this.#dropTarget, this.#dropText);
        $.hide(this.#dropTarget);
        $.append(this.#container, this.#dropTarget);
    }

    /**
     * Renders the editor elements.
     */
    #renderEditor() {
        this.#editorScroll = $.create('div', {
            class: this.constructor.classes.editorScroll,
        });

        this.#editorContainer = $.create('div', {
            class: this.constructor.classes.editorContainer,
        });

        this.#editor = $.create('div', {
            class: this.constructor.classes.editor,
            style: {
                fontFamily: this.#defaultFont,
            },
            attributes: {
                'role': 'textbox',
                'aria-multiline': true,
                'spellcheck': true,
                'autocorrect': true,
            },
        });

        this.#imgHighlight = $.create('div', {
            class: this.constructor.classes.imgHighlight,
        });

        this.#imgCursor = $.create('div', {
            class: this.constructor.classes.imgCursor,
        });

        this.#imgSize = $.create('div', {
            class: this.constructor.classes.imgSize,
        });

        this.#imgResize = $.create('div', {
            class: this.constructor.classes.imgResize,
            attributes: {
                'role': 'slider',
                'tabindex': 0,
                'aria-label': this.constructor.lang.resizeImage,
                'aria-valuemin': 1,
                'aria-valuenow': 1,
            },
        });

        $.hide(this.#imgHighlight);

        $.append(this.#imgHighlight, this.#imgSize);
        $.append(this.#imgHighlight, this.#imgResize);
        $.append(this.#editorContainer, this.#imgCursor);
        $.append(this.#editorContainer, this.#imgHighlight);
        $.append(this.#editorContainer, this.#editor);
        $.append(this.#editorScroll, this.#editorContainer);
        $.append(this.#editorBody, this.#editorScroll);
    }

    /**
     * Renders the popover elements.
     */
    #renderPopover() {
        this.#popover = $.create('div', {
            class: this.constructor.classes.popover,
            attributes: {
                'role': 'group',
                'aria-label': this.constructor.lang.contextToolbar,
            },
        });

        this.#popoverArrow = $.create('div', {
            class: this.constructor.classes.popoverArrow,
        });

        this.#popoverBody = $.create('div', {
            class: this.constructor.classes.popoverBody,
        });

        $.hide(this.#popover);
        $.append(this.#popover, this.#popoverArrow);
        $.append(this.#popover, this.#popoverBody);
        $.append(this.#container, this.#popover);
    }

    /**
     * Renders a popover item.
     * @param {string} type The item type.
     * @param {HTMLElement} parent The parent element.
     */
    #renderPopoverItem(type, parent) {
        const data = this.constructor.popovers[type];

        let node;

        if (data.render) {
            node = data.render.call(this, this.#currentNode);
        } else {
            node = this.#renderButton({
                icon: type,
                title: this.constructor.lang.popovers[type],
                ...data,
            });

            $.setDataset(node, { uiAction: type });
        }

        $.append(parent, node);
    }

    /**
     * Renders popover items.
     * @param {Array<string|string[]>} items The popover actions and groups to render.
     */
    #renderPopoverItems(items) {
        for (const item of items) {
            if ($._isString(item)) {
                this.#renderPopoverItem(item, this.#popoverBody);
            } else {
                const node = $.create('div', {
                    class: this.constructor.classes.btnGroup,
                    attributes: {
                        role: 'group',
                    },
                });

                for (const type of item) {
                    this.#renderPopoverItem(type, node);
                }

                $.append(this.#popoverBody, node);
            }
        }
    }

    /**
     * Renders the resize bar.
     */
    #renderResize() {
        this.#resizeBar = $.create('div', {
            class: this.constructor.classes.resizeBar,
            attributes: {
                'role': 'separator',
                'tabindex': 0,
                'aria-label': this.constructor.lang.resizeEditor,
                'aria-orientation': 'horizontal',
                'aria-valuenow': 0,
            },
        });

        for (let i = 0; i < 3; i++) {
            const hr = $.create('hr', { attributes: { 'aria-hidden': true } });

            $.append(this.#resizeBar, hr);
        }

        $.append(this.#container, this.#resizeBar);
    }

    /**
     * Renders the source elements.
     */
    #renderSource() {
        this.#sourceOuter = $.create('div', {
            class: this.constructor.classes.sourceOuter,
        });

        this.#sourceContainer = $.create('div', {
            class: this.constructor.classes.sourceContainer,
        });

        this.#lineNumbers = $.create('div', {
            class: this.constructor.classes.sourceLines,
            attributes: { 'aria-hidden': true },
        });

        this.#sourceScroll = $.create('div', {
            class: this.constructor.classes.sourceScroll,
        });

        this.#source = $.create('textarea', {
            class: this.constructor.classes.source,
        });

        $.hide(this.#sourceOuter);

        $.append(this.#sourceScroll, this.#source);
        $.append(this.#sourceContainer, this.#lineNumbers);
        $.append(this.#sourceContainer, this.#sourceScroll);
        $.append(this.#sourceOuter, this.#sourceContainer);
        $.append(this.#editorBody, this.#sourceOuter);
    }

    /**
     * Renders the toolbar.
     */
    #renderToolbar() {
        const header = $.create('div', {
            class: this.constructor.classes.toolbar,
        });

        this.#toolbar = $.create('div', {
            class: this.constructor.classes.toolbarButtons,
            attributes: {
                'role': 'toolbar',
                'aria-label': this.constructor.lang.toolbar,
            },
        });

        for (const buttons of this.#toolbarButtons) {
            const buttonGroup = $.create('div', {
                class: this.constructor.classes.btnGroup,
            });

            for (const type of buttons) {
                this.#renderToolbarButton(type, buttonGroup);
            }

            $.append(this.#toolbar, buttonGroup);
        }

        $.append(header, this.#toolbar);
        $.append(this.#container, header);
    }

    /**
     * Renders a toolbar button.
     * @param {string} type The button type.
     * @param {HTMLElement} parent The parent element.
     */
    #renderToolbarButton(type, parent) {
        const data = this.constructor.plugins[type];

        const button = this.#renderButton({
            icon: type,
            title: this.constructor.lang.plugins[type],
            ...data,
        });

        this.#buttons.push({ button, data, type });

        this.#setToolbarData(button, data, type);

        if ('dropdown' in data) {
            this.#renderToolbarDropdown(parent, button, data.dropdown);
        } else {
            $.append(parent, button);
        }
    }

    /**
     * Renders a toolbar dropdown.
     * @param {HTMLElement} buttonGroup The button group element.
     * @param {HTMLElement} button The button element.
     * @param {string[][]|EditorDropdownCallback} dropdownContent The toolbar groups or dropdown renderer.
     */
    #renderToolbarDropdown(buttonGroup, button, dropdownContent) {
        const dropGroup = $.create('div', {
            class: this.constructor.classes.dropdownGroup,
            attributes: {
                role: 'group',
            },
        });

        $.addClass(button, this.constructor.classes.dropdownToggle);
        $.setDataset(button, { uiToggle: 'dropdown' });
        $.setAttribute(button, {
            'aria-haspopup': true,
            'aria-expanded': false,
        });
        $.append(dropGroup, button);

        const dropdown = $.create('div', {
            class: this.constructor.classes.dropdown,
        });

        if ($._isArray(dropdownContent)) {
            $.addClass(dropdown, this.constructor.classes.dropdownButtons);

            for (const dropdownItems of dropdownContent) {
                const subDropGroup = $.create('div', {
                    class: this.constructor.classes.btnGroup,
                    attributes: {
                        role: 'group',
                    },
                });

                for (const type of dropdownItems) {
                    this.#renderToolbarButton(type, subDropGroup);
                }

                $.append(dropdown, subDropGroup);
            }
        } else if ($._isFunction(dropdownContent)) {
            dropdownContent.call(this, dropdown);
        }

        $.append(dropGroup, dropdown);
        $.append(buttonGroup, dropGroup);
        this.#ownComponent(Dropdown.init(button));
        this.listen(document, 'keydown.ui.editor', (event) => {
            if (event.code === 'Escape' && containsNode(dropdown, document.activeElement)) {
                $.focus(button);
            }
        }, { capture: true });
    }

    /**
     * Resets the drop text.
     */
    #resetDropText() {
        $.removeClass(this.#dropText, this.constructor.classes.dropHover);
        $.setText(this.#dropText, this.constructor.lang.drop.dropHere);
    }

    /**
     * Restores content and its selection without creating another history entry.
     * @param {EditorHistoryEntry} data The snapshot.
     */
    #restoreHistory({ html, selectionData = null }) {
        if (!this.node) {
            return;
        }

        const previous = $.getValue(this.node);

        this.#observe(false);

        try {
            $.setHtml(this.#editor, html);
            $.setValue(this.node, html);
            $.setValue(this.#source, html);
            this.#focusEditor();

            if (!this.node) {
                return;
            }

            restoreSelectionData(this.#editor, selectionData);
            this.#checkEmpty();
            this.#refreshDisabled();
            this.#refreshToolbar();
        } finally {
            this.#observe();
        }

        if (this.node && previous !== $.getValue(this.node)) {
            $.triggerEvent(this.node, 'change.ui.editor', { data: { skipUpdate: true } });
        }
    }

    /**
     * Sets data for a toolbar action.
     * @param {HTMLElement} node The action node.
     * @param {EditorPlugin|EditorPopover} data The action configuration.
     * @param {string} [type] The action type.
     */
    #setToolbarData(node, data, type) {
        if (data.command) {
            $.setDataset(node, { uiCommand: data.command });

            if (data.value) {
                $.setDataset(node, { uiValue: data.value });
            }
        } else if (data.action && type) {
            $.setDataset(node, { uiAction: type });
        }
    }

    /**
     * Shows the drop target.
     */
    #showDropTarget() {
        if (($.is(this.node, ':disabled') || this.node.readOnly) || $.isVisible(this.#sourceContainer)) {
            return;
        }

        $.show(this.#dropTarget);
    }

    /**
     * Shows the editor.
     */
    #showEditor() {
        $.show(this.#editorScroll);
        $.hide(this.#sourceOuter);
    }

    /**
     * Shows the image modal.
     */
    #showImageModal() {
        this.#removeModal();

        const returnFocus = document.activeElement;
        const container = $.create('div');

        const { group: fileGroup, input: fileInput } = createFileInput(this.constructor, {
            id: generateId('editor-image-file'),
            label: this.constructor.lang.modals.imageFile,
            attributes: {
                accept: 'image/*',
                multiple: true,
            },
        });

        const { group: urlGroup, input: urlInput } = createInput(this.constructor, {
            id: generateId('editor-image-url'),
            label: this.constructor.lang.modals.imageUrl,
        });

        $.append(container, fileGroup);
        $.append(container, urlGroup);

        const originalRange = getRange()?.cloneRange();

        this.#focusEditor();

        const range = getRange();

        range.collapse();

        this.#modal = createModal(this.constructor, {
            returnFocus,
            title: this.constructor.lang.modals.insertImage,
            content: container,
            cancelText: this.constructor.lang.modals.cancel,
            submitText: this.constructor.lang.modals.insertImage,
            onSubmit: () => {
                selectRange(range);

                const files = $.getProperty(fileInput, 'files');
                const src = $.getValue(urlInput);

                if (files.length) {
                    this.options.imageUpload.call(this, files);
                } else if (src) {
                    this.insertImage(src);
                }
            },
            onShown: () => {
                $.focus(fileInput);
            },
            onHidden: () => {
                this.#removeModal();

                if (this.node) {
                    selectRange(originalRange);

                    if (!returnFocus?.isConnected) {
                        this.#focusEditor();
                    }
                }
            },
        });
        this.#ownComponent(Modal.init(this.#modal));
    }

    /**
     * Shows the link modal.
     * @param {HTMLElement} [link] The current link.
     */
    #showLinkModal(link) {
        this.#removeModal();

        const returnFocus = document.activeElement;
        const container = $.create('div');

        const { group: textGroup, input: textInput } = createInput(this.constructor, {
            id: generateId('editor-link-text'),
            label: this.constructor.lang.modals.linkText,
        });

        const { group: urlGroup, input: urlInput } = createInput(this.constructor, {
            id: generateId('editor-link-url'),
            label: this.constructor.lang.modals.linkUrl,
        });

        const { group: newWindowGroup, input: newWindowInput } = createCheckbox(this.constructor, {
            id: generateId('editor-link-new-window'),
            label: this.constructor.lang.modals.linkNewWindow,
        });

        if (link) {
            const text = $.getText(link);
            const href = $.getAttribute(link, 'href');
            const newWindow = $.getAttribute(link, 'target');

            $.setValue(textInput, text);
            $.setValue(urlInput, href);

            if (newWindow === '_blank') {
                $.setProperty(newWindowInput, { checked: true });
            }
        }

        let hasText = false;

        $.append(container, textGroup);
        $.append(container, urlGroup);
        $.append(container, newWindowGroup);

        const originalRange = getRange()?.cloneRange();

        let range;

        if (link) {
            range = selectNode(link);
        } else {
            this.#focusEditor();
            range = getRange();
        }

        this.#modal = createModal(this.constructor, {
            returnFocus,
            title: this.constructor.lang.modals.insertLink,
            content: container,
            cancelText: this.constructor.lang.modals.cancel,
            submitText: this.constructor.lang.modals.insertLink,
            onSubmit: () => {
                selectRange(range);

                const text = $.getValue(textInput);
                const href = $.getValue(urlInput);
                const newWindow = $.is(newWindowInput, ':checked');

                this.insertLink(href, text, newWindow);
            },
            onShown: () => {
                $.focus(urlInput);
            },
            onHidden: () => {
                this.#removeModal();

                if (this.node) {
                    selectRange(originalRange);

                    if (!returnFocus?.isConnected) {
                        this.#focusEditor();
                    }
                }
            },
        });

        const controller = this.#ownComponent(Modal.init(this.#modal));

        controller.listen(textInput, 'input.ui.editor', () => {
            hasText = !!$.getValue(textInput);
        });

        controller.listen(urlInput, 'input.ui.editor', () => {
            if (hasText) {
                return;
            }

            const url = $.getValue(urlInput);

            $.setValue(textInput, url);
        });
    }

    /**
     * Shows the source.
     */
    #showSource() {
        $.show(this.#sourceOuter);
        $.setStyle(this.#editorScroll, { display: 'none' }, null, { important: true });
        $.hide(this.#imgHighlight);

        this.#refreshLineNumbers();
    }

    /**
     * Shows the video modal.
     */
    #showVideoModal() {
        this.#removeModal();

        const returnFocus = document.activeElement;
        const container = $.create('div');

        const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = createInput(this.constructor, {
            id: generateId('editor-video-url'),
            label: this.constructor.lang.modals.videoUrl,
        });

        $.append(container, urlGroup);

        const originalRange = getRange()?.cloneRange();

        this.#focusEditor();

        const range = getRange();

        this.#modal = createModal(this.constructor, {
            returnFocus,
            title: this.constructor.lang.modals.insertVideo,
            content: container,
            cancelText: this.constructor.lang.modals.cancel,
            submitText: this.constructor.lang.modals.insertVideo,
            onSubmit: () => {
                selectRange(range);

                const url = $.getValue(urlInput);
                let id;

                try {
                    const parsed = new URL(url);

                    if (parsed.protocol === 'https:' && (parsed.hostname === 'youtu.be' || ['youtube.com', 'www.youtube.com'].includes(parsed.hostname) && parsed.pathname === '/watch')) {
                        id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
                    }
                } catch {
                    // Invalid URLs use the same inline validation feedback.
                }

                if (!id || !/^[\w-]+$/.test(id)) {
                    $.setAttribute(urlInput, 'aria-invalid', 'true');
                    $.addClass(urlGroup, this.constructor.classes.formError);
                    $.setText(urlInvalidFeedback, this.constructor.lang.modals.videoUrlInvalid);

                    return false;
                }

                $.removeClass(urlGroup, this.constructor.classes.formError);

                $.removeAttribute(urlInput, 'aria-invalid');

                const video = $.create('iframe', {
                    attributes: {
                        width: 560,
                        height: 315,
                        src: `https://www.youtube.com/embed/${id}`,
                        frameborder: 0,
                        allowfullscreen: true,
                        title: this.constructor.lang.modals.insertVideo,
                    },
                });

                const html = $.getProperty(video, 'outerHTML');

                this.insertHtml(html);
            },
            onShown: () => {
                $.focus(urlInput);
            },
            onHidden: () => {
                this.#removeModal();

                if (this.node) {
                    selectRange(originalRange);

                    if (!returnFocus?.isConnected) {
                        this.#focusEditor();
                    }
                }
            },
        });
        this.#ownComponent(Modal.init(this.#modal));
    }

    /**
     * Renders a style dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    #styleDropdown(dropdown) {
        for (const tag of this.constructor.styles) {
            const button = $.create('button', {
                class: this.constructor.classes.dropdownItem,
                attributes: {
                    'type': 'button',
                    'aria-label': this.constructor.lang.styles[tag],
                },
            });

            const content = $.create(tag, {
                text: this.constructor.lang.styles[tag],
                class: this.constructor.classes.styleContent,
            });

            $.append(button, content);

            const data = {
                command: 'formatBlock',
                value: tag.toUpperCase(),
            };

            this.#buttons.push({ button, data });

            this.#setToolbarData(button, data);

            $.append(dropdown, button);
        }
    }

    /**
     * Renders a table dropdown.
     * @param {HTMLElement} dropdown The dropdown.
     */
    #tableDropdown(dropdown) {
        const container = $.create('div');

        for (let i = 0; i < 10; i++) {
            const row = $.create('div', {
                class: this.constructor.classes.tableRow,
            });

            $.append(container, row);

            for (let j = 0; j < 10; j++) {
                const cell = $.create('div', {
                    class: this.constructor.classes.tableCell,
                });

                $.append(row, cell);

                if (i > 4 || j > 4) {
                    $.hide(cell);
                }

                const link = $.create('button', {
                    class: this.constructor.classes.tableLink,
                    attributes: {
                        'type': 'button',
                        'aria-label': `${i + 1} × ${j + 1} table`,
                    },
                    dataset: {
                        uiColumn: j,
                        uiRow: i,
                    },
                });

                $.append(cell, link);
            }
        }

        const info = $.create('span', {
            class: this.constructor.classes.tableInfo,
        });

        $.addClass(dropdown, this.constructor.classes.tableDropdown);
        $.append(dropdown, container);
        $.append(dropdown, info);

        this.listen(container, 'click.ui.editor', (event) => {
            const cols = $.getDataset(event.currentTarget, 'uiColumn');
            const rows = $.getDataset(event.currentTarget, 'uiRow');

            const container = $.create('div');

            const table = $.create('table', {
                class: this.constructor.classes.table,
            });

            const tbody = $.create('tbody');

            for (let i = 0; i <= rows; i++) {
                const tr = $.create('tr');

                for (let j = 0; j <= cols; j++) {
                    const td = $.create('td', {
                        html: '<br>',
                    });

                    $.append(tr, td);
                }

                $.append(tbody, tr);
            }

            $.append(table, tbody);

            $.append(container, table);

            const br = $.create('br');

            $.append(container, br);

            const html = $.getHtml(container);

            this.insertHtml(html);
        }, { delegate: 'button' });

        this.listen(container, 'mouseover.ui.editor focusin.ui.editor', (event) => {
            const targetCol = $.getDataset(event.currentTarget, 'uiColumn');
            const targetRow = $.getDataset(event.currentTarget, 'uiRow');

            const colMin = Math.max(targetCol + 1, 4);
            const rowMin = Math.max(targetRow + 1, 4);

            const links = $.find('button', container);

            for (const element of links) {
                const col = $.getDataset(element, 'uiColumn');
                const row = $.getDataset(element, 'uiRow');

                if (col <= targetCol && row <= targetRow) {
                    $.addClass(element, this.constructor.classes.tableHover);
                } else {
                    $.removeClass(element, this.constructor.classes.tableHover);
                }

                const parent = $.parent(element);

                if (col <= colMin && row <= rowMin) {
                    $.show(parent);
                } else {
                    $.hide(parent);
                }
            }

            $.setText(info, `${targetCol + 1} x ${targetRow + 1}`);
        }, { delegate: 'button' });
    }

    /**
     * Updates a table element.
     * @param {HTMLTableCellElement} td The table cell.
     * @param {(cell: HTMLTableCellElement, row: HTMLTableRowElement, table: HTMLTableElement) => void} callback The callback.
     */
    #updateTable(td, callback) {
        const table = $.closest(td, 'table')[0];

        if (!table || !containsNode(this.#editor, table)) {
            return;
        }

        this.#observe(false);

        try {
            callback(td, $.closest(td, 'tr')[0], table);

            if (containsNode(this.#editor, td)) {
                const range = selectNode(td);

                range.collapse(true);
            }

            this.#normalize();
            this.#updateValue();
        } finally {
            this.#observe();
        }
    }

    /**
     * Updates the input value.
     */
    #updateValue() {
        if (!this.node) {
            return;
        }

        const html = $.getHtml(this.#editor);

        if (html === $.getValue(this.node)) {
            if (!this.#history.length) {
                this.#addHistory({ html, selectionData: getSelectionData(this.#editor) });
            }

            return;
        }

        this.#redoHistory = [];
        this.#addHistory({ html, selectionData: getSelectionData(this.#editor) });
        $.setValue(this.node, html);
        $.setValue(this.#source, html);

        if (this.node.validity.valid && !$.hasAttribute(this.node, 'aria-invalid')) {
            $.removeAttribute(this.#editor, 'aria-invalid');
            $.removeAttribute(this.#source, 'aria-invalid');
        }

        $.triggerEvent(this.node, 'change.ui.editor', { data: { skipUpdate: true } });
    }

    /**
     * Starts observing content changes owned by this editor.
     */
    #watchContent() {
        const changed = this.#debounce(() => {
            if ($.isVisible(this.#sourceContainer)) {
                return;
            }

            this.#normalize();
            this.#checkEmpty();
            this.#updateValue();
        });

        this.#observer = new window.MutationObserver((records) => {
            if (records.some((record) => record.type !== 'attributes' || record.target !== this.#editor)) {
                changed();
            }
        });
        this.#observe();
    }
}
