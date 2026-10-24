import { expect, test } from '#test';
import { createEditor, selectContents } from '../setup/editor.js';

test.describe('Editor styles', () => {
    test.describe('themes and RTL', () => {
        for (const theme of ['light', 'dark']) {
            test(`supports ${theme} theme, RTL, narrow containers, logical indentation, and resizing`, async ({ page }) => {
                await page.evaluate((theme) => {
                    document.documentElement.setAttribute('data-ui-theme', theme);
                    document.body.dir = 'rtl';
                    document.body.style.width = '300px';
                }, theme);
                await createEditor(page, '<p>مرحبا</p>', { buttons: [['style', 'source', 'fullScreen']] });
                await selectContents(page, '.editor p');
                await page.evaluate(() => window.editor.indent());
                const indentation = await page.locator('.editor > div').evaluate((node) => ({
                    margin: parseFloat(getComputedStyle(node).marginRight),
                    font: parseFloat(getComputedStyle(node).fontSize),
                    style: node.style.marginInlineStart,
                }));

                expect(indentation.style).toBe('2em');
                expect(indentation.margin).toBeCloseTo(indentation.font * 2, 1);
                const resize = page.getByRole('separator', { name: 'Resize editor' });
                const height = await page.locator('.card-body').evaluate((node) => node.getBoundingClientRect().height);
                await resize.focus();
                await page.keyboard.press('ArrowDown');

                expect(await page.locator('.card-body').evaluate((node) => node.getBoundingClientRect().height)).toBeCloseTo(height + 10, 0);
                expect(await page.locator('.card').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(300);
                await page.getByRole('button', { name: 'Full Screen', exact: true }).click();

                await expect(page.getByRole('dialog')).toBeVisible();
                await page.keyboard.press('Escape');

                await expect(page.getByRole('dialog')).toHaveCount(0);
                await expect(page.locator('.editor')).toHaveText('مرحبا');
            });
        }
    });

    test.describe('focus styling', () => {
        test('matches form-control focus styling across the panel and honors forced colors', async ({ page }) => {
            await createEditor(page);
            const panel = page.locator('.editor-panel');
            const expected = await page.evaluate(() => {
                const input = document.createElement('input');
                input.className = 'input-outline';
                input.style.transition = 'none';
                document.body.append(input);
                input.focus();
                const style = getComputedStyle(input);
                const result = {
                    shadow: style.boxShadow,
                    border: style.borderColor,
                };
                input.remove();
                return result;
            });
            await page.locator('.editor').focus();

            await expect(panel).toHaveCSS('box-shadow', expected.shadow);
            await expect(panel).toHaveCSS('border-color', expected.border);
            await expect(panel).toHaveCSS('outline-style', 'none');
            await expect(page.locator('.editor')).toHaveCSS('outline-style', 'none');
            const bold = page.getByRole('button', { name: 'Bold', exact: true });
            await bold.focus();

            await expect(panel).toHaveCSS('box-shadow', expected.shadow);
            await expect(bold).toHaveCSS('transition-duration', '0s');
            await page.getByRole('button', { name: 'View Source', exact: true }).click();

            await expect(page.locator('.editor-source')).toBeFocused();
            await expect(page.locator('.editor-source')).toHaveCSS('outline-style', 'none');
            await expect(panel).toHaveCSS('box-shadow', expected.shadow);
            await page.emulateMedia({ forcedColors: 'active' });
            await panel.evaluate((node) => node.style.setProperty('--ui-editor-focus-width', '5px'));
            // Forced colors intentionally supplies a high-contrast 2px outline.
            await expect(panel).toHaveCSS('outline-width', '2px');
        });
    });

    test.describe('sizing and overflow', () => {
        test('keeps formatting dropdowns within a mobile viewport and scrolls long menus', async ({ page }) => {
            await page.setViewportSize({
                width: 320,
                height: 480,
            });
            await createEditor(page, '<p>Mobile</p>', { buttons: [['style', 'color']] });
            await page.getByRole('button', { name: 'Style', exact: true }).click();
            const menu = page.locator('.editor-dropdown.show');
            const rect = await menu.boundingBox();

            expect(rect.x).toBeGreaterThanOrEqual(-1);
            expect(rect.x + rect.width).toBeLessThanOrEqual(321);
            expect(rect.height).toBeLessThanOrEqual(360);
            await page.getByRole('button', { name: 'Header 6', exact: true }).focus();

            expect(await menu.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
            await page.keyboard.press('Escape');
            await page.getByRole('button', { name: 'Font Color', exact: true }).click();
            const colorRect = await menu.boundingBox();

            expect(colorRect.x).toBeGreaterThanOrEqual(-1);
            expect(colorRect.x + colorRect.width).toBeLessThanOrEqual(321);
        });

        for (const height of ['auto', '260px']) {
            test(`fills the ${height} editing body with a clickable focus surface before and after resizing`, async ({ page }) => {
                await createEditor(page, '<p>Short content</p>', { height });
                const surface = page.locator('.editor');
                const body = page.locator('.card-body');
                const checkFill = async () => {
                    const frame = await body.boundingBox();
                    const content = await surface.boundingBox();

                    expect(content.height).toBeGreaterThanOrEqual(frame.height - 1);
                    await page.mouse.click(frame.x + 12, frame.y + frame.height - 8);

                    await expect(surface).toBeFocused();
                };
                await checkFill();
                const resize = page.getByRole('separator', { name: 'Resize editor' });
                await resize.focus();
                await page.keyboard.press('ArrowDown');
                await checkFill();
                await page.keyboard.press('Escape');
                await page.keyboard.press('Tab');

                await expect(surface).not.toBeFocused();
            });
        }
    });
});
