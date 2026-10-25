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

            for (const interaction of ['api', 'keyboard', 'toolbar']) {
                test(`repeatedly nests the first item and restores it (${tag}, ${interaction})`, async ({ page }) => {
                    const html = `<${tag}><li class="first">One</li><li>Two</li></${tag}>`;

                    await createEditor(page, html, { buttons: [['indent', 'outdent', 'undo', 'redo']] });
                    await selectContents(page, '.editor .first');

                    const change = async (outdent) => {
                        if (interaction === 'keyboard') {
                            await page.keyboard.press(outdent ? 'Shift+Tab' : 'Tab');
                        } else if (interaction === 'toolbar') {
                            await page.getByRole('button', { name: outdent ? 'Outdent' : 'Indent', exact: true }).click();
                        } else {
                            await page.evaluate((outdent) => window.editor[outdent ? 'outdent' : 'indent'](), outdent);
                        }
                    };

                    for (let depth = 1; depth <= 3; depth++) {
                        await change(false);
                        await expect(page.locator(`.editor ${tag}`)).toHaveCount(depth + 1);
                        await expect(page.locator('.editor li[style*="list-style-type: none"]')).toHaveCount(depth);
                        await expect(page.locator(`.editor ${tag} > :not(li)`)).toHaveCount(0);
                        expect(await page.evaluate(() => getSelection().toString())).toBe('One');
                    }

                    for (let depth = 2; depth >= 0; depth--) {
                        await change(true);
                        await expect(page.locator(`.editor ${tag}`)).toHaveCount(depth + 1);
                        expect(await page.evaluate(() => getSelection().toString())).toBe('One');
                    }

                    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                    await expect(page.locator('#editor')).toHaveValue(html);
                    await page.evaluate(() => window.editor.undo());
                    await expect(page.locator(`.editor ${tag}`)).toHaveCount(2);
                    await page.evaluate(() => window.editor.redo());
                    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                });
            }

            test(`repeatedly nests a later item and restores the original list (${tag})`, async ({ page }) => {
                const html = `<${tag}><li>One</li><li class="target">Two</li><li>Three</li></${tag}>`;

                await createEditor(page, html);
                await selectContents(page, '.editor .target');

                for (let depth = 1; depth <= 3; depth++) {
                    await page.keyboard.press('Tab');
                    await expect(page.locator(`.editor ${tag}`)).toHaveCount(depth + 1);
                }

                for (let depth = 2; depth >= 0; depth--) {
                    await page.keyboard.press('Shift+Tab');
                    await expect(page.locator(`.editor ${tag}`)).toHaveCount(depth + 1);
                }

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
            });
        }

        test('indents and outdents a whole list as one selection', async ({ page }) => {
            const html = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';

            await createEditor(page, html);
            await selectContents(page, '.editor');
            await page.evaluate(() => window.editor.indent());

            await expect(page.locator('.editor > ul > li > ul > li')).toHaveText(['One', 'Two', 'Three']);
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
        });

        test('includes the paragraph after a list in a mixed selection', async ({ page }) => {
            await createEditor(page, '<ul><li>One</li><li>Two</li></ul><p>After</p>');
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const start = document.querySelector('.editor li:last-child').firstChild;
                const end = document.querySelector('.editor p').firstChild;

                getSelection().setBaseAndExtent(start, 0, end, end.length);
                window.editor.indent();
            });

            await expect(page.locator('.editor > ul > li > ul > li')).toHaveText('Two');
            await expect(page.locator('.editor > div > p')).toHaveText('After');
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
        for (const tag of ['p', 'h2', 'blockquote']) {
            test(`preserves a directly indented ${tag} and its attributes`, async ({ page }) => {
                await createEditor(page, `<${tag} id="kept" class="note" style="margin-left: 4em; color: red;">Text</${tag}><p>After</p>`);
                await selectContents(page, '.editor #kept');
                await page.evaluate(() => window.editor.outdent());

                const block = page.locator(`.editor > ${tag}#kept.note`);

                await expect(block).toHaveAttribute('style', /margin-inline-start: 2em/);
                await page.evaluate(() => window.editor.outdent());
                await expect(block).toHaveText('Text');
                await expect(block).toHaveCSS('color', 'rgb(255, 0, 0)');
                await expect(block).not.toHaveAttribute('style', /margin/);
                expect(await page.evaluate(() => getSelection().toString())).toBe('Text');
            });
        }

        test('splits nested wrappers without outdenting unselected paragraphs or duplicating IDs', async ({ page }) => {
            const html = '<div style="margin-inline-start: 2em;"><section id="group" class="section"><p>One</p><p id="selected">Two</p><p>Three</p></section></div>';

            await createEditor(page, html);
            await selectContents(page, '.editor #selected');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor > section.section > p')).toHaveText('Two');
            await expect(page.locator('.editor > div > section.section > p')).toHaveText(['One', 'Three']);
            await expect(page.locator('#group')).toHaveCount(1);
            await expect(page.locator('#selected')).toHaveCount(1);
            expect(await page.evaluate(() => getSelection().toString())).toBe('Two');
            await page.evaluate(() => window.editor.undo());
            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
        });

        test('preserves a styled blockquote and its ID when outdenting its paragraph', async ({ page }) => {
            await createEditor(page, '<blockquote id="quote" class="blockquote" style="margin-inline-start: 2em;"><p>Quoted</p></blockquote>');
            await selectContents(page, '.editor p');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor > blockquote#quote.blockquote')).toHaveJSProperty('innerHTML', '<p>Quoted</p>');
            await expect(page.locator('#quote')).toHaveCount(1);
            await expect(page.locator('#quote')).not.toHaveAttribute('style', /margin/);
            expect(await page.evaluate(() => getSelection().toString())).toBe('Quoted');
        });

        test('removes only one indentation level from each selected paragraph', async ({ page }) => {
            await createEditor(page, '<div style="margin-inline-start: 2em;"><p>One</p><p style="margin-inline-start: 2em;">Two</p><p>Three</p></div>');
            await selectContents(page, '.editor');
            await page.evaluate(() => window.editor.outdent());

            await expect(page.locator('.editor > p')).toHaveText(['One', 'Three']);
            await expect(page.locator('.editor > div > p')).toHaveText('Two');
            await expect(page.locator('.editor > div')).toHaveAttribute('style', 'margin-inline-start: 2em;');
            await expect(page.locator('.editor p[style]')).toHaveCount(0);
        });

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

    test.describe('table cells', () => {
        for (const tag of ['td', 'th']) {
            test(`indents content inside ${tag} without changing the table structure`, async ({ page }) => {
                const html = `<table><tbody><tr><${tag} id="cell">One</${tag}><td>Two</td></tr></tbody></table>`;

                await createEditor(page, html);
                await selectContents(page, '.editor #cell');

                for (let depth = 1; depth <= 2; depth++) {
                    await page.keyboard.press('Tab');
                    await expect(page.locator('.editor #cell div[style*="margin-inline-start"]')).toHaveCount(depth);
                    await expect(page.locator('.editor tr > :not(td, th)')).toHaveCount(0);
                    await expect(page.locator('.editor tr > td:last-child')).toHaveText('Two');
                }

                for (let depth = 1; depth >= 0; depth--) {
                    await page.keyboard.press('Shift+Tab');
                    await expect(page.locator('.editor #cell div')).toHaveCount(depth);
                }

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                await page.keyboard.press('Shift+Tab');
                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                expect(await page.evaluate(() => getSelection().toString())).toBe('One');
            });
        }
    });
});
