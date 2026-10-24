import $ from '@fr0st/query';

/**
 * Emits the existing change contract without reloading our own content.
 * @param {HTMLTextAreaElement} node The native textarea.
 */
export function notifyChange(node) {
    $.triggerEvent(node, 'change.ui.editor', { data: { skipUpdate: true } });
}

/**
 * Serializes empty editing scaffolding as an empty native value.
 * @param {HTMLElement|DocumentFragment} surface The surface.
 * @param {string} [html] Its serialized HTML.
 * @returns {string} The submitted HTML.
 */
export function serialize(surface, html = surface.innerHTML) {
    return !surface.textContent.trim() && !surface.querySelector('img, iframe, hr, table') ? '' : html;
}
