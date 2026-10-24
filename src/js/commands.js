/** @import Editor from './editor.js'; */

import $ from '@fr0st/query';
import { isPhrasingContent } from './normalize.js';
import { getRange, restoreSelection, saveSelection } from './selection.js';

/**
 * Tests whether a range includes content inside a block rather than just its boundary.
 * @param {Range} range The selected range.
 * @param {HTMLElement} block The block to test.
 * @returns {boolean} Whether the block contains selected content.
 */
function intersects(range, block) {
    if (range.collapsed) {
        return block === range.startContainer || block.contains(range.startContainer);
    }
    const start = range.cloneRange();
    const end = range.cloneRange();
    start.collapse(true);
    end.collapse(false);
    const blockStart = document.createRange();
    blockStart.selectNodeContents(block);
    const blockEnd = blockStart.cloneRange();
    blockStart.collapse(true);
    blockEnd.collapse(false);
    if (start.compareBoundaryPoints(Range.START_TO_START, blockEnd) >= 0 ||
        end.compareBoundaryPoints(Range.START_TO_START, blockStart) <= 0) {
        return false;
    }
    const overlap = range.cloneRange();
    if (start.compareBoundaryPoints(Range.START_TO_START, blockStart) < 0) {
        overlap.setStart(block, 0);
    }
    if (end.compareBoundaryPoints(Range.START_TO_START, blockEnd) > 0) {
        overlap.setEnd(block, block.childNodes.length);
    }
    return Boolean(overlap.toString() ||
        [...block.querySelectorAll('br, img, hr, iframe, video, audio, svg, input')].some((node) => overlap.intersectsNode(node)) ||
        !block.childNodes.length);
}

/**
 * Gets the block units affected by a selection.
 * @param {HTMLElement} root The editing boundary.
 * @param {Range} range The selected range.
 * @returns {HTMLElement[]} The selected blocks or sibling list items.
 */
function selectedBlocks(root, range) {
    const anchor = range.startContainer.nodeType === Node.ELEMENT_NODE ?
        range.startContainer : range.startContainer.parentElement;
    const item = anchor.closest('li');
    if (item && root.contains(item)) {
        return [...item.parentElement.children].filter((node) => node.matches('li') && intersects(range, node));
    }
    const blocks = [];
    const visit = (parent) => {
        for (const child of [...parent.children]) {
            if (!range.intersectsNode(child)) {
                continue;
            }
            if (child.matches('p, h1, h2, h3, h4, h5, h6, pre, li') ||
                (child.matches('div, blockquote, td, th') && [...child.childNodes].every(isPhrasingContent))) {
                if (intersects(range, child)) {
                    blocks.push(child);
                }
            } else {
                visit(child);
            }
        }
    };
    visit(root);
    return blocks;
}

/**
 * Removes empty structural containers while preserving any remaining inline children.
 * @param {HTMLElement} node The container.
 */
function removeEmpty(node) {
    if (!node.children.length && !node.textContent.trim()) {
        node.replaceWith(...node.childNodes);
    }
}

/**
 * Indents sibling blocks or list items.
 * @param {HTMLElement[]} blocks The consecutive selected blocks.
 */
function indentBlocks(blocks) {
    const first = blocks[0];
    const parent = first.parentElement;
    if (first.matches('li')) {
        const previous = first.previousElementSibling;
        if (!previous?.matches('li')) {
            return;
        }
        let list = previous.lastElementChild;
        if (!list || list.tagName !== parent.tagName) {
            list = document.createElement(parent.localName);
            previous.append(list);
        }
        list.append(...blocks);
        return;
    }
    const wrapper = document.createElement('div');
    wrapper.style.marginInlineStart = '2em';
    first.before(wrapper);
    wrapper.append(...blocks);
}

/**
 * Moves list items out of one nesting level, retaining following items as children.
 * @param {HTMLElement[]} blocks The consecutive selected list items.
 */
