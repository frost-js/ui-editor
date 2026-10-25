import $ from '@fr0st/query';

/**
 * Checks whether a node is the parent itself or one of its descendants.
 * @param {Node|null|undefined} parent The parent node.
 * @param {Node|null|undefined} node The node to check.
 * @returns {boolean} Whether the parent contains the node.
 */
export function containsNode(parent, node) {
    return Boolean(parent && node) && ($.isSame(parent, node) || $.hasDescendent(parent, node));
}

/**
 * Checks a table's own cells for column or row spans, including rowSpan="0".
 * @param {HTMLTableElement} table The table to check.
 * @returns {boolean} Whether the table contains merged cells.
 */
export function hasMergedCells(table) {
    return [...$.getProperty(table, 'rows')].some((row) =>
        [...$.getProperty(row, 'cells')].some((cell) =>
            $.getProperty(cell, 'colSpan') > 1 || $.getProperty(cell, 'rowSpan') !== 1,
        ),
    );
}
