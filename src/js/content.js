/** @import Editor from './editor.js'; */
import $ from '@fr0st/query';
import { Dropdown } from '@fr0st/ui';
import { notifyChange, serialize } from './form.js';
import { joinAdjacentNodes, normalizePhrasing, normalizeSpans, normalizeStyles } from './normalize.js';
import { getRange, normalizeText, restoreSelection, saveSelection, selectNode, selectRange } from './selection.js';

/**
 * Check if the editor is empty and populate base markup.
 * @param {Editor} editor The editor instance.
 */
export function checkEmpty(editor) {
    if (editor.node && !editor._editor.innerHTML.trim()) {
        $.setHtml(editor._editor, '<p><br></p>');
    }
}

/**
 * Execute a command.
 * @param {Editor} editor The editor instance.
 * @param {string} command The command.
 * @param {boolean | string} [value] The command argument.
 */
export function execCommand(editor, command, value) {
    if (!editor.node || ($.is(editor.node, ':disabled') || editor.node.readOnly)) {
        return;
    }
    editor._focusEditor();
    if (!editor.node) {
        return;
    }
    editor._addHistory({ html: editor._editor.innerHTML, selectionData: editor._getSelectionData() });
    editor._observe(false);
    try {
        document.execCommand('styleWithCSS', false, !['bold', 'indent', 'italic', 'outdent', 'strikethrough', 'subscript', 'superscript', 'underline'].includes(command));
        document.execCommand(command, false, value);
        editor._normalize();
        editor._checkEmpty();
        editor._updateValue();
    } finally {
        editor._observe();
    }
}

/**
 * Ensure the editor element has focus.
 * @param {Editor} editor The editor instance.
 */
