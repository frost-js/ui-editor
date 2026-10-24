/** @import Editor from './editor.js'; */
/** @import { EditorInputOptions, EditorInputElements, EditorModalOptions } from './types.js'; */
import $ from '@fr0st/query';
import { generateId, Modal } from '@fr0st/ui';
import { getRange, selectNode, selectRange } from './selection.js';

/**
 * Remove the modal.
 * @param {Editor} editor The editor instance.
 */
export function removeModal(editor) {
    if (!editor._modal) {
        return;
    }

    Modal.init(editor._modal).dispose();
    $.remove(editor._modal);
    editor._modal = null;
}

/**
 * Show the image modal.
 * @param {Editor} editor The editor instance.
 */
export function showImageModal(editor) {
    editor._removeModal();
    const container = $.create('div');

    const { group: fileGroup, input: fileInput } = editor.constructor._createFileInput({
        id: generateId('editor-image-file'),
        label: editor.constructor.lang.modals.imageFile,
        attributes: {
            accept: 'image/*',
            multiple: true,
        },
    });

    const { group: urlGroup, input: urlInput } = editor.constructor._createInput({
        id: generateId('editor-image-url'),
        label: editor.constructor.lang.modals.imageUrl,
    });

    $.append(container, fileGroup);
    $.append(container, urlGroup);

    const originalRange = getRange()?.cloneRange();

    editor._focusEditor();

    const range = getRange();
    range.collapse();

    editor._modal = editor.constructor._createModal({
        title: editor.constructor.lang.modals.insertImage,
        content: container,
        cancelText: editor.constructor.lang.modals.cancel,
        submitText: editor.constructor.lang.modals.insertImage,
        onSubmit: (_) => {
            selectRange(range);

            const files = $.getProperty(fileInput, 'files');
            const src = $.getValue(urlInput);

            if (files.length) {
                editor.options.imageUpload.bind(editor)(files);
            } else if (src) {
                editor.insertImage(src);
            }
        },
        onShown: (_) => {
            $.focus(fileInput);
        },
        onHidden: (_) => {
            editor._removeModal();
            if (editor.node) {
                selectRange(originalRange);
            }
        },
    });
    editor._ownComponent(Modal.init(editor._modal));
}

/**
 * Show the link modal.
 * @param {Editor} editor The editor instance.
 * @param {HTMLElement} [link] The current link.
 */
