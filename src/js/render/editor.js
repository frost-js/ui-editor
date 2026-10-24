/** @import Editor from './../editor.js'; */
import $ from '@fr0st/query';
import { Tooltip } from '@fr0st/ui';

/**
 * Render the editor.
 * @param {Editor} editor The editor instance.
 */
export function render(editor) {
    editor._container = $.create('div', {
        class: editor.constructor.classes.container,
    });

    editor._renderToolbar();

    editor._editorBody = $.create('div', {
        class: editor.constructor.classes.editorBody,
        style: {
            height: editor.options.height,
        },
    });

    $.append(editor._container, editor._editorBody);

    editor._renderEditor();
    editor._renderSource();
    editor._renderPopover();
    editor._renderDrop();

    if (editor.options.resizable) {
        editor._renderResize();
    }

    // hide the input node
    $.hide(editor.node);
    $.setAttribute(editor.node, { tabindex: -1 });

    $.insertBefore(editor._container, editor.node);
}

/**
 * Render a button
 * @param {Editor} editor The editor instance.
 * @param {object} data The button data.
 * @returns {HTMLElement} The button.
 */
export function renderButton(editor, data) {
    const button = $.create('button', {
        class: editor.constructor.classes.btn,
        attributes: { type: 'button' },
    });

    if (data.setTitle) {
        data.title = data.setTitle.bind(editor)();
    }

    if (data.title) {
        $.setAttribute(button, {
            'title': data.title,
            'aria-label': data.title,
        });

        const tooltip = editor._ownComponent(Tooltip.init(button, {
            appendTo: document.body,
            placement: 'bottom',
        }));
        editor.listen(button, 'click.ui.editor', () => tooltip.hide());
    }

    if ('content' in data) {
        $.setHtml(button, data.content);
    } else {
        const content = $.parseHtml(editor.constructor.icons[data.icon]);
        $.addClass(content, editor.constructor.classes.btnIcon);
        $.append(button, content);
    }

    return button;
}

/**
 * Render the drop elements.
 * @param {Editor} editor The editor instance.
 */
export function renderDrop(editor) {
    editor._dropTarget = $.create('div', {
        class: editor.constructor.classes.dropTarget,
    });

    editor._dropText = $.create('span', {
        text: editor.constructor.lang.drop.dropHere,
        class: editor.constructor.classes.dropText,
    });

    $.append(editor._dropTarget, editor._dropText);
    $.hide(editor._dropTarget);
    $.append(editor._container, editor._dropTarget);
}

/**
 * Render the editor elements.
 * @param {Editor} editor The editor instance.
 */
export function renderEditor(editor) {
    editor._editorScroll = $.create('div', {
        class: editor.constructor.classes.editorScroll,
    });

    editor._editorContainer = $.create('div', {
        class: editor.constructor.classes.editorContainer,
    });

    editor._editor = $.create('div', {
        class: editor.constructor.classes.editor,
        style: {
            fontFamily: editor._defaultFont,
        },
        attributes: {
            'role': 'textbox',
            'aria-multiline': true,
            'spellcheck': true,
            'autocorrect': true,
        },
    });

    editor._imgHighlight = $.create('div', {
        class: editor.constructor.classes.imgHighlight,
    });

    editor._imgCursor = $.create('div', {
        class: editor.constructor.classes.imgCursor,
    });

    editor._imgSize = $.create('div', {
        class: editor.constructor.classes.imgSize,
    });

    editor._imgResize = $.create('div', {
        class: editor.constructor.classes.imgResize,
    });

    $.hide(editor._imgHighlight);

    $.append(editor._imgHighlight, editor._imgSize);
    $.append(editor._imgHighlight, editor._imgResize);
    $.append(editor._editorContainer, editor._imgCursor);
    $.append(editor._editorContainer, editor._imgHighlight);
    $.append(editor._editorContainer, editor._editor);
    $.append(editor._editorScroll, editor._editorContainer);
    $.append(editor._editorBody, editor._editorScroll);
}

/**
 * Render the resize bar.
 * @param {Editor} editor The editor instance.
 */
export function renderResize(editor) {
    editor._resizeBar = $.create('div', {
        class: editor.constructor.classes.resizeBar,
    });

    for (let i = 0; i < 3; i++) {
        const hr = $.create('hr');
        $.append(editor._resizeBar, hr);
    }

    $.append(editor._container, editor._resizeBar);
}

/**
 * Render the source elements.
 * @param {Editor} editor The editor instance.
 */
export function renderSource(editor) {
    editor._sourceOuter = $.create('div', {
        class: editor.constructor.classes.sourceOuter,
    });

    editor._sourceContainer = $.create('div', {
        class: editor.constructor.classes.sourceContainer,
    });

    editor._lineNumbers = $.create('div', {
        class: editor.constructor.classes.sourceLines,
    });

    editor._sourceScroll = $.create('div', {
        class: editor.constructor.classes.sourceScroll,
    });

    editor._source = $.create('textarea', {
        class: editor.constructor.classes.source,
    });

    $.hide(editor._sourceOuter);

    $.append(editor._sourceScroll, editor._source);
    $.append(editor._sourceContainer, editor._lineNumbers);
    $.append(editor._sourceContainer, editor._sourceScroll);
    $.append(editor._sourceOuter, editor._sourceContainer);
    $.append(editor._editorBody, editor._sourceOuter);
}
