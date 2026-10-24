import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

for (const [name, value, start, end, shift, expected, selection] of [
    ['inserts a tab at the caret', 'abc', 1, 1, false, 'a\tbc', [2, 2]],
    ['replaces a selected run with a tab', 'abc', 1, 2, false, 'a\tc', [2, 2]],
    ['indents selected lines', 'one\ntwo\nthree', 0, 7, false, '\tone\n\ttwo\nthree', [0, 9]],
    ['outdents selected lines and retains their selection', '\tone\n\ttwo\nthree', 1, 9, true, 'one\ntwo\nthree', [0, 7]],
]) {
    test(`source mode ${name}`, async ({ page }) => {
        await createEditor(page);
        await page.getByRole('button', { name: 'View Source', exact: true }).click();
        await page.locator('.editor-source').fill(value);
        await page.evaluate(({ start, end }) => {
            const source = window.editor._source;
            source.setSelectionRange(start, end);
        }, { start, end });
        await page.keyboard.press(shift ? 'Shift+Tab' : 'Tab');
        await expect(page.locator('.editor-source')).toHaveValue(expected);
        expect(await page.locator('.editor-source').evaluate((node) => [node.selectionStart, node.selectionEnd])).toEqual(selection);
        await expect(page.locator('#editor')).toHaveValue(expected);
    });
}

test('updates line numbers when source shrinks, wraps, and scrolls', async ({ page }) => {
    await createEditor(page, '<p>Initial</p>', { height: '80px' });
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    const source = page.locator('.editor-source');
    await source.fill(Array.from({ length: 20 }, (_, index) => `<p>Line ${index}</p>`).join('\n'));
    await expect(page.locator('.editor-source').locator('..').locator('..').locator('> div:first-child > div')).toHaveCount(20);
    await source.evaluate((node) => {
        node.scrollTop = 50; node.dispatchEvent(new Event('scroll'));
    });
    await expect(page.locator('.editor-source').locator('..').locator('..').locator('> div:first-child')).toHaveCSS('margin-top', '-50px');
    await source.fill('<p>Short</p>');
    await expect(page.locator('.editor-source').locator('..').locator('..').locator('> div:first-child > div')).toHaveCount(1);
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.locator('.editor')).toHaveText('Short');
});


test('leaves browser tab shortcuts alone and permits Escape then Shift+Tab navigation', async ({ page }) => {
    await createEditor(page);
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    const source = page.locator('.editor-source');
    await source.fill('\tone');
    expect(await source.evaluate((node) => ['ctrlKey', 'metaKey', 'altKey'].every((modifier) => {
        const event = new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', [modifier]: true, bubbles: true, cancelable: true });
        return node.dispatchEvent(event);
    }))).toBe(true);
    await expect(source).toHaveValue('\tone');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Shift+Tab');
    await expect(source).not.toBeFocused();
    await expect(source).toHaveValue('\tone');
});