export function showLinkModal(editor, link) {
    editor._removeModal();
    const container = $.create('div');

    const { group: textGroup, input: textInput } = editor.constructor._createInput({
        id: generateId('editor-link-text'),
        label: editor.constructor.lang.modals.linkText,
    });

    const { group: urlGroup, input: urlInput } = editor.constructor._createInput({
        id: generateId('editor-link-url'),
        label: editor.constructor.lang.modals.linkUrl,
    });

    const { group: newWindowGroup, input: newWindowInput } = editor.constructor._createCheckbox({
        id: generateId('editor-link-new-window'),
        label: editor.constructor.lang.modals.linkNewWindow,
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

    $.append(container, textGroup);
    $.append(container, urlGroup);
    $.append(container, newWindowGroup);

    const originalRange = getRange()?.cloneRange();

    let range;
    if (link) {
        range = selectNode(link);
    } else {
        editor._focusEditor();
        range = getRange();
    }

    editor._modal = editor.constructor._createModal({
        title: editor.constructor.lang.modals.insertLink,
        content: container,
        cancelText: editor.constructor.lang.modals.cancel,
        submitText: editor.constructor.lang.modals.insertLink,
        onSubmit: (_) => {
            selectRange(range);

            const text = $.getValue(textInput);
            const href = $.getValue(urlInput);
            const newWindow = $.is(newWindowInput, ':checked');

            editor.insertLink(href, text, newWindow);
        },
        onShown: (_) => {
            $.focus(urlInput);
        },
        onHidden: (_) => {
            editor._removeModal();
            if (editor.node) {
                selectRange(originalRange);
            }
        },
    });
    const controller = editor._ownComponent(Modal.init(editor._modal));
    controller.listen(textInput, 'input.ui.editor', (_) => {
        hasText = !!$.getValue(textInput);
    });

    controller.listen(urlInput, 'input.ui.editor', (_) => {
        if (hasText) {
            return;
        }

        const url = $.getValue(urlInput);
        $.setValue(textInput, url);
    });
}

/**
 * Show the video modal.
 * @param {Editor} editor The editor instance.
 */
export function showVideoModal(editor) {
    editor._removeModal();
    const container = $.create('div');

    const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = editor.constructor._createInput({
        id: generateId('editor-video-url'),
        label: editor.constructor.lang.modals.videoUrl,
    });

    $.append(container, urlGroup);

    const originalRange = getRange()?.cloneRange();

    editor._focusEditor();
    const range = getRange();

    editor._modal = editor.constructor._createModal({
        title: editor.constructor.lang.modals.insertVideo,
        content: container,
        cancelText: editor.constructor.lang.modals.cancel,
        submitText: editor.constructor.lang.modals.insertVideo,
        onSubmit: (_) => {
            selectRange(range);

            const url = $.getValue(urlInput);
            const match = url.match(/youtube\.com\/watch\?v=([\w]+)/i);

            if (!match) {
                $.addClass(urlGroup, editor.constructor.classes.formError);
                $.setText(urlInvalidFeedback, editor.constructor.lang.modals.videoUrlInvalid);
                return false;
            }

            $.removeClass(urlGroup, editor.constructor.classes.formError);

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

            editor.insertHTML(html);
        },
        onShown: (_) => {
            $.focus(urlInput);
        },
        onHidden: (_) => {
            editor._removeModal();
            if (editor.node) {
                selectRange(originalRange);
            }
        },
    });
    editor._ownComponent(Modal.init(editor._modal));
}


/**
 * Create a form checkbox.
 * @param {typeof Editor} Component The component class.
 * @param {EditorInputOptions} options Options for the checkbox.
 * @returns {EditorInputElements} The form elements.
 */
export function createCheckbox(Component, options) {
    const group = $.create('div', {
        class: Component.classes.formGroup,
    });

    const inputContainer = $.create('div', {
        class: Component.classes.checkboxContainer,
    });

    const input = $.create('input', {
        class: Component.classes.checkbox,
        attributes: {
            id: options.id,
            type: 'checkbox',
            ...options.attributes,
        },
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    $.append(inputContainer, input);
    $.append(inputContainer, label);
    $.append(group, inputContainer);

    return { group, input };
}

/**
 * Create a form file input.
 * @param {typeof Editor} Component The component class.
 * @param {EditorInputOptions} options Options for the file input.
 * @returns {EditorInputElements} The form elements.
 */
export function createFileInput(Component, options) {
    const group = $.create('div', {
        class: Component.classes.formGroup,
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    const inputContainer = $.create('div', {
        class: Component.classes.inputContainer,
    });

    const input = $.create('input', {
        attributes: {
            id: options.id,
            type: 'file',
            ...options.attributes,
        },
    });

    $.append(group, label);
    $.append(inputContainer, input);
    $.append(group, inputContainer);

    return { group, input };
}

/**
 * Create a form text input.
 * @param {typeof Editor} Component The component class.
 * @param {EditorInputOptions} options Options for the text input.
 * @returns {EditorInputElements} The form elements.
 */
export function createInput(Component, options) {
    const group = $.create('div', {
        class: Component.classes.formGroup,
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    const inputContainer = $.create('div', {
        class: Component.classes.inputContainer,
    });

    const input = $.create('input', {
        class: Component.classes.input,
        attributes: {
            id: options.id,
            type: options.type || 'text',
            ...options.attributes,
        },
    });

    const ripple = $.create('div', {
        class: Component.classes.inputRipple,
    });

    const invalidFeedback = $.create('div', {
        class: Component.classes.invalidFeedback,
    });

    $.append(group, label);
    $.append(inputContainer, input);
    $.append(inputContainer, ripple);
    $.append(group, inputContainer);
    $.append(group, invalidFeedback);

    return { group, input, invalidFeedback };
}

/**
 * Create a modal.
 * @param {typeof Editor} Component The component class.
 * @param {EditorModalOptions} options Options for the modal.
 * @returns {HTMLElement} The modal element.
 */
export function createModal(Component, options) {
    const modal = $.create('div', {
        class: Component.classes.modal,
        attributes: {
            'tabindex': -1,
            'role': 'dialog',
            'aria-modal': true,
            'aria-label': options.title || Component.lang.plugins.fullScreen,
        },
    });

    const modalDialog = $.create('div', {
        class: Component.classes.modalDialog,
    });

    $.append(modal, modalDialog);

    if (options.fullScreen) {
        $.addClass(modalDialog, Component.classes.modalFullscreen);
    }

    const modalContent = $.create('form', {
        class: Component.classes.modalContent,
    });

    $.append(modalDialog, modalContent);

    const modalHeader = $.create('div', {
        class: Component.classes.modalHeader,
    });

    $.append(modalContent, modalHeader);

    if (options.title) {
        const modalTitle = $.create('h6', {
            class: Component.classes.modalTitle,
            text: options.title,
        });

        modalTitle.id = generateId('editor-dialog');
        modal.setAttribute('aria-labelledby', modalTitle.id);
        $.append(modalHeader, modalTitle);
    }

    const closeBtn = $.create('button', {
        class: Component.classes.modalBtnClose,
        dataset: {
            uiDismiss: 'modal',
        },
        attributes: {
            'type': 'button',
            'aria-label': Component.lang.modals.close,
        },
    });

    $.append(modalHeader, closeBtn);

    if (options.content) {
        const modalBody = $.create('div', {
            class: Component.classes.modalBody,
        });

        $.append(modalBody, options.content);
        $.append(modalContent, modalBody);
    }

    if (options.onSubmit) {
        const modalFooter = $.create('div', {
            class: Component.classes.modalFooter,
        });

        $.append(modalContent, modalFooter);

        const cancelButton = $.create('button', {
            text: options.cancelText,
            class: Component.classes.modalBtnSecondary,
            dataset: {
                uiDismiss: 'modal',
            },
            attributes: {
                type: 'button',
            },
        });

        $.append(modalFooter, cancelButton);

        const submitButton = $.create('button', {
            text: options.submitText,
            class: Component.classes.modalBtnPrimary,
            attributes: {
                type: 'submit',
            },
        });

        $.append(modalFooter, submitButton);
    }

    $.append(document.body, modal);
    const controller = Modal.init(modal);
    if (options.onSubmit) {
        controller.listen(modalContent, 'submit', (e) => {
            e.preventDefault();

            if (options.onSubmit(e) === false) {
                return;
            }

            controller.hide();
        });
    }

    if ('onShow' in options) {
        controller.listen(modal, 'show.ui.modal', (e) => {
            options.onShow(e);
        });
    }

    if ('onShown' in options) {
        controller.listen(modal, 'shown.ui.modal', (e) => {
            options.onShown(e);
        });
    }

    if ('onHide' in options) {
        controller.listen(modal, 'hide.ui.modal', (e) => {
            options.onHide(e);
        });
    }

    controller.listen(modal, 'hidden.ui.modal', (event) => {
        try {
            options.onHidden?.(event);
        } finally {
            controller.dispose();
            $.remove(modal);
        }
    });

    controller.show();

    return modal;
}
