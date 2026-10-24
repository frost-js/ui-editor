import { expect, test } from '#test';

test.describe('Editor bundles', () => {
    for (const [name, path] of [
        ['UMD', '/'],
        ['minified UMD', '/umd-min.html'],
        ['ESM', '/esm.html'],
        ['minified ESM', '/esm.html?minified'],
    ]) {
        test(`initializes with shared dependencies (${name})`, async ({ page }) => {
            await page.goto(path);
            await page.waitForFunction(() => Boolean(window.UI?.Editor && window.fQuery));

            const shared = await page.evaluate(() => {
                const node = document.createElement('textarea');
                node.value = '<p>Bundle example</p>';
                document.body.append(node);
                const editor = UI.Editor.init(node);
                window.bundleEditor = editor;

                return editor instanceof UI.BaseComponent &&
                    $(node).editor() === editor &&
                    UI.Editor.init(node) === editor;
            });

            expect(shared).toBe(true);
            await expect(page.getByRole('textbox').first()).toHaveText('Bundle example');
            if (name.includes('ESM')) {
                expect(await page.evaluate(() => ({ keys: Object.keys(window.editorModule), shared: window.editorModule.default === UI.Editor }))).toEqual({ keys: ['default'], shared: true });
            }
            await page.evaluate(() => $(window.bundleEditor.node).editor('insertText', '!'));
            await expect(page.locator('textarea').first()).toHaveValue('<p>Bundle example!</p>');
            await page.evaluate(() => window.bundleEditor.undo());
            await expect(page.locator('textarea').first()).toHaveValue('<p>Bundle example</p>');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();
            await page.locator('.editor-source').fill('<h2>Source bundle</h2>');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();
            await expect(page.locator('.editor h2')).toHaveText('Source bundle');
            await page.evaluate(() => window.bundleEditor.dispose());
            await expect(page.locator('textarea')).toBeVisible();
            await expect(page.locator('.editor')).toHaveCount(0);
        });
    }
});
