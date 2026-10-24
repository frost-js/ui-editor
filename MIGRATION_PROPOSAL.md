# Frost UI Editor migration proposal

Bring `@fr0st/ui-editor` into line with the modern sibling `../ui-*` projects while preserving its editing features and supported customization hooks. Deliver the migration in the order below, with regression coverage established before changing editor behavior.

Steps 1–10 are implemented locally, with package metadata prepared for 3.0.0. Tagging and publication remain separate release actions. The GitHub workflows match `ui-tables`; hosted coverage uploads and npm publishing depend on Codecov access and npm trusted-publisher setup. The compatibility contract and verification results below record the compatibility baseline, resolved defects, and remaining work.

The starting point is commit `dc4c495`, which preserved the existing normalization, indentation, history, source-mode, bundle, and ESLint changes. JavaScript syntax checks passed for 23 files at that checkpoint; the later verification records below cover browser behavior and build reproducibility.

## Reference projects

| Reference | Use it for |
| --- | --- |
| `../ui-selectmenu` | Package metadata, Vite builds, shared lint configs, browser tests, forms, CI, and publishing |
| `../ui-autocomplete` | Component structure, JSDoc, Sass modules, compatibility exports, and documentation |
| `../ui-tagsinput` | Demo layout, native form integration, themes, and lifecycle behavior |
| `../ui-tables` | Tests for ESM and minified bundles; separate unit tests where appropriate |
| `../ui/src/js/base-component.js` | The current component lifecycle, resolved options, and listener management |

`../ui-editable` still uses an older build setup and should not define the migration target. Dependency versions below reflect the local reference projects, not a recommendation to install arbitrary latest versions.

## 1. Record compatibility requirements

- [x] Inventory public methods, options, defaults, events, data attributes, and fQuery plugin integration.
- [x] Record supported customization through `Editor.buttons`, `classes`, `lang`, `icons`, `plugins`, `popovers`, fonts, colors, and styles. Identify which underscore-prefixed members custom plugins actually require before changing their visibility.
- [x] Record current HTML output for formatting, lists, indentation, tables, media, source-mode round trips, and normalization. Distinguish intentional behavior from bugs before changing output.
- [x] Preserve the checkpointed changes and turn unfinished normalization work, the `debugger` statement, malformed ARIA attributes, and incomplete ESLint setup into explicit migration tasks.
- [x] Decide which compatibility changes require migration notes. Keep replacement of the `execCommand` editing engine outside this migration.

Acceptance: there is a defined public contract and a list of intentional behavior changes to verify during implementation.

## 2. Align dependencies and package metadata

- [x] Declare `@fr0st/query` and `@fr0st/ui` as peer dependencies and development dependencies so tests use the same supported dependency family as consumers.
- [x] Adopt the dependency baseline used by the modern siblings, verifying compatibility when updating the lockfile:

| Dependency | Local sibling baseline |
| --- | --- |
| Peer `@fr0st/query` | `^5.0.0` |
| Peer `@fr0st/ui` | `^4.0.0` |
| Development `@fr0st/query` / `@fr0st/ui` | `^5.0.1` / `^4.0.2` |
| `vite` | `^8.3.4` |
| `eslint` / `@fr0st/eslint-config` | `^10.13.0` / `^6.0.1` |
| `stylelint` / `@fr0st/stylelint-config` | `^17.16.0` / `^4.0.3` |
| `@playwright/test` | `^1.64.1` |
| `monocart-reporter` | `2.14.x` or a compatible sibling-selected release |
| `sass-embedded` | `^1.106.0` |
| `postcss` / `postcss-cli` | `^8.5.31` / `^11.0.1` |
| `autoprefixer` | `^10.6.1` |
| `clean-css-cli` | `^5.6.3` |
| `find-unused-sass-variables` | `^6.2.1` |

- [x] Remove direct Rollup, node-resolve, Terser, `eslint-config-google`, `stylelint-config-twbs-bootstrap`, and `sass` dependencies once their replacements are configured.
- [x] Add the sibling Node engine range (`^20.19.0 || ^22.13.0 || >=24`) after checking the selected dependencies against it.
- [x] Point `main` and `module` at `./dist/frost-ui-editor.esm.js`. Add an ESM-only root export with `import` and `default` conditions, plus `./dist/*` and supported `./src/*` exports. Do not imply CommonJS support.
- [x] Normalize the published `files` entries to `dist`, `LICENSE`, `README.md`, and `src`.
- [x] Review package description, keywords, homepage, bugs, and repository metadata. Confirm the intended repository destination before replacing the existing `elusivecodes/FrostUI-Editor` URLs with `frost-js` URLs.
- [x] Regenerate and commit `package-lock.json`; verify a clean `npm ci`.

Acceptance: runtime dependencies are explicit, the lockfile installs reproducibly, and metadata describes the intended package and repository.

## 3. Replace the build and lint pipelines

