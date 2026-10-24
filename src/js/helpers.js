/** @import Editor from './editor.js'; */
/** @import { EventTargetInput, EventCallback, EventOptions } from '@fr0st/query/src/events/event-handlers.js'; */

import $ from '@fr0st/query';
import { getRange } from './selection.js';

/** @type {Set<Editor>} */
const editors = new Set();
const cleanups = [];
let dragCount = 0;
let session = 0;

/**
 * Registers a shared listener with its exact removal callback.
 * @param {EventTargetInput} target The target.
 * @param {string} events The event names.
 * @param {EventCallback} callback The listener.
 * @param {EventOptions} [options] The listener options.
 */
function listenShared(target, events, callback, options = {}) {
    $.addEvent(target, events, callback, options);
    cleanups.push(() => $.removeEvent(target, events, callback, options));
}

/**
 * Starts shared listeners when the first editor becomes active.
 * @param {Editor} editor The editor to register.
 */
export function addEditor(editor) {
    if (editors.has(editor)) {
        return;
    }
    editors.add(editor);
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
            for (const current of editors) {
                current._showDropTarget();
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
        for (const current of editors) {
            if (!range || !current._editor.contains(range.startContainer) || !current._editor.contains(range.endContainer)) {
                current._removePopover();
                continue;
            }
            current._lastRange = range.cloneRange();
            current._refreshCursor();
            current._refreshToolbar();
        }
    }));
    listenShared(window, 'click.ui.editor', () => {
        for (const current of editors) {
            current._removePopover();
        }
    });
    listenShared(window, 'resize.ui.editor', deferred(() => {
        for (const current of editors) {
            if (current._currentNode?.matches('img')) {
                current._highlightImage(current._currentNode);
            }
            current._refreshLineNumbers();
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
    for (const current of editors) {
        current._resetDropText();
        $.hide(current._dropTarget);
    }
}
