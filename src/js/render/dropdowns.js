/** @import Editor from './../editor.js'; */
import $ from '@fr0st/query';
import { Tooltip } from '@fr0st/ui';

/**
 * Render a color dropdown.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function colorDropdown(editor, dropdown) {
    const container = $.create('div', {
        class: editor.constructor.classes.colorContainerRow,
    });

    const col1 = $.create('div', {
        class: editor.constructor.classes.colorContainerColumn,
    });

    const col2 = $.create('div', {
        class: editor.constructor.classes.colorContainerColumn,
    });

    const foreLabel = $.create('small', {
        text: editor.constructor.lang.dropdowns.colorForeground,
        class: editor.constructor.classes.colorLabel,
    });

    const backLabel = $.create('small', {
        text: editor.constructor.lang.dropdowns.colorBackground,
        class: editor.constructor.classes.colorLabel,
    });

    $.append(col1, foreLabel);
    $.append(col2, backLabel);

    const foreDefaultContainer = $.create('div', {
        class: editor.constructor.classes.colorLabelContainer,
    });
    $.append(col1, foreDefaultContainer);

    const backDefaultContainer = $.create('div', {
        class: editor.constructor.classes.colorLabelContainer,
    });
    $.append(col2, backDefaultContainer);

    const foreDefault = $.create('button', {
        text: editor.constructor.lang.dropdowns.colorDefault,
        class: editor.constructor.classes.colorDefaultBtn,
        attributes: {
            type: 'button',
        },
    });
    $.append(foreDefaultContainer, foreDefault);

    editor._setToolbarData(foreDefault, {
        command: 'foreColor',
        value: 'initial',
    });

    const backDefault = $.create('button', {
        text: editor.constructor.lang.dropdowns.colorTransparent,
        class: editor.constructor.classes.colorDefaultBtn,
        attributes: {
            type: 'button',
        },
    });
    $.append(backDefaultContainer, backDefault);

    editor._setToolbarData(backDefault, {
        command: 'backColor',
        value: 'initial',
    });

    for (const colorRow of editor.constructor.colors) {
        const foreRow = $.create('div', {
            class: editor.constructor.classes.colorRow,
        });
        $.append(col1, foreRow);

        const backRow = $.create('div', {
            class: editor.constructor.classes.colorRow,
        });
        $.append(col2, backRow);

        for (const [colorName, color] of Object.entries(colorRow)) {
            const foreLink = $.create('button', {
                class: editor.constructor.classes.color,
                style: {
                    backgroundColor: color,
                },
                attributes: {
                    'data-ui-title': colorName,
                    'type': 'button',
                    'aria-label': colorName,
                },
            });
            $.append(foreRow, foreLink);

            editor._ownComponent(Tooltip.init(foreLink, {
                appendTo: document.body,
                placement: 'bottom',
            }));

            editor._setToolbarData(foreLink, {
                command: 'foreColor',
                value: color,
            });

            const backLink = $.create('button', {
                class: editor.constructor.classes.color,
                style: {
                    backgroundColor: color,
                },
                attributes: {
                    'data-ui-title': colorName,
                    'type': 'button',
                    'aria-label': colorName,
                },
            });
            $.append(backRow, backLink);

            editor._ownComponent(Tooltip.init(backLink, {
                appendTo: document.body,
                placement: 'bottom',
            }));

            editor._setToolbarData(backLink, {
                command: 'backColor',
                value: color,
            });
        }
    }

    $.append(container, col1);
    $.append(container, col2);

    $.setStyle(dropdown, { minInlineSize: 'min(350px, calc(100vw - 2rem))' });
    $.append(dropdown, container);
}

/**
 * Render a font dropdown.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function fontDropdown(editor, dropdown) {
    const fonts = editor._fonts.sort();

    for (const font of fonts) {
        const button = $.create('button', {
            text: font,
            class: editor.constructor.classes.dropdownItem,
            style: {
                fontFamily: font,
            },
            attributes: {
                'type': 'button',
                'aria-label': font,
            },
        });

        const data = {
            command: 'fontName',
            value: font,
        };

        editor._buttons.push({ button, data });

        editor._setToolbarData(button, data);

        $.append(dropdown, button);
    }
}

/**
 * Render a font size dropdown.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function fontSizeDropdown(editor, dropdown) {
    const sizes = Object.values(editor.constructor.fontSizes);

    for (const size of sizes) {
        const button = $.create('button', {
            text: size,
            class: editor.constructor.classes.dropdownItem,
            attributes: {
                'type': 'button',
                'aria-label': size,
            },
        });

        const data = {
            command: 'fontSize',
            value: size,
        };

        editor._buttons.push({ button, data });

        editor._setToolbarData(button, data);

        $.append(dropdown, button);
    }
}

/**
 * Render a style dropdown.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function styleDropdown(editor, dropdown) {
    for (const tag of editor.constructor.styles) {
        const button = $.create('button', {
            class: editor.constructor.classes.dropdownItem,
            attributes: {
                'type': 'button',
                'aria-label': editor.constructor.lang.styles[tag],
            },
        });

        const content = $.create(tag, {
            text: editor.constructor.lang.styles[tag],
            class: editor.constructor.classes.styleContent,
        });

        $.append(button, content);

        const data = {
            command: 'formatBlock',
            value: tag.toUpperCase(),
        };

        editor._buttons.push({ button, data });

        editor._setToolbarData(button, data);

        $.append(dropdown, button);
    }
}

/**
 * Render a table dropdown.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function tableDropdown(editor, dropdown) {
    const container = $.create('div');

    for (let i = 0; i < 10; i++) {
        const row = $.create('div', {
            class: editor.constructor.classes.tableRow,
        });
        $.append(container, row);

        for (let j = 0; j < 10; j++) {
            const cell = $.create('div', {
                class: editor.constructor.classes.tableCell,
            });
            $.append(row, cell);

            if (i > 4 || j > 4) {
                $.hide(cell);
            }

            const link = $.create('button', {
                class: editor.constructor.classes.tableLink,
                attributes: {
                    'type': 'button',
                    'aria-label': `${i + 1} × ${j + 1} table`,
                },
                dataset: {
                    uiColumn: j,
                    uiRow: i,
                },
            });
            $.append(cell, link);
        }
    }

    const info = $.create('span', {
        class: editor.constructor.classes.tableInfo,
    });

    $.addClass(dropdown, editor.constructor.classes.tableDropdown);
    $.append(dropdown, container);
    $.append(dropdown, info);

    editor.listen(container, 'click.ui.editor', (e) => {
        const cols = $.getDataset(e.currentTarget, 'uiColumn');
        const rows = $.getDataset(e.currentTarget, 'uiRow');

        const container = $.create('div');

        const table = $.create('table', {
            class: editor.constructor.classes.table,
        });

        const tbody = $.create('tbody');

        for (let i = 0; i <= rows; i++) {
            const tr = $.create('tr');

            for (let j = 0; j <= cols; j++) {
                const td = $.create('td', {
                    html: '<br>',
                });
                $.append(tr, td);
            }

            $.append(tbody, tr);
        }

        $.append(table, tbody);

        $.append(container, table);

        const br = $.create('br');

        $.append(container, br);

        const html = $.getHtml(container);

        editor.insertHTML(html);
    }, { delegate: 'button' });

    editor.listen(container, 'mouseover.ui.editor focusin.ui.editor', (e) => {
        const targetCol = $.getDataset(e.currentTarget, 'uiColumn');
        const targetRow = $.getDataset(e.currentTarget, 'uiRow');

        const colMin = Math.max(targetCol + 1, 4);
        const rowMin = Math.max(targetRow + 1, 4);

        const links = $.find('button', container);

        for (const element of links) {
            const col = $.getDataset(element, 'uiColumn');
            const row = $.getDataset(element, 'uiRow');

            if (col <= targetCol && row <= targetRow) {
                $.addClass(element, editor.constructor.classes.tableHover);
            } else {
                $.removeClass(element, editor.constructor.classes.tableHover);
            }

            const parent = $.parent(element);
            if (col <= colMin && row <= rowMin) {
                $.show(parent);
            } else {
                $.hide(parent);
            }
        }

        $.setText(info, `${targetCol + 1} x ${targetRow + 1}`);
    }, { delegate: 'button' });
}
