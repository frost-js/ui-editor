/** @import { Page } from '@playwright/test'; */
/** @import { EditorOptions } from '../../src/js/types.js'; */

/**
 * Creates a textarea and editor with a small toolbar for behavior tests.
 * @param {Page} page The test page.
 * @param {string} [html='<p>Hello world</p>'] The initial content.
 * @param {EditorOptions} [options] Additional options.
 */
export async function createEditor(page, html = '<p>Hello world</p>', options = {}) {
    await page.evaluate(({ html, options }) => {
        const node = document.createElement('textarea');
        node.id = 'editor';
        node.value = html;
        document.body.append(node);
        window.editor = UI.Editor.init(node, {
            buttons: [['bold', 'source', 'undo', 'redo']],
            ...options,
        });
    }, {
        html,
        options,
    });
}

/**
 * Selects a content element inside the editing surface.
 * @param {Page} page The test page.
 * @param {string} selector The content selector.
 */
export async function selectContents(page, selector) {
    await page.locator('.editor').focus();
    await page.evaluate((selector) => getSelection().selectAllChildren(document.querySelector(selector)), selector);
}
