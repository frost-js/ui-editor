import { expect, test } from '#test';

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        const node = document.createElement('textarea');
        node.id = 'editor';
        node.name = 'content';
        node.value = '<p>Hello world</p>';
        document.body.append(node);
        window.editor = UI.Editor.init(node, {
            buttons: [['bold', 'italic', 'source', 'undo', 'redo']],
            fonts: ['Arial', 'serif'],
        });
    });
});

test('keeps resolved options unchanged while deriving fonts and toolbar state', async ({ page }) => {
    expect(await page.evaluate(() => ({
        frozen: Object.isFrozen(window.editor.options),
        fonts: window.editor.options.fonts,
        defaultFont: window.editor.options.defaultFont,
        buttons: window.editor.options.buttons,
    }))).toEqual({
        frozen: true,
        fonts: ['Arial', 'serif'],
        defaultFont: 'Arial',
        buttons: [['bold', 'italic', 'source', 'undo', 'redo']],
    });
    await expect(page.getByRole('toolbar').getByRole('button')).toHaveCount(5);
});

test('synchronizes typed content and emits change events on the textarea', async ({ page }) => {
    await page.evaluate(() => {
        window.changeCount = 0;
        $.addEvent(document.querySelector('#editor'), 'change.ui.editor', () => window.changeCount++);
    });
    await page.locator('.editor').fill('Edited content');
    await expect(page.locator('.editor')).toHaveText('Edited content');
    await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
    expect(await page.evaluate(() => window.changeCount)).toBeGreaterThan(0);
});

test('round trips source edits through the textarea and the editing surface', async ({ page }) => {
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    const source = page.locator('.editor-source');
    await expect(source).toHaveValue('<p>Hello world</p>');
    await source.fill('<h2>Source title</h2><p>Source body</p>');
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<h2>Source title</h2><p>Source body</p>');
    await expect(page.locator('#editor')).toHaveValue('<h2>Source title</h2><p>Source body</p>');
});

test('restores content and selection through undo and redo', async ({ page }) => {
    await page.locator('.editor').click();
    await page.keyboard.press('End');
    await page.keyboard.type('!');
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
    await page.keyboard.type('?');
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!?</p>');
    await page.evaluate(() => window.editor.undo());
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
    await expect(page.locator('.editor')).toHaveText('Hello world!');
    await page.evaluate(() => window.editor.redo());
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!?</p>');
    expect(await page.evaluate(() => {
        const selection = getSelection();
        return document.querySelector('.editor').contains(selection.anchorNode);
    })).toBe(true);
});

test('preserves redo across source viewing and clears it when source content changes', async ({ page }) => {
    await page.evaluate(() => window.editor.insertText('!'));
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
    await page.evaluate(() => window.editor.undo());
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
    await page.evaluate(() => window.editor.undo());
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await page.locator('.editor-source').fill('<p>New source</p>');
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Redo', exact: true })).toHaveAttribute('aria-disabled', 'true');
    await page.evaluate(() => window.editor.redo());
    await expect(page.locator('#editor')).toHaveValue('<p>New source</p>');
    await page.evaluate(() => window.editor.undo());
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
});

test('can undo the first edit back to the initial content', async ({ page }) => {
    await page.locator('.editor').click();
    await page.keyboard.press('End');
    await page.keyboard.type('!');
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
    await page.evaluate(() => window.editor.undo());

    await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
});

test('indents and outdents a text selection without losing its indentation', async ({ page }) => {
    await page.locator('.editor').focus();
    await page.evaluate(() => {
        const paragraph = document.querySelector('.editor p');
        const selection = getSelection();
        selection.selectAllChildren(paragraph);
        window.editor.indent();
    });
    await expect(page.locator('.editor')).toHaveText('Hello world');

    await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveText('Hello world');
    await page.evaluate(() => window.editor.outdent());
    await expect(page.locator('.editor')).toHaveText('Hello world');
    await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveCount(0);
});

test('restores the textarea and releases its registered instance on disposal', async ({ page }) => {
    await page.evaluate(() => window.editor.dispose());
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('.editor')).toHaveCount(0);
    expect(await page.evaluate(() => $.getData(document.querySelector('#editor'), UI.Editor.DATA_KEY))).toBeUndefined();
});
