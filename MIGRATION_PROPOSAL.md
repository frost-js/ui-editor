# Frost UI Editor migration proposal

Bring `@fr0st/ui-editor` into line with the modern sibling `../ui-*` projects while preserving its editing features and supported customization hooks. Deliver the migration in the order below, with regression coverage established before changing editor behavior.

The starting point is commit `dc4c495`, which preserves the existing normalization, indentation, history, source-mode, bundle, and ESLint changes. JavaScript syntax checks passed for 23 files at that checkpoint; browser behavior and build reproducibility still need verification.

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

- [ ] Inventory public methods, options, defaults, events, data attributes, and fQuery plugin integration.
- [ ] Record supported customization through `Editor.buttons`, `classes`, `lang`, `icons`, `plugins`, `popovers`, fonts, colors, and styles. Identify which underscore-prefixed members custom plugins actually require before changing their visibility.
- [ ] Record current HTML output for formatting, lists, indentation, tables, media, source-mode round trips, and normalization. Distinguish intentional behavior from bugs before changing output.
- [ ] Preserve the checkpointed changes and turn unfinished normalization work, the `debugger` statement, malformed ARIA attributes, and incomplete ESLint setup into explicit migration tasks.
- [ ] Decide which compatibility changes require migration notes. Keep replacement of the `execCommand` editing engine outside this migration.

Acceptance: there is a defined public contract and a list of intentional behavior changes to verify during implementation.

## 2. Align dependencies and package metadata

- [ ] Declare `@fr0st/query` and `@fr0st/ui` as peer dependencies and development dependencies so tests use the same supported dependency family as consumers.
- [ ] Adopt the dependency baseline used by the modern siblings, verifying compatibility when updating the lockfile:

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

- [ ] Remove direct Rollup, node-resolve, Terser, `eslint-config-google`, `stylelint-config-twbs-bootstrap`, and `sass` dependencies once their replacements are configured.
- [ ] Add the sibling Node engine range (`^20.19.0 || ^22.13.0 || >=24`) after checking the selected dependencies against it.
- [ ] Point `main` and `module` at `./dist/frost-ui-editor.esm.js`. Add an ESM-only root export with `import` and `default` conditions, plus `./dist/*` and supported `./src/*` exports. Do not imply CommonJS support.
- [ ] Normalize the published `files` entries to `dist`, `LICENSE`, `README.md`, and `src`.
- [ ] Review package description, keywords, homepage, bugs, and repository metadata. Confirm the intended repository destination before replacing the existing `elusivecodes/FrostUI-Editor` URLs with `frost-js` URLs.
- [ ] Regenerate and commit `package-lock.json`; verify a clean `npm ci`.

Acceptance: runtime dependencies are explicit, the lockfile installs reproducibly, and metadata describes the intended package and repository.

## 3. Replace the build and lint pipelines

- [ ] Replace `rollup.config.js` with `vite.config.js`, following `../ui-selectmenu/vite.config.js`.
- [ ] Build ESM from `src/js/index.js` and UMD from `src/js/browser.js`; rename `wrapper.js` to `browser.js` when switching the entry.
- [ ] Keep `@fr0st/query` and `@fr0st/ui` external. Preserve UMD globals `fQuery` and `UI`, extend the existing `UI` namespace, and export `UI.Editor`.
- [ ] Generate these files and their source maps: `frost-ui-editor.esm.js`, `frost-ui-editor.esm.min.js`, `frost-ui-editor.js`, and `frost-ui-editor.min.js`.
- [ ] Match the sibling build target (`baseline-widely-available`) and output-directory handling so the UMD pass preserves ESM output.
- [ ] Retain the separate CSS pipeline: Sass compilation, PostCSS autoprefixing, and CleanCSS minification, with expanded/minified CSS and source maps. Build JavaScript before CSS so Vite does not clear generated styles.
- [ ] Standardize scripts to `build`, `build:js`, `build:css`, `compile:css`, `autoprefix:css`, `minify:css`, `lint`, `lint:js`, `lint:css`, and `lint:sass:unused`.
- [ ] Complete `eslint.config.js` using the Frost base, browser, and Node configurations. Scope Node settings to configs and server helpers; ignore generated bundles, coverage, reports, and temporary files.
- [ ] Replace `.stylelintrc.json` with `stylelint.config.js` extending `@fr0st/stylelint-config`. Make lint checks non-mutating; reserve automatic fixes for explicit commands.
- [ ] Update `postcss.config.js` to sibling conventions and normalize touched-file line endings so generated files do not produce spurious whitespace diagnostics.
- [ ] Expand `.gitignore` for `.tmp/`, `coverage/`, `playwright-report/`, and `test-results/`, while continuing to track distributable bundles.

Acceptance: lint and build commands run successfully, every expected artifact exists, and repeated builds produce no changes to committed `dist` files.

