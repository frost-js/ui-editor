/** @import Editor from './editor.js'; */
import $ from '@fr0st/query';
import { resetDragCount } from './helpers.js';
import { selectNode } from './selection.js';

/**
 * Attach events for the Editor.
 * @param {Editor} editor The editor instance.
 */
export function events(editor) {
    editor._eventsToolbar();
    editor._eventsEditor();
    editor._eventsPopover();
    editor._eventsSource();
    editor._eventsDrop();

    if (editor.options.resizable) {
        editor._eventsResize();
    }
}

/**
 * Attach drop events.
 * @param {Editor} editor The editor instance.
 */
export function eventsDrop(editor) {
    editor.listen(editor._editor, 'dragstart.ui.editor', (e) => {
        e.preventDefault();
    }, { delegate: 'img' });

    editor.listen(editor._dropTarget, 'dragenter.ui.editor', (_) => {
        $.addClass(editor._dropText, editor.constructor.classes.dropHover);
        $.setText(editor._dropText, editor.constructor.lang.drop.drop);
        $.show(editor._dropTarget);
    });

    editor.listen(editor._dropTarget, 'dragleave.ui.editor', (_) => {
        editor._resetDropText();
    });

    editor.listen(editor._dropTarget, 'dragover.ui.editor', (e) => {
        e.preventDefault();
    });

    editor.listen(editor._dropTarget, 'drop.ui.editor', (e) => {
        e.preventDefault();

        resetDragCount();

        editor._resetDropText();
        $.hide(editor._dropTarget);

        if (e.dataTransfer.files.length) {
            editor.options.imageUpload.bind(editor)(e.dataTransfer.files);
        } else {
            const text = e.dataTransfer.getData('text');
            editor.insertText(text);
        }
    });
}

/**
 * Attach editor events.
 * @param {Editor} editor The editor instance.
 */
export function eventsEditor(editor) {
    editor.listen(editor._editor, 'focus.ui.editor', (_) => {
        document.execCommand('defaultParagraphSeparator', false, 'p');
        $.triggerEvent(editor.node, 'focus.ui.editor');
    });

    editor.listen(editor._editor, 'blur.ui.editor', (_) => {
        $.triggerEvent(editor.node, 'blur.ui.editor');
    });

    editor.listen(editor._editor, 'beforeinput.ui.editor', (e) => {
        if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
            if (e.cancelable) {
                e.preventDefault();
                editor[e.inputType === 'historyUndo' ? 'undo' : 'redo']();
            }
        } else if (editor._history.length) {
            editor._history.at(-1).selectionData = editor._getSelectionData();
        }
    });

    editor.listen(editor._editor, 'input.ui.editor', (e) => {
        switch (e.inputType) {
            case 'historyUndo':
                if (!$.isSame(document.activeElement, editor._editor)) {
                    return;
                }

                editor.undo();
                return;
            case 'historyRedo':
                if (!$.isSame(document.activeElement, editor._editor)) {
                    return;
                }

                editor.redo();
                return;
        }

        if (e.inputType !== 'insertText') {
            editor._normalize();
        }

        editor._checkEmpty();
        editor._updateValue();
    });

    editor.listen(editor._editor, 'keydown.ui.editor', (e) => {
        if (editor.options.keyDown) {
            editor.options.keyDown.bind(editor)(e);
        }

        if (e.defaultPrevented || !editor.node) {
            return;
        }
        const selection = window.getSelection();

        const isIndented = (node) => {
            return $.is(node, 'li') || $.getStyle(node, 'marginLeft');
        };

        switch (e.code) {
            case 'Backspace':
                if (
                    selection.isCollapsed &&
                    $.isSame(selection.anchorNode, selection.focusNode) &&
                    (
                        (
                            $._isElement(selection.anchorNode) &&
                            $.getText(selection.anchorNode) === '' &&
                            isIndented(selection.anchorNode)
                        ) ||
                        (
                            $._isText(selection.anchorNode) &&
                            selection.anchorOffset === 0 &&
                            isIndented($.parent(selection.anchorNode))
                        )
                    )
                ) {
                    e.preventDefault();

                    editor.outdent();
                } else if ($.contents(editor._editor).length <= 1 && $.getText(editor._editor) === '') {
                    e.preventDefault();
                }

                break;
            case 'Delete':
                if (
                    selection.isCollapsed &&
                    $.isSame(selection.anchorNode, selection.focusNode) &&
                    $.getText(selection.anchorNode) === ''
                ) {
                    const nodes = [selection.anchorNode, ...$.parents(selection.anchorNode, null, editor._editor)];

                    if (nodes.every((node) => $.contents(node).length <= 1)) {
                        const lastParent = nodes.pop();
                        const nextParent = $.next(lastParent).shift();

                        let formatElement = 'p';

                        if (nextParent && $.is(nextParent, 'h1, h2, h3, h4, h5, h6, pre')) {
                            formatElement = $.tagName(nextParent);
                        }

                        editor._observe(false);
                        editor._execCommand('formatBlock', formatElement);
                        editor._observe();
                    }
                }

                break;
            case 'Tab':
                if (document.queryCommandState('insertOrderedList') || document.queryCommandState('insertUnorderedList')) {
                    e.preventDefault();

                    if (e.shiftKey) {
                        editor.outdent();
                    } else {
                        editor.indent();
                    }
                }
                break;
        }
    });

    editor.listen(editor._editorContainer, 'click.ui.editor', (_) => {
        $.focus(editor._editor);
    });

    editor.listen(editor._editor, 'click.ui.editor', (e) => {
        e.preventDefault();
        e.stopPropagation();

        editor._refreshPopover(e.currentTarget, e);
        editor._refreshToolbar();
    }, { delegate: 'a, td, img', capture: true });

    editor._watchContent();
}

