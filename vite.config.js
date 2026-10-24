import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isUmd = mode === 'umd';

    return {
        build: {
            emptyOutDir: !isUmd,
            lib: {
                entry: isUmd ? 'src/js/browser.js' : 'src/js/index.js',
                name: 'UI',
            },
            minify: false,
            outDir: 'dist',
            rolldownOptions: {
                external: [
                    '@fr0st/query',
                    '@fr0st/ui',
                ],
                output: isUmd ? [
                    {
                        entryFileNames: 'frost-ui-editor.js',
                        extend: true,
                        format: 'umd',
                        globals: {
                            '@fr0st/query': 'fQuery',
                            '@fr0st/ui': 'UI',
                        },
                        minify: false,
                        name: 'UI',
                    },
                    {
                        entryFileNames: 'frost-ui-editor.min.js',
                        extend: true,
                        format: 'umd',
                        globals: {
                            '@fr0st/query': 'fQuery',
                            '@fr0st/ui': 'UI',
                        },
                        minify: true,
                        name: 'UI',
                    },
                ] : [
                    {
                        entryFileNames: 'frost-ui-editor.esm.js',
                        format: 'es',
                        minify: false,
                    },
                    {
                        entryFileNames: 'frost-ui-editor.esm.min.js',
                        format: 'es',
                        minify: true,
                    },
                ],
            },
            sourcemap: true,
            target: 'baseline-widely-available',
        },
    };
});
