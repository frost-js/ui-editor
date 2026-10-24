import $ from '@fr0st/query';
import { generateId, Modal } from '@fr0st/ui';
import { getRange, selectNode, selectRange } from './../selection.js';

/**
 * Remove the modal.
 */
export function _removeModal() {
    if (!this._modal) {
        return;
    }

    Modal.init(this._modal).dispose();
    $.remove(this._modal);
    this._modal = null;
}

/**
 * Show the image modal.
 */
export function _showImageModal() {
    const container = $.create('div');

    const { group: fileGroup, input: fileInput } = this.constructor._createFileInput({
        id: generateId('editor-image-file'),
        label: this.constructor.lang.modals.imageFile,
        attributes: {
            accept: 'image/*',
            multiple: true,
        },
    });

    const { group: urlGroup, input: urlInput } = this.constructor._createInput({
        id: generateId('editor-image-url'),
        label: this.constructor.lang.modals.imageUrl,
    });

    $.append(container, fileGroup);
    $.append(container, urlGroup);

    const originalRange = getRange();

    this._focusEditor();

    const range = getRange();
    range.collapse();

    this._modal = this.constructor._createModal({
        title: this.constructor.lang.modals.insertImage,
        content: container,
        cancelText: this.constructor.lang.modals.cancel,
        submitText: this.constructor.lang.modals.insertImage,
        onSubmit: (_) => {
            selectRange(range);

            const files = $.getProperty(fileInput, 'files');
            const src = $.getValue(urlInput);

            if (files.length) {
                this.options.imageUpload.bind(this)(files);
            } else if (src) {
                this.insertImage(src);
            }
        },
        onShown: (_) => {
            $.focus(fileInput);
        },
        onHidden: (_) => {
            this._removeModal();
            selectRange(originalRange);
        },
    });
}

/**
 * Show the link modal.
 * @param {HTMLElement} [link] The current link.
 */
export function _showLinkModal(link) {
    const container = $.create('div');

    const { group: textGroup, input: textInput } = this.constructor._createInput({
        id: generateId('editor-link-text'),
        label: this.constructor.lang.modals.linkText,
    });

    const { group: urlGroup, input: urlInput } = this.constructor._createInput({
        id: generateId('editor-link-url'),
        label: this.constructor.lang.modals.linkUrl,
    });

    const { group: newWindowGroup, input: newWindowInput } = this.constructor._createCheckbox({
        id: generateId('editor-link-new-window'),
        label: this.constructor.lang.modals.linkNewWindow,
    });

    if (link) {
        const text = $.getText(link);
        const href = $.getAttribute(link, 'href');
        const newWindow = $.getAttribute(link, 'target');

        $.setValue(textInput, text);
        $.setValue(urlInput, href);

        if (newWindow === '_blank') {
            $.setProperty(newWindowInput, { checked: true });
        }
    }

    let hasText = false;

    $.addEvent(textInput, 'input.ui.editor', (_) => {
        hasText = !!$.getValue(textInput);
    });

    $.addEvent(urlInput, 'input.ui.editor', (_) => {
        if (hasText) {
            return;
        }

        const url = $.getValue(urlInput);
        $.setValue(textInput, url);
    });

    $.append(container, textGroup);
    $.append(container, urlGroup);
    $.append(container, newWindowGroup);

    const originalRange = getRange();

    let range;
    if (link) {
        range = selectNode(link);
    } else {
        this._focusEditor();
        range = getRange();
    }

    this._modal = this.constructor._createModal({
        title: this.constructor.lang.modals.insertLink,
        content: container,
        cancelText: this.constructor.lang.modals.cancel,
        submitText: this.constructor.lang.modals.insertLink,
        onSubmit: (_) => {
            selectRange(range);

            const text = $.getValue(textInput);
            const href = $.getValue(urlInput);
            const newWindow = $.is(newWindowInput, ':checked');

            this.insertLink(href, text, newWindow);
        },
        onShown: (_) => {
            $.focus(urlInput);
        },
        onHidden: (_) => {
            this._removeModal();
            selectRange(originalRange);
        },
    });
}

/**
 * Show the video modal.
 */
export function _showVideoModal() {
    const container = $.create('div');

    const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = this.constructor._createInput({
        id: generateId('editor-video-url'),
        label: this.constructor.lang.modals.videoUrl,
    });

    $.append(container, urlGroup);

    const originalRange = getRange();

    this._focusEditor();
    const range = getRange();

    this._modal = this.constructor._createModal({
        title: this.constructor.lang.modals.insertVideo,
        content: container,
        cancelText: this.constructor.lang.modals.cancel,
        submitText: this.constructor.lang.modals.insertVideo,
        onSubmit: (_) => {
            selectRange(range);

            const url = $.getValue(urlInput);
            const match = url.match(/youtube\.com\/watch\?v=([\w]+)/i);

            if (!match) {
                $.addClass(urlGroup, this.constructor.classes.formError);
                $.setText(urlInvalidFeedback, this.constructor.lang.modals.videoUrlInvalid);
                return false;
            }

            $.removeClass(urlGroup, this.constructor.classes.formError);

            const id = match[1];
            const video = $.create('iframe', {
                attributes: {
                    width: 560,
                    height: 315,
                    src: `https://www.youtube.com/embed/${id}`,
                    frameborder: 0,
                    allowfullscreen: true,
                },
            });

            const html = $.getProperty(video, 'outerHTML');

            this.insertHTML(html);
        },
        onShown: (_) => {
            $.focus(urlInput);
        },
        onHidden: (_) => {
            this._removeModal();
            selectRange(originalRange);
        },
    });
}