- [x] Replace `rollup.config.js` with `vite.config.js`, following `../ui-selectmenu/vite.config.js`.
- [x] Build ESM from `src/js/index.js` and UMD from `src/js/browser.js`; rename `wrapper.js` to `browser.js` when switching the entry.
- [x] Keep `@fr0st/query` and `@fr0st/ui` external. Preserve UMD globals `fQuery` and `UI`, extend the existing `UI` namespace, and export `UI.Editor`.
- [x] Generate these files and their source maps: `frost-ui-editor.esm.js`, `frost-ui-editor.esm.min.js`, `frost-ui-editor.js`, and `frost-ui-editor.min.js`.
- [x] Match the sibling build target (`baseline-widely-available`) and output-directory handling so the UMD pass preserves ESM output.
- [x] Retain the separate CSS pipeline: Sass compilation, PostCSS autoprefixing, and CleanCSS minification, with expanded/minified CSS and source maps. Build JavaScript before CSS so Vite does not clear generated styles.
- [x] Standardize scripts to `build`, `build:js`, `build:css`, `compile:css`, `autoprefix:css`, `minify:css`, `lint`, `lint:js`, `lint:css`, and `lint:sass:unused`.
- [x] Complete `eslint.config.js` using the Frost base, browser, and Node configurations. Scope Node settings to configs and server helpers; ignore generated bundles, coverage, reports, and temporary files.
- [x] Replace `.stylelintrc.json` with `stylelint.config.js` extending `@fr0st/stylelint-config`. Make lint checks non-mutating; reserve automatic fixes for explicit commands.
- [x] Update `postcss.config.js` to sibling conventions and normalize touched-file line endings so generated files do not produce spurious whitespace diagnostics.
- [x] Expand `.gitignore` for `.tmp/`, `coverage/`, `playwright-report/`, and `test-results/`, while continuing to track distributable bundles.

Acceptance: lint and build commands run successfully, every expected artifact exists, and repeated builds produce no changes to committed `dist` files.

## 4. Establish the browser test harness

- [x] Add `playwright.config.js` with Chromium, Firefox, and WebKit projects, following the sibling test configuration.
- [x] Add `test/package.json` with the private ESM package and `#test` import alias; add shared fixtures in `test/support/test.js` and setup helpers in `test/setup/browser.js`.
- [x] Serve local built bundles and installed peer assets through `test/support/server/static-server.js`. Keep tests independent of public CDNs.
- [x] Add fixture pages under `test/support/app/` for UMD, ESM, and minified bundle loading.
- [x] Replace the placeholder `test` script with build followed by browser tests. Add `test:browser`, `test:coverage`, `test:headed`, and `test:ui`, using `--forbid-only` for automated runs.
- [x] Capture regressions around the checkpointed normalization, indentation/outdent, source-mode, and history changes before refactoring them. Introduce the harness alongside the runtime work if the old component cannot initialize against the new peers.

Acceptance: the harness loads local artifacts and can exercise editor behavior in all three browsers; failures identify concrete migration gaps.

## 5. Align code and file structure with the current component model

- [x] Keep `src/js/index.js` small: import the configured component, register it with `initComponent('editor', Editor)`, and export it as default. Keep `browser.js` as the named `Editor` re-export.
- [x] Move static defaults, classes, language configuration, and implementation methods out of the registration entry and into the component or focused modules. Remove the `prototype/` and `static/` assembly pattern as their implementations move.
- [x] Retain focused modules such as `selection.js`, `normalize.js`, `nodes.js`, `plugins.js`, and `popovers.js` where they have useful responsibilities. Avoid combining the whole editor into one oversized file.
- [x] Replace inherited `_node` and `_options` access with the current `node` and `options` accessors. Store filtered fonts, effective buttons, and other derived state separately instead of mutating frozen resolved options.
- [x] Use private state for implementation details where it does not break supported extensions. Provide explicit methods for plugin operations that currently depend on private implementation details.
- [x] Audit fQuery method names/signatures, DOM traversal, drag utilities, Popper, dropdown, and modal usage against the installed dependency versions.
- [x] Use `this.listen(...)` for instance-owned listeners and retain reference-counted cleanup for shared document/window listeners. Make observer, timer, modal, popover, and asynchronous upload cleanup safe across disposal and multiple instances.
- [x] Validate the input element; make initialization failure cleanup and repeated disposal reliable. Restore original textarea visibility, attributes, and focus behavior on disposal.
- [x] Correct ARIA names (`aria-multiline`, `aria-modal`, and `aria-haspopup`) and remove the `debugger` statement. Resolve unfinished normalization code through regression tests.
- [x] Add JSDoc types for options, language, plugins, callbacks, history entries, selections, methods, and events; follow sibling `@import` conventions where applicable.

Acceptance: the editor works with current Frost dependencies, uses the current lifecycle model, and retains documented extension contracts.

## 6. Modernize styles, accessibility, and native form behavior

- [x] Rename `src/scss/vars.scss` to `_vars.scss`, replace `@import` with `@use`/`@forward`, and preserve the old package import path through an explicit export alias if needed.
- [x] Align toolbar, dropdown, modal, input, validation, button, and focus styling with Frost UI 4. Audit old utility classes, ripple markup, and CSS tokens against current UI components.
- [x] Expose component CSS custom properties backed by Sass defaults, following sibling theme conventions. Avoid unscoped Sass variable names that can collide with host styles.
- [x] Use logical layout properties where appropriate. Verify light/dark themes, RTL, narrow containers, fullscreen mode, popover positioning, and image/editor resizing.
- [x] Preserve visible keyboard focus and accessible names; propagate textarea label/help/error associations to the editing surface. Verify toolbar controls, dropdowns, dialogs, Escape handling, and focus restoration.
- [x] Support reduced motion and forced-colors behavior where the component supplies custom styling.
- [x] Keep textarea submission, source mode, programmatic changes, and editor content synchronized with a documented event contract. Test native reset, canceled reset, disabled fields/fieldsets, and existing validation behavior.
- [x] Define HTML sanitization and URL handling for initial content, source mode, insertion, and paste. Test supported formatting and media before adopting a sanitizer; document trusted customization hooks and any intentional output changes.