export function focusEditor(editor) {
    if (!editor.node || $.is(editor.node, ':disabled')) {
        return;
    }
    if (document.activeElement === editor._editor && getRange(editor._editor)) {
        return;
    }
    const current = getRange(editor._editor)?.cloneRange();
    const selection = window.getSelection();
    const backward = current && !current.collapsed && selection.anchorNode === current.endContainer && selection.anchorOffset === current.endOffset;
    const saved = editor._lastRange;
    $.focus(editor._editor);
    if (!editor.node) {
        return;
    }
    if (current) {
        selectRange(current, backward);
    } else if (saved && editor._editor.contains(saved.startContainer) && editor._editor.contains(saved.endContainer)) {
        selectRange(saved);
    } else {
        const range = document.createRange();
        let target = editor._editor;
        const opaque = (node) => node instanceof Element && node.matches('br, img, hr, iframe, input, video, audio, svg');
        while (target.lastChild && !opaque(target)) {
            target = target.lastChild;
        }
        if (opaque(target)) {
            if (target.matches('br')) {
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
 * Refresh the popover at cursor.
 * @param {Editor} editor The editor instance.
 */
export function refreshCursor(editor) {
    const selection = window.getSelection();
    const baseNode = selection.anchorNode;

    if (!$.hasDescendent(editor._editor, baseNode)) {
        editor._removePopover();
        return;
    }

    const range = getRange(editor._editor);
    if (editor._currentNode && range && (!range.collapsed && range.intersectsNode(editor._currentNode) || editor._currentNode.contains(baseNode))) {
        return;
    }

    const currentNode = $.is(baseNode, 'a') ?
        baseNode :
        $.closest(baseNode, 'a', editor._editor).shift();

    if (!currentNode) {
        editor._removePopover();
        return;
    }

    editor._refreshPopover(currentNode);
}

/**
 * Refresh the editor disabled.
 * @param {Editor} editor The editor instance.
 */
export function refreshDisabled(editor) {
    const disabled = editor.node.matches(':disabled');
    const readOnly = editor.node.readOnly;
    if (disabled) {
        $.addClass(editor._editor, editor.constructor.classes.editorDisabled);
    } else {
        $.removeClass(editor._editor, editor.constructor.classes.editorDisabled);
    }
    editor._editor.setAttribute('contenteditable', String(!disabled && !readOnly));
    editor._editor.setAttribute('tabindex', disabled ? '-1' : (editor.node.getAttribute('tabindex') || '0'));
    editor._source.disabled = disabled;
    editor._source.readOnly = readOnly;
    for (const handle of [editor._imgResize, editor._resizeBar].filter(Boolean)) {
        handle.setAttribute('tabindex', disabled || readOnly ? '-1' : '0');
        handle.setAttribute('aria-disabled', String(disabled || readOnly));
    }
    for (const surface of [editor._editor, editor._source]) {
        surface.setAttribute('aria-disabled', String(disabled));
        surface.setAttribute('aria-readonly', String(readOnly));
        surface.setAttribute('aria-required', String(editor.node.required));
        for (const name of ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-errormessage', 'aria-invalid', 'dir', 'lang']) {
            const value = editor.node.getAttribute(name) || (name === 'aria-labelledby' && !editor.node.hasAttribute('aria-label') ? editor._labelledBy : null);
            if (value) {
                surface.setAttribute(name, value);
            } else {
                surface.removeAttribute(name);
            }
        }
    }
    editor._container.classList.toggle('form-error', editor.node.classList.contains('form-error'));
    if (disabled || readOnly) {
        editor._removePopover();
        for (const toggle of editor._toolbar.querySelectorAll('[data-ui-toggle="dropdown"]')) {
            Dropdown.init(toggle).hide();
        }
    }
}

/**
 * Refresh the source line numbers.
 * @param {Editor} editor The editor instance.
 */
export function refreshLineNumbers(editor) {
    if (!editor.node) {
        return;
    }
    if (!$.isVisible(editor._sourceContainer)) {
        return;
    }

    const lineNumbers = $.contents(editor._lineNumbers);

    const html = $.getValue(editor._source);
    const lines = html.split('\n');

    const test = $.create('div', {
        style: {
            width: $.width(editor._source, { boxSize: $.CONTENT_BOX }),
            padding: 0,
            border: 0,
            font: $.css(editor._source, 'font'),
            letterSpacing: $.css(editor._source, 'letterSpacing'),
            whiteSpace: $.css(editor._source, 'whiteSpace'),
            wordBreak: $.css(editor._source, 'wordBreak'),
            wordSpacing: $.css(editor._source, 'wordSpacing'),
            wordWrap: $.css(editor._source, 'wordWrap'),
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
            $.append(editor._lineNumbers, lineNumber);
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
 * Refresh the toolbar.
 * @param {Editor} editor The editor instance.
 */
export function refreshToolbar(editor) {
    if (!editor.node) {
        return;
    }

    const isDisabled = $.is(editor.node, ':disabled');
    const isSource = $.isVisible(editor._sourceContainer);

    for (const { button, data, type } of editor._buttons) {
        if ('setContent' in data) {
            const content = data.setContent.bind(editor)();
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
            (editor.node.readOnly && !['source', 'fullScreen'].includes(type)) ||
            (isSource && !['source', 'fullScreen'].includes(type)) ||
            ('disableCheck' in data && data.disableCheck.bind(editor)())
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
 * Reset the drop text.
 * @param {Editor} editor The editor instance.
 */
export function resetDropText(editor) {
    $.removeClass(editor._dropText, editor.constructor.classes.dropHover);
    $.setText(editor._dropText, editor.constructor.lang.drop.dropHere);
}

/**
 * Show the drop target.
 * @param {Editor} editor The editor instance.
 */
export function showDropTarget(editor) {
    if (($.is(editor.node, ':disabled') || editor.node.readOnly) || $.isVisible(editor._sourceContainer)) {
        return;
    }

    $.show(editor._dropTarget);
}

/**
 * Show the editor.
 * @param {Editor} editor The editor instance.
 */
export function showEditor(editor) {
    $.show(editor._editorScroll);
    $.hide(editor._sourceOuter);
}

/**
 * Show the source.
 * @param {Editor} editor The editor instance.
 */
export function showSource(editor) {
    $.show(editor._sourceOuter);
    $.setStyle(editor._editorScroll, { display: 'none' }, null, { important: true });
    $.hide(editor._imgHighlight);

    editor._refreshLineNumbers();
}

/**
 * Update the input value.
 * @param {Editor} editor The editor instance.
 */
export function updateValue(editor) {
    if (!editor.node) {
        return;
    }
    const html = $.getHtml(editor._editor);
    const value = serialize(editor._editor);
    if (value === $.getValue(editor.node)) {
        if (!editor._history.length) {
            editor._addHistory({ html, selectionData: editor._getSelectionData() });
        }
        return;
    }
    editor._redoHistory = [];
    editor._addHistory({ html, selectionData: editor._getSelectionData() });
    $.setValue(editor.node, value);
    $.setValue(editor._source, value);
    if (editor.node.validity.valid && !editor.node.hasAttribute('aria-invalid')) {
        editor._editor.removeAttribute('aria-invalid');
        editor._source.removeAttribute('aria-invalid');
    }
    notifyChange(editor);
}


/**
 * Insert a (cloned) node into the editor.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} node The node to insert.
 * @returns {HTMLElement} The new node.
 */
export function insertNode(editor, node) {
    if (!editor.node || ($.is(editor.node, ':disabled') || editor.node.readOnly)) {
        return null;
    }
    editor._focusEditor();
    if (!editor.node) {
        return null;
    }
    const range = getRange(editor._editor);
    if (!range) {
        return null;
    }
    editor._addHistory({ html: editor._editor.innerHTML, selectionData: editor._getSelectionData() });
    editor._observe(false);
    try {
        range.deleteContents();
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selectRange(range);
        editor._normalize();
        editor._updateValue();
    } finally {
        editor._observe();
    }
    return node;
}

/**
 * Normalize the editor.
 * @param {Editor} editor The editor instance.
 */
export function normalize(editor) {
    if (!editor.node) {
        return;
    }
    editor._observe(false);
    normalizeText(editor._editor);
    const markers = saveSelection(editor._editor);
    try {
        normalizeStyles(editor._editor);
        normalizeSpans(editor._editor);
        normalizePhrasing(editor._editor);
        joinAdjacentNodes(editor._editor, markers);
    } finally {
        restoreSelection(markers);
        normalizeText(editor._editor);
        editor._observe();
    }
}

/**
 * Update a table element.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} td The td element.
 * @param {Function} callback The callback.
 */
export function updateTable(editor, td, callback) {
    const table = td.closest('table');
    if (!table || !editor._editor.contains(table)) {
        return;
    }
    editor._observe(false);
    try {
        callback(td, td.closest('tr'), table);
        if (editor._editor.contains(td)) {
            const range = selectNode(td);
            range.collapse(true);
        }
        editor._normalize();
        editor._updateValue();
    } finally {
        editor._observe();
    }
}
