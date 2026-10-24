import { Buffer } from 'node:buffer';
import { expect, test } from '#test';

test.describe('Editor demo', () => {
    const consoleErrors = new WeakMap();

    test.beforeEach(async ({ page }) => {
        const errors = [];
        consoleErrors.set(page, errors);
        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });
        // Exercise the public HTML and scripts while keeping automated runs offline.
        await page.route('https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/*', async (route) => {
            const file = route.request().url().endsWith('.css') ? 'frost-ui.css' : 'frost-ui-bundle.js';
            await route.fulfill({ response: await page.request.get(`/assets/${file}`) });
        });
        await page.goto('/demo/index.html');

        await expect(page.locator('.editor')).toHaveCount(11);
    });

    test.afterEach(async ({ page }) => {
        expect(consoleErrors.get(page), 'Demo console errors').toEqual([]);
    });

    test.describe('navigation and layout', () => {
        test('navigates, persists themes, and fits narrow RTL layouts', async ({ page }) => {
            for (const link of await page.getByRole('navigation', { name: 'Demo sections' }).getByRole('link').all()) {
                await link.click();

                await expect(page.locator(new URL(await link.getAttribute('href'), page.url()).hash)).toBeInViewport();
            }
            await page.locator('#demo-theme').selectOption('dark');

            await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'dark');
            await page.reload();

            await expect(page.locator('#demo-theme')).toHaveValue('dark');
            await page.locator('#demo-theme').selectOption('light');

            await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'light');
            await page.locator('#demo-theme').selectOption('system');

            await expect(page.locator('html')).not.toHaveAttribute('data-ui-theme');
            await page.setViewportSize({
                width: 390,
                height: 844,
            });

            await expect(page.getByRole('textbox', { name: 'مستند عربي', exact: true })).toHaveAttribute('dir', 'rtl');
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            await expect(page.locator('#fixed-editor').locator('..').locator('.editor-resize')).toHaveCount(0);
        });
    });

    test.describe('editing', () => {
        test('runs custom buttons, source editing, and independent histories', async ({ page }) => {
            const custom = page.getByRole('textbox', { name: 'Custom toolbar', exact: true });
            await custom.click();
            await page.getByRole('button', { name: 'Insert greeting', exact: true }).click();

            await expect(page.locator('#custom-editor')).toHaveValue(/Hello from a custom plugin!/);
            await page.locator('#custom-editor').locator('..').getByRole('button', { name: 'Undo', exact: true }).click();

            await expect(page.locator('#custom-editor')).not.toHaveValue(/Hello from a custom plugin!/);
            const compact = page.locator('#compact-editor').locator('..');
            await compact.getByRole('button', { name: 'View Source', exact: true }).click();
            await compact.locator('.editor-source').fill('<h2>Source in the demo</h2>');
            await compact.getByRole('button', { name: 'View Source', exact: true }).click();

            await expect(compact.locator('.editor h2')).toHaveText('Source in the demo');
            await expect(page.locator('#resizable-editor')).toHaveValue(/Resize this editor/);
            await expect(page.locator('#fixed-editor')).toHaveValue(/stays 240px/);
            await page.getByRole('textbox', { name: 'First document', exact: true }).focus();
            await page.keyboard.press('Escape');
            await page.keyboard.press('Tab');

            await expect(page.locator('#resizable-editor').locator('..').getByRole('separator', { name: 'Resize editor' })).toBeFocused();
        });
    });

    test.describe('forms', () => {
        test('submits, resets, and omits disabled content', async ({ page }) => {
            await page.getByRole('textbox', { name: 'Document HTML', exact: true }).fill('Edited form content');
            await page.getByRole('button', { name: 'Show submitted HTML', exact: true }).click();

            await expect(page.locator('#form-output')).toContainText('Edited form content');
            await page.getByRole('button', { name: 'Reset form', exact: true }).click();

            await expect(page.locator('#form-editor')).toHaveValue('<p>Original form content</p>');
            await page.getByRole('button', { name: 'Disable fieldset', exact: true }).click();

            await expect(page.getByRole('textbox', { name: 'Document HTML', exact: true })).toHaveAttribute('contenteditable', 'false');
            await page.getByRole('button', { name: 'Show submitted HTML', exact: true }).click();

            await expect(page.locator('#form-output')).toContainText('omitted from FormData');
            await page.getByRole('button', { name: 'Enable fieldset', exact: true }).click();

            await expect(page.getByRole('textbox', { name: 'Readonly document', exact: true })).toHaveAttribute('aria-readonly', 'true');
        });
    });

    test.describe('uploads and API examples', () => {
        test('handles custom upload success and failure, methods, and event logging', async ({ page }) => {
            const upload = page.locator('#upload-editor').locator('..');
            await upload.getByRole('button', { name: 'Image', exact: true }).click();
            await page.locator('input[type=file]').setInputFiles({
                name: 'pixel.png',
                mimeType: 'image/png',
                buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'),
            });
            await page.getByRole('button', { name: 'Insert Image', exact: true }).click();

            await expect(page.locator('#upload-status')).toContainText('Inserted 1 image(s)');
            await expect(upload.locator('.editor img')).toHaveCount(1);
            await upload.getByRole('button', { name: 'Image', exact: true }).click();
            await page.locator('input[type=file]').setInputFiles({
                name: 'bad.txt',
                mimeType: 'text/plain',
                buffer: Buffer.from('Not an image'),
            });
            await page.getByRole('button', { name: 'Insert Image', exact: true }).click();

            await expect(page.locator('#upload-status')).toContainText('Image upload failed');
            await page.getByRole('button', { name: 'Load HTML + refresh', exact: true }).click();

            await expect(page.locator('#methods-editor')).toHaveValue(/Loaded with refresh/);
            await page.getByRole('button', { name: 'Insert text', exact: true }).click();

            await expect(page.locator('#event-log')).toContainText('change.ui.editor');
            await page.getByRole('button', { name: 'Disable', exact: true }).click();

            await expect(page.locator('#methods-editor')).toBeDisabled();
            await page.getByRole('button', { name: 'Enable', exact: true }).click();
            await page.getByRole('button', { name: 'Dispose', exact: true }).click();

            await expect(page.locator('#methods-editor')).toBeVisible();
            await page.getByRole('button', { name: 'Init', exact: true }).click();

            await expect(page.locator('#methods-editor')).toBeHidden();
            await page.getByRole('button', { name: 'Clear log', exact: true }).click();

            await expect(page.locator('#event-log')).toBeEmpty();
        });
    });
});
