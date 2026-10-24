import $ from '@fr0st/query';
import { Tooltip } from '@fr0st/ui';

/**
 * Render the editor.
 */
export function _render() {
    this._container = $.create('div', {
        class: this.constructor.classes.container,
    });

    this._renderToolbar();

    this._editorBody = $.create('div', {
        class: this.constructor.classes.editorBody,
        style: {
            height: this.options.height,
        },
    });

    $.append(this._container, this._editorBody);

    this._renderEditor();
    this._renderSource();
    this._renderPopover();
    this._renderDrop();

    if (this.options.resizable) {
        this._renderResize();
    }

    // hide the input node
    $.hide(this.node);
    $.setAttribute(this.node, { tabindex: -1 });

    $.insertBefore(this._container, this.node);
}

/**
 * Render a button
 * @param {object} data The button data.
 * @returns {HTMLElement} The button.
 */
export function _renderButton(data) {
    const button = $.create('button', {
        class: this.constructor.classes.btn,
    });

    if (data.setTitle) {
        data.title = data.setTitle.bind(this)();
    }

    if (data.title) {
        $.setAttribute(button, {
            'title': data.title,
            'aria-label': data.title,
        });

        Tooltip.init(button, {
            appendTo: document.body,
            placement: 'bottom',
        });
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
 * Render the drop elements.
 */
export function _renderDrop() {
    this._dropTarget = $.create('div', {
        class: this.constructor.classes.dropTarget,
    });

    this._dropText = $.create('span', {
        text: this.constructor.lang.drop.dropHere,
        class: this.constructor.classes.dropText,
    });

    $.append(this._dropTarget, this._dropText);
    $.hide(this._dropTarget);
    $.append(this._container, this._dropTarget);
}

/**
 * Render the editor elements.
 */
export function _renderEditor() {
    this._editorScroll = $.create('div', {
        class: this.constructor.classes.editorScroll,
    });

    this._editorContainer = $.create('div', {
        class: this.constructor.classes.editorContainer,
    });

    this._editor = $.create('div', {
        class: this.constructor.classes.editor,
        style: {
            fontFamily: this._defaultFont,
        },
        attributes: {
            'role': 'textbox',
            'aria-multline': true,
            'spellcheck': true,
            'autocorrect': true,
        },
    });

    this._imgHighlight = $.create('div', {
        class: this.constructor.classes.imgHighlight,
    });

    this._imgCursor = $.create('div', {
        class: this.constructor.classes.imgCursor,
    });

    this._imgSize = $.create('div', {
        class: this.constructor.classes.imgSize,
    });

    this._imgResize = $.create('div', {
        class: this.constructor.classes.imgResize,
    });

    $.hide(this._imgHighlight);

    $.append(this._imgHighlight, this._imgSize);
    $.append(this._imgHighlight, this._imgResize);
    $.append(this._editorContainer, this._imgCursor);
    $.append(this._editorContainer, this._imgHighlight);
    $.append(this._editorContainer, this._editor);
    $.append(this._editorScroll, this._editorContainer);
    $.append(this._editorBody, this._editorScroll);
}

/**
 * Render the resize bar.
 */
export function _renderResize() {
    this._resizeBar = $.create('div', {
        class: this.constructor.classes.resizeBar,
    });

    for (let i = 0; i < 3; i++) {
        const hr = $.create('hr');
        $.append(this._resizeBar, hr);
    }

    $.append(this._container, this._resizeBar);
}

/**
 * Render the source elements.
 */
export function _renderSource() {
    this._sourceOuter = $.create('div', {
        class: this.constructor.classes.sourceOuter,
    });

    this._sourceContainer = $.create('div', {
        class: this.constructor.classes.sourceContainer,
    });

    this._lineNumbers = $.create('div', {
        class: this.constructor.classes.sourceLines,
    });

    this._sourceScroll = $.create('div', {
        class: this.constructor.classes.sourceScroll,
    });

    this._source = $.create('textarea', {
        class: this.constructor.classes.source,
    });

    $.hide(this._sourceOuter);

    $.append(this._sourceScroll, this._source);
    $.append(this._sourceContainer, this._lineNumbers);
    $.append(this._sourceContainer, this._sourceScroll);
    $.append(this._sourceOuter, this._sourceContainer);
    $.append(this._editorBody, this._sourceOuter);
}
