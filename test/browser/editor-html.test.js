import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

test.describe('Editor HTML', () => {
    test.describe('loading', () => {
        test('preserves content wrappers, custom attributes, IDs, and styles', async ({ page }) => {
            await createEditor(page, '<article data-template="notice"><p id="message" style="padding: 12px;">Original content</p></article>');

            await expect(page.locator('.editor article')).toHaveAttribute('data-template', 'notice');
            await expect(page.locator('.editor #message')).toHaveText('Original content');
            await expect(page.locator('.editor #message')).toHaveCSS('padding', '12px');
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());

            await page.evaluate(() => {
                document.querySelector('#editor').value = '<section data-template="updated"><p id="replacement">Reloaded content</p></section>';
                window.editor.refresh();
            });

            await expect(page.locator('.editor section')).toHaveAttribute('data-template', 'updated');
            await expect(page.locator('.editor #replacement')).toHaveText('Reloaded content');
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
        });
    });

    test.describe('insertion', () => {
        for (const method of ['insertHtml', 'paste']) {
            test(`preserves attributes and styles through ${method}`, async ({ page }) => {
                await createEditor(page, '');
                await page.locator('.editor').focus();

                await page.evaluate((method) => {
                    const html = '<p id="inserted" data-template="notice" style="padding: 12px;">Added content</p>';
                    if (method === 'insertHtml') {
                        window.editor.insertHtml(html);
                        return;
                    }

                    const clipboardData = new DataTransfer();
                    clipboardData.setData('text/html', html);
                    const event = new Event('paste', {
                        bubbles: true,
                        cancelable: true,
                    });
                    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
                    document.querySelector('.editor').dispatchEvent(event);
                }, method);

                await expect(page.locator('.editor #inserted')).toHaveText('Added content');
                await expect(page.locator('.editor #inserted')).toHaveAttribute('data-template', 'notice');
                await expect(page.locator('.editor #inserted')).toHaveCSS('padding', '12px');
                await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
            });
        }

        test('pastes plain text without interpreting markup', async ({ page }) => {
            await createEditor(page, '');
            await page.locator('.editor').focus();

            await page.evaluate(() => {
                const clipboardData = new DataTransfer();
                clipboardData.setData('text/plain', '<b>Plain text</b>');
                const event = new Event('paste', {
                    bubbles: true,
                    cancelable: true,
                });
                Object.defineProperty(event, 'clipboardData', { value: clipboardData });
                document.querySelector('.editor').dispatchEvent(event);
            });

            await expect(page.locator('.editor b')).toHaveCount(0);
            await expect(page.locator('.editor')).toHaveText('<b>Plain text</b>');
        });
    });

    test.describe('source mode', () => {
        test('submits and renders custom markup without filtering', async ({ page }) => {
            await createEditor(page);
            await page.getByRole('button', { name: 'View Source', exact: true }).click();
            const html = '<section data-template="source"><p id="message" style="padding: 12px;">Source content</p></section>';
            await page.locator('.editor-source').fill(html);

            await expect(page.locator('#editor')).toHaveValue(html);
            await expect(page.locator('.editor-source')).toHaveValue(html);

            await page.getByRole('button', { name: 'View Source', exact: true }).click();

            await expect(page.locator('.editor section')).toHaveAttribute('data-template', 'source');
            await expect(page.locator('.editor #message')).toHaveText('Source content');
            await expect(page.locator('.editor #message')).toHaveCSS('padding', '12px');
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
        });
    });
});
