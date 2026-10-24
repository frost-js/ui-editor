import { expect, test } from '#test';
import { createEditor } from '../setup/editor.js';

test.beforeEach(async ({ page }) => {
    await page.route('https://**', (route) => route.abort());
});

const unsafe = '<p onclick="alert(1)" id="clobber" style="color: red; position: fixed; background-image: url(https://example.com/track)">Safe <b>bold</b><a href="java&#x09;script:alert(1)">Bad</a><img src="data:image/svg+xml;base64,PHN2Zz4=" onerror="alert(1)"></p><script>alert(1)</script><svg onload="alert(1)"></svg><iframe src="https://example.com/"></iframe>';

async function expectSafe(page) {
    await expect(page.locator('.editor script, .editor svg, .editor iframe')).toHaveCount(0);
    await expect(page.locator('.editor [onclick], .editor [onerror], .editor #clobber')).toHaveCount(0);
    await expect(page.locator('.editor a')).not.toHaveAttribute('href');
    await expect(page.locator('.editor img')).not.toHaveAttribute('src');
    expect(await page.locator('.editor p').first().evaluate((node) => ({ color: node.style.color, position: node.style.position, image: node.style.backgroundImage }))).toEqual({ color: 'red', position: '', image: '' });
}

test('sanitizes initial HTML before attaching live content', async ({ page }) => {
    await createEditor(page, unsafe);
    await expectSafe(page);
    await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
});

test('sanitizes insertion and clipboard HTML with the same formatting policy', async ({ page }) => {
    await createEditor(page, '');
    await page.evaluate((html) => window.editor.insertHTML(html), unsafe);
    await expectSafe(page);
    await page.evaluate((html) => {
        getSelection().selectAllChildren(window.editor._editor);
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/html', html);
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', { value: clipboardData });
        window.editor._editor.dispatchEvent(event);
    }, unsafe);
    await expectSafe(page);
});

test('sanitizes source submission immediately and source rendering on return', async ({ page }) => {
    await createEditor(page);
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await page.locator('.editor-source').fill(unsafe);
    const value = await page.locator('#editor').inputValue();
    expect(value).not.toMatch(/onclick|onerror|javascript|<script|<svg|<iframe/);
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expectSafe(page);
});

test('preserves supported formatting, table attributes, raster uploads, and YouTube embeds', async ({ page }) => {
    await createEditor(page, '<h2>Title</h2><blockquote><p style="text-align: center; font-family: serif; font-size: 18px; color: red; background-color: yellow;"><u>Underlined</u><s>Strike</s><sub>Sub</sub><sup>Super</sup></p></blockquote><ol start="3"><li>Item</li></ol><div style="margin-inline-start: 2em;"><p>Indented</p></div><table class="table"><tbody><tr><th scope="row">Heading</th><td colspan="2">Cells</td></tr></tbody></table><p><img alt="Upload" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></p><iframe src="https://www.youtube.com/embed/abc-123_X" allowfullscreen></iframe>');
    await expect(page.locator('.editor h2')).toHaveText('Title');
    await expect(page.locator('.editor [colspan="2"]')).toHaveText('Cells');
    await expect(page.locator('.editor ol')).toHaveAttribute('start', '3');
    await expect(page.locator('.editor img')).toHaveAttribute('src', /^data:image\/gif/);
    await expect(page.locator('.editor iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    await expect(page.locator('.editor iframe')).toHaveAttribute('title', 'YouTube video');
    expect(await page.locator('.editor blockquote p').evaluate((node) => node.style.textAlign)).toBe('center');
});

test('rejects unsafe public URLs and protects links opened in new windows', async ({ page }) => {
    await createEditor(page, '<p>Links</p>');
    await page.evaluate(() => {
        window.editor.insertLink('javascript:alert(1)', 'Unsafe', true);
        window.editor.insertImage('data:image/svg+xml;base64,PHN2Zz4=');
        window.editor.insertLink('data:text/html,hello', 'Unsafe');
        window.editor.insertImage('file:///tmp/unsafe');
    });
    await expect(page.locator('.editor a, .editor img')).toHaveCount(0);
    await page.evaluate(() => {
        window.editor.insertLink('/relative', 'Relative', true);
        window.editor.insertLink('mailto:editor@example.com', 'Email');
    });
    await expect(page.locator('.editor a[target="_blank"]')).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('.editor a[href^="mailto:"]')).toHaveText('Email');
});

test('supports a trusted application sanitizer for initial, inserted, source, and pasted HTML', async ({ page }) => {
    await page.evaluate(() => {
        const node = document.createElement('textarea');
        node.id = 'editor';
        node.value = '<p>Start</p>';
        document.body.append(node);
        window.sanitizeCalls = [];
        window.editor = UI.Editor.init(node, {
            buttons: [['source']],
            sanitize(html) {
                window.sanitizeCalls.push(html);
                return html.replaceAll('secret', 'redacted');
            },
        });
        window.editor.insertHTML('<p>secret</p>');
    });
    await expect(page.locator('.editor')).toContainText('redacted');
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await page.locator('.editor-source').fill('<p>secret source</p>');
    await expect(page.locator('#editor')).toHaveValue('<p>redacted source</p>');
    await page.getByRole('button', { name: 'View Source', exact: true }).click();
    await expect(page.locator('.editor')).toHaveText('redacted source');
    expect(await page.evaluate(() => window.sanitizeCalls.length)).toBeGreaterThanOrEqual(4);
});

test('pastes plain text without interpreting markup', async ({ page }) => {
    await createEditor(page, '');
    await page.evaluate(() => {
        window.editor._focusEditor();
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', '<img onerror="alert(1)">');
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', { value: clipboardData });
        window.editor._editor.dispatchEvent(event);
    });
    await expect(page.locator('.editor img')).toHaveCount(0);
    await expect(page.locator('.editor')).toHaveText('<img onerror="alert(1)">');
});


test('validates link and video dialog URLs with current input feedback styling', async ({ page }) => {
    await createEditor(page, '<p>Media</p>', { buttons: [['link', 'video']] });
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    const linkDialog = page.getByRole('dialog', { name: 'Insert Link' });
    await linkDialog.getByLabel('Link URL').fill('javascript:alert(1)');
    await linkDialog.getByRole('button', { name: 'Insert Link', exact: true }).click();
    await expect(linkDialog.getByLabel('Link URL')).toHaveAttribute('aria-invalid', 'true');
    await expect(linkDialog.getByText('Enter a supported URL.')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Video', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Insert Video' });
    await dialog.getByLabel('Video URL').fill('https://notyoutube.com/watch?v=abc');
    await dialog.getByRole('button', { name: 'Insert Video', exact: true }).click();
    await expect(dialog.getByLabel('Video URL')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText('Invalid video URL.')).toBeVisible();
    await dialog.getByLabel('Video URL').fill('https://youtu.be/abc-123_X');
    await dialog.getByRole('button', { name: 'Insert Video', exact: true }).click();
    await expect(page.locator('.editor iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/abc-123_X');
    await expect(page.locator('.editor iframe')).toHaveAttribute('title', 'YouTube video');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
