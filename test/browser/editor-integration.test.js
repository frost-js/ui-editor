import { expect, test } from '#test';
import { createEditor, selectContents } from '../setup/editor.js';

test('dispatches strikethrough to the public editor method', async ({ page }) => {
    await createEditor(page, '<p>Strike this</p>', { buttons: [['strikethrough']] });
    await selectContents(page, '.editor p');
    await page.getByRole('button', { name: 'Strikethrough', exact: true }).click();
    await expect(page.locator('.editor')).toHaveText('Strike this');
    expect(await page.evaluate(() => document.queryCommandState('strikethrough'))).toBe(true);
});

test('runs formatting commands through the current Frost UI dropdown', async ({ page }) => {
    await createEditor(page, '<p>Heading</p>', { buttons: [['style']] });
    await selectContents(page, '.editor p');
    await page.getByRole('button', { name: 'Style', exact: true }).click();
    await page.getByRole('button', { name: 'Header 2', exact: true }).click();
    await expect(page.locator('.editor > h2')).toHaveText('Heading');
});

test('positions link popovers and edits links through an owned modal', async ({ page }) => {
    await createEditor(page, '<p><a href="https://example.com/">Example</a></p>');
    await page.locator('.editor a').click();
    await expect(page.locator('.editor-popover')).toBeVisible();
    await page.getByRole('button', { name: 'Edit Link', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Insert Link' });
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('Link URL')).toHaveValue('https://example.com/');
    await modal.getByLabel('Link Text').fill('Edited link');
    await modal.getByRole('button', { name: 'Insert Link', exact: true }).click();
    await expect(page.locator('.editor a')).toHaveText('Edited link');
    await expect(page.locator('.modal, .modal-backdrop')).toHaveCount(0);
});

test('inserts a table through a delegated grid action', async ({ page }) => {
    await createEditor(page, '<p>Table follows</p>', { buttons: [['table']] });
    await page.locator('.editor').focus();
    await page.keyboard.press('End');
    await page.getByRole('button', { name: 'Table', exact: true }).click();
    await page.locator('.editor-table-link').first().click();
    await expect(page.locator('.editor table tr')).toHaveCount(1);
    await expect(page.locator('.editor table td')).toHaveCount(1);
    await expect(page.locator('#editor')).toHaveValue(await page.locator('.editor').innerHTML());
});
