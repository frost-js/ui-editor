import $ from '@fr0st/query';

/**
 * Get the current selected range.
 * @returns {Range} The Range object.
 */
export function getRange() {
    const selection = window.getSelection();

    if (!selection.rangeCount) {
        return null;
    }

    return selection.getRangeAt(0);
}

/**
 * Restore the selection from selection markers.
 * @param {object} markers The selection markers.
 * @param {Text} [markers.start] The start marker.
 * @param {Text} [markers.end] The end marker.
 */
export function restoreSelection({ start, end } = {}) {
    if (!start && !end) {
        return;
    }

    const range = $.createRange();

    if (start && $.isConnected(start)) {
        range.setStartAfter(start);
        $.detach(start);
    }

    if (end && $.isConnected(end)) {
        range.setEndBefore(end);
        $.detach(end);
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Save the selection and return the selection markers.
 * @returns {object} The selection markers.
 */
export function saveSelection() {
    const selection = window.getSelection();

    let start;
    let end;
    if (selection.rangeCount) {
        start = $.createText('');
        end = $.createText('');

        const range = selection.getRangeAt(0);
        const rangeStart = range.cloneRange();
        const rangeEnd = range.cloneRange();

        rangeStart.collapse(true);
        rangeEnd.collapse(false);

        rangeStart.insertNode(start);
        rangeEnd.insertNode(end);
    }

    return { start, end };
}

/**
 * Select a node.
 * @param {HTMLElement} node The element to select.
 * @returns {Range} The Range object.
 */
export function selectNode(node) {
    const range = $.createRange();
    range.selectNode(node);

    selectRange(range);

    return range;
}

/**
 * Select a range.
 * @param {Range} range The range to select.
 */
export function selectRange(range) {
    if (!range) {
        return;
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}
