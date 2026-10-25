/** @import { EditorLanguage } from './editor.js'; */

import $ from '@fr0st/query';
import { generateId, Modal } from '@fr0st/ui';

const document = $.getContext();

/**
 * @typedef {object} EditorInputOptions
 * @property {string} id The control ID.
 * @property {string} label The label text.
 * @property {string} [type='text'] The input type.
 * @property {Record<string, string|number|boolean>} [attributes] Additional control attributes.
 */

/**
 * @typedef {object} EditorInputElements
 * @property {HTMLDivElement} group The control group.
 * @property {HTMLInputElement} input The input.
 * @property {HTMLDivElement} [invalidFeedback] The validation message container.
 */

/**
 * @typedef {object} EditorModalOptions
 * @property {string} [title] The dialog title.
 * @property {HTMLElement} [returnFocus] The invoking control to refocus after closing.
 * @property {HTMLElement} [content] The dialog content.
 * @property {boolean} [fullScreen=false] Whether to use a fullscreen dialog.
 * @property {string} [cancelText] The cancel label.
 * @property {string} [submitText] The submit label.
 * @property {(event: Event) => boolean|void} [onSubmit] The submit handler; false keeps the dialog open.
 * @property {(event: Event) => void} [onShow] The before-show handler.
 * @property {(event: Event) => void} [onShown] The shown handler.
 * @property {(event: Event) => void} [onHide] The before-hide handler.
 * @property {(event: Event) => void} [onHidden] The hidden handler.
 */

/**
 * Creates a form checkbox.
 * @param {Record<string, string>} classes The editor classes.
 * @param {EditorInputOptions} options Options for the checkbox.
 * @returns {EditorInputElements} The form elements.
 */
export function createCheckbox(classes, options) {
    const group = $.create('div', {
        class: classes.formGroup,
    });

    const inputContainer = $.create('div', {
        class: classes.checkboxContainer,
    });

    const input = $.create('input', {
        class: classes.checkbox,
        attributes: {
            id: options.id,
            type: 'checkbox',
            ...options.attributes,
        },
    });

    const label = $.create('label', {
        text: options.label,
        class: classes.checkboxLabel,
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
 * Creates a form file input.
 * @param {Record<string, string>} classes The editor classes.
 * @param {EditorInputOptions} options Options for the file input.
 * @returns {EditorInputElements} The form elements.
 */
export function createFileInput(classes, options) {
    const group = $.create('div', {
        class: classes.formGroup,
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    const inputContainer = $.create('div', {
        class: classes.inputContainer,
    });

    const input = $.create('input', {
        class: classes.input,
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
 * Creates a form text input.
 * @param {Record<string, string>} classes The editor classes.
 * @param {EditorInputOptions} options Options for the text input.
 * @returns {EditorInputElements} The form elements.
 */
export function createInput(classes, options) {
    const group = $.create('div', {
        class: classes.formGroup,
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    const inputContainer = $.create('div', {
        class: classes.inputContainer,
    });

    const input = $.create('input', {
        class: classes.input,
        attributes: {
            id: options.id,
            type: options.type || 'text',
            ...options.attributes,
        },
    });

    const invalidFeedback = $.create('div', {
        class: classes.invalidFeedback,
        attributes: {
            id: `${options.id}-error`,
        },
    });

    $.setAttribute(input, 'aria-describedby', `${options.id}-error`);

    $.append(group, label);
    $.append(inputContainer, input);
    $.append(group, inputContainer);
    $.append(group, invalidFeedback);

    return { group, input, invalidFeedback };
}

/**
 * Creates a modal.
 * @param {Record<string, string>} classes The editor classes.
 * @param {EditorLanguage} lang The editor language.
 * @param {EditorModalOptions} options Options for the modal.
 * @returns {HTMLElement} The modal element.
 */
export function createModal(classes, lang, options) {
    const returnFocus = options.returnFocus || document.activeElement;
    const modal = $.create('div', {
        class: classes.modal,
        attributes: {
            'tabindex': -1,
            'role': 'dialog',
            'aria-modal': true,
            'aria-label': options.title || lang.plugins.fullScreen,
        },
    });

    const modalDialog = $.create('div', {
        class: classes.modalDialog,
    });

    $.append(modal, modalDialog);

    if (options.fullScreen) {
        $.addClass(modalDialog, classes.modalFullscreen);
    }

    const modalContent = $.create('form', {
        class: classes.modalContent,
    });

    $.append(modalDialog, modalContent);

    const modalHeader = $.create('div', {
        class: classes.modalHeader,
    });

    $.append(modalContent, modalHeader);

    if (options.title) {
        const id = generateId('editor-dialog');
        const modalTitle = $.create('h6', {
            class: classes.modalTitle,
            text: options.title,
            attributes: { id },
        });

        $.setAttribute(modal, 'aria-labelledby', id);
        $.append(modalHeader, modalTitle);
    }

    const closeBtn = $.create('button', {
        class: classes.modalBtnClose,
        dataset: {
            uiDismiss: 'modal',
        },
        attributes: {
            'type': 'button',
            'aria-label': lang.modals.close,
        },
    });

    $.append(modalHeader, closeBtn);

    if (options.content) {
        const modalBody = $.create('div', {
            class: classes.modalBody,
        });

        $.append(modalBody, options.content);
        $.append(modalContent, modalBody);
    }

    if (options.onSubmit) {
        const modalFooter = $.create('div', {
            class: classes.modalFooter,
        });

        $.append(modalContent, modalFooter);

        const cancelButton = $.create('button', {
            text: options.cancelText,
            class: classes.modalBtnSecondary,
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
            class: classes.modalBtnPrimary,
            attributes: {
                type: 'submit',
            },
        });

        $.append(modalFooter, submitButton);
    }

    $.append(document.body, modal);

    const controller = Modal.init(modal);

    if (options.onSubmit) {
        controller.listen(modalContent, 'submit', (event) => {
            event.preventDefault();

            if (options.onSubmit(event) === false) {
                return;
            }

            controller.hide();
        });
    }

    if ('onShow' in options) {
        controller.listen(modal, 'show.ui.modal', (event) => {
            options.onShow(event);
        });
    }

    if ('onShown' in options) {
        controller.listen(modal, 'shown.ui.modal', (event) => {
            options.onShown(event);
        });
    }

    if ('onHide' in options) {
        controller.listen(modal, 'hide.ui.modal', (event) => {
            options.onHide(event);
        });
    }

    controller.listen(modal, 'hidden.ui.modal', (event) => {
        try {
            options.onHidden?.(event);
        } finally {
            controller.dispose();
            $.remove(modal);

            if (returnFocus?.isConnected) {
                returnFocus.focus({ preventScroll: true });
            }
        }
    });

    controller.show(returnFocus);

    return modal;
}
