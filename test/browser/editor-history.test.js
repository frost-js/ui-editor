import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

test.describe('Editor history', () => {
    for (const method of ['redo', 'undo']) {
        test.describe(`#${method}`, () => {
            for (const name of ['class', 'QuerySet']) {
                test(`restores the expected content (${name})`, async ({ page }) => {
                    await createEditor(page);
                    await page.evaluate(({ method, name }) => {
                        window.editor.insertHtml('!');

                        if (method === 'redo') {
                            window.editor.undo();
                        }

                        if (name === 'class') {
                            window.editor[method]();
                        } else {
                            $('#editor').editor(method);
                        }
                    }, { method, name });

                    await expect(page.locator('#editor')).toHaveValue(
                        method === 'redo' ? '<p>Hello world!</p>' : '<p>Hello world</p>',
                    );
                });
            }
        });
    }

    test.describe('#undo and #redo', () => {
        test('restores content and selection through undo and redo', async ({ page }) => {
            await createEditor(page);
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
            await createEditor(page);
            await page.locator('.editor').click();
            await page.keyboard.press('End');
            await page.keyboard.type('!');

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
        });
    });

    test.describe('source mode', () => {
        test('preserves redo across source viewing and clears it when source content changes', async ({ page }) => {
            await createEditor(page);
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
    });

    test.describe('historyLimit option', () => {
        test('bounds history safely for zero, negative, and non-finite limits', async ({ page }) => {
            for (const historyLimit of [0, -1, 'invalid']) {
                await createEditor(page, '<p>Hello</p>', { historyLimit });
                await page.evaluate(() => window.editor.insertText('!'));

                await expect(page.locator('.editor')).toContainText('!');
                await page.evaluate(() => {
                    window.editor.undo();
                    window.editor.dispose();
                    document.querySelector('#editor').remove();
                });
            }
        });
    });

    test.describe('native history events', () => {
        test('routes native history input to the custom history without duplicating entries', async ({ page }) => {
            await createEditor(page);
            await page.locator('.editor').focus();
            await page.keyboard.press('End');
            await page.keyboard.type('!');

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
            await page.evaluate(() => {
                document.querySelector('.editor').dispatchEvent(new InputEvent('beforeinput', {
                    inputType: 'historyUndo',
                    bubbles: true,
                    cancelable: true,
                }));
            });

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
            await page.evaluate(() => window.editor.redo());

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
        });

        test('uses native history input fallback without changing unfocused editors', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => window.editor.insertText('!'));
            await page.locator('.editor').evaluate((node) => node.dispatchEvent(new InputEvent('input', {
                inputType: 'historyUndo',
                bubbles: true,
            })));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
            await page.locator('.editor').evaluate((node) => node.dispatchEvent(new InputEvent('input', {
                inputType: 'historyRedo',
                bubbles: true,
            })));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
            await page.getByRole('button', { name: 'View Source', exact: true }).focus();
            await page.locator('.editor').evaluate((node) => node.dispatchEvent(new InputEvent('input', {
                inputType: 'historyUndo',
                bubbles: true,
            })));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
            await page.locator('.editor').evaluate((node) => node.dispatchEvent(new InputEvent('input', {
                inputType: 'historyRedo',
                bubbles: true,
            })));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');
        });
    });
});