Acceptance: styles fit the current UI system, keyboard and form behavior are consistent, and content handling has a documented, tested contract.

## 7. Complete regression tests and source coverage

- [x] Organize behavior tests under `test/browser/`: editor lifecycle/options, editing commands, selection/history, normalization/source mode, media/tables, forms, styles, and bundles.
- [x] Cover collapsed and ranged selections, nested lists, indentation, Backspace/Delete boundaries, undo/redo, toolbar state, and native input/composition behavior.
- [x] Cover source-mode round trips, supported HTML preservation, malformed input handling, and change-event counts.
- [x] Cover links, images, upload success/failure, videos, table operations, popovers, fullscreen, resizing, and disabled behavior.
- [x] Cover multiple editors, repeated initialization, removal/disposal, pending asynchronous work, and shared listener cleanup.
- [x] Add integration assertions for native form submission/reset, accessible labeling, keyboard focus, themes, RTL, and layout boundaries.
- [x] Test expanded/minified ESM and UMD bundles, default/named exports, shared dependency instances, `UI.Editor`, and fQuery registration. Use `../ui-tables/test/browser/table-bundles.test.js` as a reference.
- [x] Add `playwright.coverage.config.js` and Monocart source-map coverage, filtering to editor sources and including unexecuted source files. Generate HTML and LCOV reports.
- [x] Adopt the sibling Codecov project target of 95% with a 5% threshold and informational patch status. Address missing behavior coverage before treating the migration as complete.
- [x] Add separate unit tests only for substantial DOM-independent helpers where they improve coverage; use the `ui-tables` unit configuration if needed.

Acceptance: all three browser projects pass, source coverage reports are useful, and the suite exercises user-visible behavior and extension contracts.

## 8. Add CI and release workflows

- [x] Add `.github/workflows/ci.yml` based on `ui-selectmenu`: Chromium on Node 20, 22, and 24; Firefox and WebKit on Node 24. Recheck engine compatibility when selecting versions.
- [x] Run `npm ci`, install the selected browser, lint, build, and test. Collect Chromium coverage once and upload LCOV to Codecov using OIDC.
- [x] Fail CI when rebuilding leaves modified or untracked files under `dist`; run `npm pack --dry-run` to validate package contents.
- [x] Add `.github/codecov.yml` with the agreed coverage policy.
- [x] Add `.github/workflows/publish.yml` for published GitHub releases, following sibling install, lint, build, Chromium test, artifact, and package checks before `npm publish --provenance`.
- [x] Inspect the repository's npm trusted-publishing and Codecov configuration and record remaining service prerequisites. Match workflow permissions and action versions to the working sibling setup.

Acceptance: pull requests receive reproducible quality checks, stale bundles fail CI, and the release workflow validates the same package that it publishes.

## 9. Consolidate and update demos

- [x] Replace duplicated `demo/light/` and `demo/dark/` pages with `demo/index.html`, `demo/assets/demo.css`, and `demo/assets/demo.js`, following the modern sibling demos.
- [x] Add a system/light/dark theme control and section navigation. Keep useful scenarios from every existing demo available in the consolidated page.
- [x] Demonstrate default editing, custom toolbars/buttons, custom height, resizing on/off, multiple instances, source mode, lists/history, links/images/videos/tables, methods, and event logging.
- [x] Add form submission/reset, disabled state, RTL, and custom upload examples. Keep custom upload examples explicit about their callback contract.
- [x] Use supported Frost UI 4 npm CDN assets and local editor bundles in public demos; remove legacy GitHub `@latest` dependency URLs. Use installed dependencies in automated fixtures.
- [x] Verify no console errors, working navigation, keyboard access, responsive layout, and correct behavior in both themes. Link the demo from the README.

Acceptance: one navigable demo demonstrates the supported API and replaces the existing scenario coverage without duplicated theme pages.

## 10. Rewrite the README and prepare the release

- [x] Follow the sibling README structure: overview/highlights, badges, installation, usage, options, data attributes, methods, lifecycle, events, fQuery API, accessibility, forms, themes/RTL, Sass customization, development, and license.
- [x] Document bundler imports, browser ESM/import maps, and UMD script order. Explain shared peer dependencies, the browser DOM requirement, and the ESM-only package entry.
- [x] Document all editor-specific options and extension points, including toolbar/plugin customization, popovers, fonts/colors, keyboard callbacks, image upload, history limits, and language overrides.
- [x] Document HTML handling, event timing, source-mode synchronization, disposal, form reset/submission, and known browser limitations.
- [x] Document setup, supported Node versions, build/lint commands, browser installation, test/coverage commands, and the requirement to commit generated `dist` files.
- [x] Add migration instructions for changed APIs, output HTML, styles, import paths, and dependency requirements. Plan for `3.0.0` if the proposed compatibility changes are retained.
- [x] Run final verification from a clean install: lint, build, the complete browser suite, coverage, package-content checks, and a consumer smoke test using the packed tarball. Confirm package exports, CSS/Sass paths, and clean generated artifacts.
- [x] Verify README examples and demo snippets against the final implementation before tagging a release.

Acceptance: the package can be installed and used from its documented examples, breaking changes are explained, and release artifacts pass the same checks locally and in CI.

## Proposed resulting structure

