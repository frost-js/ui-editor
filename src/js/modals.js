/** @import Editor from './editor.js'; */

/** @import { EditorInputOptions, EditorInputElements, EditorModalOptions } from './types.js'; */

import $ from '@fr0st/query';
import { generateId, Modal } from '@fr0st/ui';

/**
 * Creates a form checkbox.
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
        class: Component.classes.checkboxLabel,
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
        class: Component.classes.input,
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

    const invalidFeedback = $.create('div', {
        class: Component.classes.invalidFeedback,
    });

    $.append(group, label);
    $.append(inputContainer, input);
    $.append(group, inputContainer);
    invalidFeedback.id = `${options.id}-error`;
    input.setAttribute('aria-describedby', invalidFeedback.id);
    $.append(group, invalidFeedback);

    return { group, input, invalidFeedback };
}

/**
 * Creates a modal.
 * @param {typeof Editor} Component The component class.
 * @param {EditorModalOptions} options Options for the modal.
 * @returns {HTMLElement} The modal element.
 */
export function createModal(Component, options) {
    const returnFocus = options.returnFocus || document.activeElement;
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

            if (returnFocus?.isConnected) {
                returnFocus.focus({ preventScroll: true });
            }
        }
    });

    controller.show(returnFocus);

    return modal;
}
