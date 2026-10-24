/** @import Editor from './../editor.js'; */
import $ from '@fr0st/query';

/**
 * Render the popover elements.
 * @param {Editor} editor The editor instance.
 */
export function renderPopover(editor) {
    editor._popover = $.create('div', {
        class: editor.constructor.classes.popover,
        attributes: {
            role: 'tooltip',
        },
    });

    editor._popoverArrow = $.create('div', {
        class: editor.constructor.classes.popoverArrow,
    });

    editor._popoverBody = $.create('div', {
        class: editor.constructor.classes.popoverBody,
    });

    $.hide(editor._popover);
    $.append(editor._popover, editor._popoverArrow);
    $.append(editor._popover, editor._popoverBody);
    $.append(editor._container, editor._popover);
}

/**
 * Render a popover item.
 * @param {Editor} editor The editor instance.
 * @param {string} type The item type.
 * @param {HTMLElement} parent The parent element.
 */
export function renderPopoverItem(editor, type, parent) {
    const data = editor.constructor.popovers[type];

    let node;
    if (data.render) {
        node = data.render.bind(editor)(editor._currentNode);
    } else {
        node = editor._renderButton({
            icon: type,
            title: editor.constructor.lang.popovers[type],
            ...data,
        });

        $.setDataset(node, { uiAction: type });
    }

    $.append(parent, node);
}

/**
 * Render popover items.
 * @param {Editor} editor The editor instance.
 * @param {Array} items The items to render.
 */
export function renderPopoverItems(editor, items) {
    for (const item of items) {
        if ($._isString(item)) {
            editor._renderPopoverItem(item, editor._popoverBody);
        } else {
            const node = $.create('div', {
                class: editor.constructor.classes.btnGroup,
                attributes: {
                    role: 'group',
                },
            });

            for (const type of item) {
                editor._renderPopoverItem(type, node);
            }

            $.append(editor._popoverBody, node);
        }
    }
}