## 4. Establish the browser test harness

- [ ] Add `playwright.config.js` with Chromium, Firefox, and WebKit projects, following the sibling test configuration.
- [ ] Add `test/package.json` with the private ESM package and `#test` import alias; add shared fixtures in `test/support/test.js` and setup helpers in `test/setup/browser.js`.
- [ ] Serve local built bundles and installed peer assets through `test/support/server/static-server.js`. Keep tests independent of public CDNs.
- [ ] Add fixture pages under `test/support/app/` for UMD, ESM, and minified bundle loading.
- [ ] Replace the placeholder `test` script with build followed by browser tests. Add `test:browser`, `test:coverage`, `test:headed`, and `test:ui`, using `--forbid-only` for automated runs.
- [ ] Capture regressions around the checkpointed normalization, indentation/outdent, source-mode, and history changes before refactoring them. Introduce the harness alongside the runtime work if the old component cannot initialize against the new peers.

Acceptance: the harness loads local artifacts and can exercise editor behavior in all three browsers; failures identify concrete migration gaps.

## 5. Align code and file structure with the current component model

- [ ] Keep `src/js/index.js` small: import the configured component, register it with `initComponent('editor', Editor)`, and export it as default. Keep `browser.js` as the named `Editor` re-export.
- [ ] Move static defaults, classes, language configuration, and implementation methods out of the registration entry and into the component or focused modules. Remove the `prototype/` and `static/` assembly pattern as their implementations move.
- [ ] Retain focused modules such as `selection.js`, `normalize.js`, `nodes.js`, `plugins.js`, and `popovers.js` where they have useful responsibilities. Avoid combining the whole editor into one oversized file.
- [ ] Replace inherited `_node` and `_options` access with the current `node` and `options` accessors. Store filtered fonts, effective buttons, and other derived state separately instead of mutating frozen resolved options.
- [ ] Use private state for implementation details where it does not break supported extensions. Provide explicit methods for plugin operations that currently depend on private implementation details.
- [ ] Audit fQuery method names/signatures, DOM traversal, drag utilities, Popper, dropdown, and modal usage against the installed dependency versions.
- [ ] Use `this.listen(...)` for instance-owned listeners and retain reference-counted cleanup for shared document/window listeners. Make observer, timer, modal, popover, and asynchronous upload cleanup safe across disposal and multiple instances.
- [ ] Validate the input element; make initialization failure cleanup and repeated disposal reliable. Restore original textarea visibility, attributes, and focus behavior on disposal.
- [ ] Correct ARIA names (`aria-multiline`, `aria-modal`, and `aria-haspopup`) and remove the `debugger` statement. Resolve unfinished normalization code through regression tests.
- [ ] Add JSDoc types for options, language, plugins, callbacks, history entries, selections, methods, and events; follow sibling `@import` conventions where applicable.

Acceptance: the editor works with current Frost dependencies, uses the current lifecycle model, and retains documented extension contracts.

## 6. Modernize styles, accessibility, and native form behavior

- [ ] Rename `src/scss/vars.scss` to `_vars.scss`, replace `@import` with `@use`/`@forward`, and preserve the old package import path through an explicit export alias if needed.
- [ ] Align toolbar, dropdown, modal, input, validation, button, and focus styling with Frost UI 4. Audit old utility classes, ripple markup, and CSS tokens against current UI components.
- [ ] Expose component CSS custom properties backed by Sass defaults, following sibling theme conventions. Avoid unscoped Sass variable names that can collide with host styles.
- [ ] Use logical layout properties where appropriate. Verify light/dark themes, RTL, narrow containers, fullscreen mode, popover positioning, and image/editor resizing.
- [ ] Preserve visible keyboard focus and accessible names; propagate textarea label/help/error associations to the editing surface. Verify toolbar controls, dropdowns, dialogs, Escape handling, and focus restoration.
- [ ] Support reduced motion and forced-colors behavior where the component supplies custom styling.
- [ ] Keep textarea submission, source mode, programmatic changes, and editor content synchronized with a documented event contract. Test native reset, canceled reset, disabled fields/fieldsets, and existing validation behavior.
- [ ] Define HTML sanitization and URL handling for initial content, source mode, insertion, and paste. Test supported formatting and media before adopting a sanitizer; document trusted customization hooks and any intentional output changes.

Acceptance: styles fit the current UI system, keyboard and form behavior are consistent, and content handling has a documented, tested contract.

## 7. Complete regression tests and source coverage

