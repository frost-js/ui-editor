import $ from '@fr0st/query';

const tags = Object.fromEntries([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code',
    'col', 'colgroup', 'dd', 'del', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
    'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'ins',
    'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'samp', 'small', 'span',
    'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time',
    'tr', 'u', 'ul', 'var', 'wbr',
].map((tag) => [tag, []]));
Object.assign(tags, {
    '*': ['class', 'title', 'dir', 'lang', 'style'],
    'a': ['href', 'target', 'rel'],
    'font': ['face', 'size', 'color'],
    'img': ['src', 'alt', 'width', 'height'],
    'iframe': ['src', 'title', 'width', 'height', 'allowfullscreen', 'frameborder'],
    'ol': ['start', 'reversed', 'type'],
    'li': ['value'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan', 'scope'],
    'col': ['span'],
    'colgroup': ['span'],
});
const styles = new Set([
    'color',
    'background-color',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'text-decoration',
    'text-decoration-line',
    'text-align',
    'vertical-align',
    'white-space',
    'margin-left',
    'margin-right',
    'margin-inline-start',
    'margin-inline-end',
    'width',
    'height',
    'max-width',
    'max-height',
    'inline-size',
    'block-size',
    'max-inline-size',
    'max-block-size',
    'float',
]);

/**
 * Checks an editor URL, including relative links and raster image uploads.
 * @param {string} value The URL.
 * @param {'link'|'image'|'video'} [kind='link'] The destination type.
 * @returns {boolean} Whether the URL is supported.
 */
export function isSafeUrl(value, kind = 'link') {
    try {
        const url = new URL(value, document.baseURI);
        if (kind === 'video') {
            return url.protocol === 'https:' && ['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) && /^\/embed\/[\w-]+$/.test(url.pathname);
        }
        if (kind === 'image' && /^data:image\/(?:png|gif|jpeg|webp|avif);base64,[a-z\d+/=\s]+$/i.test(value)) {
            return true;
        }
        return ['http:', 'https:'].includes(url.protocol) || (kind === 'link' && ['mailto:', 'tel:'].includes(url.protocol));
    } catch {
        return false;
    }
}

/**
 * Sanitizes supported editor markup before it reaches the live DOM.
 * @param {string} html Untrusted HTML.
 * @returns {string} Supported HTML with safe URLs and presentation styles.
 */
export function sanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = $.sanitize(html, tags);
    for (const node of template.content.querySelectorAll('*')) {
        for (const property of [...node.style]) {
            const value = node.style.getPropertyValue(property);
            if (!styles.has(property) || /url\s*\(|expression\s*\(|var\s*\(|[\\@]/i.test(value)) {
                node.style.removeProperty(property);
            }
        }
        if (!node.style.length) {
            node.removeAttribute('style');
        }
        for (const [attribute, kind] of [['href', 'link'], ['src', node.localName === 'iframe' ? 'video' : 'image']]) {
            if (node.hasAttribute(attribute) && !isSafeUrl(node.getAttribute(attribute), kind)) {
                node.removeAttribute(attribute);
            }
        }
        if (node.localName === 'iframe') {
            if (!node.hasAttribute('src')) {
                node.remove();
                continue;
            }
            node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
            node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            if (!node.hasAttribute('title')) {
                node.setAttribute('title', 'YouTube video');
            }
        }
        if (node.localName === 'a') {
            if (node.getAttribute('target') === '_blank') {
                node.setAttribute('rel', 'noopener noreferrer');
            } else {
                node.removeAttribute('target');
            }
        }
    }
    return template.innerHTML;
}
