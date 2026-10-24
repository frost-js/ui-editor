import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

test.describe('Editor normalization', () => {
    test.describe('content structure', () => {
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

        test('lifts block descendants out of inline formatting and keeps both inline fragments', async ({ page }) => {
            await createEditor(page);
            await page.evaluate(() => {
                const paragraph = document.createElement('p');
                const bold = document.createElement('b');
                const block = document.createElement('div');
                block.textContent = 'Block';
                bold.append('Before', block, 'After');
                paragraph.append(bold);
                document.querySelector('.editor').replaceChildren(paragraph);
            });

            await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', '<p><b>Before</b></p><div>Block</div><p><b>After</b></p>');
        });
    });

    test.describe('selection preservation', () => {
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
