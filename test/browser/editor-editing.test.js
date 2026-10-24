import { expect, test } from '#test';
import { createEditor, selectContents } from '../setup/editor.js';

for (const [method, property, expected, value] of [
    ['underline', 'textDecorationLine', 'underline'],
    ['foreColor', 'color', 'rgb(255, 0, 0)', '#ff0000'],
    ['backColor', 'backgroundColor', 'rgb(255, 255, 0)', '#ffff00'],
    ['fontName', 'fontFamily', 'serif', 'serif'],
]) {
    test(`applies ${method} to a range and retains plain text on undo`, async ({ page }) => {
        await createEditor(page, '<p>Formatted text</p>');
        await selectContents(page, '.editor p');
        await page.evaluate(({ method, value }) => window.editor[method](value), { method, value });
        expect(await page.locator('.editor').evaluate((node, property) => {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            const text = walker.nextNode();
            return getComputedStyle(text.parentElement)[property];
        }, property)).toContain(expected);
        await expect(page.locator('.editor')).toHaveText('Formatted text');
        await page.evaluate(() => window.editor.undo());
        await expect(page.locator('#editor')).toHaveValue('<p>Formatted text</p>');
    });
}

for (const [method, alignment] of [['justifyLeft', 'left'], ['justifyRight', 'right'], ['justifyCenter', 'center'], ['justifyFull', 'justify']]) {
    test(`aligns a paragraph with ${method}`, async ({ page }) => {
        await createEditor(page);
        await selectContents(page, '.editor p');
        await page.evaluate((method) => window.editor[method](), method);
        await expect(page.locator('.editor p')).toHaveCSS('text-align', alignment === 'left' ? /^(left|start)$/ : alignment);
        await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
    });
}

test('sets a configured font size and removes inline formatting', async ({ page }) => {
    await createEditor(page, '<p>Size</p>', { buttons: [['fontSize', 'removeFormat', 'source']] });
    await selectContents(page, '.editor p');
    await page.evaluate(() => window.editor.fontSize(24));
    expect(await page.locator('.editor').evaluate((node) => getComputedStyle(node.querySelector('span') || node.querySelector('font')).fontSize)).toBe('24px');
    await expect(page.locator('.editor')).toHaveText('Size');
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.locator('.editor-source')).toHaveValue(/Size/);
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.locator('.editor')).toHaveText('Size');
    await selectContents(page, '.editor');
    await page.getByRole('button', { name: 'Remove Formatting', exact: true }).click();
    await expect(page.locator('.editor')).toHaveText('Size');
    await expect(page.locator('.editor [style]')).toHaveCount(0);
});

for (const [method, tag] of [['insertOrderedList', 'ol'], ['insertUnorderedList', 'ul']]) {
    test(`creates a list with ${method} and handles Tab/Shift+Tab`, async ({ page }) => {
        await createEditor(page, '<p>First</p><p>Second</p>');
        await selectContents(page, '.editor');
        await page.evaluate((method) => window.editor[method](), method);
        await expect(page.locator(`.editor > ${tag} > li`)).toHaveText(['First', 'Second']);
        await page.locator('.editor').focus();
        await page.evaluate(() => {
            const item = document.querySelector('.editor li:last-child');
            getSelection().setBaseAndExtent(item.firstChild, 0, item.firstChild, 0);
        });
        await page.keyboard.press('Tab');
        await expect(page.locator(`.editor > ${tag} > li > ${tag} > li`)).toHaveText('Second');
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator(`.editor > ${tag} > li`)).toHaveText(['First', 'Second']);
    });
}

test('inserts a horizontal rule and undoes it without dropping surrounding text', async ({ page }) => {
    await createEditor(page);
    await page.evaluate(() => window.editor.insertHorizontalRule());
    await expect(page.locator('.editor hr')).toHaveCount(1);
    await expect(page.locator('.editor')).toHaveText('Hello world');
    await page.evaluate(() => window.editor.undo());
    await expect(page.locator('.editor hr')).toHaveCount(0);
});

test('outdents an empty indented paragraph on Backspace', async ({ page }) => {
    await createEditor(page, '<div style="margin-inline-start: 2em;"><p><br></p></div>');
    await selectContents(page, '.editor p');
    await page.evaluate(() => getSelection().collapseToStart());
    await page.keyboard.press('Backspace');
    await expect(page.locator('.editor > div')).toHaveCount(0);
    await expect(page.locator('.editor > p')).toHaveCount(1);
});

for (const tag of ['p', 'h2']) {
    test(`deletes an empty paragraph before ${tag} without losing the following format`, async ({ page }) => {
        await createEditor(page, `<p><br></p><${tag}>Following</${tag}>`);
        await selectContents(page, '.editor p:first-child');
        await page.evaluate(() => getSelection().collapseToStart());
        await page.keyboard.press('Delete');
        await expect(page.locator(`.editor > ${tag}`)).toHaveText('Following');
        await expect(page.locator('.editor')).toHaveText('Following');
    });
}

test('keeps an empty editor block on Backspace and synchronizes composition input', async ({ page }) => {
    await createEditor(page, '');
    await page.locator('.editor').focus();
    await page.keyboard.press('Backspace');
    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p><br></p>');
    await page.evaluate(() => {
        const surface = window.editor._editor;
        surface.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        surface.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertCompositionText', isComposing: true, bubbles: true }));
        surface.firstChild.textContent = '日本語';
        getSelection().selectAllChildren(surface.firstChild);
        getSelection().collapseToEnd();
        surface.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true, bubbles: true }));
        surface.dispatchEvent(new CompositionEvent('compositionend', { data: '日本語', bubbles: true }));
    });
    await expect(page.locator('#editor')).toHaveValue('<p>日本語</p>');
    await page.evaluate(() => window.editor.undo());
    await expect(page.locator('#editor')).toHaveValue('');
    await page.evaluate(() => window.editor.redo());
    await expect(page.locator('.editor')).toHaveText('日本語');
});

test('updates toolbar pressed state and disables only editing controls in source mode', async ({ page }) => {
    await createEditor(page, '<p><b>Bold</b></p>', { buttons: [['bold', 'italic', 'source', 'fullScreen']] });
    await selectContents(page, '.editor b');
    await expect(page.getByRole('button', { name: 'Bold', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bold', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Full Screen', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.editor-source')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.editor-source')).toBeVisible();
});


for (const [method, tag] of [['subscript', 'sub'], ['superscript', 'sup']]) {
    test(`retains semantic ${method} formatting`, async ({ page }) => {
        await createEditor(page, '<p>Formatted text</p>');
        await selectContents(page, '.editor p');
        await page.evaluate((method) => window.editor[method](), method);
        await expect(page.locator(`.editor ${tag}`)).toHaveText('Formatted text');
        await page.evaluate(() => window.editor.undo());
        await expect(page.locator('#editor')).toHaveValue('<p>Formatted text</p>');
    });
}
