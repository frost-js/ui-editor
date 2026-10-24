import $ from '@fr0st/query';
import { getRange } from './selection.js';

let running = false;
let dragCount = 0;
const editors = new Set();

/**
 * Add an Editor.
 * @param {Editor} editor The editor to add.
 */
export function addEditor(editor) {
    editors.add(editor);

    if (running) {
        return;
    }

    dragCount = 0;

    $.addEvent(document.body, 'dragenter.ui.editor', (_) => {
        if (dragCount === 0) {
            for (const editor of editors) {
                editor._showDropTarget();
            }
        }

        dragCount++;
    });

    $.addEvent(document.body, 'dragleave.ui.editor', (_) => {
        dragCount--;

        if (dragCount === 0) {
            for (const editor of editors) {
                editor._resetDropText();
                $.hide(editor._dropTarget);
            }
        }
    });

    $.addEvent(document.body, 'dragend.ui.editor drop.ui.editor', (_) => {
        dragCount = 0;
    });

    $.addEvent(document, 'selectionchange.ui.editor', $.debounce(() => {
        const range = getRange();

        if (!range) {
            return;
        }

        const ancestor = range.commonAncestorContainer;

        for (const editor of editors) {
            if (!$.isSame(editor._editor, ancestor) && !$.hasDescendent(editor._editor, ancestor)) {
                editor._removePopover();
                continue;
            }

            editor._lastRange = range;
            editor._refreshCursor();
            editor._refreshToolbar();
        }
    }));

    $.addEvent(document, 'beforeinput.ui.editor', (e) => {
        switch (e.inputType) {
            case 'historyUndo':
            case 'historyRedo':
                break;
            default:
                return;
        }

        for (const editor of editors) {
            editor._observe(false);
        }
    });

    $.addEvent(document, 'input.ui.editor', (e) => {
        switch (e.inputType) {
            case 'historyUndo':
            case 'historyRedo':
                break;
            default:
                return;
        }

        for (const editor of editors) {
            if ($.isSame(editor._editor, document.activeElement)) {
                const { html } = editor._history.at(-1);

                $.setHtml(editor._editor, html);
                $.blur(editor._editor);
            }

            editor._observe();
        }
    }, { capture: true });

    $.addEvent(window, 'click.ui.editor', (_) => {
        for (const editor of editors) {
            editor._removePopover();
        }
    });

    $.addEvent(window, 'resize.ui.editor', $.debounce((_) => {
        for (const editor of editors) {
            if (editor._currentNode && $.is(editor._currentNode, 'img')) {
                editor._highlightImage(editor._currentNode);
            }

            editor._refreshLineNumbers();
        }
    }));

    running = true;
}

/**
 * Remove a Editor.
 * @param {Editor} editor The editor to remove.
 */
export function removeEditor(editor) {
    editors.delete(editor);

    if (editors.size) {
        return;
    }

    $.removeEvent(document.body, 'dragenter.ui.editor');
    $.removeEvent(document.body, 'dragleave.ui.editor');
    $.removeEvent(document.body, 'dragend.ui.editor');
    $.removeEvent(document, 'selectionchange.ui.editor');
    $.removeEvent(document, 'beforeinput.ui.editor');
    $.removeEvent(document, 'input.ui.editor');
    $.removeEvent(window, 'click.ui.editor');
    $.removeEvent(window, 'resize.ui.editor');

    running = false;
}

/**
 * Reset the drag count.
 */
export function resetDragCount() {
    dragCount = 0;
}
