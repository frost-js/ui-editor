/** @import { EditorSelectionData } from './types.js'; */

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

    if (!anchorNode || !focusNode || !container.contains(anchorNode) || !container.contains(focusNode)) {
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
    const length = (node) => node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;

    if (anchor && focus) {
        selection.setBaseAndExtent(anchor, Math.min(selectionData.anchorOffset, length(anchor)),
            focus, Math.min(selectionData.focusOffset, length(focus)));
    } else {
        selection.selectAllChildren(container);
        selection.collapseToEnd();
    }
}