- [ ] Organize behavior tests under `test/browser/`: editor lifecycle/options, editing commands, selection/history, normalization/source mode, media/tables, forms, styles, and bundles.
- [ ] Cover collapsed and ranged selections, nested lists, indentation, Backspace/Delete boundaries, undo/redo, toolbar state, and native input/composition behavior.
- [ ] Cover source-mode round trips, supported HTML preservation, malformed input handling, and change-event counts.
- [ ] Cover links, images, upload success/failure, videos, table operations, popovers, fullscreen, resizing, and disabled behavior.
- [ ] Cover multiple editors, repeated initialization, removal/disposal, pending asynchronous work, and shared listener cleanup.
- [ ] Add integration assertions for native form submission/reset, accessible labeling, keyboard focus, themes, RTL, and layout boundaries.
- [ ] Test expanded/minified ESM and UMD bundles, default/named exports, shared dependency instances, `UI.Editor`, and fQuery registration. Use `../ui-tables/test/browser/table-bundles.test.js` as a reference.
- [ ] Add `playwright.coverage.config.js` and Monocart source-map coverage, filtering to editor sources and including unexecuted source files. Generate HTML and LCOV reports.
- [ ] Adopt the sibling Codecov project target of 95% with a 5% threshold and informational patch status. Address missing behavior coverage before treating the migration as complete.
- [ ] Add separate unit tests only for substantial DOM-independent helpers where they improve coverage; use the `ui-tables` unit configuration if needed.

Acceptance: all three browser projects pass, source coverage reports are useful, and the suite exercises user-visible behavior and extension contracts.

## 8. Add CI and release workflows

- [ ] Add `.github/workflows/ci.yml` based on `ui-selectmenu`: Chromium on Node 20, 22, and 24; Firefox and WebKit on Node 24. Recheck engine compatibility when selecting versions.
- [ ] Run `npm ci`, install the selected browser, lint, build, and test. Collect Chromium coverage once and upload LCOV to Codecov using OIDC.
- [ ] Fail CI when rebuilding leaves modified or untracked files under `dist`; run `npm pack --dry-run` to validate package contents.
- [ ] Add `.github/codecov.yml` with the agreed coverage policy.
- [ ] Add `.github/workflows/publish.yml` for published GitHub releases, following sibling install, lint, build, Chromium test, artifact, and package checks before `npm publish --provenance`.
- [ ] Verify the repository's npm trusted-publishing and Codecov configuration before enabling external uploads or publishing. Match workflow permissions and action versions to the working sibling setup.

Acceptance: pull requests receive reproducible quality checks, stale bundles fail CI, and the release workflow validates the same package that it publishes.

## 9. Consolidate and update demos

- [ ] Replace duplicated `demo/light/` and `demo/dark/` pages with `demo/index.html`, `demo/assets/demo.css`, and `demo/assets/demo.js`, following the modern sibling demos.
- [ ] Add a system/light/dark theme control and section navigation. Keep useful scenarios from every existing demo available in the consolidated page.
- [ ] Demonstrate default editing, custom toolbars/buttons, custom height, resizing on/off, multiple instances, source mode, lists/history, links/images/videos/tables, methods, and event logging.
- [ ] Add form submission/reset, disabled state, RTL, and custom upload examples. Keep custom upload examples explicit about their callback contract.
- [ ] Use supported Frost UI 4 npm CDN assets and local editor bundles in public demos; remove legacy GitHub `@latest` dependency URLs. Use installed dependencies in automated fixtures.
- [ ] Verify no console errors, working navigation, keyboard access, responsive layout, and correct behavior in both themes. Link the demo from the README.

Acceptance: one navigable demo demonstrates the supported API and replaces the existing scenario coverage without duplicated theme pages.

## 10. Rewrite the README and prepare the release

- [ ] Follow the sibling README structure: overview/highlights, badges, installation, usage, options, data attributes, methods, lifecycle, events, fQuery API, accessibility, forms, themes/RTL, Sass customization, development, and license.
- [ ] Document bundler imports, browser ESM/import maps, and UMD script order. Explain shared peer dependencies, the browser DOM requirement, and the ESM-only package entry.
- [ ] Document all editor-specific options and extension points, including toolbar/plugin customization, popovers, fonts/colors, keyboard callbacks, image upload, history limits, and language overrides.
- [ ] Document HTML handling, event timing, source-mode synchronization, disposal, form reset/submission, and known browser limitations.
- [ ] Document setup, supported Node versions, build/lint commands, browser installation, test/coverage commands, and the requirement to commit generated `dist` files.
- [ ] Add migration instructions for changed APIs, output HTML, styles, import paths, and dependency requirements. Plan for `3.0.0` if the proposed compatibility changes are retained.
- [ ] Run final verification from a clean install: lint, build, the complete browser suite, coverage, package-content checks, and a consumer smoke test using the packed tarball. Confirm package exports, CSS/Sass paths, and clean generated artifacts.
- [ ] Verify README examples and demo snippets against the final implementation before tagging a release.

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
    editor.js                 # Component, defaults, and lifecycle
    index.js                  # Registration and default export
    helpers.js
    icons.js
    nodes.js
    normalize.js
    plugins.js
    popovers.js
    selection.js
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
