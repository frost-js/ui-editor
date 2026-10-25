# Frost UI Editor

[![CI](https://github.com/frost-js/ui-editor/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-editor/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-editor/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-editor)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-editor?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-editor)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-editor?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-editor)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-editor/main/dist/frost-ui-editor.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-editor/blob/main/dist/frost-ui-editor.min.js)
[![CSS gzip size](https://img.badgesize.io/frost-js/ui-editor/main/dist/frost-ui-editor.min.css?compression=gzip&label=CSS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-editor/blob/main/dist/frost-ui-editor.min.css)
[![license](https://img.shields.io/github/license/frost-js/ui-editor?style=flat-square)](./LICENSE)

A WYSIWYG editor for Frost UI, with customizable toolbars, HTML source editing, media, tables, and native textarea integration.

## Highlights

- Rich text formatting, headings, colors, fonts, lists, and indentation
- Links, raster images, YouTube embeds, tables, and context actions
- Source editing, selection-aware undo/redo, fullscreen, and resizing
- Custom buttons, dropdowns, popovers, upload callbacks, and language dictionaries
- Native form submission, reset, validation, disabled, and readonly behavior
- Accessible labels, keyboard controls, light/dark themes, and RTL
- Native `Editor` class and `editor` fQuery plugin
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- Expanded and minified component CSS with source maps
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-editor
```

Frost UI Editor's package entry point is ESM-only and requires a browser DOM. Import the default `Editor` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-editor/dist/frost-ui-editor.min.css';
import Editor from '@fr0st/ui-editor';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-editor@latest/dist/frost-ui-editor.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Editor from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-editor@latest/dist/frost-ui-editor.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui-editor.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-editor.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-editor@latest/dist/frost-ui-editor.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-editor@latest/dist/frost-ui-editor.min.js"></script>
<script>
    const { Editor } = globalThis.UI;
</script>
```

The UMD bundle adds `Editor` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

## Usage

Start with a labeled textarea. Its initial value is HTML; the editor keeps the original textarea synchronized for form submission:

```html
<label for="document">Document</label>
<textarea
    id="document"
    name="document"
    aria-describedby="document-help">&lt;p&gt;Start writing here.&lt;/p&gt;</textarea>
<p id="document-help">Format your document or edit its HTML source.</p>
```

```js
import Editor from '@fr0st/ui-editor';

const editor = Editor.init(
    document.querySelector('#document'),
    {
        height: '260px',
        historyLimit: 100,
    },
);
```

Initialization requires a textarea. Read its `value` for the current HTML. Initialize after the element exists; in SSR applications, initialize on the client after mounting.

## Options

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `Editor.init()`

Resolved `instance.options` are shallow-frozen. Dispose and reinitialize to replace options on an existing instance.

Set application-wide defaults before initialization:

```js
Editor.defaults.height = '260px';
Editor.defaults.historyLimit = 100;
```

Changes to defaults apply to newly created instances.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `buttons` | `string[][] \| null` | `null` | Toolbar groups; `null` uses `Editor.buttons`, `[]` renders no buttons. |
| `defaultFont` | `string` | `'Arial'` | Preferred font; falls back to the first available configured font, then sans-serif. |
| `fonts` | `string[] \| null` | `null` | Font candidates; `null` uses `Editor.fonts`, filtered with `document.fonts.check()`. Does not load fonts. |
| `height` | `string \| number` | `'auto'` | Content area height, such as `'260px'`; numeric values use pixels. |
| `resizable` | `boolean` | `true` | Render the editor resize handle. |
| `historyLimit` | `number` | `1000` | Maximum snapshots including initial content; bounded to at least one. |
| `popovers` | `object` | See [Popovers](#popovers) | Image, link, and table action groups. |
| `imageUpload` | `function` | Editor-owned file reader | `(files) => void \| Promise<void>`, with the editor as `this`; inserts successful local raster data URLs by default. |
| `keyDown` | `function \| null` | Formatting/history shortcuts | Runs on rich-editor keydown with the editor as `this`; `null` disables that callback. Structural editing keys still work. |

### Image upload

The default callback reads files through editor-owned FileReaders, inserts successful results, and cancels pending reads on disposal. A custom callback owns its asynchronous work, failure handling, and insertion:

```js
Editor.init(document.querySelector('#upload'), {
    async imageUpload(files) {
        const controller = new AbortController();
        this.onDispose(() => controller.abort());
        try {
            const body = new FormData();
            for (const file of files) {
                body.append('images', file);
            }
            const response = await fetch('/api/images', {
                method: 'POST',
                body,
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error('Image upload failed');
            }
            const { urls } = await response.json();
            if (!this.node) {
                return;
            }
            for (const url of urls) {
                this.insertImage(url);
            }
        } catch (error) {
            if (this.node) {
                console.error(error);
            }
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

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. Arrays and objects use JSON. Supply callbacks through JavaScript.

| Attribute | Example |
| --- | --- |
| `data-ui-buttons` | `data-ui-buttons='[["bold","italic"],["source"]]'` |
| `data-ui-default-font` | `data-ui-default-font="Georgia"` |
| `data-ui-fonts` | `data-ui-fonts='["Georgia","Arial"]'` |
| `data-ui-height` | `data-ui-height="240px"` |
| `data-ui-history-limit` | `data-ui-history-limit="100"` |
| `data-ui-popovers` | `data-ui-popovers='{"image":[]}'` |
| `data-ui-resizable` | `data-ui-resizable="false"` |

```html
<label for="configured-document">Document</label>
<textarea
    id="configured-document"
    name="document"
    data-ui-toggle="editor"
    data-ui-height="240px"
    data-ui-resizable="false"
    data-ui-history-limit="100"
    data-ui-buttons='[["bold","italic"],["source"]]'></textarea>
```

```js
import $ from '@fr0st/query';
import '@fr0st/ui-editor';

$('[data-ui-toggle="editor"]').editor();
```

Data attributes configure options; they do not initialize Editor by themselves. Initialize through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance. `disabled`, `readonly`, `required`, `name`, `dir`, and `lang` remain native textarea attributes.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Editor.init(node, options?)` | `Editor` | Return the existing instance for an element or create one. |
| `backColor(color)` | `void` | Set the selection background color. |
| `bold()` | `void` | Toggle bold formatting. |
| `disable()` | `void` | Disable the native textarea and generated editing controls. |
| `dispose()` | `void` | Release owned resources, remove generated markup, and restore the textarea. |
| `enable()` | `void` | Enable the textarea and generated controls; an ancestor disabled fieldset still takes precedence. |
| `fontName(name)` | `void` | Set the selected font family. |
| `fontSize(pixels)` | `void` | Set one of the configured pixel sizes. |
| `foreColor(color)` | `void` | Set the selection text color. |
| `formatBlock(tag)` | `void` | Set a block tag, such as `'h2'` or `'p'`. |
| `indent()` | `void` | Indent selected blocks or list items while retaining selection. |
| `insertHorizontalRule()` | `void` | Insert a horizontal rule. |
| `insertHtml(html)` | `void` | Insert HTML at the selection. |
| `insertImage(src)` | `void` | Insert an image in rich mode, or its HTML at the source selection in source mode. |
| `insertLink(href, text, newWindow?)` | `void` | Insert a link; newWindow defaults to false. |
| `insertNode(node)` | `HTMLElement\|null` | Insert a trusted DOM element, recording history and synchronizing the textarea. |
| `insertOrderedList()` | `void` | Toggle ordered-list formatting. |
| `insertText(text)` | `void` | Insert literal text at the selection. |
| `insertUnorderedList()` | `void` | Toggle unordered-list formatting. |
| `italic()` | `void` | Toggle italic formatting. |
| `justifyCenter()` | `void` | Center the selection. |
| `justifyFull()` | `void` | Justify the selection. |
| `justifyLeft()` | `void` | Align the selection left. |
| `justifyRight()` | `void` | Align the selection right. |
| `onDispose(callback)` | `void` | Register extension cleanup; run it immediately if the editor is already disposed. |
| `outdent()` | `void` | Outdent selected blocks or list items while retaining selection. |
| `redo()` | `void` | Restore the next content and selection snapshot. |
| `refresh()` | `void` | Reload and normalize the assigned textarea value and update state without emitting a change event. |
| `removeFormat()` | `void` | Remove formatting from the selection. |
| `strikethrough()` | `void` | Toggle strikethrough formatting. |
| `subscript()` | `void` | Toggle subscript formatting. |
| `superscript()` | `void` | Toggle superscript formatting. |
| `underline()` | `void` | Toggle underline formatting. |
| `undo()` | `void` | Restore the previous content and selection snapshot. |
| `unlink()` | `void` | Remove link formatting while preserving its text. |

```js
const textarea = document.querySelector('#document');
textarea.value = '<h2>Updated document</h2><p>New content.</p>';
editor.refresh();

console.log(textarea.value);
editor.disable();
editor.enable();
editor.dispose();
```

Formatting commands operate on the rich editing selection and are disabled for readonly/disabled fields. Source, fullscreen, video, and table dialogs are toolbar plugins rather than public methods with those names.

History includes the initial snapshot; new edits clear redo. `refresh()` records changed content without clearing existing undo history. Native reset restores defaults and clears history.

## Lifecycle

Calling `Editor.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original textarea as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases owned listeners, observers, dialogs, popovers, file reads, and deferred work. It restores original textarea visibility and managed attributes while retaining its current value and unrelated application styles. Repeated disposal is safe. Use a new instance before calling other methods after disposal.

Use inherited `listen(...)` for extension listeners and `onDispose(callback)` for resources such as child components and pending requests. Cleanup callbacks run once, in reverse registration order; registering after disposal runs the callback immediately.

If initialization fails, the component releases resources it created and removes its registered instance before rethrowing the error. The textarea can then be initialized again.

Removing the original textarea through fQuery disposes the component automatically. Call `dispose()` before removing it through native DOM APIs.

## Events

Events originate on the original textarea:

| Event | Description |
| --- | --- |
| `init.ui.editor` | Initialization completed. |
| `change.ui.editor` | Changed HTML has been synchronized to the textarea, including undo/redo and source input. |
| `focus.ui.editor` | An editing view received focus. |
| `blur.ui.editor` | An editing view lost focus. |

```js
import $ from '@fr0st/query';
import Editor from '@fr0st/ui-editor';

$.addEvent(
    '#document',
    'init.ui.editor change.ui.editor focus.ui.editor blur.ui.editor',
    (event) => {
        console.log(event.type, event.currentTarget.value);
    },
);

Editor.init(document.querySelector('#document'));
```

Register before initialization to observe `init`. fQuery exposes the namespace on `event.namespace`; the underlying event type is `init`, `change`, `focus`, or `blur`.

Change callbacks observe synchronized textarea content. Mutation delivery and browser editing events can affect counts; there is no one-event-per-keystroke guarantee. The editor does not synthesize a separate native input event for every command.

Initialization can synchronize normalized content before `init`; an unchanged initial value does not produce a change notification. `refresh()` and native reset do not emit an editor change event.

## fQuery API

Importing Editor registers `editor` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-editor';

const editor = $('#document').editor({
    height: '260px',
});

$('#document').editor('insertText', 'Hello');
$('#document').editor('undo');
$('#document').editor('disable');
$('#document').editor('enable');
$('#document').editor('dispose');
```

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned; the plugin is not chainable. String dispatch initializes an absent instance first, including when dispatching `dispose`.

## Accessibility

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

List indentation adds a nested `<ul>` or `<ol>` level. When there is no preceding item to nest under, the editor creates a markerless parent `<li>`, so the first item and entire lists can be indented repeatedly. Outdent removes one level and cleans up unused markerless parents; outdenting a top-level item converts it to paragraph content. Paragraph indentation uses 2em steps, and table-cell indentation stays inside the cell. Toolbar actions, keyboard shortcuts, and the `indent()`/`outdent()` methods share the same behavior.

The editing engine still uses browser `contenteditable` and deprecated `document.execCommand()` APIs. Serialization, font handling, and native selection/editing details differ by browser; depend on semantic formatting rather than byte-identical HTML. Real operating-system IME behavior and assistive technology combinations need application testing; automated composition events do not replace those checks.

## Forms

The original named textarea remains the submitted form control. Rich editing, commands, undo/redo, and source input keep `textarea.value` current. Source input synchronizes exactly as entered; returning to rich mode normalizes HTML and records a history operation if it changed. Rich mode submits the editing surface's HTML, including empty paragraphs and media-only content.

After assigning `textarea.value`, call `editor.refresh()` or dispatch `input`/`change` on the textarea to reload it. Native form reset waits for its default action, restores the default value, clears history, and emits no editor change event. Canceling reset leaves editing state intact. Disabled controls/fieldsets block editing and follow native submission rules, including the first-legend exception. Readonly controls remain selectable and submitted, and allow viewing source.

Native required and custom validity checks use the textarea. Invalid events focus the visible editing view. Keep help/error text associated through `aria-describedby` and `aria-errormessage`; set application validation feedback on the textarea and its associated error elements.

```html
<form id="document-form">
    <label for="form-document">Document</label>
    <textarea
        id="form-document"
        name="document"
        required>&lt;p&gt;Original document&lt;/p&gt;</textarea>
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
</form>
```

```js
import Editor from '@fr0st/ui-editor';

Editor.init(document.querySelector('#form-document'));
```

### HTML handling

Editor loads and inserts HTML directly. Normalization repairs unsupported nesting and merges equivalent inline nodes. Source edits synchronize with the submitted textarea; returning to rich mode applies normalization. The video dialog converts YouTube watch URLs and `youtu.be` links into embeds.

## Customization

The public static `defaults`, `classes`, `icons`, `lang`, `buttons`, `plugins`, `popovers`, `fonts`, `fontSizes`, `colors`, and `styles` objects can be customized before initialization. Class overrides require matching CSS; icons and plugin HTML are trusted application content.

### Toolbars and plugins

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

### Popovers

Tables with merged cells (`colspan` or `rowspan`) disable row and column actions and show an explanation. Cell text editing and removing the whole table remain available.

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
Editor.lang.dropdowns.tableSize = 'Table: {rows} rows, {columns} columns';
```

The full default dictionaries are in [editor.js](./src/js/editor.js). Configure language before creating editors.

### CSS custom properties

Parts expose runtime CSS custom properties backed by the [Sass defaults](./src/scss/_vars.scss). Set properties on the relevant part in a stylesheet loaded after the editor CSS:

| Part | Properties |
| --- | --- |
| `.editor-panel` | `--ui-editor-focus-color`, `--ui-editor-focus-width` |
| `.editor-disabled` | `--ui-editor-disabled-opacity` |
| `.editor-color` | `--ui-editor-color-height` |
| `.editor-link-url` | `--ui-editor-link-url-max-width` |
| `.editor-drop-target` | `--ui-editor-drop-target-bg` |
| `.editor-img-cursor` | `--ui-editor-img-cursor-size` |
| `.editor-img-highlight` | `--ui-editor-img-highlight-z-index`, `--ui-editor-img-highlight-bg`, `--ui-editor-img-highlight-border-width`, `--ui-editor-img-highlight-border-color` |
| `.editor-img-size` | `--ui-editor-img-size-color`, `--ui-editor-img-size-bg` |
| `.editor-img-resize` | `--ui-editor-img-resize-z-index`, `--ui-editor-img-resize-size`, `--ui-editor-img-resize-bg` |

```css
.article-editor .editor-panel {
    --ui-editor-focus-color: var(--ui-info);
}

.article-editor .editor-img-resize {
    --ui-editor-img-resize-size: 8px;
}
```

Toolbar buttons also expose Frost UI's `--ui-btn-*` properties through the `$btn-editor-*` and `$btn-outline-editor-*` Sass defaults.

### Custom Sass builds

Install Sass and create an application stylesheet to customize the component:

```bash
npm i -D sass
```

`src/styles.scss`

```scss
@use "@fr0st/ui-editor/src/scss/editor" with (
    $editor-img-resize-size: 8px,
    $editor-focus-color: var(--ui-info)
);
```

Compile the entry point with npm package resolution enabled:

```bash
npx sass --load-path=node_modules src/styles.scss dist/styles.css
```

The `editor` module forwards the [component variables](./src/scss/_vars.scss), all of which have `!default` values. Include Frost UI CSS separately. Build tools that already resolve Sass modules from npm packages do not need the explicit load path.

The legacy `src/scss/vars.scss` package export resolves to `_vars.scss`.

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

Load Frost UI 4 CSS before the editor stylesheet. Editor uses its color, focus, reduced-motion, and forced-colors tokens. The focus ring surrounds the complete panel while an editing view or toolbar control has focus.

```html
<section data-ui-theme="dark" dir="rtl">
    <label for="rtl-document">Document</label>
    <textarea
        id="rtl-document"
        name="document"
        dir="rtl">&lt;p&gt;مرحبا&lt;/p&gt;</textarea>
</section>
```

Normal document and ancestor direction is respected. A `dir` attribute on the textarea is copied to the editing views. Logical spacing and indentation follow the writing direction; left/right alignment commands retain their physical meaning. New indentation uses `margin-inline-start`, and legacy `margin-left` indentation still outdents correctly.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI Editor is released under the [MIT License](./LICENSE).
