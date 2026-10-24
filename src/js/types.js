/** @import Editor from './editor.js'; */

/**
 * @typedef {object} EditorSelectionData
 * @property {number[]} anchorPath Child indexes from the editing surface to the selection anchor.
 * @property {number} anchorOffset The anchor offset.
 * @property {number[]} focusPath Child indexes from the editing surface to the selection focus.
 * @property {number} focusOffset The focus offset.
 */

/**
 * @typedef {object} EditorHistoryEntry
 * @property {string} html The serialized content.
 * @property {EditorSelectionData|null} [selectionData=null] The selection to restore.
 */

/**
 * @typedef {object} EditorSelectionMarkers
 * @property {Text} [start] The start marker.
 * @property {Text} [end] The end marker.
 * @property {boolean} [backward=false] Whether the selection runs toward the start.
 */

/**
 * @callback EditorAction
 * @this {Editor}
 * @returns {void} Nothing.
 */

/**
 * @callback EditorDropdownCallback
 * @this {Editor}
 * @param {HTMLElement} dropdown The dropdown container to populate.
 * @returns {void} Nothing.
 */

/**
 * @callback EditorContentCallback
 * @this {Editor}
 * @returns {string|number} The button HTML, title, or numeric label.
 */

/**
 * @callback EditorDisableCallback
 * @this {Editor}
 * @returns {boolean} Whether the button should be disabled.
 */

/**
 * @callback EditorUploadCallback
 * @this {Editor}
 * @param {FileList|File[]} files The files to upload and insert.
 * @returns {void|Promise<void>} Optional asynchronous completion.
 */

/**
 * @callback EditorKeyDownCallback
 * @this {Editor}
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {void} Nothing.
 */

/**
 * @typedef {object} EditorPopoverGroups
 * @property {Array<string|string[]>} [image] Image actions and groups.
 * @property {Array<string|string[]>} [link] Link actions and groups.
 * @property {Array<string|string[]>} [table] Table actions and groups.
 */

/**
 * @typedef {object} EditorOptions
 * @property {string[][]|null} [buttons=null] Toolbar groups, or the component's default toolbar.
 * @property {string[]|null} [fonts=null] Fonts to filter against the browser's available fonts.
 * @property {string} [defaultFont='Arial'] The preferred font.
 * @property {string|number} [height='auto'] The content area's CSS height.
 * @property {boolean} [resizable=true] Whether to render a resize handle.
 * @property {number} [historyLimit=1000] Maximum history snapshots, including the initial content; at least one.
 * @property {EditorPopoverGroups} [popovers] Image, link, and table action groups.
 * @property {EditorUploadCallback} [imageUpload] The image upload callback; the default reader is canceled on disposal.
 * @property {EditorKeyDownCallback|null} [keyDown] A keyboard callback, or null to disable shortcuts.
 */

/**
 * @typedef {object} EditorPlugin
 * @property {string} [command] The editor method to invoke.
 * @property {string|number} [value] The command argument.
 * @property {EditorAction} [action] The custom action.
 * @property {string[][]|EditorDropdownCallback} [dropdown] Nested toolbar groups or a dropdown renderer.
 * @property {EditorContentCallback} [setContent] The dynamic button HTML.
 * @property {EditorContentCallback} [setTitle] The dynamic title.
 * @property {EditorDisableCallback} [disableCheck] A custom disabled-state check.
 * @property {string} [content] Static button HTML.
 * @property {string} [icon] The icon lookup key.
 * @property {string} [title] The accessible button title.
 */

/**
 * @callback EditorPopoverAction
 * @this {Editor}
 * @param {HTMLElement} node The selected content element.
 * @returns {void} Nothing.
 */

/**
 * @callback EditorPopoverRenderer
 * @this {Editor}
 * @param {HTMLElement} node The selected content element.
 * @returns {HTMLElement} The rendered popover element.
 */

/**
 * @typedef {object} EditorPopover
 * @property {EditorPopoverAction} [action] The popover action.
 * @property {EditorPopoverRenderer} [render] A custom renderer.
 * @property {string} [icon] The icon lookup key.
 * @property {string} [title] The accessible title.
 * @property {string} [content] Custom button HTML.
 */

/**
 * @typedef {object} EditorLanguage
 * @property {Record<string, string>} drop Drag and drop messages.
 * @property {Record<string, string>} dropdowns Dropdown labels.
 * @property {Record<string, string>} modals Dialog labels and messages.
 * @property {Record<string, string>} plugins Toolbar action titles.
 * @property {Record<string, string>} popovers Popover action titles.
 * @property {Record<string, string>} styles Block style titles.
 */

/**
 * @typedef {object} EditorInputOptions
 * @property {string} id The control ID.
 * @property {string} label The label text.
 * @property {string} [type='text'] The input type.
 * @property {Record<string, string|number|boolean>} [attributes] Additional control attributes.
 */

/**
 * @typedef {object} EditorInputElements
 * @property {HTMLDivElement} group The control group.
 * @property {HTMLInputElement} input The input.
 * @property {HTMLDivElement} [invalidFeedback] The validation message container.
 */

/**
 * @typedef {object} EditorModalOptions
 * @property {string} [title] The dialog title.
 * @property {HTMLElement} [content] The dialog content.
 * @property {boolean} [fullScreen=false] Whether to use a fullscreen dialog.
 * @property {string} [cancelText] The cancel label.
 * @property {string} [submitText] The submit label.
 * @property {(event: Event) => boolean|void} [onSubmit] The submit handler; false keeps the dialog open.
 * @property {(event: Event) => void} [onShow] The before-show handler.
 * @property {(event: Event) => void} [onShown] The shown handler.
 * @property {(event: Event) => void} [onHide] The before-hide handler.
 * @property {(event: Event) => void} [onHidden] The hidden handler.
 */

/**
 * Emitted on the textarea after initialization completes.
 * @event Editor#init.ui.editor
 * @type {CustomEvent}
 */

/**
 * Emitted on the textarea after its content changes, including undo and redo.
 * @event Editor#change.ui.editor
 * @type {CustomEvent}
 */

/**
 * Forwarded from the editing surface to the textarea when it receives focus.
 * @event Editor#focus.ui.editor
 * @type {CustomEvent}
 */

/**
 * Forwarded from the editing surface to the textarea when it loses focus.
 * @event Editor#blur.ui.editor
 * @type {CustomEvent}
 */

export {};
