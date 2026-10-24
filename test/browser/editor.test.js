import { expect, test } from '#test';

test.describe('Editor', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body, '<textarea id="editor" name="content"><p>Hello world</p></textarea>');
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            {
                name: 'class',
                init: () => UI.Editor.init($.findOne('#editor')),
            },
            {
                name: 'QuerySet',
                init: () => $('#editor').editor(),
            },
        ]) {
            test(`creates and registers an Editor with shared dependencies (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);

                expect(await instance.evaluate((value) => value instanceof UI.Editor)).toBe(true);
                expect(await instance.evaluate((value) => value instanceof UI.BaseComponent)).toBe(true);
                expect(await instance.evaluate((value) => Object.keys(value))).toEqual([]);
                expect(await instance.evaluate((value) => $.getData('#editor', UI.Editor.DATA_KEY) === value)).toBe(true);
                expect(await instance.evaluate((value) => $('#editor').editor() === value)).toBe(true);
                expect(await instance.evaluate((value) => UI.Editor.init($.findOne('#editor')) === value)).toBe(true);
                await expect(page.locator('.editor')).toHaveCount(1);
                await expect(page.locator('.editor')).toHaveText('Hello world');
                await expect(page.locator('#editor')).toBeHidden();
            });
        }

        test('keeps resolved options unchanged while deriving fonts and toolbar state', async ({ page }) => {
            const instance = await page.evaluateHandle(() => UI.Editor.init($.findOne('#editor'), {
                buttons: [['bold', 'italic', 'source', 'undo', 'redo']],
                fonts: ['Arial', 'serif'],
            }));

            expect(await instance.evaluate((value) => Object.isFrozen(value.options))).toBe(true);
            expect(await instance.evaluate((value) => value.options.fonts)).toEqual(['Arial', 'serif']);
            expect(await instance.evaluate((value) => value.options.defaultFont)).toBe('Arial');
            expect(await instance.evaluate((value) => value.options.buttons)).toEqual([
                ['bold', 'italic', 'source', 'undo', 'redo'],
            ]);
            await expect(page.getByRole('toolbar').getByRole('button')).toHaveCount(5);
        });
    });

    test.describe('fQuery API', () => {
        test('initializes multiple textareas and returns the first instance', async ({ page }) => {
            await page.evaluate(() => {
                $.append(document.body, $.create('textarea', {
                    attributes: { id: 'second' },
                }));
            });
            const instance = await page.evaluateHandle(() => $('textarea').editor({ buttons: [] }));

            expect(await instance.evaluate((value) => $.getData('#editor', UI.Editor.DATA_KEY) === value)).toBe(true);
            expect(await page.evaluate(() => $.getData('#second', UI.Editor.DATA_KEY) instanceof UI.Editor)).toBe(true);
            await expect(page.locator('.editor')).toHaveCount(2);
        });

        test('dispatches public editing, history, state, and disposal methods', async ({ page }) => {
            await page.evaluate(() => $('#editor').editor({ buttons: [['undo', 'redo']] }));

            await page.evaluate(() => $('#editor').editor('insertText', '!'));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');

            await page.evaluate(() => $('#editor').editor('undo'));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world</p>');

            await page.evaluate(() => $('#editor').editor('redo'));

            await expect(page.locator('#editor')).toHaveValue('<p>Hello world!</p>');

            await page.evaluate(() => $('#editor').editor('disable'));

            await expect(page.locator('.editor')).toHaveAttribute('contenteditable', 'false');

            await page.evaluate(() => $('#editor').editor('enable'));

            await expect(page.locator('.editor')).toHaveAttribute('contenteditable', 'true');

            await page.evaluate(() => $('#editor').editor('dispose'));

            await expect(page.locator('#editor')).toBeVisible();
            await expect(page.locator('.editor')).toHaveCount(0);
        });
    });

    test.describe('change events', () => {
        test('synchronizes typed content and emits change events on the textarea', async ({ page }) => {
            await page.evaluate(() => {
                UI.Editor.init($.findOne('#editor'), { buttons: [] });
                window.changeCount = 0;
                $.addEvent('#editor', 'change.ui.editor', () => window.changeCount++);
            });

            await page.locator('.editor').fill('Edited content');

            await expect(page.locator('.editor')).toHaveText('Edited content');
            await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
            expect(await page.evaluate(() => window.changeCount)).toBeGreaterThan(0);
        });
    });

    test.describe('#dispose', () => {
        test('restores the textarea and releases its registered instance', async ({ page }) => {
            const instance = await page.evaluateHandle(() => UI.Editor.init($.findOne('#editor')));

            await instance.evaluate((value) => value.dispose());

            await expect(page.locator('#editor')).toBeVisible();
            await expect(page.locator('.editor')).toHaveCount(0);
            expect(await page.evaluate(() => $.getData('#editor', UI.Editor.DATA_KEY))).toBeUndefined();
            expect(await instance.evaluate((value) => value.node)).toBeNull();
            expect(await instance.evaluate((value) => value.options)).toBeNull();
        });
    });
});
