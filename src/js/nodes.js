import $ from '@fr0st/query';

/**
 * Replaces an element while preserving its children, attributes, styles, and classes.
 * @param {HTMLElement} oldElement The element to replace.
 * @param {HTMLElement} newElement The replacement element.
 */
export function replaceElement(oldElement, newElement) {
    const newStyles = {
        ...$.getStyle(oldElement),
        ...$.getStyle(newElement),
    };

    const newClasses = [
        $.getAttribute(oldElement, 'class') || '',
        $.getAttribute(newElement, 'class') || '',
    ];

    $.setAttribute(newElement, {
        ...$.getAttribute(oldElement),
        ...$.getAttribute(newElement),
    });

    $.setStyle(newElement, newStyles);
    $.addClass(newElement, newClasses);

    $.append(newElement, $.contents(oldElement));
    $.before(oldElement, newElement);
    $.detach(oldElement);
}

/**
 * Replaces element tags while retaining their content and attributes.
 * @param {HTMLElement[]} elements The elements to replace.
 * @param {string} tagName The replacement tag name.
 * @returns {HTMLElement[]} The replacement elements.
 */
export function swapTags(elements, tagName) {
    const results = [];

    for (const element of elements) {
        const newElement = $.create(tagName);

        replaceElement(element, newElement);

        results.push(newElement);
    }

    return results;
}