function outdentItems(blocks) {
    const list = blocks[0].parentElement;
    const parentItem = list.parentElement;
    const following = list.cloneNode(false);
    following.removeAttribute('id');
    while (blocks.at(-1).nextSibling) {
        following.append(blocks.at(-1).nextSibling);
    }
    if (parentItem.matches('li')) {
        if (following.children.length) {
            blocks.at(-1).append(following);
        }
        parentItem.after(...blocks);
    } else {
        const content = document.createDocumentFragment();
        for (const item of blocks) {
            const paragraph = document.createElement('p');
            while (item.firstChild && isPhrasingContent(item.firstChild)) {
                paragraph.append(item.firstChild);
            }
            if (paragraph.childNodes.length) {
                content.append(paragraph);
            }
            content.append(...item.childNodes);
            item.remove();
        }
        if (following.children.length) {
            content.append(following);
        }
        list.after(content);
    }
    removeEmpty(list);
}

/**
 * Outdents a selection from a margin wrapper without modifying surrounding blocks.
 * @param {HTMLElement[]} blocks The selected blocks.
 * @param {HTMLElement} root The editing boundary.
 */
function outdentBlocks(blocks, root) {
    if (blocks[0].matches('li')) {
        outdentItems(blocks);
        return;
    }
    const wrappers = new Set();
    for (const block of blocks) {
        let wrapper = block;
        while (wrapper && wrapper !== root && !(parseFloat(wrapper.style.marginInlineStart || wrapper.style.marginLeft) > 0)) {
            wrapper = wrapper.parentElement;
        }
        if (wrapper && wrapper !== root) {
            wrappers.add(wrapper);
        }
    }
    for (const wrapper of wrappers) {
        const selected = [...wrapper.childNodes].filter((node) => blocks.some((block) =>
            block === node || node.contains(block)));
        if (blocks.includes(wrapper)) {
            wrapper.replaceWith(...wrapper.childNodes);
        } else if (selected.length) {
            const following = wrapper.cloneNode(false);
            following.removeAttribute('id');
            while (selected.at(-1).nextSibling) {
                following.append(selected.at(-1).nextSibling);
            }
            wrapper.after(...selected, following);
            removeEmpty(wrapper);
            removeEmpty(following);
        }
    }
}

/**
 * Changes indentation as a single history operation with selection preservation.
 * @param {Editor} editor The editor.
 * @param {boolean} outdent Whether to remove one indentation level.
 */
export function changeIndent(editor, outdent) {
    if (!editor.node || ($.is(editor.node, ':disabled') || editor.node.readOnly)) {
        return;
    }
    editor._focusEditor();
    if (!editor.node) {
        return;
    }
    const range = getRange(editor._editor);
    if (!range) {
        return;
    }
    let blocks = selectedBlocks(editor._editor, range);
    if (outdent && !blocks.length) {
        return;
    }
    editor._addHistory({ html: editor._editor.innerHTML, selectionData: editor._getSelectionData() });
    editor._observe(false);
    const markers = saveSelection(editor._editor);
    try {
        if (!blocks.length) {
            const paragraph = document.createElement('p');
            let first = markers.start;
            while (first.parentNode !== editor._editor) {
                first = first.parentNode;
            }
            while (first.previousSibling && isPhrasingContent(first.previousSibling)) {
                first = first.previousSibling;
            }
            const inline = [];
            for (let node = first; node && isPhrasingContent(node); node = node.nextSibling) {
                inline.push(node);
            }
            if (inline.length) {
                inline[0].before(paragraph);
                paragraph.append(...inline);
                blocks = [paragraph];
            }
        }
        while (blocks.length) {
            const group = [blocks.shift()];
            while (blocks.length && group.at(-1).nextElementSibling === blocks[0]) {
                group.push(blocks.shift());
            }
            if (outdent) {
                outdentBlocks(group, editor._editor);
            } else {
                indentBlocks(group);
            }
        }
    } finally {
        restoreSelection(markers);
        editor._normalize();
        editor._updateValue();
        editor._observe();
    }
}
