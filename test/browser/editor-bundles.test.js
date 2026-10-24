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

                return editor instanceof UI.BaseComponent &&
                    $(node).editor() === editor &&
                    UI.Editor.init(node) === editor;
            });

            expect(shared).toBe(true);
            await expect(page.getByRole('textbox').first()).toHaveText('Bundle example');
        });
    }
});
