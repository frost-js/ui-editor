import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const css = 'text/css; charset=utf-8';
const html = 'text/html; charset=utf-8';
const javaScript = 'text/javascript; charset=utf-8';
const resolveModule = (specifier) => new URL(import.meta.resolve(specifier));

const routes = new Map([
    ['/', { contentType: html, file: new URL('../app/index.html', import.meta.url) }],
    ['/demo/index.html', { contentType: html, file: new URL('../../../demo/index.html', import.meta.url) }],
    ['/demo/assets/demo.css', { contentType: css, file: new URL('../../../demo/assets/demo.css', import.meta.url) }],
    ['/demo/assets/demo.js', { contentType: javaScript, file: new URL('../../../demo/assets/demo.js', import.meta.url) }],
    ['/dist/frost-ui-editor.css', { contentType: css, file: new URL('../../../dist/frost-ui-editor.css', import.meta.url) }],
    ['/dist/frost-ui-editor.js', { contentType: javaScript, file: new URL('../../../dist/frost-ui-editor.js', import.meta.url) }],
    ['/esm.html', { contentType: html, file: new URL('../app/esm.html', import.meta.url) }],
    ['/umd-min.html', { contentType: html, file: new URL('../app/umd-min.html', import.meta.url) }],
    ['/src/js/nodes.js', { contentType: javaScript, file: new URL('../../../src/js/nodes.js', import.meta.url) }],
    ['/src/js/selection.js', { contentType: javaScript, file: new URL('../../../src/js/selection.js', import.meta.url) }],
    ['/assets/frost-ui-editor.js', { contentType: javaScript, file: new URL('../../../dist/frost-ui-editor.js', import.meta.url) }],
    ['/assets/frost-ui-editor.css', { contentType: css, file: new URL('../../../dist/frost-ui-editor.css', import.meta.url) }],
    ['/assets/frost-ui-bundle.js', { contentType: javaScript, file: resolveModule('@fr0st/ui/dist/frost-ui-bundle.js') }],
    ['/assets/frost-ui.css', { contentType: css, file: resolveModule('@fr0st/ui/dist/frost-ui.css') }],
]);

for (const filename of ['frost-ui-editor.esm.js', 'frost-ui-editor.esm.min.js', 'frost-ui-editor.min.js']) {
    routes.set(`/assets/${filename}`, {
        contentType: javaScript,
        file: new URL(`../../../dist/${filename}`, import.meta.url),
    });
}

for (const [filename, specifier] of [
    ['frost-core.esm.js', '@fr0st/core'],
    ['fquery.esm.js', '@fr0st/query'],
    ['frost-ui.esm.js', '@fr0st/ui'],
]) {
    routes.set(`/assets/${filename}`, { contentType: javaScript, file: resolveModule(specifier) });
}

const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const route = routes.get(url.pathname);

    if (!route) {
        response.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Not found');
        return;
    }

    try {
        const data = await readFile(route.file);

        response.writeHead(200, {
            'Content-Type': route.contentType,
        });
        response.end(data);
    } catch {
        response.writeHead(500, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Internal server error');
    }
});

server.listen(Number(process.env.PORT ?? 3001));
