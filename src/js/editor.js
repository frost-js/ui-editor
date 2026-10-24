import $ from '@fr0st/query';
import { BaseComponent, Modal } from '@fr0st/ui';
import { addEditor, removeEditor } from './helpers.js';
import { swapTags } from './nodes.js';
import { getRange, restoreSelection, saveSelection, selectRange } from './selection.js';

/**
 * Editor
 * @class
 */
export default class Editor extends BaseComponent {
    /**
     * New Editor constructor.
     * @param {HTMLElement} node The input node.
     * @param {object} [options] The options to create the Editor with.
     */
    constructor(node, options) {
        super(node, options);

        this._toolbarButtons = this.options.buttons || this.constructor.buttons;

        this._fonts = this.options.fonts || this.constructor.fonts;
        this._defaultFont = this.options.defaultFont;

        this._fonts = this._fonts.filter((font) => document.fonts.check(`12px ${font}`));

        if (!this._fonts.includes(this._defaultFont)) {
            this._defaultFont = this._fonts.slice().shift();
        }

        this._buttons = [];
        this._history = [];
        this._redoHistory = [];

        this._render();

        const html = $.getValue(this.node);
        $.setHtml(this._editor, html);

        const range = getRange();

        this._focusEditor();
        this._execCommand('defaultParagraphSeparator', 'p');
        this._checkEmpty();
        this._refreshToolbar();

        selectRange(range);

        this._events();
        this._normalize();
        this._updateValue();
        this._refreshDisabled();

        addEditor(this);

        $.triggerEvent(this.node, 'init.ui.editor');
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
        removeEditor(this);

        if (this._popper) {
            this._popper.dispose();
            this._popper = null;
        }

        if (this._modal) {
            Modal.init(this._modal).dispose();
            $.remove(this._modal);
            this._modal = null;
        }

        if (this._fullScreen) {
            Modal.init(this._fullScreen).dispose();
            $.remove(this._fullScreen);
            this._fullScreen = null;
        }

        this._observer.disconnect();
        this._observer = null;
        this._observe = null;

        $.remove(this._container);
        $.show(this.node);
        $.removeAttribute(this.node, 'tabindex');

        this._buttons = null;

        this._container = null;
        this._toolbar = null;
        this._editorBody = null;
        this._editorContainer = null;
        this._editorScroll = null;
        this._editor = null;
        this._imgHighlight = null;
        this._imgCursor = null;
        this._imgResize = null;
        this._imgSize = null;
        this._sourceOuter = null;
        this._sourceContainer = null;
        this._sourceScroll = null;
        this._lineNumbers = null;
        this._source = null;
        this._popover = null;
        this._popoverArrow = null;
        this._popoverBody = null;
        this._dropTarget = null;
        this._dropText = null;
        this._resizeBar = null;
        this._currentNode = null;
        this._lastRange = null;
        this._history = null;
        this._redoHistory = null;

        super.dispose();
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
     * @param {string} value The font size.
     */
    fontSize(value) {
        value = Object.keys(this.constructor.fontSizes)
            .find((key) => this.constructor.fontSizes[key] === value);

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
        if ($.is(this.node, ':disabled')) {
            return;
        }

        this._observe(false);
        this._focusEditor();

        const markers = saveSelection();

        const selection = getSelection();

        const getSelectedNodes = (parent) => {
            const nodes = [];
            const contents = $.contents(parent);

            for (const content of contents) {
                if (!selection.containsNode(content, true)) {
                    continue;
                }

                if ($._isText(content) || selection.containsNode(content)) {
                    nodes.push(content);
                    continue;
                }

                const containedNodes = getSelectedNodes(content);
                const childContents = $.contents(content);

                if (containedNodes.length === childContents.length) {
                    nodes.push(content);
                } else {
                    nodes.push(...containedNodes);
                }
            }

            return nodes;
        };

        const nodes = getSelectedNodes(this._editor);

        while (nodes.length) {
            const subNodes = [];
            subNodes.push(nodes.shift());

            while (nodes.length && $.isSame(nodes[0], subNodes.at(-1).nextSibling)) {
                subNodes.push(nodes.shift());
            }

            const parent = $.parent(subNodes[0]).shift();

            if ($.is(parent, 'ol, ul')) {
                const tagName = $.tagName(parent);
                const element = $.create(tagName);
                $.before(subNodes[0], element);
                $.append(element, subNodes);
                continue;
            }

            const container = $.create('div', {
                style: {
                    marginLeft: '2em',
                    marginBottom: 0,
                },
            });

            $.before(subNodes[0], container);
            $.append(container, subNodes);
        }

        restoreSelection(markers);

        this._normalize();
        this._updateValue();
        this._observe();
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
        this._execCommand('insertHTML', value);
    }

    /**
     * Insert an image.
     * @param {string} src The image src.
     */
    insertImage(src) {
        const img = $.create('img', {
            attributes: { src },
        });

        const newImg = this._insertNode(img);

        const image = new Image();
        image.onload = (_) => {
            const maxWidth = $.width(this._editor, { boxSize: $.CONTENT_BOX });
            const width = Math.min(image.width, maxWidth);
            $.setStyle(newImg, 'width', `${width}px`);
        };

        image.src = src;
    }

    /**
     * Insert a link.
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
        if ($.is(this.node, ':disabled')) {
            return;
        }

        this._observe(false);
        this._focusEditor();

        const markers1 = saveSelection();

        const blockquotes = $.find('.blockquote', this._editor);

        const tempDivs = swapTags(blockquotes, 'div');

        restoreSelection(markers1);

        this._execCommand('outdent');

        const markers2 = saveSelection();

        swapTags(tempDivs, 'blockquote');

        restoreSelection(markers2);

        this._normalize();
        this._updateValue();
        this._observe();
    }

    /**
     * Perform a redo.
     */
    redo() {
        if (!this._redoHistory.length) {
            return;
        }

        const current = this._redoHistory.pop();

        this._addHistory(current);
        this._restoreHistory(current);
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
        if (this._history.length <= 1) {
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