/**
 * Attach popover events.
 * @param {Editor} editor The editor instance.
 */
export function eventsPopover(editor) {
    editor.listen(editor._popover, 'click.ui.editor', (e) => {
        const action = $.getDataset(e.currentTarget, 'uiAction');

        if (!(action in editor.constructor.popovers)) {
            throw new Error(`Unknown action ${action}`);
        }

        e.preventDefault();
        e.stopPropagation();

        editor.constructor.popovers[action].action.bind(editor)(editor._currentNode);
        editor._refreshPopover(editor._currentNode);
    }, { delegate: '[data-ui-action]' });

    const downEvent = (e) => {
        if (!editor._currentNode || !$.is(editor._currentNode, 'img')) {
            return false;
        }

        e.stopPropagation();

        $.hide(editor._imgCursor);
        $.hide(editor._popover);

        editor._observe(false);
    };

    const moveEvent = (e) => {
        const imgRect = $.rect(editor._currentNode, { offset: true });
        const ratio = imgRect.width / imgRect.height;
        const width = Math.max(
            e.pageX - imgRect.x,
            (e.pageY - imgRect.y) * ratio,
            1,
        );
        $.setStyle(editor._currentNode, { width: `${Math.round(width)}px` });
        editor._highlightImage(editor._currentNode);
    };

    const upEvent = (_) => {
        if (editor._currentNode?.isConnected && editor._editor.contains(editor._currentNode)) {
            const range = selectNode(editor._currentNode);
            range.collapse(false);
        }

        editor._updateValue();
        editor._observe();
    };

    bindDrag(editor, editor._imgResize, downEvent, moveEvent, upEvent);

    editor.listen(editor._editorBody, 'scroll.ui.editor', (_) => {
        editor._removePopover();
    });
}

/**
 * Attach resize events.
 * @param {Editor} editor The editor instance.
 */
export function eventsResize(editor) {
    let resizeOffset = 0;

    const downEvent = (e) => {
        const barPosition = $.position(editor._resizeBar, { offset: true });
        resizeOffset = e.pageY - barPosition.y;

        editor._removePopover();
    };

    const moveEvent = (e) => {
        const editorPosition = $.position(editor._editorBody, { offset: true });

        const height = Math.max(0, e.pageY - editorPosition.y - resizeOffset);
        $.setStyle(editor._editorBody, { height: `${height}px` });
    };

    const upEvent = (_) => {
        resizeOffset = 0;
    };

    bindDrag(editor, editor._resizeBar, downEvent, moveEvent, upEvent);
}

/**
 * Attach source events.
 * @param {Editor} editor The editor instance.
 */
