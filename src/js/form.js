/** @import Editor from './editor.js'; */
import $ from '@fr0st/query';
import { generateId } from '@fr0st/ui';

/**
 * Emits the existing change contract without reloading our own content.
 * @param {Editor} editor The editor.
 */
export function notifyChange(editor) {
    $.triggerEvent(editor.node, 'change.ui.editor', { data: { skipUpdate: true } });
}

/**
 * Serializes empty editing scaffolding as an empty native value.
 * @param {HTMLElement|DocumentFragment} surface The surface.
 * @param {string} [html] Its serialized HTML.
 * @returns {string} The submitted HTML.
 */
export function serialize(surface, html = surface.innerHTML) {
    return !surface.textContent.trim() && !surface.querySelector('img, iframe, hr, table') ? '' : html;
}

/**
 * Loads an external value and starts a fresh history after native reset.
 * @param {Editor} editor The editor.
 * @param {boolean} [reset=false] Whether to clear history.
 */
export function loadValue(editor, reset = false) {
    editor._observe(false);
    try {
        editor._editor.innerHTML = editor.options.sanitize(editor.node.value);
        editor._normalize();
        editor._checkEmpty();
        editor.node.value = serialize(editor._editor);
        editor._source.value = editor.node.value;
        editor._lastRange = null;
        if (reset) {
            editor._history = [];
            editor._redoHistory = [];
        }
        if (editor._history.at(-1)?.html !== editor._editor.innerHTML) {
            editor._redoHistory = [];
        }
        editor._addHistory({ html: editor._editor.innerHTML });
        editor._refreshDisabled();
        editor._refreshToolbar();
        editor._refreshLineNumbers();
    } finally {
        editor._observe();
    }
}

/**
 * Attaches native form, label, validation, and state synchronization.
 * @param {Editor} editor The editor.
 */
export function eventsForm(editor) {
    const focus = () => {
        if (editor.node && !editor.node.matches(':disabled')) {
            ($.isVisible(editor._sourceContainer) ? editor._source : editor._editor).focus();
        }
    };
    const labels = [...editor.node.labels];
    const generated = [];
    for (const label of labels) {
        if (!label.id) {
            label.id = generateId('editor-label');
            generated.push([label, label.id]);
        }
        editor.listen(label, 'click.ui.editor', (event) => {
            if (event.target === label || !event.target.closest('a, button, input, select, textarea')) {
                event.preventDefault();
                focus();
            }
        });
    }
    editor._labelledBy = labels.map((label) => label.id).join(' ');
    editor._refreshDisabled();
    editor.listen(editor.node, 'focus.ui.editor', (event) => {
        if (event.target === document.activeElement) {
            focus();
        }
    });
    editor.listen(editor.node, 'invalid.ui.editor', (event) => {
        event.preventDefault();
        editor._editor.setAttribute('aria-invalid', 'true');
        editor._source.setAttribute('aria-invalid', 'true');
        focus();
    });
    editor.listen(editor.node, 'input.ui.editor change.ui.editor', (event) => {
        if (!event.skipUpdate) {
            loadValue(editor);
        }
    });
    const timers = new Set();
    editor.listen(editor.node.ownerDocument, 'reset.ui.editor', (event) => {
        if (event.target !== editor.node.form) {
            return;
        }
        const timer = setTimeout(() => {
            timers.delete(timer);
            if (editor.node && !event.defaultPrevented) {
                editor._removePopover();
                loadValue(editor, true);
            }
        }, 0);
        timers.add(timer);
    });
    const observer = new MutationObserver(() => {
        if (editor.node) {
            editor._refreshDisabled();
            editor._refreshToolbar();
        }
    });
    observer.observe(editor.node, { attributes: true });
    for (const fieldset of $.parents(editor.node, 'fieldset')) {
        observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
    }
    editor._onDispose(() => {
        observer.disconnect();
        for (const timer of timers) {
            clearTimeout(timer);
        }
        for (const [label, id] of generated) {
            if (label.id === id) {
                label.removeAttribute('id');
            }
        }
    });
}
