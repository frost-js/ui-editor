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

test('can undo the first edit back to the initial content', async ({ page }) => {
    await page.locator('.editor').click();
    await page.keyboard.press('End');
    await page.keyboard.type('!');
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
    await page.evaluate(() => window.editor.undo());

    test.fail(true, 'Step 5: the checkpoint does not seed history with initial content (MIGRATION_PROPOSAL.md).');
    await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
});

test('indents and outdents a text selection without losing its indentation', async ({ page, browserName }) => {
    await page.locator('.editor').focus();
    await page.evaluate(() => {
        const paragraph = document.querySelector('.editor p');
        const selection = getSelection();
        selection.selectAllChildren(paragraph);
        window.editor.indent();
    });
    await expect(page.locator('.editor')).toHaveText('Hello world');

    test.fail(true, browserName === 'firefox' ?
        'Step 5: checkpoint outdent retains the manual indentation in Firefox (MIGRATION_PROPOSAL.md).' :
        'Step 5: checkpoint text-selection indentation leaves text outside the wrapper in Chromium/WebKit (MIGRATION_PROPOSAL.md).');
    await expect(page.locator('.editor div[style*="margin-left"]')).toHaveText('Hello world');
    await page.evaluate(() => window.editor.outdent());
    await expect(page.locator('.editor')).toHaveText('Hello world');
    await expect(page.locator('.editor div[style*="margin-left"]')).toHaveCount(0);
});

test('restores the textarea and releases its registered instance on disposal', async ({ page }) => {
    await page.evaluate(() => window.editor.dispose());
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('.editor')).toHaveCount(0);
    expect(await page.evaluate(() => $.getData(document.querySelector('#editor'), UI.Editor.DATA_KEY))).toBeUndefined();
});
