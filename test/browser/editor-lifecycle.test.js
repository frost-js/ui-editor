import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

test.describe('Editor lifecycle', () => {
    test.describe('#init', () => {
        test('rejects a non-textarea without registering an instance or changing the element', async ({ page }) => {
            const result = await page.evaluate(() => {
                const node = document.createElement('div');
                node.textContent = 'Original';
                document.body.append(node);
                let message;
                try {
                    UI.Editor.init(node);
                } catch (error) {
                    message = error.message;
                }
                return {
                    message,
                    registered: $.getData(node, UI.Editor.DATA_KEY),
                };
            });

            expect(result.message).toBe('Editor must be created on a textarea element.');
            await expect(page.locator('body > div')).toHaveText('Original');
            await expect(page.locator('body > div')).toHaveJSProperty('outerHTML', '<div>Original</div>');
            expect(result.registered).toBeUndefined();
        });

        test('cleans up failed initialization and permits a successful retry', async ({ page }) => {
            const result = await page.evaluate(() => {
                const node = document.createElement('textarea');
                node.setAttribute('style', 'display: inline-block !important; width: 123px;');
                node.setAttribute('tabindex', '7');
                document.body.append(node);
                const original = node.outerHTML;
                UI.Editor.plugins.broken = {
                    content: 'Broken',
                    dropdown() {
                        throw new Error('Rendering failed');
                    },
                };
                let message;
                try {
                    UI.Editor.init(node, { buttons: [['bold', 'broken']] });
                } catch (error) {
                    message = error.message;
                }
                const unregistered = !$.getData(node, UI.Editor.DATA_KEY);
                delete UI.Editor.plugins.broken;
                const editor = UI.Editor.init(node, { buttons: [] });
                editor.dispose();
                editor.dispose();
                return {
                    message,
                    original,
                    unregistered,
                    retry: editor.node === null,
                };
            });

            expect(result.message).toBe('Rendering failed');
            await expect(page.locator('textarea')).toHaveJSProperty('outerHTML', result.original);
            expect(result.unregistered).toBe(true);
            expect(result.retry).toBe(true);
        });

        test('preserves another control’s focus during initialization and restores textarea focus on disposal', async ({ page }) => {
            await page.evaluate(() => {
                const input = document.createElement('input');
                input.id = 'other';
                document.body.append(input);
                input.focus();
            });
            await createEditor(page);

            await expect(page.locator('#other')).toBeFocused();
            await page.locator('.editor').focus();
            await page.evaluate(() => window.editor.dispose());

            await expect(page.locator('#editor')).toBeFocused();
        });
    });

    test.describe('#dispose', () => {
        test('restores original visibility and attributes on repeated disposal', async ({ page }) => {
            const result = await page.evaluate(() => {
                const node = document.createElement('textarea');
                node.setAttribute('style', 'display: none !important; color: red;');
                node.setAttribute('tabindex', '4');
                node.setAttribute('aria-hidden', 'true');
                node.hidden = true;
                node.value = '<p>Original</p>';
                document.body.append(node);
                const original = node.outerHTML;
                const editor = UI.Editor.init(node, { buttons: [] });
                editor.dispose();
                editor.dispose();
                return {
                    original,
                    registered: $.getData(node, UI.Editor.DATA_KEY),
                };
            });

            await expect(page.locator('textarea')).toHaveJSProperty('outerHTML', result.original);
            expect(result.registered).toBeUndefined();
        });

        test('removes instance listeners and retains application listeners sharing the namespace', async ({ page }) => {
            await createEditor(page);
            const result = await page.evaluate(() => {
                let changes = 0;
                let resizes = 0;
                const node = document.querySelector('#editor');
                const surface = document.querySelector('.editor');
                $.addEvent(node, 'change.ui.editor', () => changes++);
                const applicationResize = () => resizes++;
                $.addEvent(window, 'resize.ui.editor', applicationResize);
                window.editor.dispose();
                surface.innerHTML = '<p>Detached edit</p>';
                $.triggerEvent(surface, 'input');
                $.triggerEvent(window, 'resize.ui.editor');
                $.removeEvent(window, 'resize.ui.editor', applicationResize);
                return {
                    changes,
                    resizes,
                };
            });

            expect(result.changes).toBe(0);
            expect(result.resizes).toBe(1);
            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
        });

        test('keeps a second editor working after disposing the first and reinitializes shared listeners', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                const first = window.editor;
                const node = document.createElement('textarea');
                node.id = 'second';
                node.value = '<p>Second</p>';
                document.body.append(node);
                window.editor = UI.Editor.init(node, { buttons: [] });
                first.dispose();
            });
            await page.locator('.editor').fill('Second edit');

            await expect(page.locator('#second')).toHaveValue(await page.locator('.editor').innerHTML());
            await page.evaluate(() => {
                window.editor.dispose();
                window.editor = UI.Editor.init(document.querySelector('#editor'), { buttons: [] });
                $.triggerEvent(document.body, 'dragenter');
            });

            await expect(page.locator('.editor-drop-target')).toBeVisible();
            await page.evaluate(() => $.triggerEvent(document.body, 'drop'));

            await expect(page.locator('.editor-drop-target')).toBeHidden();
        });

        test('disposes the editor when its textarea is removed through fQuery', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => $.remove(document.querySelector('#editor')));

            await expect(page.locator('.editor')).toHaveCount(0);
            expect(await page.evaluate(() => window.editor.node)).toBeNull();
        });

        test('owns active resize gestures through disposal', async ({ page }) => {
            await createEditor(page);
            const bounds = await page.locator('.editor-resize').boundingBox();
            await page.mouse.move(bounds.x + 5, bounds.y + 2);
            await page.mouse.down();
            await page.mouse.move(bounds.x + 5, bounds.y + 30);
            await page.evaluate(() => window.editor.dispose());
            await page.mouse.move(bounds.x + 5, bounds.y + 45);
            await page.mouse.up();

            await expect(page.locator('.editor')).toHaveCount(0);
        });

        test('cleans up owned dialogs and fullscreen UI on disposal', async ({ page }) => {
            await createEditor(page, '<p>Hello</p>', { buttons: [['link', 'fullScreen']] });
            await page.getByRole('button', { name: 'Link', exact: true }).click();

            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
            await page.evaluate(() => window.editor.dispose());

            await expect(page.locator('.modal, .modal-backdrop')).toHaveCount(0);
            await page.evaluate(() => {
                window.editor = UI.Editor.init(document.querySelector('#editor'), { buttons: [['fullScreen']] });
            });
            await page.getByRole('button', { name: 'Full Screen', exact: true }).click();

            await expect(page.getByRole('dialog')).toBeVisible();
            await page.evaluate(() => window.editor.dispose());

            await expect(page.locator('.modal, .modal-backdrop')).toHaveCount(0);
            await expect(page.locator('#editor')).toBeVisible();
        });

        test('allows an application focus callback to dispose the editor during a command', async ({ page }) => {
            await createEditor(page);
            const result = await page.evaluate(() => {
                const editor = window.editor;
                $.addEvent(editor.node, 'focus.ui.editor', () => editor.dispose());
                editor.insertText('Canceled edit');
                return {
                    disposed: editor.node === null,
                };
            });

            expect(result.disposed).toBe(true);
            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
            await expect(page.locator('#editor')).toBeVisible();
        });
    });

    test.describe('pending work', () => {
        test('aborts pending default image reads on disposal', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(async () => {
                const editor = window.editor;
                const upload = editor.options.imageUpload.call(editor, [new File(['image'], 'example.png', { type: 'image/png' })]);
                editor.dispose();
                await upload;
            });

            await expect(page.locator('img')).toHaveCount(0);
            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
        });

        test('guards pending content changes and image completion after disposal', async ({ page }) => {
            await createEditor(page);
            const result = await page.evaluate(async () => {
                const editor = window.editor;
                const NativeImage = window.Image;
                let loader;
                window.Image = class {
                    width = 200;

                    constructor() {
                        loader = this;
                    }
                };
                try {
                    editor.insertImage('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                    const loaded = loader.onload;
                    const expectedValue = editor.node.value;
                    document.querySelector('.editor p').textContent = 'Pending edit';
                    await Promise.resolve();
                    editor.dispose();
                    editor.insertHtml('<p>Late HTML callback</p>');
                    loaded();
                    await Promise.resolve();
                    return {
                        expectedValue,
                        cleared: loader.onload === null && loader.src === '',
                    };
                } finally {
                    window.Image = NativeImage;
                }
            });

            await expect(page.locator('#editor')).toHaveValue(result.expectedValue);
            expect(result.cleared).toBe(true);
        });
    });

    test.describe('extensions', () => {
        test('preserves custom toolbar actions and their editor receiver', async ({ page }) => {
            await page.evaluate(() => {
                UI.Editor.plugins.custom = {
                    content: 'Insert',
                    title: 'Custom insert',
                    action() {
                        this.insertText(' custom');
                    },
                };
            });
            await createEditor(page, '<p>Hello</p>', { buttons: [['custom']] });
            await page.locator('.editor').focus();
            await page.keyboard.press('End');
            await page.getByRole('button', { name: 'Custom insert' }).click();

            await expect(page.locator('.editor')).toHaveText('Hello custom');
        });

        test('finishes restoring the textarea even when extension cleanup throws', async ({ page }) => {
            await createEditor(page);
            const result = await page.evaluate(() => {
                const editor = window.editor;
                editor.onDispose(() => {
                    throw new Error('Extension cleanup failed');
                });
                let message;
                try {
                    editor.dispose();
                } catch (error) {
                    message = error.message;
                }
                editor.dispose();
                return {
                    message,
                    disposed: editor.node === null,
                    containers: document.querySelectorAll('.editor').length,
                };
            });

            expect(result.message).toBe('Extension cleanup failed');
            expect(result.disposed).toBe(true);
            await expect(page.locator('.editor')).toHaveCount(0);
            await expect(page.locator('#editor')).toBeVisible();
        });
    });

    test.describe('fullscreen', () => {
        test('returns from fullscreen without removing the editor or replacing its instance', async ({ page }) => {
            await createEditor(page, '<p>Hello</p>', { buttons: [['fullScreen']] });
            await page.getByRole('button', { name: 'Full Screen', exact: true }).click();

            await expect(page.getByRole('dialog')).toBeVisible();
            await page.getByRole('button', { name: 'Full Screen', exact: true }).click();

            await expect(page.locator('.modal, .modal-backdrop')).toHaveCount(0);
            await expect(page.locator('.editor')).toHaveText('Hello');
            expect(await page.evaluate(() => UI.Editor.init(document.querySelector('#editor')) === window.editor)).toBe(true);
        });
    });
});
