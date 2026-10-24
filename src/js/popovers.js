/** @import { EditorPopover } from './types.js'; */

import $ from '@fr0st/query';
import { getRange } from './selection.js';

/** @type {Record<string, EditorPopover>} */
export default {
    floatLeft: {
        action(node) {
            $.setStyle(node, { float: 'left' });
        },
    },
    floatRight: {
        action(node) {
            $.setStyle(node, { float: 'right' });
        },
    },
    floatNone: {
        action(node) {
            $.removeStyle(node, 'float');
        },
    },
    imageFull: {
        content: '100%',
        action(node) {
            $.setStyle(node, { width: '100%' });
        },
    },
    imageHalf: {
        content: '50%',
        action(node) {
            $.setStyle(node, { width: '50%' });
        },
    },
    imageQuarter: {
        content: '25%',
        action(node) {
            $.setStyle(node, { width: '25%' });
        },
    },
    imageOriginal: {
        action(node) {
            $.removeStyle(node, 'width');
        },
    },
    imageRemove: {
        action(node) {
            $.detach(node);

            this._removePopover();
        },
    },
    link: {
        render(node) {
            const href = $.getAttribute(node, 'href');
            return $.create('a', {
                text: href,
                class: this.constructor.classes.linkUrl,
                attributes: {
                    href,
                    target: '_blank',
                },
            });
        },
    },
    linkEdit: {
        action(node) {
            this._showLinkModal(node);
        },
    },
    tableColumnAfter: {
        action(node) {
            this._updateTable(node, (td, _, table) => {
                const index = $.index(td);
                const rows = $.find(':scope > thead > tr, :scope > tbody > tr', table);

                this._observe(false);

                for (const row of rows) {
                    const newTd = $.create('td', {
                        html: '<br>',
                    });
                    const cells = $.children(row, 'th, td');
                    $.after(cells[index], newTd);
                }

                this._observe();
                this._updateValue();
            });
        },
    },
    tableColumnBefore: {
        action(node) {
            this._updateTable(node, (td, _, table) => {
                const index = $.index(td);
                const rows = $.find(':scope > thead > tr, :scope > tbody > tr', table);

                this._observe(false);

                for (const row of rows) {
                    const newTd = $.create('td', {
                        html: '<br>',
                    });
                    const cells = $.children(row, 'th, td');
                    $.before(cells[index], newTd);
                }

                this._observe();
                this._updateValue();
            });
        },
    },
    tableColumnRemove: {
        action(node) {
            this._updateTable(node, (td, _, table) => {
                const index = $.index(td);
                const rows = $.find(':scope > thead > tr, :scope > tbody > tr', table);

                this._observe(false);

                for (const row of rows) {
                    const cells = $.children(row, 'th, td');
                    $.remove(cells[index]);
                }

                this._observe();
                this._updateValue();
                this._removePopover();
            });
        },
    },
    tableRemove: {
        action(node) {
            const table = $.closest(node, 'table', this._editor).shift();
            $.detach(table);

            this._removePopover();
        },
    },
    tableRowAfter: {
        action(node) {
            this._updateTable(node, (_, tr) => {
                const columns = $.children(tr).length;
                const newTr = $.create('tr');

                for (let i = 0; i < columns; i++) {
                    const newTd = $.create('td', {
                        html: '<br>',
                    });
                    $.append(newTr, newTd);
                }

                $.after(tr, newTr);
            });
        },
    },
    tableRowBefore: {
        action(node) {
            this._updateTable(node, (_, tr) => {
                const columns = $.children(tr).length;
                const newTr = $.create('tr');

                for (let i = 0; i < columns; i++) {
                    const newTd = $.create('td', {
                        html: '<br>',
                    });
                    $.append(newTr, newTd);
                }

                $.before(tr, newTr);
            });
        },
    },
    tableRowRemove: {
        action(node) {
            this._updateTable(node, (_, tr) => {
                $.remove(tr);

                this._removePopover();
            });
        },
    },
    unlink: {
        action(node) {
            $.select(node);
            this.unlink();

            const range = getRange();
            range.collapse();
        },
    },
};
