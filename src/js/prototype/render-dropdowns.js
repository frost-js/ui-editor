import $ from '@fr0st/query';
import { Tooltip } from '@fr0st/ui';

/**
 * Render a color dropdown.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function _colorDropdown(dropdown) {
    const container = $.create('li', {
        class: this.constructor.classes.colorContainerRow,
    });

    const col1 = $.create('div', {
        class: this.constructor.classes.colorContainerColumn,
    });

    const col2 = $.create('div', {
        class: this.constructor.classes.colorContainerColumn,
    });

    const foreLabel = $.create('small', {
        text: this.constructor.lang.dropdowns.colorForeground,
        class: this.constructor.classes.colorLabel,
    });

    const backLabel = $.create('small', {
        text: this.constructor.lang.dropdowns.colorBackground,
        class: this.constructor.classes.colorLabel,
    });

    $.append(col1, foreLabel);
    $.append(col2, backLabel);

    const foreDefaultContainer = $.create('div', {
        class: this.constructor.classes.colorLabelContainer,
    });
    $.append(col1, foreDefaultContainer);

    const backDefaultContainer = $.create('div', {
        class: this.constructor.classes.colorLabelContainer,
    });
    $.append(col2, backDefaultContainer);

    const foreDefault = $.create('button', {
        text: this.constructor.lang.dropdowns.colorDefault,
        class: this.constructor.classes.colorDefaultBtn,
        attributes: {
            type: 'button',
        },
    });
    $.append(foreDefaultContainer, foreDefault);

    this._setToolbarData(foreDefault, {
        command: 'foreColor',
        value: 'initial',
    });

    const backDefault = $.create('button', {
        text: this.constructor.lang.dropdowns.colorTransparent,
        class: this.constructor.classes.colorDefaultBtn,
        attributes: {
            type: 'button',
        },
    });
    $.append(backDefaultContainer, backDefault);

    this._setToolbarData(backDefault, {
        command: 'backColor',
        value: 'initial',
    });

    for (const colorRow of this.constructor.colors) {
        const foreRow = $.create('div', {
            class: this.constructor.classes.colorRow,
        });
        $.append(col1, foreRow);

        const backRow = $.create('div', {
            class: this.constructor.classes.colorRow,
        });
        $.append(col2, backRow);

        for (const [colorName, color] of Object.entries(colorRow)) {
            const foreLink = $.create('button', {
                class: this.constructor.classes.color,
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

            Tooltip.init(foreLink, {
                appendTo: document.body,
                placement: 'bottom',
            });

            this._setToolbarData(foreLink, {
                command: 'foreColor',
                value: color,
            });

            const backLink = $.create('button', {
                class: this.constructor.classes.color,
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

            Tooltip.init(backLink, {
                appendTo: document.body,
                placement: 'bottom',
            });

            this._setToolbarData(backLink, {
                command: 'backColor',
                value: color,
            });
        }
    }

    $.append(container, col1);
    $.append(container, col2);

    $.setStyle(dropdown, { minWidth: '350px' });
    $.append(dropdown, container);
}

/**
 * Render a font dropdown.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function _fontDropdown(dropdown) {
    const fonts = this._fonts.sort();

    for (const font of fonts) {
        const button = $.create('li', {
            text: font,
            class: this.constructor.classes.dropdownItem,
            style: {
                fontFamily: font,
            },
            attributes: {
                'role': 'button',
                'aria-label': font,
            },
        });

        const data = {
            command: 'fontName',
            value: font,
        };

        this._buttons.push({ button, data });

        this._setToolbarData(button, data);

        $.append(dropdown, button);
    }
}

/**
 * Render a font size dropdown.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function _fontSizeDropdown(dropdown) {
    const sizes = Object.values(this.constructor.fontSizes);

    for (const size of sizes) {
        const button = $.create('li', {
            text: size,
            class: this.constructor.classes.dropdownItem,
            attributes: {
                'role': 'button',
                'aria-label': size,
            },
        });

        const data = {
            command: 'fontSize',
            value: size,
        };

        this._buttons.push({ button, data });

        this._setToolbarData(button, data);

        $.append(dropdown, button);
    }
}

/**
 * Render a style dropdown.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function _styleDropdown(dropdown) {
    for (const tag of this.constructor.styles) {
        const button = $.create('li', {
            class: this.constructor.classes.dropdownItem,
            attributes: {
                'role': 'button',
                'aria-label': this.constructor.lang.styles[tag],
            },
        });

        const content = $.create(tag, {
            text: this.constructor.lang.styles[tag],
            class: this.constructor.classes.styleContent,
        });

        $.append(button, content);

        const data = {
            command: 'formatBlock',
            value: tag.toUpperCase(),
        };

        this._buttons.push({ button, data });

        this._setToolbarData(button, data);

        $.append(dropdown, button);
    }
}

/**
 * Render a table dropdown.
 * @param {HTMLElement} dropdown The dropdown.
 */
export function _tableDropdown(dropdown) {
    const container = $.create('li');

    for (let i = 0; i < 10; i++) {
        const row = $.create('div', {
            class: this.constructor.classes.tableRow,
        });
        $.append(container, row);

        for (let j = 0; j < 10; j++) {
            const cell = $.create('div', {
                class: this.constructor.classes.tableCell,
            });
            $.append(row, cell);

            if (i > 4 || j > 4) {
                $.hide(cell);
            }

            const link = $.create('a', {
                class: this.constructor.classes.tableLink,
                attributes: {
                    href: '#',
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
        class: this.constructor.classes.tableInfo,
    });

    $.addClass(dropdown, this.constructor.classes.tableDropdown);
    $.append(dropdown, container);
    $.append(dropdown, info);

    $.addEventDelegate(container, 'click.ui.editor', 'a', (e) => {
        const cols = $.getDataset(e.currentTarget, 'uiColumn');
        const rows = $.getDataset(e.currentTarget, 'uiRow');

        const container = $.create('div');

        const table = $.create('table', {
            class: this.constructor.classes.table,
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

        this.insertHTML(html);
    });

    $.addEventDelegate(container, 'mouseover.ui.editor', 'a', (e) => {
        const targetCol = $.getDataset(e.currentTarget, 'uiColumn');
        const targetRow = $.getDataset(e.currentTarget, 'uiRow');

        const colMin = Math.max(targetCol + 1, 4);
        const rowMin = Math.max(targetRow + 1, 4);

        const links = $.find('a', container);

        for (const element of links) {
            const col = $.getDataset(element, 'uiColumn');
            const row = $.getDataset(element, 'uiRow');

            if (col <= targetCol && row <= targetRow) {
                $.addClass(element, this.constructor.classes.tableHover);
            } else {
                $.removeClass(element, this.constructor.classes.tableHover);
            }

            const parent = $.parent(element);
            if (col <= colMin && row <= rowMin) {
                $.show(parent);
            } else {
                $.hide(parent);
            }
        }

        $.setText(info, `${targetCol + 1} x ${targetRow + 1}`);
    });
}