```text
.github/
  codecov.yml
  workflows/
    ci.yml
    publish.yml
demo/
  assets/
    demo.css
    demo.js
  index.html
dist/                         # Tracked ESM, UMD, CSS, minified files, and maps
src/
  js/
    browser.js                # Named export for UMD
    editor.js                 # Component lifecycle and callable extension methods
    commands.js               # Portable block and list indentation
    config.js                 # Defaults, classes, and language
    content.js                # Content synchronization and command helpers
    events.js                 # Managed instance listeners
    form.js                   # Native values, labels, validation, and reset
    index.js                  # Registration and default export
    helpers.js                # Shared listeners with exact cleanup
    history.js
    icons.js
    modals.js                 # Owned dialogs and input factories
    nodes.js
    normalize.js
    plugins.js
    popovers.js               # Customizable popover definitions
    positioning.js
    sanitize.js               # Supported HTML, presentation styles, and URL policy
    render/
      dropdowns.js
      editor.js
      popover.js
      toolbar.js
    selection.js
    types.js                  # JSDoc contracts
    values.js
  scss/
    _vars.scss
    editor.scss
test/
  browser/
  setup/
  support/
    app/
    server/
    test.js
  package.json
eslint.config.js
playwright.config.js
playwright.coverage.config.js
postcss.config.js
stylelint.config.js
vite.config.js
package.json
package-lock.json
README.md
```

Additional focused editor modules or a unit-test directory can be retained when justified by the implementation. The structural goal is a small registration entry, an explicit component lifecycle, and clear module responsibilities with the same build/test/demo conventions as the siblings.

## Compatibility contract

The checkpoint at `dc4c495` defines the starting API. The public contracts below remain supported; step 5 resolves the checkpoint defects and changes the internal organization as recorded below.

### Public entry points and methods

- Package consumers import the default `Editor`; UMD consumers use `UI.Editor`.
- `Editor.init(textarea, options)` reuses an existing instance. The registered fQuery method is `$(textarea).editor(options)`, with string dispatch such as `$(textarea).editor('bold')`.
- Formatting methods: `backColor(value)`, `bold()`, `fontName(value)`, `fontSize(value)`, `formatBlock(value)`, `foreColor(value)`, `italic()`, `justifyCenter()`, `justifyFull()`, `justifyLeft()`, `justifyRight()`, `removeFormat()`, `strikethrough()`, `subscript()`, `superscript()`, and `underline()`.
- Structure and insertion methods: `indent()`, `outdent()`, `insertHorizontalRule()`, `insertHTML(value)`, `insertImage(src)`, `insertLink(href, text, newWindow)`, `insertText(value)`, `insertOrderedList()`, `insertUnorderedList()`, and `unlink()`.
- State and lifecycle methods: `undo()`, `redo()`, `disable()`, `enable()`, `refresh()`, and `dispose()`. `refresh()` reloads programmatic textarea changes without emitting an editor change event.
- Source and fullscreen views are toolbar plugin actions, not public class methods. Content is read from the original textarea; there is no existing editor `getValue()` or `setValue()` method to preserve.

### Options and defaults

| Option | Current default and behavior |
| --- | --- |
| `buttons` | `null`; use `Editor.buttons`, an array of toolbar groups |
| `fonts` | `null`; use `Editor.fonts` and filter to available fonts |
| `defaultFont` | `'Arial'`; fall back to the first available configured font |
| `height` | `'auto'` |
| `resizable` | `true` |
| `historyLimit` | `1000`; cap stored history entries |
| `popovers` | Image size/float/removal actions, link display/edit/unlink, and table row/column/removal actions |
| `imageUpload(files)` | Read files as data URLs, insert fulfilled results, and return a completion promise; callback `this` is the editor, and pending default reads are aborted on disposal |
| `keyDown(event)` | Ctrl or Meta+B/I/U/Y/Z invokes formatting or history; Shift+Ctrl/Meta+Z redoes; callback `this` is the editor |
| `sanitize(html)` | Synchronous default HTML policy preserving supported editor content; a custom callback replaces that policy and returns trusted HTML |

Frost UI resolves `data-ui-*` options on the textarea, such as `data-ui-height`, `data-ui-resizable`, and `data-ui-history-limit`. The `data-ui-toggle="editor"` marker can select elements for explicit initialization through `$('[data-ui-toggle="editor"]').editor()`; data attributes alone do not initialize the editor. Generated `data-ui-action`, `data-ui-command`, and `data-ui-value` attributes route toolbar actions; generated dropdowns use the standard UI dropdown marker. Attribute options are subject to the shared parser; callbacks must be configured in JavaScript.

### Events and content synchronization

- `init.ui.editor` fires on the textarea after rendering, event setup, normalization, and disabled-state refresh.
- Focus and blur on either editing view forward `focus.ui.editor` and `blur.ui.editor` to the textarea.
- `_updateValue()` emits `change.ui.editor` when serialized content differs from the textarea. Source input immediately sanitizes and updates the textarea, emitting that event only when its submitted value changes; returning to visual mode normalizes and commits the source HTML as one history operation. Viewing source without editing preserves redo.
- Undo/redo restores serialized content and selection, including backward selections, and emits `change.ui.editor` when the textarea value changes.
- External `input`/`change` events reload a programmatically assigned textarea value; internal change events carry `skipUpdate` to avoid reloading the current selection. Applications can also call `refresh()`.
- Native reset reloads defaults after the cancelable reset event completes, clears history, and emits no editor change event. Canceled reset leaves editing state intact. Empty rich/source scaffolding submits as an empty string for native required validation.
- A change callback observes synchronized textarea content. Event counts may vary with browser editing events and mutation delivery; this stage does not promise one event per keystroke.

