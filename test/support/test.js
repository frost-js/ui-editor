import process from 'node:process';
import { test as base, expect } from '@playwright/test';
import { setupClock } from '../setup/browser.js';

const collectCoverage = process.env.FROST_UI_EDITOR_COVERAGE === 'true';

const test = base.extend({
    expectedBrowserErrors: [[], { option: true }],
    mockClock: [false, { option: true }],
    uiPage: [
        async ({ page, mockClock, expectedBrowserErrors }, use, testInfo) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));

            if (collectCoverage) {
                await page.coverage.startJSCoverage({
                    resetOnNavigation: false,
                });
            }

            if (mockClock) {
                await setupClock(page);
            }

            await page.goto('/', {
                waitUntil: 'domcontentloaded',
            });

            await page.evaluate(() => {
                if (
                    !window.fQuery ||
                    !window.UI?.Editor ||
                    typeof window.fQuery.QuerySet.prototype.editor !== 'function'
                ) {
                    throw new Error('Failed to initialize Editor on the test page.');
                }

                // Keep the stylesheet in the head for component layout and transitions.
                document.body.replaceChildren();
            });

            await page.waitForFunction(() => {
                const node = document.createElement('div');
                node.className = 'editor-container text-center';
                document.body.append(node);

                const style = getComputedStyle(node);
                const ready = style.minHeight === '100%' &&
                    style.textAlign === 'center';

                node.remove();
                return ready;
            });

            await use();

            if (collectCoverage) {
                // Coverage runs on Node 24; regular tests also support Node 20.
                const { addCoverageReport } = await import('monocart-reporter');
                const coverage = await page.coverage.stopJSCoverage();
                await addCoverageReport(coverage, testInfo);
            }

            expect(errors, 'Uncaught browser errors').toEqual(expectedBrowserErrors);
        },
        { auto: true },
    ],
});

export { expect, test };
