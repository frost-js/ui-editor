import $ from '@fr0st/query';
import { Modal } from '@fr0st/ui';

/**
 * Create a form checkbox.
 * @param {object} options Options for the checkbox.
 * @returns {object} An object containing the form elements.
 */
export function _createCheckbox(options) {
    const group = $.create('div', {
        class: this.classes.formGroup,
    });

    const inputContainer = $.create('div', {
        class: this.classes.checkboxContainer,
    });

    const input = $.create('input', {
        class: this.classes.checkbox,
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
 * @param {object} options Options for the file input.
 * @returns {object} An object containing the form elements.
 */
export function _createFileInput(options) {
    const group = $.create('div', {
        class: this.classes.formGroup,
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    const inputContainer = $.create('div', {
        class: this.classes.inputContainer,
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
 * @param {object} options Options for the text input.
 * @returns {object} An object containing the form elements.
 */
export function _createInput(options) {
    const group = $.create('div', {
        class: this.classes.formGroup,
    });

    const label = $.create('label', {
        text: options.label,
        attributes: {
            for: options.id,
        },
    });

    const inputContainer = $.create('div', {
        class: this.classes.inputContainer,
    });

    const input = $.create('input', {
        class: this.classes.input,
        attributes: {
            id: options.id,
            type: options.type || 'text',
            ...options.attributes,
        },
    });

    const ripple = $.create('div', {
        class: this.classes.inputRipple,
    });

    const invalidFeedback = $.create('div', {
        class: this.classes.invalidFeedback,
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
 * @param {object} options Options for the modal.
 * @returns {HTMLElement} The modal element.
 */
export function _createModal(options) {
    const modal = $.create('div', {
        class: this.classes.modal,
        attributes: {
            'tabindex': -1,
            'role': 'dialog',
            'aria-model': true,
        },
    });

    const modalDialog = $.create('div', {
        class: this.classes.modalDialog,
    });

    $.append(modal, modalDialog);

    if (options.fullScreen) {
        $.addClass(modalDialog, this.classes.modalFullscreen);
    }

    const modalContent = $.create('form', {
        class: this.classes.modalContent,
    });

    $.append(modalDialog, modalContent);

    const modalHeader = $.create('div', {
        class: this.classes.modalHeader,
    });

    $.append(modalContent, modalHeader);

    if (options.title) {
        const modalTitle = $.create('h6', {
            class: this.classes.modalTitle,
            text: options.title,
        });

        $.append(modalHeader, modalTitle);
    }

    const closeBtn = $.create('button', {
        class: this.classes.modalBtnClose,
        dataset: {
            uiDismiss: 'modal',
        },
        attributes: {
            'type': 'button',
            'aria-label': this.lang.modals.close,
        },
    });

    $.append(modalHeader, closeBtn);

    if (options.content) {
        const modalBody = $.create('div', {
            class: this.classes.modalBody,
        });

        $.append(modalBody, options.content);
        $.append(modalContent, modalBody);
    }

    if (options.onSubmit) {
        const modalFooter = $.create('div', {
            class: this.classes.modalFooter,
        });

        $.append(modalContent, modalFooter);

        const cancelButton = $.create('button', {
            text: options.cancelText,
            class: this.classes.modalBtnSecondary,
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
            class: this.classes.modalBtnPrimary,
            attributes: {
                type: 'submit',
            },
        });

        $.append(modalFooter, submitButton);

        $.addEvent(modalContent, 'submit', (e) => {
            e.preventDefault();

            if (options.onSubmit(e) === false) {
                return;
            }

            Modal.init(modal).hide();
        });
    }

    $.append(document.body, modal);

    if ('onShow' in options) {
        $.addEvent(modal, 'show.ui.modal', (e) => {
            options.onShow(e);
        });
    }

    if ('onShown' in options) {
        $.addEvent(modal, 'shown.ui.modal', (e) => {
            options.onShown(e);
        });
    }

    if ('onHide' in options) {
        $.addEvent(modal, 'hide.ui.modal', (e) => {
            options.onHide(e);
        });
    }

    if ('onHidden' in options) {
        $.addEvent(modal, 'hidden.ui.modal', (e) => {
            options.onHidden(e);
        });
    }

    Modal.init(modal).show();

    return modal;
}
