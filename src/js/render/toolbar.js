/** @import Editor from './../editor.js'; */
import $ from '@fr0st/query';
import { Dropdown } from '@fr0st/ui';

/**
 * Render the toolbar.
 * @param {Editor} editor The editor instance.
 */
export function renderToolbar(editor) {
    const header = $.create('div', {
        class: editor.constructor.classes.toolbar,
    });

    editor._toolbar = $.create('div', {
        class: editor.constructor.classes.toolbarButtons,
        attributes: {
            'role': 'toolbar',
            'aria-label': editor.constructor.lang.toolbar,
        },
    });

    for (const buttons of editor._toolbarButtons) {
        const buttonGroup = $.create('div', {
            class: editor.constructor.classes.btnGroup,
        });

        for (const type of buttons) {
            editor._renderToolbarButton(type, buttonGroup);
        }

        $.append(editor._toolbar, buttonGroup);
    }

    $.append(header, editor._toolbar);
    $.append(editor._container, header);
}

/**
 * Render a toolbar button.
 * @param {Editor} editor The editor instance.
 * @param {string} type The button type.
 * @param {HTMLElement} parent The parent element.
 */
export function renderToolbarButton(editor, type, parent) {
    const data = editor.constructor.plugins[type];

    const button = editor._renderButton({
        icon: type,
        title: editor.constructor.lang.plugins[type],
        ...data,
    });

    editor._buttons.push({ button, data, type });

    editor._setToolbarData(button, data, type);

    if ('dropdown' in data) {
        editor._renderToolbarDropdown(parent, button, data.dropdown);
    } else {
        $.append(parent, button);
    }
}

/**
 * Render a toolbar dropdown.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} buttonGroup The button group element.
 * @param {HTMLElement} button The button element.
 * @param {Array|Function} dropdownContent The dropdown content.
 */
export function renderToolbarDropdown(editor, buttonGroup, button, dropdownContent) {
    const dropGroup = $.create('div', {
        class: editor.constructor.classes.dropdownGroup,
        attributes: {
            role: 'group',
        },
    });

    $.addClass(button, editor.constructor.classes.dropdownToggle);
    $.setDataset(button, { uiToggle: 'dropdown' });
    $.setAttribute(button, {
        'aria-haspopup': true,
        'aria-expanded': false,
    });
    $.append(dropGroup, button);

    const dropdown = $.create('div', {
        class: editor.constructor.classes.dropdown,
    });

    if ($._isArray(dropdownContent)) {
        $.addClass(dropdown, editor.constructor.classes.dropdownButtons);

        for (const dropdownItems of dropdownContent) {
            const subDropGroup = $.create('div', {
                class: editor.constructor.classes.btnGroup,
                attributes: {
                    role: 'group',
                },
            });

            for (const type of dropdownItems) {
                editor._renderToolbarButton(type, subDropGroup);
            }

            $.append(dropdown, subDropGroup);
        }
    } else if ($._isFunction(dropdownContent)) {
        dropdownContent.bind(editor)(dropdown);
    }

    $.append(dropGroup, dropdown);
    $.append(buttonGroup, dropGroup);
    editor._ownComponent(Dropdown.init(button));
    editor.listen(document, 'keydown.ui.editor', (event) => {
        if (event.code === 'Escape' && dropdown.contains(document.activeElement)) {
            button.focus();
        }
    }, { capture: true });
}

/**
 * Set data for a toolbar action.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} node The action node.
 * @param {object} data The data to set.
 * @param {string} [type] The action type.
 */
export function setToolbarData(editor, node, data, type) {
    if (data.command) {
        $.setDataset(node, { uiCommand: data.command });

        if (data.value) {
            $.setDataset(node, { uiValue: data.value });
        }
    } else if (data.action && type) {
        $.setDataset(node, { uiAction: type });
    }
}
