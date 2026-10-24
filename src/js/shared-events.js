/** @import Editor from './editor.js'; */

import $ from '@fr0st/query';
import { getRange } from './selection.js';

const document = $.getContext();
const window = $.getWindow();

/**
 * @typedef {object} EditorSharedEvents
 * @property {() => void} showDropTarget Shows the active drop target.
 * @property {() => void} resetDropTarget Resets and hides the drop target.
 * @property {() => void} removePopover Dismisses the context toolbar.
 * @property {(range: Range|null) => void} selectionChange Updates the owned selection.
 * @property {() => void} resize Updates the component after a viewport resize.
 */

/** @type {Map<Editor, EditorSharedEvents>} */
const editors = new Map();
const cleanups = [];
let dragCount = 0;
let session = 0;

/**
 * Registers a shared listener with its exact removal callback.
 * @param {EventTarget} target The target.
 * @param {string} events The event names.
 * @param {(event: Event) => void} callback The event callback.
 */
function listenShared(target, events, callback) {
    $.addEvent(target, events, callback);
    cleanups.push(() => $.removeEvent(target, events, callback));
}

/**
 * Starts shared listeners when the first editor becomes active.
 * @param {Editor} editor The editor to register.
 * @param {EditorSharedEvents} callbacks The callbacks owned by the component.
 */
export function addEditor(editor, callbacks) {
    if (editors.has(editor)) {
        return;
    }

    editors.set(editor, callbacks);

    if (editors.size > 1) {
        return;
    }

    const generation = ++session;

    dragCount = 0;

    const deferred = (callback) => $.debounce(() => {
        if (generation === session) {
            callback();
        }
    });

    listenShared(document.body, 'dragenter.ui.editor', () => {
        if (dragCount++ === 0) {
            for (const current of editors.values()) {
                current.showDropTarget();
            }
        }
    });
    listenShared(document.body, 'dragleave.ui.editor', () => {
        dragCount = Math.max(0, dragCount - 1);

        if (dragCount === 0) {
            resetDragCount();
        }
    });
    listenShared(document.body, 'dragend.ui.editor drop.ui.editor', resetDragCount);
    listenShared(document, 'selectionchange.ui.editor', deferred(() => {
        const range = getRange();

        for (const current of editors.values()) {
            current.selectionChange(range);
        }
    }));
    listenShared(window, 'click.ui.editor', () => {
        for (const current of editors.values()) {
            current.removePopover();
        }
    });
    listenShared(window, 'resize.ui.editor', deferred(() => {
        for (const current of editors.values()) {
            current.resize();
        }
    }));
}

/**
 * Removes only this library's listeners when its last editor is disposed.
 * @param {Editor} editor The editor to unregister.
 */
export function removeEditor(editor) {
    if (!editors.delete(editor) || editors.size) {
        return;
    }

    session++;
    dragCount = 0;

    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
}

/**
 * Resets drag state and hides drop targets for all active editors.
 */
export function resetDragCount() {
    dragCount = 0;

    for (const current of editors.values()) {
        current.resetDropTarget();
    }
}
