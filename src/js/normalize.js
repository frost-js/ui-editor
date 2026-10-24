import $ from '@fr0st/query';

const transparent = 'rgba(0, 0, 0, 0)';

/**
 * Determine if a node is phrasing content.
 * https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
 * @param {Node} node The input node.
 * @returns {boolean} TRUE if the node is phrasing content, otherwise FALSE.
 */
export const isPhrasingContent = (node) => $._isText(node) || $.is(node, 'a, abbr, area, audio, b, bdi, bdo, br, button, cite, code, data, datalist, del, dfn, em, embed, i, iframe, img, input, ins, kbd, label, map, mark, math, meter, noscript, object, output, picture, progress, q, ruby, s, samp, script, select, slot, small, span, strong, sub, sup, svg, template, textarea, time, u, var, video, wbr');

/**
 * Determine if a node is a form element.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
 * @param {Node} node The input node.
 * @returns {boolean} TRUE if the node is a form element, otherwise FALSE.
 */
const isFormElement = (node) => $.is(node, 'button, fieldset, input, object, output, select, textarea');

/**
 * Determine if a node is a void element.
 * https://developer.mozilla.org/en-US/docs/Glossary/Void_element
 * @param {Node} node The input node.
 * @returns {boolean} TRUE if the node is a void element, otherwise FALSE.
 */
const isVoidElement = (node) => $.is(node, 'area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr');

/**
 * Determine if a node is a phrasing container.
 * @param {Node} node The input node.
 * @returns {boolean} TRUE if the node is a phrasing container, otherwise FALSE.
 */
const isPhrasingContainer = (node) => !$._isText(node) && isPhrasingContent(node) && !isVoidElement(node) && !isFormElement(node);

/**
 * Join adjacent inline elements.
 * @param {HTMLElement} container The container.
 * @param {object} markers The selection markers.
 */
export function joinAdjacentNodes(container, markers) {
    const isMarker = (node) => node === markers.start || node === markers.end;
    for (const element of [...container.querySelectorAll('*')]) {
        if (!container.contains(element) || !isPhrasingContainer(element)) {
            continue;
        }
        while (true) {
            const between = [];
            let next = element.nextSibling;
            while (next && isMarker(next)) {
                between.push(next);
                next = next.nextSibling;
            }
            if (!next || !isPhrasingContainer(next) || !$.isEqual(element, next, { shallow: true })) {
                break;
            }
            element.append(...between, ...next.childNodes);
            next.remove();
        }
    }
}

/**
 * Normalize phrasing containers.
 * @param {HTMLElement} container The container.
 */
export function normalizePhrasing(container) {
    const elements = [...container.querySelectorAll('*')].reverse();
    for (const element of elements) {
        if (!container.contains(element) ||
            (!element.matches('p, h1, h2, h3, h4, h5, h6, pre') && !isPhrasingContainer(element)) ||
            [...element.childNodes].every(isPhrasingContent)) {
            continue;
        }
        const fragment = document.createDocumentFragment();
        let group = [];
        let first = true;
        const flush = () => {
            if (!group.length) {
                return;
            }
            if (group.every((node) => node.nodeType === Node.TEXT_NODE && !node.textContent)) {
                fragment.append(...group);
            } else {
                const wrapper = element.cloneNode(false);
                if (!first) {
                    wrapper.removeAttribute('id');
                }
                first = false;
                wrapper.append(...group);
                fragment.append(wrapper);
            }
            group = [];
        };
        for (const child of [...element.childNodes]) {
            if (isPhrasingContent(child)) {
                group.push(child);
            } else {
                flush();
                fragment.append(child);
            }
        }
        flush();
        element.replaceWith(fragment);
    }
}

/**
 * Normalize span elements.
 * @param {HTMLElement} container The container.
 */
export function normalizeSpans(container) {
    const elements = $.find('span', container);

    for (const element of elements) {
        if ([...$.getProperty(element, 'attributes')].length) {
            continue;
        }

        const contents = $.contents(element);

        if (contents.length) {
            $.after(element, contents);
        }

        $.detach(element);
    }
}

/**
 * Normalize style attributes.
 * @param {HTMLElement} container The container.
 */
export function normalizeStyles(container) {
    const elements = $.find('[style]', container);

    for (const element of elements) {
        const styles = $.getStyle(element);

        for (const [style, value] of Object.entries(styles)) {
            if (value === 'inherit') {
                $.removeStyle(element, style);
                continue;
            }

            const clone = $.clone(element, { deep: false });
            $.after(element, clone);
            $.removeAttribute(clone, 'style');
            let testValue = $.css(clone, style);
            $.detach(clone);

            if (style === 'background-color' && testValue === transparent) {
                testValue = [container, ...$.parents(element, null, container)]
                    .map((parent) => $.css(parent, style))
                    .filter((parentStyle) => parentStyle !== transparent)
                    .pop();
            }

            const cssValue = $.css(element, style);

            if (cssValue === testValue) {
                $.removeStyle(element, style);
            }
        }

        if ($.getAttribute(element, 'style') === '') {
            $.removeAttribute(element, 'style');
        }
    }
}
