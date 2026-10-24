import { expect, test } from '#test';

test('removes unadorned spans and joins identical adjacent inline nodes', async ({ page }) => {
    await page.evaluate(() => {
        const node = document.createElement('textarea');
        node.value = '<p><span>Plain</span> <b>bold</b><b> text</b></p>';
        document.body.append(node);
        UI.Editor.init(node, { buttons: [] });
    });
    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p>Plain <b>bold text</b></p>');
});

test('preserves headings, lists, tables, and media in existing content', async ({ page }) => {
    const html = '<h2>Title</h2><ul><li>Item</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table><p><a href="https://example.com/">Link</a><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Example"></p>';
    await page.evaluate((html) => {
        const node = document.createElement('textarea');
        node.value = html;
        document.body.append(node);
        UI.Editor.init(node, { buttons: [] });
    }, html);
    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
});

test('restores a ranged selection after inserting and removing selection markers', async ({ page }) => {
    expect(await page.evaluate(async () => {
        const { saveSelection, restoreSelection } = await import('/src/js/selection.js');
        const node = document.createElement('p');
        node.textContent = 'Selected text';
        document.body.append(node);
        const range = document.createRange();
        range.setStart(node.firstChild, 0);
        range.setEnd(node.firstChild, 8);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const markers = saveSelection();
        restoreSelection(markers);
        return { selected: selection.toString(), text: node.textContent };
    })).toEqual({ selected: 'Selected', text: 'Selected text' });
});
