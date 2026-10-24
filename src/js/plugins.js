/** @import { EditorPlugin } from './types.js'; */

import $ from '@fr0st/query';
import { Modal } from '@fr0st/ui';

/** @type {Record<string, EditorPlugin>} */
export default {
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
            this._colorDropdown(dropdown);
        },
    },
    font: {
        setContent() {
            const fontName = document.queryCommandValue('fontName').replace(/"/g, '');

            return this._fonts.includes(fontName) ?
                fontName :
                this._defaultFont;
        },
        dropdown(dropdown) {
            this._fontDropdown(dropdown);
        },
    },
    fontSize: {
        setContent() {
            const size = document.queryCommandValue('fontSize');

            if (size) {
                return this.constructor.fontSizes[size];
            }

            const fontSizePx = $.css(this._editor, 'fontSize');
            const fontSize = parseFloat(fontSizePx);
            return Math.round(fontSize);
        },
        dropdown(dropdown) {
            this._fontSizeDropdown(dropdown);
        },
    },
    fullScreen: {
        action() {
            if (this._fullScreen) {
                Modal.init(this._fullScreen).hide();
                return;
            }

            this._fullScreen = this.constructor._createModal({
                content: this._container,
                fullScreen: true,
                onShown: (_) => {
                    if ($.isVisible(this._sourceContainer)) {
                        $.focus(this._source);
                    } else {
                        $.focus(this._editor);
                    }
                },
                onHide: (_) => {
                    $.insertBefore(this._container, this.node);
                    this._fullScreen = null;
                },
            });
            this._ownComponent(Modal.init(this._fullScreen));
        },
    },
    hr: {
        command: 'insertHorizontalRule',
    },
    image: {
        action() {
            this._showImageModal();
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
            this._showLinkModal();
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
            return !this._redoHistory.length;
        },
    },
    removeFormat: {
        command: 'removeFormat',
    },
    source: {
        action() {
            const value = $.getValue(this.node);
            if ($.isVisible(this._sourceContainer)) {
                this._observe(false);
                try {
                    $.setHtml(this._editor, this.options.sanitize(value));
                    this._normalize();
                    this._checkEmpty();
                    const html = $.getHtml(this._editor);
                    if (this._history.at(-1)?.html !== html) {
                        this._redoHistory = [];
                        this._addHistory({ html });
                    }
                    this._updateValue();
                } finally {
                    this._observe();
                }
                if (!this.node) {
                    return;
                }
                this._showEditor();
                this._focusEditor();
            } else {
                $.setValue(this._source, value);
                this._showSource();
                $.focus(this._source);
            }
            this._refreshToolbar();
        },
    },
    strikethrough: {
        command: 'strikethrough',
    },
    style: {
        dropdown(dropdown) {
            this._styleDropdown(dropdown);
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
            this._tableDropdown(dropdown);
        },
    },
    underline: {
        command: 'underline',
    },
    undo: {
        command: 'undo',
        disableCheck() {
            return !this._history.length;
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
            this._showVideoModal();
        },
    },
};
