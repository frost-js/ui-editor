import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

test.describe('Editor normalization', () => {
    test.describe('content structure', () => {
        test('preserves existing empty blocks', async ({ page }) => {
            const html = '<h2></h2><p></p><pre></pre>';

            await createEditor(page, html);

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
            await expect(page.locator('#editor')).toHaveValue(html);
        });

        test('removes unadorned spans and joins identical adjacent inline nodes', async ({ page }) => {
            await page.evaluate(() => {
                const node = document.createElement('textarea');

                node.value = '<p><span>Plain</span> <b>bold</b><b> text</b></p>';
                document.body.append(node);
                UI.Editor.init(node, { buttons: [] });
            });

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p>Plain <b>bold text</b></p>');
        });

        test('preserves headings, lists, tables, and media in existing content', async ({ page }) => {
            const html = '<h2>Title</h2>' +
                '<ul>' +
                '<li>Item</li>' +
                '</ul>' +
                '<table>' +
                '<tbody>' +
                '<tr>' +
                '<td>Cell</td>' +
                '</tr>' +
                '</tbody>' +
                '</table>' +
                '<p>' +
                '<a href="https://example.com/">Link</a>' +
                '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Example">' +
                '</p>';

            await page.evaluate((html) => {
                const node = document.createElement('textarea');

                node.value = html;
                document.body.append(node);
                UI.Editor.init(node, { buttons: [] });
            }, html);

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
        });

        test('splits a paragraph around nested block content without discarding trailing text', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                const paragraph = document.createElement('p');

                paragraph.className = 'lead';

                const block = document.createElement('div');

                block.textContent = 'Block';
                paragraph.append('Before', block, 'After');
                document.querySelector('.editor').replaceChildren(paragraph);
            });

            const html = '<p class="lead">Before</p><div>Block</div><p class="lead">After</p>';

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
            await expect(page.locator('#editor')).toHaveValue(html);
        });

        for (const tagName of ['h2', 'pre']) {
            test(`retains ${tagName} formatting around nested blocks and trailing text`, async ({ page }) => {
                await createEditor(page);
                await page.evaluate((tagName) => {
                    const element = document.createElement(tagName);

                    element.className = 'lead';

                    const block = document.createElement('div');

                    block.textContent = 'Block';
                    element.append('Before', block, 'After');
                    document.querySelector('.editor').replaceChildren(element);
                }, tagName);

                const html = `<${tagName} class="lead">Before</${tagName}>` +
                    `<div><${tagName} class="lead">Block</${tagName}></div>` +
                    `<${tagName} class="lead">After</${tagName}>`;

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                await expect(page.locator('#editor')).toHaveValue(html);
            });
        }

        for (const [name, html] of [
            ['SVG', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="5"></circle></svg>'],
            ['MathML', '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mn>1</mn></math>'],
            ['video sources', '<video controls=""><source type="video/mp4"></video>'],
            ['audio sources', '<audio controls=""><source type="audio/mpeg"></audio>'],
            ['picture sources', '<picture><source media="(min-width: 1px)"><img alt="Example"></picture>'],
            ['ruby annotations', '<ruby>漢<rt>kan</rt></ruby>'],
        ]) {
            test(`preserves ${name} without restructuring its children`, async ({ page }) => {
                await createEditor(page, html);

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                await expect(page.locator('#editor')).toHaveValue(html);

                await page.evaluate(() => window.editor.refresh());

                await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
                await expect(page.locator('#editor')).toHaveValue(html);
            });
        }

        test('retains the following element when joining adjacent inline nodes', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                const surface = document.querySelector('.editor');

                surface.innerHTML = '<p><b>One</b><b>Two</b><b>Three</b></p>';
                window.survivingInline = surface.querySelector('b:last-child');
            });

            await expect(page.locator('.editor b')).toHaveCount(1);
            await expect(page.locator('.editor b')).toHaveText('OneTwoThree');
            expect(await page.locator('.editor b').evaluate((node) => node === window.survivingInline)).toBe(true);
        });
    });

    test.describe('selection preservation', () => {
        test('preserves a backward range when splitting a paragraph around a block', async ({ page }) => {
            await createEditor(page);
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const paragraph = document.createElement('p');
                const block = document.createElement('div');

                block.textContent = 'Block';

                const after = document.createTextNode('After');

                paragraph.append('Before', block, after);
                document.querySelector('.editor').replaceChildren(paragraph);
                getSelection().setBaseAndExtent(after, 4, after, 1);
            });

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p>Before</p><div>Block</div><p>After</p>');
            expect(await page.evaluate(() => getSelection().toString())).toBe('fte');
            expect(await page.evaluate(() => getSelection().anchorOffset > getSelection().focusOffset)).toBe(true);
        });

        test('preserves a text range through indentation and removes selection markers', async ({ page }) => {
            await createEditor(page, '<p>Selected text</p>');
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const text = document.querySelector('.editor p').firstChild;

                getSelection().setBaseAndExtent(text, 0, text, 8);
                window.editor.indent();
                window.editor.outdent();
            });

            await expect(page.locator('#editor')).toHaveValue('<p>Selected text</p>');
            expect(await page.evaluate(() => getSelection().toString())).toBe('Selected');

            const emptyTextNodes = await page.locator('.editor p').evaluate((node) =>
                [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE && !child.textContent).length,
            );

            expect(emptyTextNodes).toBe(0);
        });

        test('preserves a selection at an inline merge boundary', async ({ page }) => {
            await createEditor(page);
            await page.locator('.editor').focus();
            await page.evaluate(() => {
                const surface = document.querySelector('.editor');

                surface.innerHTML = '<p><b>One</b><b>Two</b></p>';

                const paragraph = surface.firstChild;
                const range = document.createRange();

                range.setStart(paragraph, 1);
                range.setEnd(paragraph, 2);

                const selection = getSelection();

                selection.removeAllRanges();
                selection.addRange(range);
            });

            await expect(page.locator('#editor')).toHaveValue('<p><b>OneTwo</b></p>');
            expect(await page.evaluate(() => getSelection().toString())).toBe('Two');
        });

        test('does not place selection markers in another editing surface', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                const other = document.createElement('div');

                other.id = 'other';
                other.contentEditable = 'true';
                other.textContent = 'Outside';
                document.body.append(other);
                other.focus();
                getSelection().setBaseAndExtent(other.firstChild, 0, other.firstChild, 3);
                document.querySelector('.editor p').firstChild.data = 'Changed elsewhere';
            });

            await expect(page.locator('#editor')).toHaveValue('<p>Changed elsewhere</p>');
            expect(await page.evaluate(() => getSelection().toString())).toBe('Out');
            await expect(page.locator('#other')).toBeFocused();
            await expect(page.locator('#other')).toHaveText('Outside');
            expect(await page.locator('#other').evaluate((node) => node.childNodes.length)).toBe(1);
        });
    });

    test.describe('mutation observation', () => {
        test('observes character-data changes without requiring a synthetic input event', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                document.querySelector('.editor p').firstChild.data = 'Programmatic edit';
            });

            await expect(page.locator('#editor')).toHaveValue('<p>Programmatic edit</p>');
        });
    });
});
