import $ from '@fr0st/query';



export function replaceElement(oldElement, newElement) {
    const newStyles = {
        ...$.getStyle(oldElement),
        ...$.getStyle(newElement)
    };

    const newClasses = [
        $.getAttribute(oldElement, 'class') || '',
        $.getAttribute(newElement, 'class') || ''
    ];

    $.setAttribute(newElement, {
        ...$.getAttribute(oldElement),
        ...$.getAttribute(newElement)
    });

    $.setStyle(newElement, newStyles);
    $.addClass(newElement, newClasses);

    $.append(newElement, $.contents(oldElement));
    $.before(oldElement, newElement);
    $.detach(oldElement);
};

export function swapTags(elements, tagName) {
    const results = [];

    for (const element of elements) {
        const newElement = $.create(tagName);

        replaceElement(element, newElement);

        results.push(newElement);
    }

    return results;
};