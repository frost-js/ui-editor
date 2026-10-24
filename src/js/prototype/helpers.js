import $ from '@fr0st/query';

/**
 * Check if the editor is empty and populate base markup.
 */
export function _checkEmpty() {
    const html = $.getValue(this.node).trim();

    if (html) {
        return;
    }

    $.setHtml(this._editor, '<p><br></p>');
}

/**
 * Execute a command.
 * @param {string} command The command.
 * @param {boolean | string} [value] The command argument.
 */
export function _execCommand(command, value) {
    if ($.is(this.node, ':disabled')) {
        return;
    }

    this._focusEditor();

    document.execCommand('styleWithCSS', false, !['bold', 'indent', 'italic', 'outdent', 'strikethrough', 'subscript', 'superscript', 'underline'].includes(command));
    document.execCommand(command, false, value);
}

/**
 * Ensure the editor element has focus.
 */
export function _focusEditor() {
    if ($.isSame(this._editor, document.activeElement) || $.hasDescendent(this._editor, document.activeElement)) {
        return;
    }

    const selection = window.getSelection();

    if (selection.anchorNode && $.hasDescendent(this._editor, selection.anchorNode)) {
        return;
    }

    $.focus(this._editor);
}

/**
 * Refresh the popover at cursor.
 */
export function _refreshCursor() {
    const selection = window.getSelection();
    const baseNode = selection.baseNode;

    if (!$.hasDescendent(this._editor, baseNode)) {
        this._removePopover();
        return;
    }

    const currentNode = $.is(baseNode, 'a') ?
        baseNode :
        $.closest(baseNode, 'a', this._editor).shift();

    if (!currentNode) {
        this._removePopover();
        return;
    }

    this._refreshPopover(currentNode);
}

/**
 * Refresh the editor disabled.
 */
export function _refreshDisabled() {
    if ($.is(this.node, ':disabled')) {
        $.addClass(this._editor, this.constructor.classes.editorDisabled);
        $.setStyle(this._editor, { opacity: .5 });
        $.removeAttribute(this._editor, 'contenteditable');
        $.setAttribute(this._editor, { 'aria-disabled': true });
        $.setAttribute(this._source, { disabled: true });
    } else {
        $.removeClass(this._editor, this.constructor.classes.editorDisabled);
        $.setStyle(this._editor, { opacity: '' });
        $.setAttribute(this._editor, { contenteditable: true });
        $.removeAttribute(this._editor, 'aria-disabled');
        $.removeAttribute(this._source, 'disabled');
    }
}

/**
 * Refresh the source line numbers.
 */
export function _refreshLineNumbers() {
    if (!$.isVisible(this._sourceContainer)) {
        return;
    }

    const lineNumbers = $.contents(this._lineNumbers);

    const html = $.getValue(this._source);
    const lines = html.split('\n');

    const test = $.create('div', {
        style: {
            width: $.width(this._source, { boxSize: $.CONTENT_BOX }),
            padding: 0,
            border: 0,
            font: $.css(this._source, 'font'),
            letterSpacing: $.css(this._source, 'letterSpacing'),
            whiteSpace: $.css(this._source, 'whiteSpace'),
            wordBreak: $.css(this._source, 'wordBreak'),
            wordSpacing: $.css(this._source, 'wordSpacing'),
            wordWrap: $.css(this._source, 'wordWrap'),
        },
    });

    $.append(document.body, test);

    for (const [i, line] of lines.entries()) {
        let lineNumber;
        if (i < lineNumbers.length) {
            lineNumber = lineNumbers[i];
        } else {
            lineNumber = $.create('div', {
                text: i + 1,
            });
            $.append(this._lineNumbers, lineNumber);
        }

        $.setText(test, line || ' ');

        const { height } = $.rect(test);

        $.setStyle(lineNumber, {
            height: `${height}px`,
        });
    }

    $.detach(test);

    if (lineNumbers.length > lines.length) {
        $.detach(lineNumbers.slice(lines.length));
    }
}

/**
 * Refresh the toolbar.
 */
export function _refreshToolbar() {
    this._focusEditor();

    const isDisabled = $.is(this.node, ':disabled');
    const isSource = $.isVisible(this._sourceContainer);

    for (const { button, data, type } of this._buttons) {
        if ('setContent' in data) {
            const content = data.setContent.bind(this)();
            $.setHtml(button, content);
        }

        let enabled = false;
        if ('command' in data) {
            enabled = 'value' in data ?
                document.queryCommandValue(data.command) === data.value :
                document.queryCommandState(data.command);
        }

        if (enabled) {
            $.addClass(button, 'active');
            $.setAttribute(button, { 'aria-pressed': true });
        } else {
            $.removeClass(button, 'active');
            $.removeAttribute(button, 'aria-pressed');
        }

        if (
            isDisabled ||
            (isSource && !['source', 'fullScreen'].includes(type)) ||
            ('disableCheck' in data && data.disableCheck.bind(this)())
        ) {
            $.addClass(button, 'disabled');
            $.setAttribute(button, { 'aria-disabled': true });
        } else {
            $.removeClass(button, 'disabled');
            $.removeAttribute(button, 'aria-disabled');
        }
    }
}

/**
 * Reset the drop text.
 */
export function _resetDropText() {
    $.removeClass(this._dropText, this.constructor.classes.dropHover);
    $.setText(this._dropText, this.constructor.lang.drop.dropHere);
}

/**
 * Show the drop target.
 */
export function _showDropTarget() {
    if ($.is(this.node, ':disabled') || $.isVisible(this._sourceContainer)) {
        return;
    }

    $.show(this._dropTarget);
}

/**
 * Show the editor.
 */
export function _showEditor() {
    $.show(this._editorScroll);
    $.hide(this._sourceOuter);
}

/**
 * Show the source.
 */
export function _showSource() {
    $.show(this._sourceOuter);
    $.setStyle(this._editorScroll, { display: 'none' }, null, { important: true });
    $.hide(this._imgHighlight);

    this._refreshLineNumbers();
}

/**
 * Update the input value.
 */
export function _updateValue() {
    const html = $.getHtml(this._editor);

    if (html === $.getValue(this.node)) {
        return;
    }

    this._redoHistory = [];

    const selectionData = this._getSelectionData();

    this._addHistory({ html, selectionData });

    $.setValue(this.node, html);

    $.triggerEvent(this.node, 'change.ui.editor');
}
