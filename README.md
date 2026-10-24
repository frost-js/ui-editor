# Frost UI Editor

[![CI](https://github.com/elusivecodes/FrostUI-Editor/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/elusivecodes/FrostUI-Editor/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-editor?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-editor)
[![license](https://img.shields.io/github/license/elusivecodes/FrostUI-Editor?style=flat-square)](./LICENSE)

A WYSIWYG editor for Frost UI, with customizable toolbars, HTML source editing, media, tables, and native textarea integration.

## Highlights

- Rich text formatting, headings, colors, fonts, lists, and indentation
- Links, raster images, YouTube embeds, tables, and context actions
- Source editing, selection-aware undo/redo, fullscreen, and resizing
- Custom buttons, dropdowns, popovers, upload callbacks, and language dictionaries
- Native form submission, reset, validation, disabled, and readonly behavior
- Accessible labels, keyboard controls, light/dark themes, and RTL
- Default HTML sanitization and configurable content policy
- Native `Editor` class and `editor` fQuery plugin, with existing-instance reuse
- ESM and UMD bundles, expanded/minified CSS, source maps, and Sass modules
- JSDoc-powered IntelliSense and Chromium, Firefox, and WebKit regression tests

Explore [the demo](./demo/index.html) for working examples. This checkout prepares **3.0.0**; registry availability and publication are separate from the local migration. See [Migrating from 2.x](#migrating-from-2x) before upgrading.

## Installation

### Browser projects / bundlers

Once 3.0.0 is published:

```sh
npm install @fr0st/ui-editor@^3 @fr0st/query@^5 @fr0st/ui@^4
```

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-editor/dist/frost-ui-editor.min.css';
import Editor from '@fr0st/ui-editor';
```

The package root is ESM-only and requires a browser DOM. It does not provide a CommonJS entry or server renderer. In SSR applications, initialize the editor on the client after its textarea mounts. `@fr0st/query` 5 and `@fr0st/ui` 4 are peer dependencies; use the same instances throughout the application. Published `dist/*` and `src/*` files are available through matching package subpaths.

To try this checkout before publication, run `npm ci`, `npm run build`, and `npm pack`, then install the resulting tarball in a browser project.

### Browser ESM / import maps

Serve the editor's built `dist/` directory at `/dist/`. Load Frost UI CSS first. fQuery imports `@fr0st/core`, so direct browser imports need all three dependency mappings. These versions match the verified development baseline:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@4.0.2/dist/frost-ui.min.css">
<link rel="stylesheet" href="/dist/frost-ui-editor.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@4.0.1/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@5.0.1/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@4.0.2/dist/frost-ui.esm.min.js"
    }
}
</script>
<label for="browser-document">Document</label>
<textarea id="browser-document" name="document"></textarea>
<script type="module">
    import Editor from '/dist/frost-ui-editor.esm.min.js';
    Editor.init(document.querySelector('#browser-document'));
</script>
```

### Browser UMD

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.min.css">
<link rel="stylesheet" href="/dist/frost-ui-editor.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui-bundle.min.js" defer></script>
<script src="/dist/frost-ui-editor.min.js" defer></script>
<script src="/app.js" defer></script>
```

In `app.js`, call `UI.Editor.init(textarea)`. Frost UI's all-in-one bundle supplies `globalThis.UI` and `globalThis.fQuery`; the editor adds `UI.Editor` to that existing namespace. Keep this script order. Use either the ESM setup or the UMD setup on a page so dependency instances are shared.

## Usage

Start with a labeled textarea. Its initial value is HTML:

```html
<label for="document">Document</label>
<textarea id="document" name="document" aria-describedby="document-help">&lt;p&gt;Start writing here.&lt;/p&gt;</textarea>
<p id="document-help">Format your document or edit its HTML source.</p>
```

```js
import Editor from '@fr0st/ui-editor';

const textarea = document.querySelector('#document');
const editor = Editor.init(textarea, {
    height: '260px',
    historyLimit: 100,
});

// The original textarea always contains the submitted HTML.
const html = textarea.value;

// Reload content assigned by application code.
textarea.value = '<h2>Updated document</h2><p>New content.</p>';
editor.refresh();
```

Initialization requires a textarea. Data attributes configure an editor but do not initialize it automatically. Explicitly initialize each textarea, or use the [fQuery API](#fquery-api).

## Options

Options resolve from `Editor.defaults`, then the textarea's `data-ui-*` attributes, then the object passed to `Editor.init()`. Resolved `editor.options` are shallow-frozen; change defaults before creating instances, or dispose and reinitialize to replace options.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `buttons` | `string[][] \| null` | `null` | Toolbar groups; `null` uses `Editor.buttons`, `[]` renders no buttons. |
| `defaultFont` | `string` | `'Arial'` | Preferred font; falls back to the first available configured font, then sans-serif. |
| `fonts` | `string[] \| null` | `null` | Font candidates; `null` uses `Editor.fonts`, filtered with `document.fonts.check()`. Does not load fonts. |
| `height` | `string \| number` | `'auto'` | Content area height, such as `'260px'`; numeric values use pixels. |
| `resizable` | `boolean` | `true` | Render the editor resize handle. |
| `historyLimit` | `number` | `1000` | Maximum snapshots including initial content; bounded to at least one. |
| `popovers` | `object` | See below | Image, link, and table action groups. |
| `imageUpload` | `function` | Editor-owned file reader | `(files) => void \| Promise<void>`, with the editor as `this`; inserts successful local raster data URLs by default. |
| `sanitize` | `function` | Built-in HTML policy | Synchronous `(html) => string`; a replacement returns trusted HTML. |
| `keyDown` | `function \| null` | Formatting/history shortcuts | Runs on rich-editor keydown with the editor as `this`; `null` disables that callback. Structural editing keys still work. |

Default toolbar:

```js
Editor.buttons = [
    ['style'],
    ['bold', 'italic', 'underline', 'removeFormat'],
    ['font'],
    ['color'],
    ['unorderedList', 'orderedList', 'paragraph'],
    ['table'],
    ['link', 'image', 'video'],
    ['fullScreen', 'source'],
];
```

Available plugin keys are `alignCenter`, `alignJustify`, `alignLeft`, `alignRight`, `bold`, `color`, `font`, `fontSize`, `fullScreen`, `hr`, `image`, `indent`, `italic`, `link`, `orderedList`, `outdent`, `paragraph`, `redo`, `removeFormat`, `source`, `strikethrough`, `style`, `subscript`, `superscript`, `table`, `underline`, `undo`, `unlink`, `unorderedList`, and `video`. The `paragraph` dropdown groups alignment and indentation actions. Add `undo` and `redo` to a custom toolbar if you want visible history buttons; shortcuts also work.

### Data attributes

Use kebab-case option names; booleans, numbers, arrays, and objects are parsed by fQuery. Pass functions in JavaScript.

```html
<textarea id="configured"
    data-ui-height="240px"
    data-ui-resizable="false"
    data-ui-history-limit="100"
    data-ui-default-font="Georgia"
    data-ui-fonts='["Georgia","Arial"]'
    data-ui-buttons='[["bold","italic"],["source"]]'></textarea>
```

Call `Editor.init(document.querySelector('#configured'))` after this element exists. `disabled`, `readonly`, `required`, `name`, `dir`, and `lang` remain native textarea attributes.

### Toolbars and plugins

Register a plugin before initialization, then reference its key in the `buttons` option:

```js
Editor.plugins.greeting = {
    content: 'Hello',
    title: 'Insert greeting',
    action() {
        this.insertText('Hello from a custom plugin! ');
    },
};

Editor.init(document.querySelector('#custom'), {
    buttons: [['bold', 'italic', 'greeting'], ['undo', 'redo', 'source']],
});
```

A plugin can supply `command` (an editor method) and `value` (its argument), or `action()`. Rendering accepts `content` (HTML), `icon` (an `Editor.icons` key), `title`, `setContent()`, and `setTitle()`. `dropdown` accepts nested button groups or a callback receiving the dropdown container. `disableCheck()` returns whether to disable the button. Callbacks run with the editor as `this`. Plugin HTML and DOM are trusted application code.

`Editor.classes` maps structural and state class names. `Editor.icons` maps icon names to HTML. Set them before initialization and supply matching CSS for class overrides.

Existing extensions can use `_insertNode(node)`, `_showEditor()`, `_showSource()`, `_refreshToolbar()`, and the focused dropdown/modal helpers. Use `listen(...)` for instance-owned event handlers, `_ownComponent(component)` for child Frost UI components, `_onDispose(callback)` for cleanup, and `_debounce(callback)` for deferred work that must stop after disposal. Use `_observe(enabled)` to control observation; lifecycle bookkeeping is private. Application code should prefer public methods and `node`/`options`. The [migration proposal](./MIGRATION_PROPOSAL.md) records retained extension seams.

### Popovers

Default groups:

```js
const popovers = {
    image: [
        ['imageFull', 'imageHalf', 'imageQuarter', 'imageOriginal'],
        ['floatLeft', 'floatRight', 'floatNone'],
        ['imageRemove'],
    ],
    link: ['link', ['linkEdit'], ['unlink']],
    table: [
        ['tableRowAfter', 'tableRowBefore', 'tableColumnBefore', 'tableColumnAfter'],
        ['tableRowRemove', 'tableColumnRemove', 'tableRemove'],
    ],
};
```

Pass partial `popovers` options to replace specific groups; an empty array disables that type's actions. Register named actions in `Editor.popovers` with `action(node)`, `render(node)` (returns an element), `content`, `icon`, or `title`. The `link` entry renders its URL; grouped entries render buttons. Action/render callbacks run with the editor as `this` and receive the selected content element.

### Fonts, colors, styles, and language

Set `Editor.fonts` (candidate font names), `Editor.fontSizes` (native size 1–7 to pixel values), `Editor.colors` (array of name-to-color objects), and `Editor.styles` (block tag names) before initialization. Default pixel sizes are `8, 13, 16, 18, 24, 32, 48`; the default block list is `p`, `blockquote`, `pre`, and `h1`–`h6`. Per-instance `fonts` and `defaultFont` override font selection. Native font availability and formatting markup vary by browser.

Language is configured through the static `Editor.lang` dictionary, rather than a per-instance `lang` option. It contains `toolbar`, `contextToolbar`, `resizeEditor`, `resizeImage`, and nested `drop`, `dropdowns`, `modals`, `plugins`, `popovers`, and `styles` labels. Override individual keys to retain the remaining translations:

```js
Editor.lang.plugins.source = 'Edit HTML';
Editor.lang.modals.cancel = 'Cancel editing';
Editor.lang.toolbar = 'Document formatting';
```

The full default dictionaries are in [config.js](./src/js/config.js). Configure language before creating editors.

### Image upload

The default callback reads files through editor-owned FileReaders, inserts successful results, and cancels pending reads on disposal. A custom callback owns its asynchronous work, failure handling, and insertion:

```js
Editor.init(document.querySelector('#upload'), {
    async imageUpload(files) {
        const controller = new AbortController();
        this._onDispose(() => controller.abort());
        try {
            const body = new FormData();
            for (const file of files) body.append('images', file);
            const response = await fetch('/api/images', {
                method: 'POST', body, signal: controller.signal,
            });
            if (!response.ok) throw new Error('Image upload failed');
            const { urls } = await response.json();
            if (!this.node) return;
            for (const url of urls) this.insertImage(url);
        } catch (error) {
            if (this.node) console.error(error);
        }
    },
});
```

This example assumes an application endpoint returning `{ urls: string[] }`; validate files and permissions there. The callback receives `FileList` or `File[]`, and runs with the editor as `this`. The editor does not consume a returned URL, await completion at the dialog/drop call site, or catch custom rejections. Keep selection changes during uploads in mind: `insertImage()` uses the editor's current/saved selection at insertion time. The [demo callback](./demo/assets/demo.js) works locally without an upload service.

### Keyboard callback

To add a shortcut while preserving the defaults, save and call the default callback:

```js
const defaultKeyDown = Editor.defaults.keyDown;
Editor.init(document.querySelector('#shortcuts'), {
    keyDown(event) {
        if (event.key === 'F2') {
            event.preventDefault();
            this.insertText('Reviewed');
            return;
        }
        defaultKeyDown.call(this, event);
    },
});
```

Calling `preventDefault()` stops subsequent structural key handling for that event.

## Methods and lifecycle

`Editor.init(textarea, options)` returns an existing instance when present; new options do not reconfigure it. `new Editor(textarea, options)` constructs an instance directly; prefer `init()` to reuse one safely. `editor.node` is the original textarea and `editor.options` exposes resolved options; both become `null` after disposal.

| Method | Behavior |
| --- | --- |
| `refresh()` | Reload the assigned textarea value, sanitize/normalize it, and update state without emitting a change event. |
| `enable()`, `disable()` | Update native disabled state and the generated controls. An ancestor disabled fieldset still takes precedence. |
| `dispose()` | Release observers, listeners, dialogs, popovers, pending owned work, and generated DOM; restore original textarea visibility/attributes. Repeated disposal is safe. |
| `insertText(text)`, `insertHTML(html)` | Insert literal text or sanitized HTML at the selection. |
| `insertImage(src)`, `insertLink(href, text, newWindow)` | Insert a protocol-checked image/link; `newWindow` defaults to false. |
| `bold()`, `italic()`, `underline()`, `strikethrough()` | Toggle inline formatting. |
| `subscript()`, `superscript()`, `removeFormat()` | Apply script formatting or remove selection formatting. |
| `backColor(color)`, `foreColor(color)` | Set highlight/text color. |
| `fontName(name)`, `fontSize(pixels)` | Set font or one of the configured pixel sizes. |
| `formatBlock(tag)` | Set a block tag, such as `'h2'` or `'p'`. |
| `justifyLeft()`, `justifyCenter()`, `justifyRight()`, `justifyFull()` | Align the selection. |
| `insertOrderedList()`, `insertUnorderedList()` | Toggle list formatting. |
| `indent()`, `outdent()` | Change block/list nesting while retaining selection. |
| `insertHorizontalRule()`, `unlink()` | Insert a rule or remove link formatting. |
| `undo()`, `redo()` | Restore content and selection through editor history. |

Formatting commands operate on the rich editing selection and are disabled for readonly/disabled fields. Source/fullscreen/video/table dialogs are toolbar plugins rather than public methods with those names. History includes the initial snapshot; new edits clear redo, and native reset clears both stacks. `refresh()` records changed content without promising a new history baseline; use native reset to restore defaults and clear history.

Disposal retains the current textarea value. To change options, dispose and call `Editor.init()` again. fQuery removal emits the component removal event and disposes it; when removing DOM through native APIs, call `dispose()` explicitly first.

## Events

Listen on the original textarea using fQuery. Register before `init()` to observe initialization:

```js
import $ from '@fr0st/query';

$.addEvent(textarea, 'init.ui.editor change.ui.editor focus.ui.editor blur.ui.editor', (event) => {
    console.log(event.type, textarea.value);
});
const editor = Editor.init(textarea);
```

| Event | Timing |
| --- | --- |
| `init.ui.editor` | Initialization completed. |
| `change.ui.editor` | Changed HTML has been synchronized to the textarea, including undo/redo and source input. |
| `focus.ui.editor`, `blur.ui.editor` | Focus enters/leaves an editing view; forwarded to the textarea. |

Mutation delivery and browser editing events can affect counts; there is no one-event-per-keystroke guarantee. The editor does not synthesize a separate native input event for every command. Initialization can synchronize changed sanitized/normalized content before `init`; an unchanged initial value does not produce a change notification. `refresh()` and native reset do not emit an editor change event. Namespaces belong to fQuery's event API; `event.type` is the base name.

## fQuery API

Importing the editor registers `editor` on the shared fQuery instance:

```js
import $ from '@fr0st/query';
import Editor from '@fr0st/ui-editor';

const editor = $('#document').editor({ height: '260px' });
$('#document').editor('insertText', 'Hello');
$('#document').editor('undo');
$('#document').editor('dispose');
```

The plugin initializes each matched element and returns the first result: an instance for initialization or the first method's return value for string dispatch. It is not chainable. String dispatch initializes an absent instance first, including when dispatching `dispose`.

## Content and native forms

The original named textarea remains the submitted form control. Rich editing, commands, undo/redo, and source input keep `textarea.value` current. Source input is sanitized immediately for submission; returning to rich mode normalizes HTML and records a history operation if it changed. Empty editing scaffolding serializes as `''` for native required validation.

After assigning `textarea.value`, call `editor.refresh()` or dispatch `input`/`change` on the textarea to reload it. Native form reset waits for its default action, restores the default value, clears history, and emits no editor change event. Canceling reset leaves editing state intact. Disabled controls/fieldsets block editing and follow native submission rules, including the first-legend exception. Readonly controls remain selectable and submitted, and allow viewing source.

Native required and custom validity checks use the textarea. Invalid events focus the visible editing view. Keep help/error text associated through `aria-describedby` and `aria-errormessage`; set application validation feedback on the textarea and its associated error elements.

### HTML and URL policy

HTML is sanitized before initial rendering, insertion, paste, external value reloads, and source rendering/submission. The default policy preserves editor headings, inline formatting, legacy font presentation, lists, tables, selected presentation styles, raster data images, and supported YouTube embeds. It removes scripts, SVG, form controls, arbitrary embeds, event attributes, IDs, unsafe URLs, and layout/resource-loading CSS. Normalization also repairs unsupported nesting and merges equivalent inline nodes. Submitted HTML can differ from the original input.

Links accept relative/HTTP(S) URLs, `mailto:`, and `tel:`. Images accept relative/HTTP(S) URLs and base64 PNG/JPEG/GIF/WebP/AVIF data. New-window links receive `rel="noopener noreferrer"`. The video dialog accepts HTTPS YouTube watch URLs and `youtu.be` links; resulting embeds use HTTPS `www.youtube.com/embed/…` or `www.youtube-nocookie.com/embed/…`, a sandbox, referrer policy, and accessible title.

A synchronous `sanitize(html)` option replaces the HTML policy and returns trusted HTML. Toolbar/icon HTML, plugin renderers, direct DOM mutations, and `_insertNode()` also cross a trusted application boundary. Public image/link insertion still validates URL protocols. Validate and sanitize submitted content on the server for its eventual display context; the browser policy is not a substitute for that boundary.

## Accessibility and keyboard controls

The complete editor panel uses the same focused border and translucent ring as Frost UI outline inputs whenever an editing view or toolbar control has focus. Textarea labels and `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-errormessage`, `aria-invalid`, `required`, `dir`, and `lang` reach both editing views. Toolbar/dropdown/table choices use named native buttons. Focus remains visible; Escape closes dialogs/dropdowns and restores invoking focus, and dismisses context controls.

| Keys | Action |
| --- | --- |
| Ctrl/Meta+B, I, U | Bold, italic, underline in rich mode. |
| Ctrl/Meta+Z | Undo. |
| Ctrl/Meta+Shift+Z or Ctrl/Meta+Y | Redo. |
| Tab / Shift+Tab in rich mode | Indent/outdent selected blocks or list items. |
| Tab / Shift+Tab in source mode | Insert a tab or indent/outdent selected HTML lines. |
| Escape, then Tab / Shift+Tab | Leave the editing field without indenting. |
| Up/Down on the editor resize handle | Change editor height. |
| Left/Right on the image width handle | Change image width. |

The editing engine still uses browser `contenteditable` and deprecated `document.execCommand()` APIs. Serialization, font handling, and native selection/editing details differ by browser; depend on semantic formatting rather than byte-identical HTML. Real operating-system IME behavior and assistive technology combinations need application testing; automated composition events do not replace those checks.

## Themes, RTL, and Sass

Load Frost UI 4 CSS before the editor stylesheet. It follows Frost UI tokens for system/light/dark themes, supports reduced motion and forced colors, and uses logical spacing. Set `data-ui-theme="light"` or `"dark"` on the document element to force a theme; remove it to use the system preference. Set `dir="rtl"` on the textarea or its writing container for right-to-left content. New indentation uses `margin-inline-start`; legacy `margin-left` still outdents correctly.

Parts expose CSS custom properties. Set them on the relevant part after loading editor CSS:

```css
.editor-panel {
    --ui-editor-focus-color: var(--ui-primary);
}
.editor-img-resize {
    --ui-editor-img-resize-size: 8px;
}
.editor-img-highlight {
    --ui-editor-img-highlight-z-index: 1071;
}
```

Sass uses modules and forwards defaults. With Sass's Node package importer (`--pkg-importer=node`):

```scss
@use "pkg:@fr0st/ui-editor/src/scss/editor.scss" with (
    $editor-img-resize-size: 8px
);
```

Defaults live in [src/scss/_vars.scss](./src/scss/_vars.scss). The package export for the legacy `src/scss/vars.scss` path resolves to that partial.

## Migrating from 2.x

This migration prepares a major release, **3.0.0**, because dependency, module, content, and keyboard contracts changed:

1. Upgrade shared peers to `@fr0st/query` 5 and `@fr0st/ui` 4. Remove duplicate/older Frost UI or fQuery bundles and load Frost UI 4 CSS before the editor CSS.
2. Switch package-root imports to the default ESM export. CommonJS `require()` is not supported. UMD consumers keep `UI.Editor` and load Frost UI's all-in-one bundle first. Browser ESM users need the import map shown above.
3. Replace direct imports from the removed `src/js/prototype/*`, `src/js/static/*`, and `wrapper.js` paths with the package entry, `src/js/index.js`, or `src/js/browser.js` as appropriate. Prefer `instance.node` and `instance.options` to inherited `_node`/`_options`; do not mutate resolved options.
4. Review stored HTML against the sanitization policy before rollout. Scripts, arbitrary embeds, SVG, form controls, IDs, unsafe attributes/URLs/styles, and unsupported structure may be removed or normalized. Provide a reviewed synchronous `sanitize` replacement only when your application requires another policy. Empty scaffolding now submits as an empty string; indentation uses logical margins. Browser-produced markup, including Firefox `font` elements, may differ.
5. Reload programmatic textarea updates with `refresh()` or native input/change events. Source input synchronizes sanitized submitted HTML immediately; undo/redo emit changes and native reset clears history silently. Observe synchronized values rather than relying on exact event counts.
6. Use Tab / Shift+Tab for indentation in rich and source modes. Press Escape, then Tab / Shift+Tab to move focus out of an editing field. Browser Ctrl+Tab shortcuts remain available. Review form validation, disabled/readonly state, and visible focus in your application.
7. Convert Sass `@import` overrides to `@use ... with (...)`. Rename `$btn-border-color` to `$btn-editor-border-color`, `$btn-editor-focus-shadow-rgb` to `$btn-editor-focus-shadow-color`, and `$btn-outline-editor-focus-shadow-rgb` to `$btn-outline-editor-focus-shadow-color`. The legacy `src/scss/vars.scss` package path remains an alias; filesystem consumers should use `_vars.scss`.
8. Use Node `^20.19.0 || ^22.13.0 || >=24` for development/builds; use Node 24 for coverage because reporter dependencies require a newer runtime. Rebuild and commit the tracked distribution files, then exercise your plugin/upload overrides and representative saved content in all supported browsers.

Existing static dictionaries and callable extension hooks are retained; observers, readers, timers, and lifecycle resources are now owned and cleaned up by the instance. The legacy editing engine is retained. See [MIGRATION_PROPOSAL.md](./MIGRATION_PROPOSAL.md) for implementation and verification records.

## Development

```sh
npm ci
npx playwright install --with-deps
npm run lint
npm run lint:sass:unused
npm run build
npm run test:browser -- --workers=3
npm run test:coverage -- --workers=3
npm pack --dry-run
```

`npm test` builds and runs all three browser projects. `test:browser` and `test:coverage` use the existing build. `npm run test:headed` opens browser windows, and `npm run test:ui` starts the Playwright UI. Coverage on Node 24 writes `coverage/index.html` and `coverage/lcov.info`. Automated tests serve installed peer assets locally; no public CDN is required.

Build commands are `build:js` (Vite ESM then UMD), `build:css`, `compile:css`, `autoprefix:css`, and `minify:css`. `lint:js` and `lint:css` are non-mutating checks. Build produces four JS variants, two CSS variants, and their maps; commit all 12 `dist/` artifacts with source changes. CI rejects stale or untracked distribution output.

To view the public demo locally, run `python3 -m http.server 8080` from the repository root and open `http://localhost:8080/demo/`. It uses npm CDN Frost UI 4 assets and the local built editor; serve over HTTP rather than opening a file URL.

### Release preparation

CI covers Chromium on Node 20/22/24 and Firefox/WebKit on Node 24, with coverage collected once. The release workflow checks that the GitHub release tag matches `package.json`, installs dependencies, lints, builds, tests Chromium, verifies tracked artifacts, and checks package contents before tokenless npm publication with provenance. Prereleases use the `next` dist tag; stable releases use `latest`.

Local release preparation does not publish a package, create a tag/release, or transfer the repository. Codecov upload and npm publication remain gated by `CODECOV_ENABLED` and `NPM_PUBLISH_ENABLED`; their activation prerequisites are in the [proposal](./MIGRATION_PROPOSAL.md#external-service-activation). Confirm the existing repository/package destination, activate Codecov, and configure npm trusted publishing before enabling those variables and publishing a release.

## License

[MIT](./LICENSE).
