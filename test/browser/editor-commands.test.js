import { expect, test } from '#test';
import { createEditor, selectContents } from '../setup/editor.js';

test.describe('Editor indentation', () => {
    test.describe('#indent and #outdent', () => {
        test('preserves a backward partial selection through indent and outdent', async ({ page }) => {
            await createEditor(page);
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const text = document.querySelector('.editor p').firstChild;
                getSelection().setBaseAndExtent(text, 5, text, 2);
                window.editor.indent();
            });

            await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveText('Hello world');
            expect(await page.evaluate(() => getSelection().toString())).toBe('llo');
            expect(await page.evaluate(() => {
                const selection = getSelection();
                const range = document.createRange();
                range.setStart(selection.anchorNode, selection.anchorOffset);
                range.setEnd(selection.focusNode, selection.focusOffset);
                return range.collapsed;
            })).toBe(true);
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p>Hello world</p>');
            expect(await page.evaluate(() => getSelection().toString())).toBe('llo');
        });

        test('changes one level of indentation at a collapsed caret', async ({ page }) => {
            await createEditor(page);
            await page.locator('.editor').focus();
            await page.keyboard.press('End');
            await page.evaluate(() => {
                window.editor.indent();
                window.editor.indent();
            });

            await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveCount(2);
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveCount(1);
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p>Hello world</p>');
        });

        test('indents multiple paragraphs together and can undo the entire operation', async ({ page }) => {
            const html = '<p>One</p><p>Two</p>';
            await createEditor(page, html);
            await selectContents(page, '.editor');
            await page.evaluate(() => window.editor.indent());

            await expect(page.locator('.editor > div > p')).toHaveText(['One', 'Two']);
            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
        });

        test('does not indent the next paragraph when the selection ends at its first text offset', async ({ page }) => {
            await createEditor(page, '<p>One</p><p>Two</p>');
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const paragraphs = document.querySelectorAll('.editor p');
                getSelection().setBaseAndExtent(paragraphs[0].firstChild, 0, paragraphs[1].firstChild, 0);
                window.editor.indent();
            });

            await expect(page.locator('.editor > div')).toHaveText('One');
            await expect(page.locator('.editor > p')).toHaveText('Two');
        });

        test('indents a bare inline run without moving unrelated text across paragraphs', async ({ page }) => {
            await createEditor(page, 'Before<p>Middle</p>After');
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const text = document.querySelector('.editor').lastChild;
                getSelection().setBaseAndExtent(text, 0, text, text.textContent.length);
                window.editor.indent();
            });

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', 'Before<p>Middle</p><div style="margin-inline-start: 2em;"><p>After</p></div>');
        });

        test('indents and outdents a text selection without losing its indentation', async ({ page }) => {
            await createEditor(page);
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const paragraph = document.querySelector('.editor p');
                const selection = getSelection();
                selection.selectAllChildren(paragraph);
                window.editor.indent();
            });

            await expect(page.locator('.editor')).toHaveText('Hello world');

            await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveText('Hello world');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor')).toHaveText('Hello world');
            await expect(page.locator('.editor div[style*="margin-inline-start"]')).toHaveCount(0);
        });
    });

    test.describe('lists', () => {
        for (const tag of ['ul', 'ol']) {
            test(`nests and outdents a list item inside its previous sibling (${tag})`, async ({ page }) => {
                const html = `<${tag}><li class="a">One</li><li class="b">Two</li><li class="c">Three</li></${tag}>`;
                await createEditor(page, html);
                await selectContents(page, '.editor .b');
                await page.evaluate(() => window.editor.indent());

                await expect(page.locator(`.editor > ${tag} > .a > ${tag} > .b`)).toHaveText('Two');
                await expect(page.locator(`.editor ${tag} > ${tag}`)).toHaveCount(0);
                await page.evaluate(() => window.editor.outdent());

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
            });
        }

        test('does not indent a first list item without a preceding sibling', async ({ page }) => {
            const html = '<ul><li>One</li><li>Two</li></ul>';
            await createEditor(page, html);
            await selectContents(page, '.editor li:first-child');
            await page.evaluate(() => window.editor.indent());

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
        });

        test('outdents a top-level list item and retains its following siblings', async ({ page }) => {
            await createEditor(page, '<ul><li>One</li><li>Two</li><li>Three</li></ul>');
            await selectContents(page, '.editor li:nth-child(2)');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor > p')).toHaveText('Two');
            await expect(page.locator('.editor > ul')).toHaveText(['One', 'Three']);
            await page.evaluate(() => window.editor.undo());

            await expect(page.locator('.editor > ul > li')).toHaveText(['One', 'Two', 'Three']);
        });

        test('outdents a nested item while retaining its following items as children', async ({ page }) => {
            await createEditor(page, '<ul><li>One<ul><li>Two</li><li>Three</li></ul></li><li>Four</li></ul>');
            await selectContents(page, '.editor ul ul li:first-child');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor > ul > li')).toHaveText(['One', 'TwoThree', 'Four']);
            await expect(page.locator('.editor > ul > li:nth-child(2) > ul > li')).toHaveText('Three');
        });
    });

    test.describe('#outdent', () => {
        test('outdents only the selected paragraph from a shared wrapper', async ({ page }) => {
            await createEditor(page, '<div style="margin-left: 2em;"><p>One</p><p>Two</p><p>Three</p></div>');
            await selectContents(page, '.editor p:nth-child(2)');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor > p')).toHaveText('Two');
            await expect(page.locator('.editor > div')).toHaveText(['One', 'Three']);
        });

        test('keeps blockquote markup when removing a surrounding indentation', async ({ page }) => {
            await createEditor(page, '<div style="margin-left: 2em;"><blockquote class="blockquote"><p>Quoted</p></blockquote></div>');
            await selectContents(page, '.editor p');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<blockquote class="blockquote"><p>Quoted</p></blockquote>');
        });
    });
});
