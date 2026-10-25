import $ from '@fr0st/query';
import { containsNode } from './helpers.js';

const window = $.getWindow();

/**
 * @typedef {object} EditorSelectionData
 * @property {number[]} anchorPath Child indexes from the editing surface to the selection anchor.
 * @property {number} anchorOffset The anchor offset.
 * @property {number[]} focusPath Child indexes from the editing surface to the selection focus.
 * @property {number} focusOffset The focus offset.
 */

/**
 * @typedef {object} EditorHistoryEntry
 * @property {string} html The serialized content.
 * @property {EditorSelectionData|null} [selectionData=null] The selection to restore.
 */

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
 * Captures a selection owned by this editor, including backward ranges.
 * @param {HTMLElement} container The editing boundary.
 * @returns {EditorSelectionData|null} The saved selection.
 */
export function getSelectionData(container) {
    const { anchorNode, anchorOffset, focusNode, focusOffset } = window.getSelection();

    if (!containsNode(container, anchorNode) || !containsNode(container, focusNode)) {
        return null;
    }

    return {
        anchorPath: getPathToNode(anchorNode, container),
        anchorOffset,
        focusPath: getPathToNode(focusNode, container),
        focusOffset,
    };
}

/**
 * Restores a saved selection within the current editing boundary.
 * @param {HTMLElement} container The editing boundary.
 * @param {EditorSelectionData|null} selectionData The saved selection.
 */
export function restoreSelectionData(container, selectionData) {
    const selection = window.getSelection();
    const anchor = selectionData && getNodeFromPath(selectionData.anchorPath, container);
    const focus = selectionData && getNodeFromPath(selectionData.focusPath, container);
    const length = (node) => $._isText(node) ? node.textContent.length : node.childNodes.length;

    if (anchor && focus) {
        selection.setBaseAndExtent(anchor, Math.min(selectionData.anchorOffset, length(anchor)),
            focus, Math.min(selectionData.focusOffset, length(focus)));
    } else {
        selection.selectAllChildren(container);
        selection.collapseToEnd();
    }
}