export function eventsSource(editor) {
    const refreshLineNumbersDebounced = editor._debounce((_) => {
        editor._refreshLineNumbers();
    });

    editor.listen(editor._source, 'input.ui.editor', (_) => {
        refreshLineNumbersDebounced();
    });

    editor.listen(editor._source, 'change.ui.editor', (_) => {
        const html = $.getValue(editor._source);

        refreshLineNumbersDebounced();

        $.setValue(editor.node, html);
        $.triggerEvent(editor.node, 'change.ui.editor');
    });

    editor.listen(editor._source, 'keydown.ui.editor', (e) => {
        if (e.code !== 'Tab') {
            return;
        }

        e.preventDefault();

        const start = $.getProperty(editor._source, 'selectionStart');
        const end = $.getProperty(editor._source, 'selectionEnd');
        const value = $.getValue(editor._source);
        const lines = value.split('\n');

        const startLine = value.substring(0, start).split('\n').length - 1;
        const endLine = value.substring(0, end).split('\n').length - 1;

        const tab = '\t';

        let newStart = start;
        let newEnd = end;
        let newValue;
        if (e.shiftKey) {
            for (const [i, line] of lines.entries()) {
                if (i >= startLine && i <= endLine && line.startsWith(tab)) {
                    lines[i] = line.substring(1);

                    if (i === startLine) {
                        newStart--;
                    }

                    if (i < endLine) {
                        newEnd--;
                    }
                }
            }

            newValue = lines.join('\n');
        } else if (startLine !== endLine) {
            for (const [i, line] of lines.entries()) {
                if (i >= startLine && i <= endLine && (i < endLine || lines[i])) {
                    lines[i] = tab + line;

                    if (i < endLine) {
                        newEnd++;
                    }
                }
            }

            newValue = lines.join('\n');
        } else {
            newValue = value.substring(0, start) + '\t' + value.substring(end);

            newStart++;

            if (start === end) {
                newEnd++;
            } else {
                newEnd = newStart;
            }
        }

        $.select(editor._source);
        document.execCommand('insertText', false, newValue);
        editor._source.setSelectionRange(newStart, newEnd);
    });

    editor.listen(editor._source, 'scroll.ui.editor', editor._debounce((_) => {
        const scrollY = $.getScrollY(editor._source);
        $.setStyle(editor._lineNumbers, { marginTop: `${-scrollY}px` });
    }));
}

/**
 * Attach toolbar events.
 * @param {Editor} editor The editor instance.
 */
export function eventsToolbar(editor) {
    editor.listen(editor._toolbar, 'click.ui.editor', (e) => {
        const action = $.getDataset(e.currentTarget, 'uiAction');

        if (!(action in editor.constructor.plugins)) {
            throw new Error(`Unknown action ${action}`);
        }

        e.preventDefault();
        e.stopPropagation();
        if ($.is(editor.node, ':disabled') || $.is(e.currentTarget, '[aria-disabled="true"]')) {
            return;
        }

        if (editor._lastRange && editor._editor.contains(editor._lastRange.startContainer) && editor._editor.contains(editor._lastRange.endContainer)) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(editor._lastRange);
        }

        editor.constructor.plugins[action].action.bind(editor)();
    }, { delegate: '[data-ui-action]' });

    editor.listen(editor._toolbar, 'click.ui.editor', (e) => {
        const command = $.getDataset(e.currentTarget, 'uiCommand');

        if (!(command in editor)) {
            throw new Error(`Unknown command ${command}`);
        }

        e.preventDefault();

        if (editor._lastRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(editor._lastRange);
        }

        const value = $.getDataset(e.currentTarget, 'uiValue');
        editor[command](value);

        editor._refreshToolbar();
    }, { delegate: '[data-ui-command]' });
}

/**
 * Binds a drag whose global listeners and active state are owned by the editor.
 * @param {Editor} editor The editor.
 * @param {HTMLElement} handle The drag handle.
 * @param {Function} down The start callback.
 * @param {Function} move The move callback.
 * @param {Function} up The finish callback.
 */
function bindDrag(editor, handle, down, move, up) {
    let pointer = null;
    editor._onDispose(() => {
        pointer = null;
    });
    editor.listen(handle, 'pointerdown.ui.editor', (event) => {
        if (event.button !== 0 || pointer !== null || $.is(editor.node, ':disabled') || down(event) === false) {
            return;
        }
        event.preventDefault();
        pointer = event.pointerId;
    });
    editor.listen(window, 'pointermove.ui.editor', (event) => {
        if (event.pointerId === pointer) {
            event.preventDefault();
            move(event);
        }
    }, { passive: false });
    editor.listen(window, 'blur.ui.editor', () => {
        if (pointer !== null) {
            pointer = null;
            up();
        }
    });
    editor.listen(window, 'pointerup.ui.editor pointercancel.ui.editor', (event) => {
        if (event.pointerId === pointer) {
            pointer = null;
            up(event);
        }
    });
}
