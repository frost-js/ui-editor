import $ from '@fr0st/query';
import { containsNode } from './helpers.js';

const window = $.getWindow();

/**
 * @typedef {object} EditorSelectionMarkers
 * @property {Text} [start] The start marker.
 * @property {Text} [end] The end marker.
 * @property {boolean} [backward=false] Whether the selection runs toward the start.
 */

/**
 * Gets the current range, optionally restricted to an editing boundary.
 * @param {HTMLElement|null} [container=null] The optional editing boundary.
 * @returns {Range|null} The owned range, or null when the selection is elsewhere.
 */
export function getRange(container = null) {
    const selection = window.getSelection();

    if (!selection.rangeCount) {
        return null;
    }

    const range = selection.getRangeAt(0);

    return !container || (containsNode(container, range.startContainer) && containsNode(container, range.endContainer)) ? range : null;
}

/**
 * Restores a range from markers and removes the markers without losing direction.
 * @param {EditorSelectionMarkers} [markers={}] The selection markers.
 */
export function restoreSelection({ start, end, backward = false } = {}) {
    if (!start?.isConnected || !end?.isConnected) {
        $.remove(start);
        $.remove(end);

        return;
    }

    const range = $.createRange();

    range.setStartAfter(start);
    range.setEndBefore(end);
    $.remove(start);
    $.remove(end);

    const selection = window.getSelection();

    if (backward) {
        selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
    } else {
        selectRange(range);
    }
}

/**
 * Saves a range as empty text markers inside an optional editing boundary.
 * @param {HTMLElement|null} [container=null] The optional editing boundary.
 * @returns {EditorSelectionMarkers} The markers and selection direction.
 */
export function saveSelection(container = null) {
    const range = getRange(container);

    if (!range) {
        return {};
    }

    const selection = window.getSelection();
    const backward = !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
    const start = $.createText('');
    const end = $.createText('');
    const startRange = range.cloneRange();
    const endRange = range.cloneRange();

    startRange.collapse(true);
    endRange.collapse(false);
    endRange.insertNode(end);
    startRange.insertNode(start);

    return { start, end, backward };
}

/**
 * Selects a node.
 * @param {Node} node The node to select.
 * @returns {Range} The selected range.
 */
export function selectNode(node) {
    const range = $.createRange();

    range.selectNode(node);
    selectRange(range);

    return range;
}

/**
 * Restores a connected range.
 * @param {Range|null} range The range to select.
 * @param {boolean} [backward=false] Whether to restore a backward selection.
 */
export function selectRange(range, backward = false) {
    if (!range || !range.startContainer.isConnected || !range.endContainer.isConnected) {
        return;
    }

    const selection = window.getSelection();

    if (backward) {
        selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
    } else {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * Normalizes text nodes while preserving the live range and its direction.
 * @param {HTMLElement} container The content boundary.
 */
export function normalizeText(container) {
    const range = getRange(container)?.cloneRange();
    const selection = window.getSelection();
    const backward = range && !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;

    $.normalize(container);

    if (range) {
        selectRange(range, backward);
    }
}
