# FrostUI Editor

**FrostUI Editor** is a free, open-source WYSIWYG editor for *JavaScript*.

It is built on top of the [FrostUI](https://github.com/elusivecodes/FrostUI) library.


## Table Of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Content, forms, and accessibility](#content-forms-and-accessibility)
- [Styling](#styling)



## Installation

**Dependencies**

- [fQuery](https://github.com/elusivecodes/fQuery)
- [FrostUI](https://github.com/elusivecodes/FrostUI)

**CSS**

```html
<link rel="stylesheet" href="/path/to/frost-ui.min.css" />
<link rel="stylesheet" href="/path/to/frost-ui-editor.min.css" />
```

**JS**

```html
<script type="text/javascript" src="/path/to/frost-ui-bundle.min.js"></script>
<script type="text/javascript" src="/path/to/frost-ui-editor.min.js"></script>
```


## Usage

Check the demo folder for examples. Full documentation and website coming soon™.

## Content, forms, and accessibility

The original textarea remains the submitted form control. Read its `value` for the current HTML. Rich editing, commands, undo/redo, and source input synchronize that value and emit `change.ui.editor` when it changes. Source input is sanitized immediately for submission; returning to rich editing normalizes its HTML and commits one history operation. Focus and blur from either editing view are forwarded to the textarea. These are the existing namespaced fQuery events; the editor does not synthesize a separate native input event for every command.

After assigning `textarea.value` in application code, call `editor.refresh()` or dispatch an `input`/`change` event on the textarea to reload the editor. `refresh()` does not emit a change event. Native form reset reloads the default value after the reset completes, clears undo/redo, and emits no editor change event. Canceling reset leaves the edited value intact. Disabled controls and disabled fieldsets prevent editing and follow native submission rules. Readonly fields remain submitted and selectable. Native required and custom validity checks use the textarea; empty editing scaffolding submits as an empty string, and invalid events focus the visible editing view.

Native labels, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-errormessage`, `aria-invalid`, `required`, `dir`, and `lang` are reflected on both editing views. Toolbar choices use native buttons. Tab leaves source mode; Ctrl+Tab inserts indentation there. Ctrl or Meta+B/I/U applies formatting, Ctrl or Meta+Z undoes, and Shift+Ctrl/Meta+Z or Ctrl/Meta+Y redoes. Dialogs and dropdowns support Escape and restore focus. The editor resize handle supports Up/Down, and the image width handle supports Left/Right.

HTML is sanitized **before initial rendering, HTML insertion, paste, external value reloads, and source rendering/submission**. The default policy preserves editor headings, inline formatting, lists, tables, presentation styles, raster image uploads, and HTTPS YouTube embeds. It removes scripts, SVG, form controls, arbitrary embeds, event attributes, IDs, unsafe URLs, and layout/resource-loading CSS. New indentation uses `margin-inline-start`; existing `margin-left` indentation still outdents correctly. Links accept HTTP(S), relative URLs, `mailto:`, and `tel:`. Images accept HTTP(S), relative URLs, and base64 PNG/JPEG/GIF/WebP/AVIF data. Video embeds accept HTTPS `www.youtube.com/embed/...` and `www.youtube-nocookie.com/embed/...`, with a sandbox and accessible title. New-window links receive `rel="noopener noreferrer"`. The video dialog accepts HTTPS YouTube watch URLs and `youtu.be` links.

Applications can supply a synchronous `sanitize(html)` option to replace the HTML policy. Its return value is trusted HTML. Custom toolbar/icon HTML, plugin renderers, direct DOM changes, and the `_insertNode` extension hook are also trusted application code. Public link/image insertion still checks URL protocols. Sanitize and validate submitted content on the server before storing or displaying it in another context. These content and serialization changes require migration review for existing stored HTML; the complete release guide remains part of the migration proposal.

## Styling

Load Frost UI 4 CSS before the editor CSS. Styles follow its light/dark tokens and support RTL, visible keyboard focus, reduced motion, and forced colors.

Sass uses modules and forwards component defaults. With Sass's Node package importer (`--pkg-importer=node`):

```scss
@use "pkg:@fr0st/ui-editor/src/scss/editor.scss" with (
    $editor-img-resize-size: 8px
);
```

Variables live in `src/scss/_vars.scss`; the package export for the old `src/scss/vars.scss` path points there. The unscoped `$btn-border-color` becomes `$btn-editor-border-color`. The button focus defaults become `$btn-editor-focus-shadow-color` and `$btn-outline-editor-focus-shadow-color`, matching Frost UI 4's `--ui-btn-focus-shadow-color` token.

Component parts expose CSS custom properties such as `--ui-editor-focus-color`, `--ui-editor-focus-width`, `--ui-editor-img-resize-size`, and `--ui-editor-link-url-max-width`. Set them on the relevant editor part in a stylesheet loaded after the editor CSS:

```css
.editor,
.editor-source {
    --ui-editor-focus-color: var(--ui-accent);
}

.editor-img-resize {
    --ui-editor-img-resize-size: 8px;
}
```
