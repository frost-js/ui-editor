import { Buffer } from 'node:buffer';
import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

const gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const imageHtml = `<p><img src="data:image/gif;base64,${gif}" alt="Example" style="width: 120px;"></p>`;

test.describe('Editor media', () => {
    test.describe('images', () => {
        for (const [name, property, expected] of [
            ['Full Size', 'width', '100%'],
            ['Half Size', 'width', '50%'],
            ['Quarter Size', 'width', '25%'],
            ['Original Size', 'width', ''],
            ['Float Left', 'float', 'left'],
            ['Float Right', 'float', 'right'],
            ['Remove Float', 'float', ''],
        ]) {
            test(`applies image action ${name} and synchronizes HTML`, async ({ page }) => {
                await createEditor(page, imageHtml);

                const image = page.locator('.editor img');

                await image.click();
                await page.getByRole('button', { name, exact: true }).click();

                if (property === 'float') {
                    await expect(image).toHaveCSS('float', expected || 'none');
                } else if (expected) {
                    await expect(image).toHaveAttribute('style', new RegExp(`width: ${expected};`));
                } else {
                    await expect(image).not.toHaveAttribute('style', /width:/);
                }

                const bounds = await image.boundingBox();
                const highlight = await page.locator('.editor-img-highlight').boundingBox();

                expect(highlight.width).toBeCloseTo(Math.round(bounds.width) + 2, 0);
                expect(highlight.height).toBeCloseTo(Math.round(bounds.height) + 2, 0);
                expect(highlight.x).toBeCloseTo(Math.round(bounds.x) - 2, 0);
                expect(highlight.y).toBeCloseTo(Math.round(bounds.y) - 2, 0);
                await expect(page.locator('.editor-img-resize')).toHaveAttribute('aria-valuenow', String(Math.round(bounds.width)));

                await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
                await page.evaluate(() => window.editor.undo());

                await expect(page.locator('.editor img')).toHaveAttribute('src', /^data:image\/gif/);
            });
        }

        test('removes an image and can undo its removal', async ({ page }) => {
            await createEditor(page, imageHtml);
            await page.locator('.editor img').click();
            await page.getByRole('button', { name: 'Remove Image', exact: true }).click();

            await expect(page.locator('.editor img')).toHaveCount(0);
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('.editor img')).toHaveCount(1);
        });

        test('inserts an image by URL and restores dialog focus', async ({ page }) => {
            await createEditor(page, '<p>Image</p>', { buttons: [['image']] });

            const button = page.getByRole('button', { name: 'Image', exact: true });

            await button.click();

            const dialog = page.getByRole('dialog', { name: 'Insert Image' });

            await expect(dialog.getByLabel('Select Files')).toBeFocused();
            await dialog.getByLabel('Image URL').fill(`data:image/gif;base64,${gif}`);
            await dialog.getByRole('button', { name: 'Insert Image', exact: true }).click();

            await expect(page.locator('.editor img')).toHaveCount(1);
            await expect(button).toBeFocused();
            await expect(page.getByRole('dialog')).toHaveCount(0);
            await expect(page.locator('.editor img')).toHaveCSS('width', '1px');
        });
    });

    test.describe('tables', () => {
        for (const [name, rows, columns] of [
            ['Add Row After', 3, 2],
            ['Add Row Before', 3, 2],
            ['Add Column After', 2, 3],
            ['Add Column Before', 2, 3],
            ['Remove Row', 1, 2],
            ['Remove Column', 2, 1],
        ]) {
            test(`runs table action ${name} and restores the original on undo`, async ({ page }) => {
                const html = '<table class="table table-bordered"><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>';

                await createEditor(page, html);
                await page.locator('.editor td').first().click();

                await expect(page.locator('.editor-popover')).toHaveCSS('opacity', '1');
                await page.getByRole('button', { name, exact: true }).click();

                await expect(page.locator('.editor tr')).toHaveCount(rows);
                await expect(page.locator('.editor tr').first().locator('td')).toHaveCount(columns);
                await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
                await page.evaluate(() => window.editor.undo());

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
            });
        }

        test('removes a table through the context toolbar and restores it on undo', async ({ page }) => {
            await createEditor(page, '<table><tbody><tr><td>Cell</td></tr></tbody></table>');
            await page.locator('.editor td').click();
            await page.getByRole('button', { name: 'Remove Table', exact: true }).click();

            await expect(page.locator('.editor table')).toHaveCount(0);
            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('.editor td')).toHaveText('Cell');
        });

        test('shows the table context toolbar for header cells and dismisses it with Escape', async ({ page }) => {
            await createEditor(page, '<table><tbody><tr><th>Header</th><td>Cell</td></tr></tbody></table>');
            await page.locator('.editor th').click();

            await expect(page.locator('.editor-popover')).toHaveCSS('opacity', '1');
            await page.getByRole('button', { name: 'Add Row After', exact: true }).click();

            await expect(page.locator('.editor tr')).toHaveCount(2);
            await page.locator('.editor th').click();
            await page.keyboard.press('Escape');

            await expect(page.locator('.editor-popover')).toBeHidden();
            await expect(page.locator('.editor-popover')).not.toHaveClass(/show/);
        });

        test('inserts a table through a delegated grid action', async ({ page }) => {
            await createEditor(page, '<p>Table follows</p>', { buttons: [['table']] });
            await page.locator('.editor').focus();
            await page.keyboard.press('End');
            await page.getByRole('button', { name: 'Table', exact: true }).click();
            await page.locator('.editor-table-link').first().click();

            await expect(page.locator('.editor table tr')).toHaveCount(1);
            await expect(page.locator('.editor table td')).toHaveCount(1);
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
        });
    });

    test.describe('links', () => {
        test('inserts an application URL without restricting its scheme', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => window.editor.insertLink('app:document/42', 'Document', true));

            await expect(page.locator('.editor a')).toHaveText('Document');
            await expect(page.locator('.editor a')).toHaveAttribute('href', 'app:document/42');
            await expect(page.locator('.editor a')).toHaveAttribute('target', '_blank');
        });

        test('removes a link without losing its text or selection', async ({ page }) => {
            await createEditor(page, '<p><a href="/example">Example</a> remains</p>');
            await page.locator('.editor a').click();
            await page.getByRole('button', { name: 'Remove Link', exact: true }).click();

            await expect(page.locator('.editor a')).toHaveCount(0);
            await expect(page.locator('.editor')).toHaveText('Example remains');
            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('.editor a')).toHaveText('Example');
        });

        test('edits an existing new-window link and preserves its target', async ({ page }) => {
            await createEditor(page, '<p><a href="https://example.com/" target="_blank">Old</a></p>');
            await page.locator('.editor a').click();
            await page.getByRole('button', { name: 'Edit Link', exact: true }).click();

            const dialog = page.getByRole('dialog', { name: 'Insert Link' });

            await expect(dialog.getByLabel('Open in new window')).toBeChecked();
            await dialog.getByLabel('Link Text').fill('Custom title');
            await dialog.getByLabel('Link URL').fill('https://example.org/');

            await expect(dialog.getByLabel('Link Text')).toHaveValue('Custom title');
            await dialog.getByRole('button', { name: 'Insert Link', exact: true }).click();

            await expect(page.locator('.editor a')).toHaveText('Custom title');
            await expect(page.locator('.editor a')).toHaveAttribute('target', '_blank');
        });

        test('does not serialize popover positioning or add undo entries when viewing a link', async ({ page }) => {
            const html = '<p><a href="/example">Example</a></p>';

            await createEditor(page, html);
            await page.evaluate(() => window.editor.insertText('!'));

            const value = await page.locator('#editor').inputValue();

            await page.locator('.editor a').click();
            await expect(page.locator('.editor-popover')).toBeVisible();
            await page.evaluate(() => window.dispatchEvent(new Event('resize')));
            await expect(page.locator('#editor')).toHaveValue(value);

            await page.mouse.click(700, 500);
            await expect(page.locator('.editor-popover')).toBeHidden();
            await expect(page.locator('#editor')).toHaveValue(value);

            await page.evaluate(() => window.editor.undo());
            await expect(page.locator('#editor')).toHaveValue(html);
            await page.evaluate(() => window.editor.redo());
            await expect(page.locator('#editor')).toHaveValue(value);
        });

        test('positions link popovers and edits links through an owned modal', async ({ page }) => {
            await createEditor(page, '<p><a href="https://example.com/">Example</a></p>');
            await page.locator('.editor a').click();

            await expect(page.locator('.editor-popover')).toBeVisible();
            await expect(page.locator('.editor-popover')).toHaveCSS('opacity', '1');
            await page.getByRole('button', { name: 'Edit Link', exact: true }).click();

            const modal = page.getByRole('dialog', { name: 'Insert Link' });

            await expect(modal).toBeVisible();
            await expect(modal.getByLabel('Link URL')).toHaveValue('https://example.com/');
            await modal.getByLabel('Link Text').fill('Edited link');
            await modal.getByRole('button', { name: 'Insert Link', exact: true }).click();

            await expect(page.locator('.editor a')).toHaveText('Edited link');
            await expect(page.locator('.modal, .modal-backdrop')).toHaveCount(0);
        });
    });

    test.describe('videos', () => {
        test('shows invalid video feedback and inserts a YouTube embed', async ({ page }) => {
            await createEditor(page, '<p>Media</p>', { buttons: [['video']] });
            await page.getByRole('button', { name: 'Video', exact: true }).click();

            const dialog = page.getByRole('dialog', { name: 'Insert Video' });

            await dialog.getByLabel('Video URL').fill('https://example.com/watch?v=abc');
            await dialog.getByRole('button', { name: 'Insert Video', exact: true }).click();

            await expect(dialog.getByLabel('Video URL')).toHaveAttribute('aria-invalid', 'true');
            await expect(dialog.getByText('Invalid video URL.')).toBeVisible();

            await dialog.getByLabel('Video URL').fill('https://youtu.be/abc-123_X');
            await dialog.getByRole('button', { name: 'Insert Video', exact: true }).click();

            await expect(page.locator('.editor iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/abc-123_X');
            await expect(page.locator('.editor iframe')).toHaveAttribute('title', 'Insert Video');
            await expect(page.getByRole('dialog')).toHaveCount(0);
        });
    });

    test.describe('uploads', () => {
        test('uploads files from the image dialog and sizes a successful image', async ({ page }) => {
            await createEditor(page, '<p>Upload</p>', { buttons: [['image']] });
            await page.getByRole('button', { name: 'Image', exact: true }).click();

            const dialog = page.getByRole('dialog', { name: 'Insert Image' });

            await dialog.getByLabel('Select Files').setInputFiles({
                name: 'upload.gif',
                mimeType: 'image/gif',
                buffer: Buffer.from(gif, 'base64'),
            });
            await dialog.getByRole('button', { name: 'Insert Image', exact: true }).click();

            await expect(page.locator('.editor img')).toHaveAttribute('src', /^data:image\/gif;base64,/);
            await expect(page.locator('.editor img')).toHaveCSS('width', '1px');
        });

        test('settles failed uploads independently and inserts successful results in order', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(async (gif) => {
                const editor = window.editor;
                const NativeReader = window.FileReader;

                window.FileReader = class extends NativeReader {
                    readAsDataURL(file) {
                        if (file.name === 'failed.gif') {
                            throw new Error('Read failed');
                        }

                        super.readAsDataURL(file);
                    }
                };

                const bytes = Uint8Array.from(atob(gif), (char) => char.charCodeAt(0));

                try {
                    await editor.options.imageUpload.call(editor, [new File([bytes], 'failed.gif'), new File([bytes], 'valid.gif', { type: 'image/gif' })]);
                } finally {
                    window.FileReader = NativeReader;
                }
            }, gif);

            await expect(page.locator('.editor img')).toHaveCount(1);
            await expect(page.locator('.editor img')).toHaveCSS('width', '1px');
        });

        test('settles FileReader failures, releases handlers, and ignores uploads after disposal', async ({ page }) => {
            await createEditor(page);

            const result = await page.evaluate(async () => {
                const NativeReader = window.FileReader;
                const readers = [];

                window.FileReader = class {
                    constructor() {
                        readers.push(this);
                    }

                    readAsDataURL(file) {
                        if (file.name === 'throw') {
                            throw new Error('Synchronous failure');
                        }

                        queueMicrotask(() => this.onerror());
                    }
                };

                try {
                    const editor = window.editor;

                    await editor.options.imageUpload.call(editor, [new File([], 'error'), new File([], 'throw')]);

                    const released = readers.every((reader) => reader.onload === null && reader.onerror === null && reader.onabort === null);

                    editor.dispose();
                    await UI.Editor.defaults.imageUpload.call(editor, [new File([], 'disposed')]);

                    return {
                        readers: readers.length,
                        released,
                        images: document.querySelectorAll('img').length,
                        value: document.querySelector('#editor').value,
                    };
                } finally {
                    window.FileReader = NativeReader;
                }
            });

            expect(result.readers).toBe(2);
            expect(result.released).toBe(true);
            await expect(page.locator('img')).toHaveCount(0);
            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');
        });

        test('runs a custom image uploader in the editor context', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                const node = window.editor.node;

                window.editor.dispose();
                window.editor = UI.Editor.init(node, {
                    buttons: [['image']],
                    imageUpload(files) {
                        window.upload = {
                            owned: this === window.editor,
                            names: [...files].map((file) => file.name),
                        };
                    },
                });
            });
            await page.getByRole('button', { name: 'Image', exact: true }).click();
            await page.getByLabel('Select Files').setInputFiles({
                name: 'custom.gif',
                mimeType: 'image/gif',
                buffer: Buffer.from(gif, 'base64'),
            });
            await page.getByRole('dialog').getByRole('button', { name: 'Insert Image', exact: true }).click();

            const result = await page.evaluate(() => window.upload);

            expect(result.owned).toBe(true);
            expect(result.names).toEqual(['custom.gif']);
        });
    });
});
