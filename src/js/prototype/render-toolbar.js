import $ from '@fr0st/query';

/**
 * Render the toolbar.
 */
export function _renderToolbar() {
    const header = $.create('div', {
        class: this.constructor.classes.toolbar,
    });

    this._toolbar = $.create('div', {
        class: this.constructor.classes.toolbarButtons,
        attributes: {
            role: 'toolbar',
        },
    });

    for (const buttons of this._toolbarButtons) {
        const buttonGroup = $.create('div', {
            class: this.constructor.classes.btnGroup,
        });

        for (const type of buttons) {
            this._renderToolbarButton(type, buttonGroup);
        }

        $.append(this._toolbar, buttonGroup);
    }

    $.append(header, this._toolbar);
    $.append(this._container, header);
}

/**
 * Render a toolbar button.
 * @param {string} type The button type.
 * @param {HTMLElement} parent The parent element.
 */
export function _renderToolbarButton(type, parent) {
    const data = this.constructor.plugins[type];

    const button = this._renderButton({
        icon: type,
        title: this.constructor.lang.plugins[type],
        ...data,
    });

    this._buttons.push({ button, data, type });

    this._setToolbarData(button, data, type);

    if ('dropdown' in data) {
        this._renderToolbarDropdown(parent, button, data.dropdown);
    } else {
        $.append(parent, button);
    }
}

/**
 * Render a toolbar dropdown.
 * @param {HTMLElement} buttonGroup The button group element.
 * @param {HTMLElement} button The button element.
 * @param {Array|Function} dropdownContent The dropdown content.
 */
export function _renderToolbarDropdown(buttonGroup, button, dropdownContent) {
    const dropGroup = $.create('div', {
        class: this.constructor.classes.dropdownGroup,
        attributes: {
            role: 'group',
        },
    });

    $.addClass(button, this.constructor.classes.dropdownToggle);
    $.setDataset(button, { uiToggle: 'dropdown' });
    $.setAttribute(button, {
        'aria-has-popup': true,
        'aria-expanded': false,
    });
    $.append(dropGroup, button);

    const dropdown = $.create('ul', {
        class: this.constructor.classes.dropdown,
    });

    if ($._isArray(dropdownContent)) {
        $.addClass(dropdown, this.constructor.classes.dropdownButtons);

        for (const dropdownItems of dropdownContent) {
            const subDropGroup = $.create('div', {
                class: this.constructor.classes.btnGroup,
                attributes: {
                    role: 'group',
                },
            });

            for (const type of dropdownItems) {
                this._renderToolbarButton(type, subDropGroup);
            }

            $.append(dropdown, subDropGroup);
        }
    } else if ($._isFunction(dropdownContent)) {
        dropdownContent.bind(this)(dropdown);
    }

    $.append(dropGroup, dropdown);
    $.append(buttonGroup, dropGroup);
}

/**
 * Set data for a toolbar action.
 * @param {HTMLElement} node The action node.
 * @param {object} data The data to set.
 * @param {string} [type] The action type.
 */
export function _setToolbarData(node, data, type) {
    if (data.command) {
        $.setDataset(node, { uiCommand: data.command });

        if (data.value) {
            $.setDataset(node, { uiValue: data.value });
        }
    } else if (data.action && type) {
        $.setDataset(node, { uiAction: type });
    }
}
