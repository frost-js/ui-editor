import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

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
    const html = '<h2>Title</h2><ul><li>Item</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table><p><a href="https://example.com/">Link</a><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Example"></p>';
    await page.evaluate((html) => {
        const node = document.createElement('textarea');
        node.value = html;
        document.body.append(node);
        UI.Editor.init(node, { buttons: [] });
    }, html);
    await expect(page.locator('.editor')).toHaveJSProperty('innerHTML', html);
});

test('restores a ranged selection after inserting and removing selection markers', async ({ page }) => {
    expect(await page.evaluate(async () => {
        const { saveSelection, restoreSelection } = await import('/src/js/selection.js');
        const node = document.createElement('p');
        node.textContent = 'Selected text';
        document.body.append(node);
        const range = document.createRange();
        range.setStart(node.firstChild, 0);
        range.setEnd(node.firstChild, 8);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const markers = saveSelection();
        restoreSelection(markers);
        return { selected: selection.toString(), text: node.textContent };
    })).toEqual({ selected: 'Selected', text: 'Selected text' });
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

test('preserves a selection at an inline merge boundary', async ({ page }) => {
    await createEditor(page);
    await page.locator('.editor').focus();
    expect(await page.evaluate(() => {
        const editor = window.editor;
        editor._observe(false);
        editor._editor.innerHTML = '<p><b>One</b><b>Two</b></p>';
        const paragraph = editor._editor.firstChild;
        const range = document.createRange();
        range.setStart(paragraph, 1);
        range.setEnd(paragraph, 2);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editor._normalize();
        editor._updateValue();
        editor._observe();
        return { html: editor._editor.innerHTML, selected: selection.toString() };
    })).toEqual({ html: '<p><b>OneTwo</b></p>', selected: 'Two' });
});

test('does not place selection markers in another editing surface', async ({ page }) => {
    await createEditor(page);
    expect(await page.evaluate(() => {
        const other = document.createElement('div');
        other.contentEditable = 'true';
        other.textContent = 'Outside';
        document.body.append(other);
        other.focus();
        getSelection().setBaseAndExtent(other.firstChild, 0, other.firstChild, 3);
        window.editor._normalize();
        return { selected: getSelection().toString(), textNodes: other.childNodes.length, focused: document.activeElement === other };
    })).toEqual({ selected: 'Out', textNodes: 1, focused: true });
});

test('observes character-data changes without requiring a synthetic input event', async ({ page }) => {
    await createEditor(page);
    await page.evaluate(() => {
        document.querySelector('.editor p').firstChild.data = 'Programmatic edit';
    });
    await expect(page.locator('#editor')).toHaveValue('<p>Programmatic edit</p>');
});
