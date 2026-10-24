import $ from '@fr0st/query';
import { resetDragCount } from './../helpers.js';
import { getRange, selectNode } from './../selection.js';

/**
 * Attach events for the Editor.
 */
export function _events() {
    this._eventsToolbar();
    this._eventsEditor();
    this._eventsPopover();
    this._eventsSource();
    this._eventsDrop();

    if (this._options.resizable) {
        this._eventsResize();
    }
};

/**
 * Attach drop events.
 */
export function _eventsDrop() {
    $.addEventDelegate(this._editor, 'dragstart.ui.editor', 'img', (e) => {
        e.preventDefault();
    });

    $.addEvent(this._dropTarget, 'dragenter.ui.editor', (_) => {
        $.addClass(this._dropText, this.constructor.classes.dropHover);
        $.setText(this._dropText, this.constructor.lang.drop.drop);
        $.show(this._dropTarget);
    });

    $.addEvent(this._dropTarget, 'dragleave.ui.editor', (_) => {
        this._resetDropText();
    });

    $.addEvent(this._dropTarget, 'dragover.ui.editor', (e) => {
        e.preventDefault();
    });

    $.addEvent(this._dropTarget, 'drop.ui.editor', (e) => {
        e.preventDefault();

        resetDragCount();

        this._resetDropText();
        $.hide(this._dropTarget);

        if (e.dataTransfer.files.length) {
            this._options.imageUpload.bind(this)(e.dataTransfer.files);
        } else {
            const text = e.dataTransfer.getData('text');
            this.insertText(text);
        }
    });
};

/**
 * Attach editor events.
 */
export function _eventsEditor() {
    $.addEvent(this._editor, 'focus.ui.editor', (_) => {
        $.triggerEvent(this._node, 'focus.ui.editor');
    });

    $.addEvent(this._editor, 'blur.ui.editor', (_) => {
        $.triggerEvent(this._node, 'blur.ui.editor');
    });

    $.addEvent(this._editor, 'input.ui.editor', (e) => {
        switch (e.inputType) {
            case 'historyUndo':
                if (!$.isSame(document.activeElement, this._editor)) {
                    return;
                }

                this.undo();
                break;
            case 'historyRedo':
                if (!$.isSame(document.activeElement, this._editor)) {
                    return;
                }

                this.redo();
                break;
        }

        if (e.inputType !== 'insertText') {
            this._normalize();
        }

        this._updateValue();
        this._checkEmpty();
    });

    $.addEvent(this._editor, 'keydown.ui.editor', (e) => {
        if (this._options.keyDown) {
            this._options.keyDown.bind(this)(e);
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

                    this.outdent();
                } else if ($.contents(this._editor).length <= 1 && $.getText(this._editor) === '') {
                    e.preventDefault();
                }

                break;
            case 'Delete':
                if (
                    selection.isCollapsed &&
                    $.isSame(selection.anchorNode, selection.focusNode) &&
                    $.getText(selection.anchorNode) === ''
                ) {
                    const nodes = [selection.anchorNode, ...$.parents(selection.anchorNode, null, this._editor)];

                    if (nodes.every((node) => $.contents(node).length <= 1)) {
                        const lastParent = nodes.pop();
                        const nextParent = $.next(lastParent).shift();

                        let formatElement = 'p';

                        if (nextParent && $.is(nextParent, 'h1, h2, h3, h4, h5, h6, pre')) {
                            formatElement = $.tagName(nextParent);
                        }

                        this._observe(false);
                        this._execCommand('formatBlock', formatElement);
                        this._observe();
                    }
                }

                break;
            case 'Tab':
                if (document.queryCommandState('insertOrderedList') || document.queryCommandState('insertUnorderedList')) {
                    e.preventDefault();

                    if (e.shiftKey) {
                        this.outdent();
                    } else {
                        this.indent();
                    }
                }
                break;
        }
    });

    $.addEvent(this._editorContainer, 'click.ui.editor', (_) => {
        $.focus(this._editor);
    });

    $.addEventDelegate(this._editor, 'click.ui.editor', 'a, td, img', (e) => {
        e.preventDefault();
        e.stopPropagation();

        this._refreshPopover(e.currentTarget, e);
        this._refreshToolbar();
    }, { capture: true });

    const mutationHandler = () => {
        this._normalize();
        this._updateValue();
        this._checkEmpty();
    };

    this._observer = new MutationObserver(mutationHandler);

    let observeLevel = 0;
    let pendingMutations = [];
    this._observe = (observe = true) => {
        if (observe) {
            observeLevel++;

            if (observeLevel === 1) {
                this._observer.observe(this._editor, { attributes: true, childList: true, subtree: true });

                if (pendingMutations.length) {
                    mutationHandler(pendingMutations);
                    pendingMutations = [];
                }
            }
        } else {
            observeLevel--;

            if (observeLevel === 0) {
                this._observer.disconnect();
                pendingMutations = this._observer.takeRecords();
            }
        }
    };

    this._observe();
};

