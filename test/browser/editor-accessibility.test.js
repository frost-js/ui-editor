import { expect, test } from '#test';
import { createEditor, selectContents } from '../setup/editor.js';

test.describe('Editor accessibility', () => {
    test.describe('keyboard navigation and focus', () => {
        test('formats from keyboard dropdown controls and restores focus with Escape', async ({ page }) => {
            await createEditor(page, '<p>Heading</p>', { buttons: [['style', 'source']] });
            await selectContents(page, '.editor p');

            const toggle = page.getByRole('button', { name: 'Style', exact: true });

            await toggle.focus();
            await page.keyboard.press('ArrowDown');

            await expect(page.getByRole('button', { name: 'Paragraph', exact: true })).toBeFocused();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');

            await expect(page.locator('.editor h1')).toHaveText('Heading');
            await toggle.focus();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Escape');

            await expect(toggle).toBeFocused();
            await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        });

        test('opens a dialog by keyboard and restores focus after Escape', async ({ page }) => {
            await createEditor(page, '<p>Link</p>', { buttons: [['link']] });

            const button = page.getByRole('button', { name: 'Link', exact: true });

            await button.focus();
            await page.keyboard.press('Enter');

            const dialog = page.getByRole('dialog', { name: 'Insert Link' });

            await expect(dialog).toBeVisible();
            await expect(dialog.getByLabel('Link URL')).toBeFocused();
            await expect(dialog.getByLabel('Link URL')).toHaveAttribute('aria-describedby', /-error$/);
            await page.keyboard.press('Escape');

            await expect(dialog).toHaveCount(0);
            await expect(button).toBeFocused();
        });
    });

    test.describe('formatting and history shortcuts', () => {
        test('supports Escape then Tab to leave source mode and Meta formatting/history shortcuts', async ({ page }) => {
            await createEditor(page);
            await selectContents(page, '.editor p');
            await page.keyboard.press('Meta+b');

            await expect(page.locator('.editor').getByText('Hello world', { exact: true })).toHaveCSS('font-weight', '700');
            await expect(page.getByRole('button', { name: 'Bold', exact: true })).toHaveAttribute('aria-pressed', 'true');
            await page.evaluate(() => window.editor.insertText('Changed'));
            await page.keyboard.press('Meta+z');

            await expect(page.locator('.editor')).toHaveText('Hello world');
            await page.keyboard.press('Meta+Shift+z');

            await expect(page.locator('.editor')).toHaveText('Changed');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();

            const value = await page.locator('.editor-source').inputValue();

            await page.keyboard.press('Escape');
            await page.keyboard.press('Tab');

            await expect(page.locator('.editor-source')).not.toBeFocused();
            await expect(page.locator('.editor-source')).toHaveValue(value);
        });

        test('indents and outdents rich paragraphs with Tab and Shift+Tab', async ({ page }) => {
            await createEditor(page, '<p>First</p><p>Second</p>');
            await selectContents(page, '.editor');
            await page.keyboard.press('Tab');

            await expect(page.locator('.editor > div')).toHaveCSS('margin-inline-start', /px$/);
            expect(await page.locator('.editor > div').evaluate((node) => parseFloat(getComputedStyle(node).marginInlineStart))).toBeGreaterThan(0);
            await page.keyboard.press('Shift+Tab');

            await expect(page.locator('.editor > p')).toHaveCount(2);
            await expect(page.locator('.editor')).toBeFocused();
        });

        test('supports the default Ctrl formatting and redo shortcuts without intercepting unrelated keys', async ({ page }) => {
            await createEditor(page, '<p>Shortcuts</p>');
            await selectContents(page, '.editor p');
            await page.keyboard.press('Control+i');

            await expect(page.locator('.editor').getByText('Shortcuts', { exact: true })).toHaveCSS('font-style', 'italic');
            await page.keyboard.press('Control+u');

            await expect(page.locator('.editor u, .editor [style*="text-decoration"]')).toHaveCSS('text-decoration-line', 'underline');
            await page.keyboard.press('Control+z');
            await page.keyboard.press('Control+y');

            await expect(page.locator('.editor')).toHaveText('Shortcuts');
            expect(await page.locator('.editor').evaluate((node) => node.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'q',
                code: 'KeyQ',
                ctrlKey: true,
                bubbles: true,
                cancelable: true,
            })))).toBe(true);
        });
    });

    test.describe('context controls', () => {
        test('inserts tables using named native grid buttons', async ({ page }) => {
            await createEditor(page, '<p>Table</p>', { buttons: [['table']] });
            await page.getByRole('button', { name: 'Table', exact: true }).click();

            const cell = page.getByRole('button', { name: '2 × 3 table', exact: true });

            await cell.focus();
            await page.keyboard.press('Enter');

            await expect(page.locator('.editor table tr')).toHaveCount(2);
            await expect(page.locator('.editor table td')).toHaveCount(6);
        });

        test('positions and resizes an image in RTL and dismisses its context toolbar', async ({ page }) => {
            await page.evaluate(() => {
                document.body.dir = 'rtl';
            });
            await createEditor(page, '<p>' +
                '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="width: 100px; height: 50px;" alt="Example">' +
                '</p>');

            const image = page.locator('.editor img');

            await image.click();

            await expect(page.getByRole('group', { name: 'Context formatting', exact: true })).toBeVisible();
            await expect(page.locator('.editor-popover')).toHaveCSS('opacity', '1');

            const rect = await image.boundingBox();
            const overlay = await page.locator('.editor-img-highlight').boundingBox();

            expect(Math.abs(rect.x - overlay.x)).toBeLessThanOrEqual(3);
            expect(Math.abs(rect.y - overlay.y)).toBeLessThanOrEqual(3);

            const slider = page.getByRole('slider', { name: 'Image width' });

            await slider.focus();
            await page.keyboard.press('ArrowRight');

            await expect(image).toHaveCSS('width', '110px');
            await expect(slider).toHaveAttribute('aria-valuenow', '110');
            await page.keyboard.press('Escape');

            await expect(page.locator('.editor-popover')).toBeHidden();
            await expect(page.locator('.editor')).toBeFocused();
        });
    });
});
