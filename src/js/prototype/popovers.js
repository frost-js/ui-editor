import $ from '@fr0st/query';
import { Popper } from '@fr0st/ui';

/**
 * Highlight an image.
 * @param {HTMLElement} image The image element.
 */
export function _highlightImage(image) {
    $.hide(this._imgHighlight);
    $.hide(this._imgCursor);

    const imgRect = $.rect(image, { offset: true });
    const editorPos = $.position(this._editor, { offset: true });
    const scrollX = $.getScrollX(this._editorScroll);
    const scrollY = $.getScrollY(this._editorScroll);
    const imgX = Math.round(imgRect.x);
    const imgY = Math.round(imgRect.y);
    const imgWidth = Math.round(imgRect.width);
    const imgHeight = Math.round(imgRect.height);

    $.setStyle(this._imgHighlight, {
        top: `${imgY - editorPos.y + scrollY - 2}px`,
        left: `${imgX - editorPos.x + scrollX - 2}px`,
        width: `${imgWidth + 2}px`,
        height: `${imgHeight + 2}px`,
    });

    $.setText(this._imgSize, `${imgWidth}x${imgHeight}`);

    if (imgWidth < 100 || imgHeight < 50) {
        $.hide(this._imgSize);
    } else {
        $.show(this._imgSize);
    }

    $.show(this._imgHighlight);
    $.show(this._imgCursor);
}

/**
 * Refresh the popover.
 * @param {HTMLElement} currentNode The current selected node.
 * @param {Event} [event] The current event.
 */
export function _refreshPopover(currentNode, event) {
    if ($.isSame(currentNode, this._currentNode)) {
        return;
    }

    this._removePopover();

    this._currentNode = currentNode;

    if (!this._currentNode) {
        return;
    }

    const tagName = $.tagName(this._currentNode);

    let reference = this._currentNode;
    if (event && tagName === 'img') {
        const editorPos = $.position(this._editor, { offset: true });
        const scrollX = $.getScrollX(this._editorScroll);
        const scrollY = $.getScrollY(this._editorScroll);
        $.setStyle(this._imgCursor, {
            top: `${event.pageY - editorPos.y + scrollY}px`,
            left: `${event.pageX - editorPos.x + scrollX}px`,
        });
        reference = this._imgCursor;
    }

    this._popper = new Popper(
        this._popover,
        {
            reference,
            arrow: this._popoverArrow,
            container: this._editor,
            placement: 'bottom',
            position: 'left',
            minContact: 0,
            noAttributes: true,
        },
    );

    $.show(this._popover);

    switch (tagName) {
        case 'a':
            this._renderPopoverItems(this.options.popovers.link);
            break;
        case 'img':
            this._renderPopoverItems(this.options.popovers.image);
            this._highlightImage(this._currentNode);
            $.show(this._imgHighlight);
            break;
        case 'td':
            this._renderPopoverItems(this.options.popovers.table);
            break;
    }

    this._popper.update();
}

/**
 * Remove the popover.
 */
export function _removePopover() {
    if (!this._currentNode) {
        return;
    }

    $.hide(this._imgHighlight);
    $.hide(this._imgCursor);
    $.hide(this._popover);
    $.empty(this._popoverBody);

    this._popper.dispose();
    this._popper = null;
    this._currentNode = null;
}