/**
 * Attach popover events.
 */
export function _eventsPopover() {
    $.addEventDelegate(this._popover, 'click.ui.editor', '[data-ui-action]', (e) => {
        const action = $.getDataset(e.currentTarget, 'uiAction');

        if (!(action in this.constructor.popovers)) {
            throw new Error(`Unknown action ${action}`);
        }

        e.preventDefault();

        this.constructor.popovers[action].action.bind(this)(this._currentNode);
        this._refreshPopover(this._currentNode);
    });

    const downEvent = (e) => {
        if (!this._currentNode || !$.is(this._currentNode, 'img')) {
            return false;
        }

        e.stopPropagation();

        $.hide(this._imgCursor);
        $.hide(this._popover);

        this._observe(false);
    };

    const moveEvent = (e) => {
        const imgRect = $.rect(this._currentNode, { offset: true });
        const ratio = imgRect.width / imgRect.height;
        const width = Math.max(
            e.pageX - imgRect.x,
            (e.pageY - imgRect.y) * ratio,
            1,
        );
        $.setStyle(this._currentNode, { width: `${Math.round(width)}px` });
        this._highlightImage(this._currentNode);
    };

    const upEvent = (_) => {
        selectNode(this._currentNode);

        const range = getRange();
        range.collapse(false);

        this._updateValue();
        this._observe();
    };

    const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent);

    $.addEvent(this._imgResize, 'mousedown.ui.editor', dragEvent);

    $.addEvent(this._editorBody, 'scroll.ui.editor', (_) => {
        this._removePopover();
    });
};

/**
 * Attach resize events.
 */
export function _eventsResize() {
    let resizeOffset = 0;

    const downEvent = (e) => {
        const barPosition = $.position(this._resizeBar, { offset: true });
        resizeOffset = e.pageY - barPosition.y;

        this._removePopover();
    };

    const moveEvent = (e) => {
        const editorPosition = $.position(this._editorBody, { offset: true });

        const height = Math.max(0, e.pageY - editorPosition.y - resizeOffset);
        $.setStyle(this._editorBody, { height: `${height}px` });
    };

    const upEvent = (_) => {
        resizeOffset = 0;
    };

    const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent);

    $.addEvent(this._resizeBar, 'mousedown.ui.editor', dragEvent);
};

/**
 * Attach source events.
 */
export function _eventsSource() {
    const refreshLineNumbersDebounced = $.debounce((_) => {
        this._refreshLineNumbers();
    });

    $.addEvent(this._source, 'input.ui.editor', (_) => {
        refreshLineNumbersDebounced();
    });

    $.addEvent(this._source, 'change.ui.editor', (_) => {
        const html = $.getValue(this._source);

        refreshLineNumbersDebounced();

        $.setValue(this._node, html);
        $.triggerEvent(this._node, 'change.ui.editor');
    });

    $.addEvent(this._source, 'keydown.ui.editor', (e) => {
        if (e.code !== 'Tab') {
            return;
        }

        e.preventDefault();

        const start = $.getProperty(this._source, 'selectionStart');
        const end = $.getProperty(this._source, 'selectionEnd');
        const value = $.getValue(this._source);
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

        $.select(this._source);
        document.execCommand('insertText', false, newValue);
        this._source.setSelectionRange(newStart, newEnd);
    });

    $.addEvent(this._source, 'scroll.ui.editor', $.debounce((_) => {
        const scrollY = $.getScrollY(this._source);
        $.setStyle(this._lineNumbers, { marginTop: `${-scrollY}px` });
    }));
};

/**
 * Attach toolbar events.
 */
export function _eventsToolbar() {
    $.addEventDelegate(this._toolbar, 'click.ui.editor', '[data-ui-action]', (e) => {
        const action = $.getDataset(e.currentTarget, 'uiAction');

        if (!(action in this.constructor.plugins)) {
            throw new Error(`Unknown action ${action}`);
        }

        e.preventDefault();

        if (this._lastRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this._lastRange);
        }

        this.constructor.plugins[action].action.bind(this)();
    });

    $.addEventDelegate(this._toolbar, 'click.ui.editor', '[data-ui-command]', (e) => {
        const command = $.getDataset(e.currentTarget, 'uiCommand');

        if (!(command in this)) {
            throw new Error(`Unknown command ${command}`);
        }

        e.preventDefault();

        if (this._lastRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this._lastRange);
        }

        const value = $.getDataset(e.currentTarget, 'uiValue');
        this[command](value);

        this._refreshToolbar();
    });
};
