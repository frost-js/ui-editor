import $ from '@fr0st/query';
import { containsNode } from './helpers.js';
import { isPhrasingContent } from './normalize.js';

const window = $.getWindow();

/**
 * Tests whether a range includes content inside a block rather than just its boundary.
 * @param {Range} range The selected range.
 * @param {HTMLElement} block The block to test.
 * @returns {boolean} Whether the block contains selected content.
 */
function intersects(range, block) {
    if (range.collapsed) {
        return containsNode(block, range.startContainer);
    }

    const start = range.cloneRange();
    const end = range.cloneRange();

    start.collapse(true);
    end.collapse(false);

    const blockStart = $.createRange();

    blockStart.selectNodeContents(block);

    const blockEnd = blockStart.cloneRange();

    blockStart.collapse(true);
    blockEnd.collapse(false);

    if (start.compareBoundaryPoints(window.Range.START_TO_START, blockEnd) >= 0 ||
        end.compareBoundaryPoints(window.Range.START_TO_START, blockStart) <= 0) {
        return false;
    }

    const overlap = range.cloneRange();

    if (start.compareBoundaryPoints(window.Range.START_TO_START, blockStart) < 0) {
        overlap.setStart(block, 0);
    }

    if (end.compareBoundaryPoints(window.Range.START_TO_START, blockEnd) > 0) {
        overlap.setEnd(block, block.childNodes.length);
    }

    return Boolean(overlap.toString() ||
        $.find('br, img, hr, iframe, video, audio, svg, input', block).some((node) => overlap.intersectsNode(node)) ||
        !block.childNodes.length);
}

/**
 * Gets the block units affected by a selection.
 * @param {HTMLElement} root The editing boundary.
 * @param {Range} range The selected range.
 * @returns {HTMLElement[]} The selected blocks or sibling list items.
 */
export function getSelectedBlocks(root, range) {
    const anchor = range.startContainer.nodeType === window.Node.ELEMENT_NODE ?
        range.startContainer : range.startContainer.parentElement;
    const item = $.closest(anchor, 'li')[0];

    if (item && containsNode(root, item)) {
        return [...item.parentElement.children].filter((node) => $.is(node, 'li') && intersects(range, node));
    }

    const blocks = [];
    const visit = (parent) => {
        for (const child of [...parent.children]) {
            if (!range.intersectsNode(child)) {
                continue;
            }

            if ($.is(child, 'p, h1, h2, h3, h4, h5, h6, pre, li') ||
                ($.is(child, 'div, blockquote, td, th') && [...child.childNodes].every(isPhrasingContent))) {
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
    if (!node.children.length && !$.getText(node).trim()) {
        $.replaceWith(node, node.childNodes);
    }
}

/**
 * Indents sibling blocks or list items.
 * @param {HTMLElement[]} blocks The consecutive selected blocks.
 */
export function indentBlocks(blocks) {
    const first = blocks[0];
    const parent = first.parentElement;

    if ($.is(first, 'li')) {
        const previous = first.previousElementSibling;

        if (!$.is(previous, 'li')) {
            return;
        }

        let list = previous.lastElementChild;

        if (!list || list.tagName !== parent.tagName) {
            list = $.create(parent.localName);
            $.append(previous, list);
        }

        $.append(list, blocks);

        return;
    }

    const wrapper = $.create('div');

    $.setStyle(wrapper, 'marginInlineStart', '2em');
    $.before(first, wrapper);
    $.append(wrapper, blocks);
}

/**
 * Moves list items out of one nesting level, retaining following items as children.
 * @param {HTMLElement[]} blocks The consecutive selected list items.
 */
function outdentItems(blocks) {
    const list = blocks[0].parentElement;
    const parentItem = list.parentElement;
    const following = $.clone(list, { deep: false })[0];

    $.removeAttribute(following, 'id');

    while (blocks.at(-1).nextSibling) {
        $.append(following, blocks.at(-1).nextSibling);
    }

    if ($.is(parentItem, 'li')) {
        if (following.children.length) {
            $.append(blocks.at(-1), following);
        }

        $.after(parentItem, blocks);
    } else {
        const content = $.createFragment();

        for (const item of blocks) {
            const paragraph = $.create('p');

            while (item.firstChild && isPhrasingContent(item.firstChild)) {
                $.append(paragraph, item.firstChild);
            }

            if (paragraph.childNodes.length) {
                $.append(content, paragraph);
            }

            $.append(content, item.childNodes);
            $.remove(item);
        }

        if (following.children.length) {
            $.append(content, following);
        }

        $.after(list, content);
    }

    removeEmpty(list);
}

/**
 * Outdents a selection from a margin wrapper without modifying surrounding blocks.
 * @param {HTMLElement[]} blocks The selected blocks.
 * @param {HTMLElement} root The editing boundary.
 */
export function outdentBlocks(blocks, root) {
    if ($.is(blocks[0], 'li')) {
        outdentItems(blocks);

        return;
    }

    const wrappers = new Set();

    for (const block of blocks) {
        let wrapper = block;

        while (wrapper && wrapper !== root && !(parseFloat($.getStyle(wrapper, 'marginInlineStart') || $.getStyle(wrapper, 'marginLeft')) > 0)) {
            wrapper = wrapper.parentElement;
        }

        if (wrapper && wrapper !== root) {
            wrappers.add(wrapper);
        }
    }

    for (const wrapper of wrappers) {
        const selected = [...wrapper.childNodes].filter((node) => blocks.some((block) =>
            containsNode(node, block)));

        if (blocks.includes(wrapper)) {
            $.replaceWith(wrapper, wrapper.childNodes);
        } else if (selected.length) {
            const following = $.clone(wrapper, { deep: false })[0];

            $.removeAttribute(following, 'id');

            while (selected.at(-1).nextSibling) {
                $.append(following, selected.at(-1).nextSibling);
            }

            $.after(wrapper, [...selected, following]);
            removeEmpty(wrapper);
            removeEmpty(following);
        }
    }
}
