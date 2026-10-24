/** @import Editor from './editor.js'; */
import $ from '@fr0st/query';
import { Popper } from '@fr0st/ui';

/**
 * Highlight an image.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} image The image element.
 */
export function highlightImage(editor, image) {
    $.hide(editor._imgHighlight);
    $.hide(editor._imgCursor);

    const imgRect = $.rect(image, { offset: true });
    const editorPos = $.position(editor._editor, { offset: true });
    const scrollX = $.getScrollX(editor._editorScroll);
    const scrollY = $.getScrollY(editor._editorScroll);
    const imgX = Math.round(imgRect.x);
    const imgY = Math.round(imgRect.y);
    const imgWidth = Math.round(imgRect.width);
    const imgHeight = Math.round(imgRect.height);

    $.setStyle(editor._imgHighlight, {
        top: `${imgY - editorPos.y + scrollY - 2}px`,
        left: `${imgX - editorPos.x + scrollX - 2}px`,
        width: `${imgWidth + 2}px`,
        height: `${imgHeight + 2}px`,
    });

    editor._imgResize.setAttribute('aria-valuenow', String(imgWidth));
    $.setText(editor._imgSize, `${imgWidth}x${imgHeight}`);

    if (imgWidth < 100 || imgHeight < 50) {
        $.hide(editor._imgSize);
    } else {
        $.show(editor._imgSize);
    }

    $.show(editor._imgHighlight);
    $.show(editor._imgCursor);
}

/**
 * Refresh the popover.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} currentNode The current selected node.
 * @param {Event} [event] The current event.
 */
export function refreshPopover(editor, currentNode, event) {
    if (!editor.node) {
        return;
    }
    if ($.isSame(currentNode, editor._currentNode)) {
        return;
    }

    editor._removePopover();

    editor._currentNode = currentNode;

    if (!editor._currentNode) {
        return;
    }

    const tagName = $.tagName(editor._currentNode);

    let reference = editor._currentNode;
    if (event && tagName === 'img') {
        const editorPos = $.position(editor._editor, { offset: true });
        const scrollX = $.getScrollX(editor._editorScroll);
        const scrollY = $.getScrollY(editor._editorScroll);
        $.setStyle(editor._imgCursor, {
            top: `${event.pageY - editorPos.y + scrollY}px`,
            left: `${event.pageX - editorPos.x + scrollX}px`,
        });
        reference = editor._imgCursor;
    }

    const originalPlacement = reference.getAttribute('data-ui-placement');
    editor._popper = new Popper(
        editor._popover,
        {
            reference,
            arrow: editor._popoverArrow,
            container: editor._editor,
            placement: 'bottom',
            position: 'start',
            minContact: 0,
            afterUpdate(_, anchor) {
                // Positioning metadata belongs to the UI, not the submitted content.
                if (editor._editor?.contains(anchor)) {
                    if (originalPlacement === null) {
                        anchor.removeAttribute('data-ui-placement');
                    } else {
                        anchor.setAttribute('data-ui-placement', originalPlacement);
                    }
                }
            },
        },
    );

    $.show(editor._popover);

    switch (tagName) {
        case 'a':
            editor._renderPopoverItems(editor.options.popovers.link);
            break;
        case 'img':
            editor._renderPopoverItems(editor.options.popovers.image);
            editor._highlightImage(editor._currentNode);
            $.show(editor._imgHighlight);
            break;
        case 'td':
            editor._renderPopoverItems(editor.options.popovers.table);
            break;
    }

    editor._popper.update();
}

/**
 * Remove the popover.
 * @param {Editor} editor The editor instance.
 */
export function removePopover(editor) {
    if (!editor._currentNode) {
        return;
    }

    $.hide(editor._imgHighlight);
    $.hide(editor._imgCursor);
    $.hide(editor._popover);
    $.empty(editor._popoverBody);

    editor._popper.dispose();
    editor._popper = null;
    editor._currentNode = null;
}