### Supported customization and existing internal dependencies

Keep `Editor.buttons`, `classes`, `lang`, `icons`, `plugins`, `popovers`, `colors`, `fonts`, `fontSizes`, and `styles` customizable. A toolbar plugin can provide `command`, `value`, `action`, `dropdown`, `setContent`, `setTitle`, `content`, `icon`, `title`, and `disableCheck`; callbacks execute in the editor context where currently bound. Popover definitions support actions and render callbacks, and toolbar/popover arrays control grouping.

Existing built-in plugins depend on `_editor`, `_container`, `_source`, `_sourceContainer`, `_fullScreen`, `_buttons`, `_history`, `_redoHistory`, and `_currentNode`, together with `_showEditor`, `_showSource`, `_refreshToolbar`, `_addHistory`, dropdown renderers, modal helpers, `_insertNode`, `_updateTable`, `_observe`, `_updateValue`, and `_removePopover`. These remain callable class methods and accessible operational fields for existing plugins; lifecycle bookkeeping is private. Command dispatch also uses `_execCommand`; document replacements before making these seams inaccessible.

The inherited node/options fields are implementation dependencies, not the preferred public API. In this stage, code uses the current base accessors and stores effective fonts and toolbar configuration separately so resolved options remain unchanged. Frost UI classes used by module code must be imported explicitly, rather than resolved through UMD globals.

### HTML regression expectations

The browser suite records concrete examples before the larger refactor:

- `<p>Hello world</p>` survives initialization and source-mode entry unchanged.
- A source edit to `<h2>Source title</h2><p>Source body</p>` appears in both the textarea and visual surface on return.
- `<p><span>Plain</span> <b>bold</b><b> text</b></p>` normalizes to `<p>Plain <b>bold text</b></p>`.
- Heading, list, table, link, and image markup is retained in the supported-content fixture.
- Indentation keeps selected text inside valid block wrappers and nests list items under their preceding sibling. Outdent removes one wrapper or list nesting level, preserves unselected siblings and blockquotes, and retains selection text and direction.
- Typing followed by undo/redo restores the previous/next content and a selection inside the editor.

Browser-produced formatting HTML can differ between engines. Preserve semantic formatting rather than requiring one browser's `execCommand` serialization everywhere. Normalization is separate from sanitization. Step 6 adds the HTML policy described below before initial rendering, source submission/rendering, HTML insertion, paste, and external value reloads; application extension DOM/HTML remains trusted.

### Resolved defects and remaining migration work

- The checkpoint's inherited `_node`/`_options` access and uppercase fQuery HTML helpers could not run against the selected peers. This stage updates those calls, keeps effective fonts and toolbar groups separate from resolved options, and imports modal/tooltip classes explicitly.
- The `debugger` statement and unfinished normalization branch have been removed. Normalization now splits phrasing wrappers around nested blocks while retaining both inline fragments, selection boundaries, and surrounding content.
- Initial content now seeds history even when initialization leaves the HTML unchanged, so undo restores the state before the first edit. Zero, negative, and non-finite history limits are bounded safely.
- Text-selection indentation and outdent now use DOM operations consistently across Chromium, Firefox, and WebKit. Tests cover partial and backward selections, collapsed carets, multiple paragraphs, selected siblings, and ordered/unordered list nesting.
- The malformed ARIA names have been corrected to `aria-multiline`, `aria-modal`, and `aria-haspopup`. Label/help/error propagation, visible focus, native keyboard controls, Escape restoration, and logical layout are implemented in step 6.
- Disposal restoration, failed initialization cleanup, default upload cancellation, and managed listener/resource ownership are complete. Step 6 adds native form reset/validation, keyboard consistency, sanitization, and URL handling. Step 7 completes the broader editing coverage and exceeds the proposed source coverage target.
- The ESM package entry, newer peer majors, changed Node requirements, and any later internal hook changes need release migration notes. Keep the package version unchanged until release preparation.
- Retain the existing repository URLs until the destination is confirmed. Repository transfer, npm publication, and a version release remain outside the completed local migration work. Step 8 adds CI/release workflow files without enabling external uploads or publishing.

### Verification at the steps 1 through 4 checkpoint

These results record the earlier baseline. Step 5 verification below supersedes its expected failures and coverage baseline.

- Clean `npm ci --offline` succeeds in an empty temporary directory using the updated manifest and lockfile.
- `npm run lint` succeeds with the shared Frost ESLint and Stylelint configurations.
- `npm run build` generates all four JavaScript variants, both CSS variants, and their source maps. A repeat build produced identical contents for all 12 distribution files. Sass still warns about `@import`; its module conversion belongs to step 6.
- `npm run test:browser -- --workers=3` exercises 42 cases across Chromium, Firefox, and WebKit: 36 pass and six reproduce the explicitly documented checkpoint defects. There are no unexpected failures, skipped cases, or flaky results.
- `npm run test:coverage -- --workers=3` succeeds and produces source-mapped HTML and LCOV reports. Initial line coverage is 55.79%; reaching the proposed coverage target remains step 7.
- `npm pack --dry-run` includes the 12 expected distribution files and the supported source files, with development fixtures and reports excluded.

Use `npx playwright install --with-deps` to install browser binaries on a fresh development machine. `npm test` builds before running browser tests; `test:browser` and `test:coverage` use the existing build. The six expected-failure annotations from that checkpoint have been removed after fixing their defects in step 5.

