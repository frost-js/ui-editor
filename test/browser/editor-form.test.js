/** @import { Page } from '@playwright/test'; */

import { expect, test } from '#test';

/**
 * Creates a labelled editor in a native form and counts its change events.
 * @param {Page} page The test page.
 * @param {string} [value='<p>Default</p>'] The initial and reset content.
 */
async function createForm(page, value = '<p>Default</p>') {
    await page.evaluate((value) => {
        $.setHtml(document.body, '<form>' +
            '<fieldset>' +
            '<label for="editor">Article</label>' +
            '<p id="help">Write a description</p>' +
            '<p id="error">Required</p>' +
            '<textarea id="editor" name="article" required aria-describedby="help" aria-errormessage="error">' +
            '</textarea>' +
            '</fieldset>' +
            '<button type="submit">Save</button>' +
            '</form>',
        );

        const node = $.findOne('#editor');

        $.setProperty(node, 'defaultValue', value);
        window.editor = UI.Editor.init(node, { buttons: [['bold', 'source', 'undo', 'redo']] });
        window.changes = 0;
        $.addEvent(node, 'change.ui.editor', () => window.changes++);
    }, value);
}

test.describe('Editor forms', () => {
    test.describe('accessible state', () => {
        test('forwards labels, descriptions, errors, and required state to both views', async ({ page }) => {
            await createForm(page);

            const surface = page.getByRole('textbox', { name: 'Article', exact: true });

            await expect(surface).toHaveAttribute('aria-describedby', 'help');
            await expect(surface).toHaveAttribute('aria-errormessage', 'error');
            await expect(surface).toHaveAttribute('aria-required', 'true');
            await page.locator('label').click();

            await expect(surface).toBeFocused();
            await page.getByRole('button', { name: 'View Source', exact: true }).click();

            await expect(page.locator('.editor-source')).toHaveAccessibleName('Article');
            await expect(page.locator('.editor-source')).toHaveAttribute('aria-describedby', 'help');
            await page.evaluate(() => {
                $.setAttribute('#editor', 'aria-label', 'Updated article');
                $.setAttribute('#editor', 'aria-invalid', 'true');
            });

            await expect(page.locator('.editor-source')).toHaveAttribute('aria-invalid', 'true');
            await expect(page.locator('.editor-source')).toHaveAccessibleName('Updated article');
            await page.evaluate(() => window.editor.dispose());

            await expect(page.locator('label')).not.toHaveAttribute('id');
        });

        test('preserves custom validity and explicit accessibility overrides', async ({ page }) => {
            await createForm(page);
            await page.evaluate(() => {
                const node = $.findOne('#editor');

                $.setAttribute(node, 'aria-labelledby', 'help');
                node.setCustomValidity('Application error');
            });

            await expect(page.locator('.editor')).toHaveAccessibleName('Write a description');
            expect(await page.evaluate(() => $.findOne('form').reportValidity())).toBe(false);
            await expect(page.locator('.editor')).toBeFocused();
            await page.evaluate(() => {
                const node = $.findOne('#editor');

                node.setCustomValidity('');
                $.removeAttribute(node, 'required');
            });

            await expect(page.locator('.editor')).toHaveAttribute('aria-required', 'false');
        });
    });

    test.describe('native synchronization', () => {
        test('reloads programmatic values on change and through refresh', async ({ page }) => {
            await createForm(page);
            await page.evaluate(() => {
                $.setValue('#editor', '<h2>External</h2>');
                $.findOne('#editor').dispatchEvent(new Event('change', { bubbles: true }));
            });

            await expect(page.locator('.editor h2')).toHaveText('External');
            await page.evaluate(() => {
                $.setValue('#editor', '<p>Refreshed</p>');
                window.editor.refresh();
            });

            await expect(page.locator('.editor p')).toHaveText('Refreshed');
            await expect(page.locator('.editor-source')).toHaveValue('<p>Refreshed</p>');
            expect(await page.evaluate(() => window.changes)).toBe(1);
        });

        test('accepts application value updates during an editor change callback', async ({ page }) => {
            await createForm(page);
            await page.evaluate(() => {
                const node = $.findOne('#editor');

                node.addEventListener('change', () => {
                    $.setValue(node, '<p>Application replacement</p>');
                    node.dispatchEvent(new Event('input', { bubbles: true }));
                }, { once: true });
                window.editor.insertText('Trigger');
            });

            await expect(page.locator('.editor')).toHaveText('Application replacement');
            await expect(page.locator('#editor')).toHaveValue('<p>Application replacement</p>');
        });
    });

    test.describe('submission', () => {
        test('submits source edits exactly as entered and emits one change per changed value', async ({ page }) => {
            await createForm(page);
            await page.getByRole('button', { name: 'View Source', exact: true }).click();

            const html = '<h2 data-template="heading">Submitted source';

            await page.locator('.editor-source').fill(html);

            expect(await page.evaluate(() => new FormData($.findOne('form')).get('article'))).toBe(html);
            await expect(page.locator('#editor')).toHaveValue(html);
            await expect(page.locator('.editor-source')).toHaveValue(html);
            await page.locator('.editor-source').blur();

            expect(await page.evaluate(() => window.changes)).toBe(1);
        });

        for (const [name, html] of [
            ['video', '<video controls=""></video>'],
            ['audio', '<audio controls=""></audio>'],
            ['whitespace', '<p> </p>'],
        ]) {
            test(`preserves ${name} content through submission, history, and refresh`, async ({ page }) => {
                await createForm(page, html);

                await expect(page.locator('#editor')).toHaveValue(html);
                expect(await page.evaluate(() => new FormData($.findOne('form')).get('article'))).toBe(html);

                await page.evaluate(() => {
                    const paragraph = $.create('p', { text: 'Changed' });

                    window.editor.insertNode(paragraph);
                });

                await expect(page.locator('.editor')).toContainText('Changed');

                await page.evaluate(() => window.editor.undo());

                await expect(page.locator('#editor')).toHaveValue(html);

                await page.evaluate(() => window.editor.refresh());

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                await expect(page.locator('#editor')).toHaveValue(html);
                expect(await page.evaluate(() => new FormData($.findOne('form')).get('article'))).toBe(html);
            });
        }
    });

    test.describe('reset', () => {
        for (const source of [false, true]) {
            test(`resets native content and history in ${source ? 'source' : 'rich'} mode`, async ({ page }) => {
                await createForm(page);

                if (source) {
                    await page.getByRole('button', { name: 'View Source', exact: true }).click();
                    await page.locator('.editor-source').fill('<p>Edited</p>');
                } else {
                    await page.locator('.editor').fill('Edited');
                }

                const changes = await page.evaluate(() => window.changes);

                await page.evaluate(() => $.findOne('form').reset());

                await expect(page.locator('#editor')).toHaveValue('<p>Default</p>');
                await expect(page.locator('.editor')).toHaveText('Default');
                await expect(page.locator('.editor-source')).toHaveValue('<p>Default</p>');

                if (source) {
                    await page.getByRole('button', { name: 'View Source', exact: true }).click();
                }

                await expect(page.getByRole('button', { name: 'Redo', exact: true })).toHaveAttribute('aria-disabled', 'true');
                await page.evaluate(() => window.editor.undo());

                await expect(page.locator('#editor')).toHaveValue('<p>Default</p>');
                await page.evaluate(() => window.editor.redo());

                await expect(page.locator('#editor')).toHaveValue('<p>Default</p>');
                expect(await page.evaluate(() => window.changes)).toBe(changes);
            });
        }

        test.describe('pending resets', () => {
            test.use({ mockClock: true });

            test('honors canceled reset and cancels pending work on disposal', async ({ page }) => {
                await createForm(page);
                await page.locator('.editor').fill('Edited');

                const value = await page.locator('#editor').inputValue();

                await page.evaluate(() => {
                    $.findOne('form').addEventListener('reset', (event) => event.preventDefault(), { once: true });
                    $.findOne('form').reset();
                });
                await page.clock.runFor(30);

                await expect(page.locator('#editor')).toHaveValue(value);
                await page.evaluate(() => {
                    $.findOne('form').reset();
                    window.editor.dispose();
                });
                await page.clock.runFor(30);

                await expect(page.locator('.editor')).toHaveCount(0);
                await expect(page.locator('#editor')).toHaveValue('<p>Default</p>');
            });
        });
    });

    test.describe('content values', () => {
        test('preserves rich HTML through clearing, undo, and redo', async ({ page }) => {
            await createForm(page, '');

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p><br></p>');
            await expect(page.locator('#editor')).toHaveValue('<p><br></p>');
            await page.locator('.editor').fill('Valid');

            await expect(page.locator('.editor')).toHaveText('Valid');
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());

            const value = await page.locator('#editor').inputValue();

            await page.locator('.editor').fill('');

            await expect(page.locator('.editor')).toHaveText('');
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
            await expect(page.locator('#editor')).not.toHaveValue('');

            const empty = await page.locator('#editor').inputValue();

            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('#editor')).toHaveValue(value);
            await page.evaluate(() => window.editor.redo());

            await expect(page.locator('#editor')).toHaveValue(empty);
        });

        test('preserves empty source markup and allows readonly source viewing', async ({ page }) => {
            await createForm(page, '');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();
            await page.locator('.editor-source').fill('<p><br></p>');

            await expect(page.locator('#editor')).toHaveValue('<p><br></p>');
            await expect(page.locator('.editor-source')).toBeFocused();
            await page.locator('.editor-source').fill('<p>Valid source</p>');

            await expect(page.locator('#editor')).toHaveValue('<p>Valid source</p>');
            await page.evaluate(() => {
                $.setProperty('#editor', 'readOnly', true);
            });

            await expect(page.locator('.editor-source')).toHaveJSProperty('readOnly', true);
            await expect(page.locator('#editor')).toHaveValue('<p>Valid source</p>');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();

            await expect(page.locator('.editor')).toHaveText('Valid source');
            await expect(page.locator('.editor')).toBeFocused();
        });
    });

    test.describe('disabled state', () => {
        test('honors disabled fieldsets, re-enabling, and readonly command guards', async ({ page }) => {
            await createForm(page);
            await page.evaluate(() => {
                $.setProperty('fieldset', 'disabled', true);
            });

            await expect(page.locator('.editor')).toHaveAttribute('contenteditable', 'false');
            await expect(page.getByRole('button', { name: 'Bold', exact: true })).toBeDisabled();
            expect(await page.evaluate(() => new FormData($.findOne('form')).has('article'))).toBe(false);
            await page.evaluate(() => {
                window.editor.insertText('ignored');
                $.setProperty('fieldset', 'disabled', false);
            });

            await expect(page.locator('.editor')).toHaveAttribute('contenteditable', 'true');
            await expect(page.getByRole('button', { name: 'Bold', exact: true })).toBeEnabled();
            await page.evaluate(() => {
                $.setProperty('#editor', 'readOnly', true);
            });

            await expect(page.locator('.editor')).toHaveAttribute('aria-readonly', 'true');
            await expect(page.locator('.editor-source')).toHaveJSProperty('readOnly', true);
            await page.evaluate(() => {
                window.editor.insertText('ignored');
                window.editor.insertHtml('<p>ignored</p>');
                window.editor.indent();
                window.editor.undo();
            });

            await expect(page.locator('#editor')).toHaveValue('<p>Default</p>');
            expect(await page.evaluate(() => new FormData($.findOne('form')).get('article'))).toBe('<p>Default</p>');
        });

        test('keeps controls inside a disabled fieldset first legend editable', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(document.body, '<form><fieldset disabled><legend><textarea id="editor" name="article">Allowed</textarea></legend></fieldset></form>');
                window.editor = UI.Editor.init($.findOne('#editor'), { buttons: [['bold']] });
            });

            await expect(page.locator('.editor')).toHaveAttribute('contenteditable', 'true');
            await expect(page.getByRole('button', { name: 'Bold', exact: true })).toBeEnabled();
            await page.locator('.editor').fill('Legend value');

            expect(await page.evaluate(() => new FormData($.findOne('form')).get('article'))).toBe('Legend value');
        });
    });
});
