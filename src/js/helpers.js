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