### Step 5 implementation and compatibility notes

- `index.js` only registers and exports the configured class. Defaults, classes, and language live in `config.js`; focused modules own content, commands, events, history, dialogs, positioning, and rendering. The `prototype/` and `static/` assembly directories are removed.
- Existing callable underscore methods and customization dictionaries remain available. Lifecycle state, observers, owned child components, file readers, pending image loads, and original textarea attributes are private.
- Extensions can use inherited `listen(...)` for instance listeners, `_ownComponent(component)` for child Frost UI components, `_onDispose(callback)` for synchronous cleanup, and `_debounce(callback)` for work that must not run after disposal. Use `_observe(...)` rather than accessing the old observer field.
- Shared document/window listeners are reference counted and removed by their exact callbacks. Disposing an editor preserves application listeners using the same namespace and leaves other editors operational. Pointer gestures, queued callbacks, and default image reads cannot continue mutating a disposed instance.
- Initialization validates textarea inputs and restores the textarea on failure. Disposal is repeatable, restores original visibility/attributes, restores focus when appropriate, and completes cleanup even when an extension cleanup callback throws. Commands stop safely if a focus callback disposes the owner.
- Modal factories own their listeners and dispose/remove dialogs after hiding. Fullscreen returns the editor to its original location before cleanup. Popper uses logical `start` alignment, activation dismisses obstructing tooltips, and strikethrough dispatches to the correct public method.
- JSDoc contracts for options, language, plugins, popovers, callbacks, input/modal factories, history, selection, and events live in `types.js` and are imported by source modules. Resolved options remain unchanged while effective fonts and toolbar configuration are derived separately.
- Direct imports from the removed `src/js/prototype/*` and `src/js/static/*` paths need migration. Prefer the package entry or `src/js/index.js`; callable class hooks retain their names. Normalized source edits, undo/redo change events, and predictable normalization of invalid nested blocks should be noted for the next major release.

### Step 5 verification

- Shared JavaScript and stylesheet lint checks pass.
- The complete Playwright suite passes 153 cases across Chromium, Firefox, and WebKit, with no expected-failure annotations or skipped tests.
- Coverage generation, package contents, and reproducible distribution builds are verified alongside the browser suite. Source line coverage is 76.30%; the broader coverage target remains step 7.

### Step 6 implementation and compatibility notes

- Sass uses `@use`/`@forward` and `_vars.scss`. The package's old `src/scss/vars.scss` export resolves to the partial. Configurable package imports and that alias have been verified with Sass's Node package importer. Rename `$btn-border-color` to `$btn-editor-border-color`, and the editor/outline button `focus-shadow-rgb` defaults to `focus-shadow-color` for the Frost UI 4 token. Component parts expose CSS custom properties backed by scoped Sass defaults.
- Existing `input-filled`, `form-input`, checkbox, modal, and `form-error` classes were checked against installed Frost UI 4. Input fields retain those supported classes; `text-muted` becomes `text-body-secondary`, unused `ripple-line` markup is removed, file inputs and checkbox labels receive current classes, and dialog feedback has description/error associations.
- Logical sizing, new logical indentation, responsive scrollable dropdowns, current button focus tokens, explicit focus outlines, reduced motion, and forced-colors rules cover current themes and narrow/RTL layouts. Image cursor and resize handle geometry remains physical to match pointer coordinates. Pointer and keyboard resize controls remain available.
- Textarea labels and ARIA help/error/required/readonly state reach both editing views. Dropdown choices and table cells are native named buttons; dropdown/dialog Escape restores focus, context toolbars dismiss with Escape, and source Tab permits leaving the control. Ctrl/Meta formatting and undo/redo shortcuts are supported. Source retains Ctrl+Tab indentation.
- `refresh()` and external textarea `input`/`change` events reload programmatic values. Source input updates the submitted value immediately. Native reset/canceled reset, disabled fields/fieldsets (including first-legend exceptions), readonly source viewing, native required/custom validity, and disposal of pending reset work are covered. Rich/source empty scaffolding serializes as an empty native value. Content observation excludes surface presentation attributes and cannot overwrite active source edits.
- Default HTML sanitization preserves editor formatting, lists, tables, selected presentation styles, raster data uploads, and supported HTTPS YouTube embeds. It removes scripts, SVG, controls, arbitrary embeds, event attributes, IDs, unsafe URL schemes, and resource-loading/layout CSS. Relative/HTTP(S) links and images, mailto/tel links, and PNG/JPEG/GIF/WebP/AVIF base64 images are supported. New-window links receive `noopener noreferrer`; embeds get a sandbox, referrer policy, and accessible title. Link/image/video dialogs show invalid URL feedback.
- A synchronous `sanitize(html)` option replaces the HTML policy and returns trusted HTML. Toolbar/icon HTML, plugin renderers, direct DOM changes, and `_insertNode` remain trusted customization boundaries. Public link/image insertion still checks URLs. The README documents this policy and the form/event/style contract; output filtering, empty-value serialization, logical indentation, Sass default renames, and source keyboard changes require release migration notes.

### Step 6 verification

