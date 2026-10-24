import $ from '@fr0st/query';
import { joinAdjacentNodes, normalizePhrasing, normalizeSpans, normalizeStyles } from './../normalize.js';
import { getRange, restoreSelection, saveSelection, selectNode } from './../selection.js';

/**
 * Insert a (cloned) node into the editor.
 * @param {HTMLElement} node The node to insert.
 * @returns {HTMLElement} The new node.
 */
export function _insertNode(node) {
    this._focusEditor();

    const range = getRange();
    range.deleteContents();
    range.insertNode(node);
    range.collapse(false);

    return node;
}

/**
 * Normalize the editor.
 */
export function _normalize() {
    this._observe(false);

    $.normalize(this._editor);

    const markers = saveSelection();

    normalizeStyles(this._editor);
    normalizeSpans(this._editor);
    normalizePhrasing(this._editor);
    joinAdjacentNodes(this._editor, markers);

    restoreSelection(markers);

    $.normalize(this._editor);

    this._observe();
}

/**
 * Update a table element.
 * @param {HTMLElement} td The td element.
 * @param {Function} callback The callback.
 */
export function _updateTable(td, callback) {
    const table = $.closest(td, 'table', this._editor).shift();

    if (!table) {
        return;
    }

    const tr = $.closest(td, 'tr', this._editor).shift();

    callback(td, tr, table);

    const range = selectNode(td);
    range.collapse(true);
}
