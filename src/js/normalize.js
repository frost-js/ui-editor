import $ from '@fr0st/query';
import { replaceElement } from './nodes.js';

const transparent = 'rgba(0, 0, 0, 0)';

/**
 * Determine if a node is phrasing content.
 * https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
 * @param {Node} node The input node.
 * @return {Boolean} TRUE if the node is phrasing content, otherwise FALSE.
 */
export const isPhrasingContent = (node) => $._isText(node) || $.is(node, 'a, abbr, area, audio, b, bdi, bdo, br, button, cite, code, data, datalist, del, dfn, em, embed, i, iframe, img, input, ins, kbd, label, map, mark, math, meter, noscript, object, output, picture, progress, q, ruby, s, samp, script, select, slot, small, span, strong, sub, sup, svg, template, textarea, time, u, var, video, wbr');

/**
 * Determine if a node is a form element.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
 * @param {Node} node The input node.
 * @return {Boolean} TRUE if the node is a form element, otherwise FALSE.
 */
const isFormElement = (node) => $.is(node, 'button, fieldset, input, object, output, select, textarea');

/**
 * Determine if a node is a void element.
 * https://developer.mozilla.org/en-US/docs/Glossary/Void_element
 * @param {Node} node The input node.
 * @return {Boolean} TRUE if the node is a void element, otherwise FALSE.
 */
const isVoidElement = (node) => $.is(node, 'area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr');

/**
 * Determine if a node is a phrasing container.
 * @param {Node} node The input node.
 * @return {Boolean} TRUE if the node is a phrasing container, otherwise FALSE.
 */
const isPhrasingContainer = (node) => !$._isText(node) && isPhrasingContent(node) && !isVoidElement(node) && !isFormElement(node);

/**
 * Join adjacent inline elements.
 * @param {HTMLElement} container The container.
 * @param {object} markers The selection markers.
 */
export function joinAdjacentNodes(container, markers) {
    const elements = $.find('*', container);

    const isMarker = (node) =>
        (markers.start && $.isSame(node, markers.start)) ||
        (markers.end && $.isSame(node, markers.end));

    for (const element of elements) {
        if (
            isMarker(element) ||
            !isPhrasingContainer(element)
        ) {
            continue;
        }

        const moveMarkers = [];
        let next = element.nextSibling;
        while (next && isMarker(next)) {
            moveMarkers.push(next);
            next = next.nextSibling;
        }

        if (
            !next ||
            !isPhrasingContainer(next) ||
            !$.isEqual(element, next, { shallow: true })
        ) {
            continue;
        }

        $.prepend(next, $.contents(element));

        if (moveMarkers.length) {
            $.prepend(next, moveMarkers);
        }

        $.detach(element);
    }
};

/**
 * Normalize phrasing containers.
 * @param {HTMLElement} container The container.
 */
export function normalizePhrasing(container) {
    const elements = $.find('h1, h2, h3, h4, h5, h6, p, pre', container);

    for (const element of elements) {
        const contents = $.contents(element);

        if (!contents.length) {
            continue;
        }

        for (const [i, child] of contents.entries()) {
            if (isPhrasingContent(child)) {
                continue;
            }

            const nextSiblings = contents.splice(i);
            $.after(element, nextSiblings);

            // TODO: check
            if ($.is(element, 'p')) {
                break;
            }

            const tagName = $.tagName(element);

            const wrapContents = (parent, nodes) => {
                const stack = [];
                let lastNode;

                for (const node of nodes) {
                    if (isPhrasingContent(node)) {
                        stack.push(node);
                        continue;
                    }

                    if (stack.length) {
                        const clone = $.clone(element, { deep: false });
                        const tempNodes = stack.splice(0);
                        $.append(clone, tempNodes);
                        $.before(node, clone);
                    }

                    lastNode = node;

                    if ($.is(node, tagName)) {
                        continue;
                    }

                    if ($.is(node, 'h1, h2, h3, h4, h5, h6, p, pre')) {
                        const clone = $.clone(element, { deep: false });
                        replaceElement(node, clone);
                        lastNode = clone;
                        continue;
                    }

                    const contents = $.contents(node);

                    wrapContents(node, contents);
                }

                if (stack.length) {
                    const clone = $.clone(element, { deep: false });
                    $.append(clone, stack);

                    if (lastNode) {
                        $.after(lastNode, clone);
                    } else {
                        $.append(parent, clone);
                    }
                }

                return stack;
            };

            wrapContents(element, nextSiblings);
            break;
        }

        if (!contents.length) {
            $.detach(element);
        }
    }
};

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
};

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
};