- `npm run lint` and `npm run lint:sass:unused` pass, with no unused Sass defaults or deprecated Sass imports. Every configured default class has a rule in the installed Frost UI or editor stylesheet; the final utility rename was checked with lint and the three-browser integration suite.
- The complete browser suite passes 240 tests across Chromium, Firefox, and WebKit, with no skipped or expected-failure cases. It covers native submission/reset/canceled reset, programmatic reloads, disabled/readonly/validation states, labels and focus, dialogs/dropdowns, keyboard and pointer lifecycle, themes/RTL/mobile sizing, HTML/URL filtering, trusted sanitizer replacement, and supported formatting/media. HTML insertion after disposal remains a safe no-op.
- `npm run test:coverage -- --workers=3` passes all 80 Chromium cases with no errors. Source line coverage is 82.23% (statements 80.59%, branches 75.72%, functions 77.81%); the broader coverage target remains step 7.
- Light/dark RTL layouts and the responsive style dropdown were visually checked at a narrow viewport using local assets. Browser assertions also check forced colors, reduced motion, fullscreen, resize handles, and image overlay geometry.
- Configurable Sass module imports and the legacy package export pass in a temporary consumer using Sass's Node package importer. `npm pack --dry-run` includes 42 files, all 12 distribution artifacts, and the new source modules, excluding tests, reports, and temporary files. Repeated builds produce identical distribution files and source maps.

### Steps 7–8 implementation and compatibility notes

- Behavior tests remain under `test/browser/`, with focused suites for editing commands, source mode, media/table actions, pointer/keyboard events, source DOM utilities, forms, accessibility, lifecycle, normalization, sanitization, and bundles. DOM-dependent helpers use browser tests; no separate unit runner is needed.
- Each expanded/minified ESM and UMD bundle now performs editing, undo, source round trips, and disposal. Tests assert ESM's default export, UMD's named `UI.Editor` export, shared Frost UI/fQuery instances, instance reuse, and string method dispatch.
- Coverage still includes unexecuted editor sources. The existing published `nodes.js` helpers are exercised through their source import; coverage merges that direct module with bundle source maps. HTML and LCOV reports remain available locally. Codecov uses the sibling 95% project target, 5% threshold, and informational patch status.
- Regression tests exposed and fixed source indentation selection offsets, Backspace at an empty indented paragraph, positioning metadata leaking into table/link HTML and undo history, and asynchronous normalization stealing focus after an image dialog closes. The image overlay now exposes `--ui-editor-img-highlight-z-index` / `$editor-img-highlight-z-index` (default 1071), and its scroll container no longer traps the resize handle below context controls.
- The sanitizer retains safe legacy `font` presentation attributes (`face`, `size`, `color`) because Firefox's native font sizing can produce that markup. Tests preserve sized text through source mode before removing formatting. URL and executable-content restrictions remain in effect.
- CI and release workflows match `ui-tables`, with checks inline in YAML. CI covers Chromium on Node 20/22/24 and Firefox/WebKit on Node 24; release validation uses Chromium on Node 24. Both install from the lockfile, install the selected browser, lint, check unused Sass defaults, build, test, reject dirty/untracked `dist`, and inspect `npm pack --dry-run`. Release tags must be `v${version}` matching the package version; publishing uses the sibling `npm publish --provenance` command without custom dist-tag selection.
- Coverage is collected once on Node 24. The coverage reporter is imported only during coverage runs because its current transitive dependencies require newer Node versions; regular tests continue to run on Node 20. Package and release versions are unchanged.

### Steps 7–8 verification

- The complete browser suite passes 414 checks (138 cases across Chromium, Firefox, and WebKit) on Node 24, with no skipped or expected-failure cases. The same 138 Chromium cases also pass on Node 20.20.2 and Node 22.23.4; JavaScript lint passes on those runtimes as well.
- Source-mapped coverage passes all 138 Chromium cases with no errors: 97.76% lines, 97.25% statements, 88.91% branches, and 99.41% functions. The LCOV report includes the published source DOM helpers and unexecuted source files rather than excluding them to reach the target.
- Full repository lint, stylesheet lint, and unused Sass checks pass. `actionlint` 1.7.12 validates both workflows. Inline artifact guards were exercised in a temporary repository: clean artifacts pass, while modified and untracked distribution files fail. The release version guard accepts a matching version/tag and rejects a mismatch.
- Rebuilding produces identical contents for all 12 distribution artifacts. `npm pack --dry-run` contains 42 package files, including all 12 distribution artifacts, and excludes tests, reports, temporary directories, and CI configuration.
- Hosted workflow execution and external service integration still require pushing these changes and completing the activation prerequisites below; no hosted run or publication is claimed by the local verification.

### External service activation

At the step 8 checkpoint, read-only checks found GitHub Actions enabled for `elusivecodes/FrostUI-Editor`, with no repository variables or Actions secrets. Codecov reported `active: false`, `activated: false`, and no coverage totals. The npm registry returned 404 for `@fr0st/ui-editor`, leaving its publication/access and trusted-publisher settings unverified. These service observations have not been rechecked during local workflow alignment.

- CI uploads Node 24 Chromium coverage through `codecov/codecov-action@v7`, `use_oidc: true`, and `id-token: write`, following the [official action documentation](https://github.com/codecov/codecov-action#using-oidc). Configure Codecov access for the repository; there is no separate workflow enable variable.
- Published GitHub releases trigger validation and `npm publish --provenance`. Verify package access (and bootstrap the initial publication if needed), then configure npm's GitHub trusted publisher for owner `elusivecodes`, repository `FrostUI-Editor`, workflow `publish.yml`, and no environment restriction unless one is added to the workflow. Allow direct `npm publish` and confirm provenance support using [npm's trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/). The workflow uses Node 24 and tokenless OIDC, with no separate publishing enable variable.
- The workflow conditions and publish command now match `ui-tables`. Hosted CI, Codecov upload, and npm publishing have not been run from this local checkout. Service setup remains a release prerequisite for the confirmed repository/package destination.

