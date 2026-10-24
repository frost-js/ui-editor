import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

const gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function dragEvent(page, target, type, text = '') {
    return page.evaluate(({ target, type, text }) => {
        const dataTransfer = new DataTransfer();

        dataTransfer.setData('text/plain', text);

        const event = new Event(type, {
            bubbles: true,
            cancelable: true,
        });

        Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });

        return document.querySelector(target).dispatchEvent(event);
    }, {
        target,
        type,
        text,
    });
}

test.describe('Editor interactions', () => {
    test.describe('drag and drop', () => {
        test('shows a shared drop target, updates hover feedback, and inserts dropped plain text', async ({ page }) => {
            await createEditor(page);
            await dragEvent(page, 'body', 'dragenter');

            await expect(page.locator('.editor-drop-target')).toBeVisible();
            await dragEvent(page, '.editor-drop-target', 'dragenter');

            await expect(page.locator('.editor-drop-target')).toHaveText('Drop image or text');
            expect(await dragEvent(page, '.editor-drop-target', 'dragover')).toBe(false);
            await dragEvent(page, '.editor-drop-target', 'dragleave');

            await expect(page.locator('.editor-drop-target')).toHaveText('Drop image or text here');
            await dragEvent(page, '.editor-drop-target', 'drop', '<b>Plain drop</b>');

            await expect(page.locator('.editor')).toHaveText('Hello world<b>Plain drop</b>');
            await expect(page.locator('.editor b')).toHaveCount(0);
            await expect(page.locator('.editor-drop-target')).toBeHidden();
            await dragEvent(page, 'body', 'dragenter');
            await dragEvent(page, 'body', 'dragleave');

            await expect(page.locator('.editor-drop-target')).toBeHidden();
        });

        test('uploads a dropped file and blocks native image dragging', async ({ page }) => {
            await createEditor(page);
            await page.evaluate((gif) => {
                const dataTransfer = new DataTransfer();
                const bytes = Uint8Array.from(atob(gif), (char) => char.charCodeAt(0));

                dataTransfer.items.add(new File([bytes], 'drop.gif', { type: 'image/gif' }));

                const event = new Event('drop', {
                    bubbles: true,
                    cancelable: true,
                });

                Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
                document.querySelector('.editor-drop-target').dispatchEvent(event);
            }, gif);

            await expect(page.locator('.editor img')).toHaveCount(1);
            expect(await page.locator('.editor img').evaluate((node) => node.dispatchEvent(new Event('dragstart', {
                bubbles: true,
                cancelable: true,
            })))).toBe(false);
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
        });

        test('keeps disabled and source editors out of shared drag feedback', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => window.editor.disable());
            await dragEvent(page, 'body', 'dragenter');

            await expect(page.locator('.editor-drop-target')).toBeHidden();
            await page.evaluate(() => window.editor.enable());
            await dragEvent(page, 'body', 'dragend');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();
            await dragEvent(page, 'body', 'dragenter');

            await expect(page.locator('.editor-drop-target')).toBeHidden();
        });
    });

    test.describe('resizing', () => {
        test('resizes the editor with pointer movement and finishes on pointer cancel or window blur', async ({ page }) => {
            await createEditor(page, '<p>Resize</p>', { height: '150px' });

            const handle = page.locator('.editor-resize');
            const rect = await handle.boundingBox();

            await page.mouse.move(rect.x + 10, rect.y + 2);
            await page.mouse.down();
            await page.mouse.move(rect.x + 10, rect.y + 42);
            await page.mouse.up();

            await expect(page.locator('.card-body')).toHaveCSS('height', '190px');
            await handle.dispatchEvent('pointerdown', {
                button: 0,
                pointerId: 77,
                clientY: rect.y,
            });
            await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 77 })));
            await handle.dispatchEvent('pointerdown', {
                button: 0,
                pointerId: 78,
                clientY: rect.y,
            });
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            await handle.dispatchEvent('pointerdown', {
                button: 2,
                pointerId: 79,
            });
            await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointermove', {
                pointerId: 79,
                clientY: 500,
            })));

            await expect(page.locator('.card-body')).toHaveCSS('height', '190px');
        });

        test('resizes an image by pointer, preserves its selection, and dismisses on scrolling', async ({ page }) => {
            await createEditor(page, `<p><img src="data:image/gif;base64,${gif}" style="width: 100px; height: 50px;"></p>`);
            await page.locator('.editor img').click();

            const handle = page.locator('.editor-img-resize');
            const rect = await handle.boundingBox();

            await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
            await page.mouse.down();
            await page.mouse.move(rect.x + 25, rect.y + 10);
            await page.mouse.up();

            expect(await page.locator('.editor img').evaluate((node) => parseFloat(node.style.width))).toBeGreaterThan(100);
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
            await page.locator('.editor img').click();
            await page.evaluate(() => window.dispatchEvent(new Event('resize')));

            await expect(page.locator('.editor-img-highlight')).toBeVisible();
            await page.locator('.card-body').dispatchEvent('scroll');

            await expect(page.locator('.editor-popover')).toBeHidden();
        });
    });
});
