import process from 'node:process';
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.js';

process.env.FROST_UI_EDITOR_COVERAGE = 'true';

const normalizePath = (filePath) => filePath.replaceAll('\\', '/');
const sourceMapUrl = new URL('./dist/frost-ui-editor.js.map', import.meta.url).href;

export default defineConfig({
    ...baseConfig,
    projects: [
        {
            name: 'coverage',
            use: { browserName: 'chromium' },
        },
    ],
    reporter: [
        ['line'],
        [
            'monocart-reporter',
            {
                name: 'Frost UI Editor Coverage',
                outputFile: './test-results/coverage/index.html',
                coverage: {
                    name: 'Frost UI Editor Source Coverage',
                    outputDir: './coverage',
                    reports: [
                        'console-summary',
                        'html',
                        'lcovonly',
                    ],
                    entryFilter: (entry) => ['/assets/frost-ui-editor.js', '/src/js/nodes.js'].some((path) => normalizePath(entry.url).endsWith(path)),
                    sourcePath: (filePath) => {
                        const normalized = normalizePath(filePath);
                        const index = normalized.indexOf('src/js/');
                        return index === -1 ? normalized : normalized.slice(index);
                    },
                    sourceFilter: (sourcePath) => {
                        const normalizedPath = normalizePath(sourcePath);

                        // The browser entry only re-exports the component, so bundling
                        // erases it and V8 cannot associate runtime ranges with the file.
                        return normalizedPath.startsWith('src/js/') &&
                            normalizedPath !== 'src/js/browser.js';
                    },
                    sourceMapResolver: (_url, defaultResolver) => defaultResolver(sourceMapUrl),
                    all: './src/js',
                },
            },
        ],
    ],
});