### Steps 9–10 implementation and compatibility notes

- `demo/index.html` replaces the duplicated light/dark pages and the separate methods/events pages. `demo/assets/demo.css` and `demo/assets/demo.js` follow the sibling layout. The page provides section navigation, persistent system/light/dark selection, default and compact toolbars, a custom plugin, height/resizing examples, independent editors, source/history controls, links/images/video/table tools, forms/reset/disabled/readonly behavior, RTL, methods, and bounded event logging.
- Public demo dependencies use Frost UI 4 npm CDN assets with local editor bundles. Automated demo checks intercept those dependency requests with installed assets; they require no public CDN. The existing static test server serves explicit demo routes alongside the component fixtures.
- The custom upload example is a local simulation with explicit file validation, error handling, editor-owned file reading, asynchronous disposal checks, and insertion through `insertImage`. Its callback contract and the application-server alternative are documented.
- The README now covers supported imports and shared peers, options/data attributes, all public methods, lifecycle/events, fQuery dispatch, plugins/popovers, fonts/colors/styles/language, uploads, keyboard callbacks, forms, HTML policy, accessibility, themes/RTL, Sass, development, and release activation. The 2.x migration guide explains the dependency, ESM, source-path, content, form/event, source-keyboard, and Sass changes.
- Manifest and lockfile root versions are 3.0.0 in preparation for the breaking release. Repository URLs remain `elusivecodes/FrostUI-Editor`. No tag, GitHub release, repository transfer, npm publication, or external service activation is part of this local migration; those actions require the confirmed destination and service prerequisites above.


### Steps 9–10 verification

- A clean `npm ci --no-audit --no-fund` succeeds against the final manifest/lockfile on Node 24.22.0. Shared JavaScript/stylesheet lint, unused Sass checks, and the demo stylesheet check pass. All 12 tracked distribution files are rebuilt with the final demo-review fixes; repeated builds produce byte-identical output.
- The complete browser suite passes 441 checks (147 cases across Chromium, Firefox, and WebKit), with no skipped or expected-failure cases. The 12 demo checks cover navigation, persistent themes, mobile/RTL sizing, keyboard access, plugins/source mode, independent content, form submission/reset/disabled state, custom upload success/failure, lifecycle methods, and event logging. Additional regression cases cover full-body clicking/resizing, panel focus matching a real Frost UI outline input, header-cell context tools, and actual Tab/Shift+Tab input plus Escape-assisted focus navigation. Console errors and uncaught browser errors are rejected.
- Coverage passes all 147 Chromium cases with no errors: 97.77% lines, 97.27% statements, 89.14% branches, and 99.42% functions. The existing source inclusion and coverage policy remain unchanged.
- The light desktop and dark mobile demo layouts, visible table context toolbar, and final panel focus ring were visually inspected. All six npm CDN URLs used by the public demo and README import-map example return HTTP 200. Automated demo checks use installed peer assets independently of that CDN verification.
- The packed `@fr0st/ui-editor@3.0.0` tarball contains 42 files, including all 12 distribution artifacts, with demos, tests, reports, temporary files, and CI configuration excluded. Installing it and its peers into an isolated consumer succeeds with normal peer validation.
- The packed consumer builds the documented bundler imports and CSS, then exercises editing, undo, source round trips, and disposal through that build and all four expanded/minified UMD/ESM variants. Browser import maps use the documented minified peer assets. All variants pass without browser/console errors. Package-root/source/CSS/Sass exports resolve, configurable Sass compilation works, and the legacy `src/scss/vars.scss` alias compiles.
- README/demo local links resolve, and `git diff --check` passes. The local migration is complete; hosted CI, external service activation, tagging, and publication are not claimed by these checks.


### Final demo review corrections

- Context toolbars now apply/remove Frost UI 4's `show` class as well as toggling display; the shared `.popover` rule otherwise leaves them transparent. Regression checks assert computed opacity for link, image, and table controls. Header cells now receive the same context actions as data cells.
- The editor container uses a column flex layout and its editable surface grows to fill the body, including fixed-height and resized editors. Blank-area clicks now focus the editor across the editing body. The entire `.editor-panel` uses `:focus-within` to show the same focused border and translucent ring as Frost UI outline inputs, covering rich/source editing and toolbar focus. Inner editing surfaces no longer draw focus outlines. Focus CSS tokens are configured on the panel; forced colors supplies a visible outline.
- Tab / Shift+Tab indent/outdent in rich and source editing. Ctrl/Meta/Alt+Tab are left to the browser. Escape followed by Tab / Shift+Tab permits ordinary focus navigation without indentation. This final contract supersedes the Ctrl+Tab source shortcut recorded at the earlier step 6 checkpoint; the README and demo help use the final keys. Source tests send actual keyboard input instead of synthetic Ctrl+Tab events.


### GitHub workflow alignment

- All three `.github` files match `../ui-tables/.github` byte for byte: the CI workflow, publishing workflow, and Codecov policy.
- Removed editor-only enable conditions, job timeouts, matrix fail-fast override, and prerelease dist-tag selection. Sass validation is a separate step, and release tags must use the `v` prefix.
- Documentation describes the sibling workflow behavior and external service prerequisites. This local alignment does not run hosted workflows or publish a package.
