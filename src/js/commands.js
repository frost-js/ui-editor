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
    const item = $.is(anchor, 'li') ? anchor : $.closest(anchor, 'li')[0];

    if (item && containsNode(root, item) && containsNode(item.parentElement, range.endContainer)) {
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
 * Gets an explicitly styled indentation in em units.
 * @param {HTMLElement} node The indented element.
 * @returns {number} The indentation, or zero when no positive inline margin is set.
 */
function getIndent(node) {
    for (const property of ['marginInlineStart', 'marginLeft']) {
        const value = $.getStyle(node, property);

        if (value) {
            // Preserve exact em steps instead of converting rounded layout pixels back to em.
            if (/^[\d.]+em$/.test(value) && parseFloat(value) > 0) {
                return parseFloat(value);
            }

            const margin = parseFloat($.css(node, property));

            if (margin > 0) {
                return margin / parseFloat($.css(node, 'fontSize'));
            }
        }
    }

    return 0;
}

/**
 * Sets an indentation without changing the element's markup or other styles.
 * @param {HTMLElement} node The indented element.
 * @param {number} indent The indentation in em units.
 */
function setIndent(node, indent) {
    $.removeStyle(node, 'margin-inline-start');
    $.removeStyle(node, 'margin-left');

    if (indent > 0) {
        $.setStyle(node, 'marginInlineStart', `${Number(indent.toFixed(6))}em`);
    }
}

/**
 * Finds the nearest explicit indentation without crossing a table cell boundary.
 * @param {HTMLElement} block The selected block.
 * @param {HTMLElement} root The editing boundary.
 * @returns {HTMLElement|null} The indented ancestor or block.
 */
function getIndentWrapper(block, root) {
    for (let node = block; node && node !== root; node = node.parentElement) {
        if (getIndent(node)) {
            return node;
        }

        if ($.is(node, 'td, th')) {
            break;
        }
    }

    return null;
}

/**
 * Indents sibling blocks or list items.
 * @param {HTMLElement[]} blocks The consecutive selected blocks.
 */
export function indentBlocks(blocks) {
    const first = blocks[0];
    const parent = first.parentElement;

    if ($.is(first, 'li')) {
        let previous = first.previousElementSibling;

        if (!$.is(previous, 'li')) {
            previous = $.create('li', {
                style: { listStyleType: 'none' },
            });

            $.before(first, previous);
        }

        let list = previous.lastElementChild;

        if (!list || list.tagName !== parent.tagName) {
            list = $.create(parent.localName);
            $.append(previous, list);
        }

        $.append(list, blocks);

        return;
    }

    if ($.is(first, 'td, th')) {
        for (const cell of blocks) {
            const wrapper = $.create('div');

            $.setStyle(wrapper, 'marginInlineStart', '2em');
            $.append(wrapper, cell.childNodes);
            $.append(cell, wrapper);
        }

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

    if ($.is(parentItem, 'li') && $.getStyle(parentItem, 'listStyleType') === 'none') {
        removeEmpty(parentItem);
    }
}

/**
 * Outdents a selection from a margin wrapper without modifying surrounding blocks.
 * @param {HTMLElement[]} blocks The selected blocks.
 * @param {HTMLElement} root The editing boundary.
 */
export function outdentBlocks(blocks, root) {
    if ($.is(blocks[0], 'li')) {
        const remaining = [...blocks];

        while (remaining.length) {
            const group = [remaining.shift()];
            const styled = !$.is(group[0].parentElement.parentElement, 'li') && getIndent(group[0]) > 0;

            while (remaining.length && (!$.is(remaining[0].parentElement.parentElement, 'li') && getIndent(remaining[0]) > 0) === styled) {
                group.push(remaining.shift());
            }

            if (styled) {
                for (const item of group) {
                    setIndent(item, getIndent(item) - 2);
                }
            } else {
                outdentItems(group);
            }
        }

        return;
    }

    const groups = [];
    let previousWrapper;

    for (const block of blocks) {
        const wrapper = getIndentWrapper(block, root);

        if (wrapper) {
            if (wrapper === previousWrapper) {
                groups.at(-1).push(block);
            } else {
                groups.push([block]);
            }
        }

        previousWrapper = wrapper;
    }

    for (const selected of groups) {
        // Earlier groups may have split the original wrapper around these blocks.
        const wrapper = getIndentWrapper(selected[0], root);
        const indentationOnly = $.is(wrapper, 'div') &&
            [...wrapper.attributes].every((attribute) => attribute.name === 'style') &&
            Object.keys($.getStyle(wrapper)).every((property) => ['margin-inline-start', 'margin-left'].includes(property));
        const indent = getIndent(wrapper) - 2;

        if (selected.includes(wrapper)) {
            if (indentationOnly && indent <= 0) {
                $.replaceWith(wrapper, wrapper.childNodes);
            } else {
                setIndent(wrapper, indent);
            }
        } else if (selected.length) {
            const following = $.clone(wrapper, { deep: false })[0];
            const originalNodes = new Set($.find('[id]', wrapper));
            let first = selected[0];
            let last = selected.at(-1);

            $.removeAttribute(following, 'id');

            // Split ancestor containers as well, so unselected blocks keep their indentation.
            while (first.parentElement !== wrapper && !first.previousSibling) {
                first = first.parentElement;
            }

            while (last.parentElement !== wrapper && !last.nextSibling) {
                last = last.parentElement;
            }

            const tail = $.createRange();

            tail.selectNodeContents(wrapper);
            tail.setStartAfter(last);
            $.append(following, tail.extractContents());

            const range = $.createRange();

            range.selectNodeContents(wrapper);
            range.setStartBefore(first);

            let content = range.extractContents();

            if (!indentationOnly || indent > 0) {
                const container = $.clone(wrapper, { deep: false })[0];

                $.removeAttribute(container, 'id');
                setIndent(container, indent);
                $.append(container, content);
                content = container;
            }

            // Range extraction clones ancestor elements, including their IDs.
            for (const node of [...$.find('[id]', content), ...$.find('[id]', following)]) {
                if (!originalNodes.has(node)) {
                    $.removeAttribute(node, 'id');
                }
            }

            if (!indentationOnly && !wrapper.children.length && !$.getText(wrapper).trim() && $.hasAttribute(wrapper, 'id')) {
                $.setAttribute(content, 'id', $.getAttribute(wrapper, 'id'));
            }

            $.after(wrapper, [content, following]);
            removeEmpty(wrapper);
            removeEmpty(following);
        }
    }
}
