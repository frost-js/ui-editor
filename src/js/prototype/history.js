import $ from '@fr0st/query';

/**
 * Get a node from a container path.
 * @param {Array} path The path.
 * @param {HTMLElement} container The container.
 * @returns {Node|HTMLElement} The node.
 */
function getNodeFromPath(path, container) {
    let current = container;
    for (const index of path) {
        current = $.contents(current)[index];
    }

    return current;
}

/**
 * Get the path to a node from a container.
 * @param {Node|HTMLElement} node The node.
 * @param {HTMLElement} container The container.
 * @returns {Array} The path.
 */
function getPathToNode(node, container) {
    if ($.isSame(node, container)) {
        return [];
    }

    return [...$.parents(node, null, container), node]
        .map((node) => $.contents($.parent(node).shift()).indexOf(node));
}

/**
 * Add an item to the history.
 * @param {object} [data] The history data.
 * @param {string} data.html The serialized editor content.
 * @param {object|null} [data.selectionData=null] The saved selection paths and offsets.
 */
export function _addHistory({ html, selectionData = null } = {}) {
    this._history.push({ html, selectionData });

    while (this._history.length > this.options.historyLimit) {
        this._history.shift();
    }
}

/**
 * Get selection data for history.
 * @returns {object} The selection data.
 */
export function _getSelectionData() {
    const { anchorNode, anchorOffset, focusNode, focusOffset } = window.getSelection();

    if (
        !anchorNode ||
        !focusNode ||
        (!$.isSame(this._editor, anchorNode) && !$.hasDescendent(this._editor, anchorNode)) ||
        (!$.isSame(this._editor, focusNode) && !$.hasDescendent(this._editor, focusNode))
    ) {
        return null;
    }

    return {
        anchorPath: getPathToNode(anchorNode, this._editor),
        anchorOffset,
        focusPath: getPathToNode(focusNode, this._editor),
        focusOffset,
    };
}

/**
 * Restore an item from history.
 * @param {object} [data] The history data.
 * @param {string} data.html The serialized editor content.
 * @param {object|null} [data.selectionData=null] The saved selection paths and offsets.
 */
export function _restoreHistory({ html, selectionData = null } = {}) {
    this._observe(false);

    $.setHtml(this._editor, html);
    $.setValue(this.node, html);

    const selection = window.getSelection();

    if (selectionData) {
        const anchorNode = getNodeFromPath(selectionData.anchorPath, this._editor);
        const focusNode = getNodeFromPath(selectionData.focusPath, this._editor);
        selection.setBaseAndExtent(anchorNode, selectionData.anchorOffset, focusNode, selectionData.focusOffset);
    } else {
        selection.selectAllChildren(this._editor);
        selection.collapseToEnd();
    }

    this._checkEmpty();
    this._observe();
}
