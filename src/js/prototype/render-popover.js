import $ from '@fr0st/query';

/**
 * Render the popover elements.
 */
export function _renderPopover() {
    this._popover = $.create('div', {
        class: this.constructor.classes.popover,
        attributes: {
            role: 'tooltip',
        },
    });

    this._popoverArrow = $.create('div', {
        class: this.constructor.classes.popoverArrow,
    });

    this._popoverBody = $.create('div', {
        class: this.constructor.classes.popoverBody,
    });

    $.hide(this._popover);
    $.append(this._popover, this._popoverArrow);
    $.append(this._popover, this._popoverBody);
    $.append(this._container, this._popover);
}

/**
 * Render a popover item.
 * @param {string} type The item type.
 * @param {HTMLElement} parent The parent element.
 */
export function _renderPopoverItem(type, parent) {
    const data = this.constructor.popovers[type];

    let node;
    if (data.render) {
        node = data.render.bind(this)(this._currentNode);
    } else {
        node = this._renderButton({
            icon: type,
            title: this.constructor.lang.popovers[type],
            ...data,
        });

        $.setDataset(node, { uiAction: type });
    }

    $.append(parent, node);
}

/**
 * Render popover items.
 * @param {Array} items The items to render.
 */
export function _renderPopoverItems(items) {
    for (const item of items) {
        if ($._isString(item)) {
            this._renderPopoverItem(item, this._popoverBody);
        } else {
            const node = $.create('div', {
                class: this.constructor.classes.btnGroup,
                attributes: {
                    role: 'group',
                },
            });

            for (const type of item) {
                this._renderPopoverItem(type, node);
            }

            $.append(this._popoverBody, node);
        }
    }
}
