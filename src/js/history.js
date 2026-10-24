/** @import Editor from './editor.js'; */
/** @import { EditorHistoryEntry, EditorSelectionData } from './types.js'; */

import $ from '@fr0st/query';

/**
 * Gets a descendant by its child indexes, returning null for stale paths.
 * @param {number[]} path The child indexes.
 * @param {HTMLElement} container The editing boundary.
 * @returns {Node|null} The descendant.
 */
function getNodeFromPath(path, container) {
    let node = container;
    for (const index of path) {
        node = node?.childNodes[index];
    }
    return node || null;
}

/**
 * Gets child indexes from the editing boundary to a descendant.
 * @param {Node} node The descendant.
 * @param {HTMLElement} container The editing boundary.
 * @returns {number[]} The child indexes.
 */
function getPathToNode(node, container) {
    const path = [];
    while (node !== container) {
        path.unshift([...node.parentNode.childNodes].indexOf(node));
        node = node.parentNode;
    }
    return path;
}

/**
 * Adds a content snapshot, coalescing repeated HTML and bounding history safely.
 * @param {Editor} editor The editor.
 * @param {EditorHistoryEntry} data The snapshot.
 */
export function addHistory(editor, { html, selectionData = null }) {
    if (editor._history.at(-1)?.html === html) {
        editor._history.at(-1).selectionData = selectionData;
        return;
    }
    editor._history.push({ html, selectionData });
    const requested = Number(editor.options.historyLimit);
    const limit = Number.isFinite(requested) ? Math.max(1, Math.trunc(requested)) : 1000;
    if (editor._history.length > limit) {
        editor._history.splice(0, editor._history.length - limit);
    }
}

/**
 * Captures a selection owned by this editor, including backward ranges.
 * @param {Editor} editor The editor.
 * @returns {EditorSelectionData|null} The saved selection.
 */
export function getSelectionData(editor) {
    const { anchorNode, anchorOffset, focusNode, focusOffset } = window.getSelection();
    if (!anchorNode || !focusNode || !editor._editor.contains(anchorNode) || !editor._editor.contains(focusNode)) {
        return null;
    }
    return {
        anchorPath: getPathToNode(anchorNode, editor._editor),
        anchorOffset,
        focusPath: getPathToNode(focusNode, editor._editor),
        focusOffset,
    };
}

/**
 * Restores content and its selection without creating another history entry.
 * @param {Editor} editor The editor.
 * @param {EditorHistoryEntry} data The snapshot.
 */
export function restoreHistory(editor, { html, selectionData = null }) {
    if (!editor.node) {
        return;
    }
    const changed = $.getValue(editor.node) !== html;
    editor._observe(false);
    try {
        $.setHtml(editor._editor, html);
        $.setValue(editor.node, html);
        $.setValue(editor._source, html);
        editor._focusEditor();
        if (!editor.node) {
            return;
        }
        const selection = window.getSelection();
        const anchor = selectionData && getNodeFromPath(selectionData.anchorPath, editor._editor);
        const focus = selectionData && getNodeFromPath(selectionData.focusPath, editor._editor);
        const length = (node) => node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
        if (anchor && focus) {
            selection.setBaseAndExtent(anchor, Math.min(selectionData.anchorOffset, length(anchor)),
                focus, Math.min(selectionData.focusOffset, length(focus)));
        } else {
            selection.selectAllChildren(editor._editor);
            selection.collapseToEnd();
        }
        editor._checkEmpty();
        editor._refreshToolbar();
    } finally {
        editor._observe();
    }
    if (changed) {
        $.triggerEvent(editor.node, 'change.ui.editor');
    }
}
