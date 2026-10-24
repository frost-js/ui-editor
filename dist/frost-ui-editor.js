(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require("@fr0st/ui"), require("@fr0st/query")) :
  typeof define === 'function' && define.amd ? define(['exports', "@fr0st/ui", "@fr0st/query"], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
// \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

_fr0st_query = __toESM(_fr0st_query, 1);

// src/js/normalize.js
	var transparent = "rgba(0, 0, 0, 0)";
	var phrasingSelector = [
		"a",
		"abbr",
		"area",
		"audio",
		"b",
		"bdi",
		"bdo",
		"br",
		"button",
		"cite",
		"code",
		"data",
		"datalist",
		"del",
		"dfn",
		"em",
		"embed",
		"i",
		"iframe",
		"img",
		"input",
		"ins",
		"kbd",
		"label",
		"map",
		"mark",
		"math",
		"meter",
		"noscript",
		"object",
		"output",
		"picture",
		"progress",
		"q",
		"ruby",
		"s",
		"samp",
		"script",
		"select",
		"slot",
		"small",
		"span",
		"strong",
		"sub",
		"sup",
		"svg",
		"template",
		"textarea",
		"time",
		"u",
		"var",
		"video",
		"wbr"
	].join(", ");
	/**
	* Determines whether a node is phrasing content.
	* https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
	* @param {Node} node The input node.
	* @returns {boolean} TRUE if the node is phrasing content, otherwise FALSE.
	*/
	var isPhrasingContent = (node) => _fr0st_query.default._isText(node) || _fr0st_query.default.is(node, phrasingSelector);
	/**
	* Determine if a node is a form element.
	* https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
	* @param {Node} node The input node.
	* @returns {boolean} TRUE if the node is a form element, otherwise FALSE.
	*/
	var isFormElement = (node) => _fr0st_query.default.is(node, "button, fieldset, input, object, output, select, textarea");
	/**
	* Determine if a node is a void element.
	* https://developer.mozilla.org/en-US/docs/Glossary/Void_element
	* @param {Node} node The input node.
	* @returns {boolean} TRUE if the node is a void element, otherwise FALSE.
	*/
	var isVoidElement = (node) => _fr0st_query.default.is(node, "area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr");
	/**
	* Determine if a node is a phrasing container.
	* @param {Node} node The input node.
	* @returns {boolean} TRUE if the node is a phrasing container, otherwise FALSE.
	*/
	var isPhrasingContainer = (node) => !_fr0st_query.default._isText(node) && isPhrasingContent(node) && !isVoidElement(node) && !isFormElement(node);
	/**
	* Join adjacent inline elements.
	* @param {HTMLElement} container The container.
	* @param {object} markers The selection markers.
	*/
	function joinAdjacentNodes(container, markers) {
		const isMarker = (node) => node === markers.start || node === markers.end;
		for (const element of [...container.querySelectorAll("*")]) {
			if (!container.contains(element) || !isPhrasingContainer(element)) continue;
			while (true) {
				const between = [];
				let next = element.nextSibling;
				while (next && isMarker(next)) {
					between.push(next);
					next = next.nextSibling;
				}
				if (!next || !isPhrasingContainer(next) || !_fr0st_query.default.isEqual(element, next, { shallow: true })) break;
				element.append(...between, ...next.childNodes);
				next.remove();
			}
		}
	}
	/**
	* Normalizes phrasing containers.
	* @param {HTMLElement} container The container.
	*/
	function normalizePhrasing(container) {
		const elements = [...container.querySelectorAll("*")].reverse();
		for (const element of elements) {
			if (!container.contains(element) || !element.matches("p, h1, h2, h3, h4, h5, h6, pre") && !isPhrasingContainer(element) || [...element.childNodes].every(isPhrasingContent)) continue;
			const fragment = document.createDocumentFragment();
			let group = [];
			let first = true;
			const flush = () => {
				if (!group.length) return;
				if (group.every((node) => node.nodeType === Node.TEXT_NODE && !node.textContent)) fragment.append(...group);
				else {
					const wrapper = element.cloneNode(false);
					if (!first) wrapper.removeAttribute("id");
					first = false;
					wrapper.append(...group);
					fragment.append(wrapper);
				}
				group = [];
			};
			for (const child of [...element.childNodes]) if (isPhrasingContent(child)) group.push(child);
			else {
				flush();
				fragment.append(child);
			}
			flush();
			element.replaceWith(fragment);
		}
	}
	/**
	* Normalizes span elements.
	* @param {HTMLElement} container The container.
	*/
	function normalizeSpans(container) {
		const elements = _fr0st_query.default.find("span", container);
		for (const element of elements) {
			if ([..._fr0st_query.default.getProperty(element, "attributes")].length) continue;
			const contents = _fr0st_query.default.contents(element);
			if (contents.length) _fr0st_query.default.after(element, contents);
			_fr0st_query.default.detach(element);
		}
	}
	/**
	* Normalizes style attributes.
	* @param {HTMLElement} container The container.
	*/
	function normalizeStyles(container) {
		const elements = _fr0st_query.default.find("[style]", container);
		for (const element of elements) {
			const styles = _fr0st_query.default.getStyle(element);
			for (const [style, value] of Object.entries(styles)) {
				if (value === "inherit") {
					_fr0st_query.default.removeStyle(element, style);
					continue;
				}
				const clone = _fr0st_query.default.clone(element, { deep: false });
				_fr0st_query.default.after(element, clone);
				_fr0st_query.default.removeAttribute(clone, "style");
				let testValue = _fr0st_query.default.css(clone, style);
				_fr0st_query.default.detach(clone);
				if (style === "background-color" && testValue === transparent) testValue = [container, ..._fr0st_query.default.parents(element, null, container)].map((parent) => _fr0st_query.default.css(parent, style)).filter((parentStyle) => parentStyle !== transparent).pop();
				if (_fr0st_query.default.css(element, style) === testValue) _fr0st_query.default.removeStyle(element, style);
			}
			if (_fr0st_query.default.getAttribute(element, "style") === "") _fr0st_query.default.removeAttribute(element, "style");
		}
	}

// src/js/commands.js
/**
	* Tests whether a range includes content inside a block rather than just its boundary.
	* @param {Range} range The selected range.
	* @param {HTMLElement} block The block to test.
	* @returns {boolean} Whether the block contains selected content.
	*/
	function intersects(range, block) {
		if (range.collapsed) return block === range.startContainer || block.contains(range.startContainer);
		const start = range.cloneRange();
		const end = range.cloneRange();
		start.collapse(true);
		end.collapse(false);
		const blockStart = document.createRange();
		blockStart.selectNodeContents(block);
		const blockEnd = blockStart.cloneRange();
		blockStart.collapse(true);
		blockEnd.collapse(false);
		if (start.compareBoundaryPoints(Range.START_TO_START, blockEnd) >= 0 || end.compareBoundaryPoints(Range.START_TO_START, blockStart) <= 0) return false;
		const overlap = range.cloneRange();
		if (start.compareBoundaryPoints(Range.START_TO_START, blockStart) < 0) overlap.setStart(block, 0);
		if (end.compareBoundaryPoints(Range.START_TO_START, blockEnd) > 0) overlap.setEnd(block, block.childNodes.length);
		return Boolean(overlap.toString() || [...block.querySelectorAll("br, img, hr, iframe, video, audio, svg, input")].some((node) => overlap.intersectsNode(node)) || !block.childNodes.length);
	}
	/**
	* Gets the block units affected by a selection.
	* @param {HTMLElement} root The editing boundary.
	* @param {Range} range The selected range.
	* @returns {HTMLElement[]} The selected blocks or sibling list items.
	*/
	function getSelectedBlocks(root, range) {
		const item = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement).closest("li");
		if (item && root.contains(item)) return [...item.parentElement.children].filter((node) => node.matches("li") && intersects(range, node));
		const blocks = [];
		const visit = (parent) => {
			for (const child of [...parent.children]) {
				if (!range.intersectsNode(child)) continue;
				if (child.matches("p, h1, h2, h3, h4, h5, h6, pre, li") || child.matches("div, blockquote, td, th") && [...child.childNodes].every(isPhrasingContent)) {
					if (intersects(range, child)) blocks.push(child);
				} else visit(child);
			}
		};
		visit(root);
		return blocks;
	}
	/**
	* Removes empty structural containers while preserving any remaining inline children.
	* @param {HTMLElement} node The container.
	*/
	function removeEmpty(node) {
		if (!node.children.length && !node.textContent.trim()) node.replaceWith(...node.childNodes);
	}
	/**
	* Indents sibling blocks or list items.
	* @param {HTMLElement[]} blocks The consecutive selected blocks.
	*/
	function indentBlocks(blocks) {
		const first = blocks[0];
		const parent = first.parentElement;
		if (first.matches("li")) {
			const previous = first.previousElementSibling;
			if (!previous?.matches("li")) return;
			let list = previous.lastElementChild;
			if (!list || list.tagName !== parent.tagName) {
				list = document.createElement(parent.localName);
				previous.append(list);
			}
			list.append(...blocks);
			return;
		}
		const wrapper = document.createElement("div");
		wrapper.style.marginInlineStart = "2em";
		first.before(wrapper);
		wrapper.append(...blocks);
	}
	/**
	* Moves list items out of one nesting level, retaining following items as children.
	* @param {HTMLElement[]} blocks The consecutive selected list items.
	*/
	function outdentItems(blocks) {
		const list = blocks[0].parentElement;
		const parentItem = list.parentElement;
		const following = list.cloneNode(false);
		following.removeAttribute("id");
		while (blocks.at(-1).nextSibling) following.append(blocks.at(-1).nextSibling);
		if (parentItem.matches("li")) {
			if (following.children.length) blocks.at(-1).append(following);
			parentItem.after(...blocks);
		} else {
			const content = document.createDocumentFragment();
			for (const item of blocks) {
				const paragraph = document.createElement("p");
				while (item.firstChild && isPhrasingContent(item.firstChild)) paragraph.append(item.firstChild);
				if (paragraph.childNodes.length) content.append(paragraph);
				content.append(...item.childNodes);
				item.remove();
			}
			if (following.children.length) content.append(following);
			list.after(content);
		}
		removeEmpty(list);
	}
	/**
	* Outdents a selection from a margin wrapper without modifying surrounding blocks.
	* @param {HTMLElement[]} blocks The selected blocks.
	* @param {HTMLElement} root The editing boundary.
	*/
	function outdentBlocks(blocks, root) {
		if (blocks[0].matches("li")) {
			outdentItems(blocks);
			return;
		}
		const wrappers = /* @__PURE__ */ new Set();
		for (const block of blocks) {
			let wrapper = block;
			while (wrapper && wrapper !== root && !(parseFloat(wrapper.style.marginInlineStart || wrapper.style.marginLeft) > 0)) wrapper = wrapper.parentElement;
			if (wrapper && wrapper !== root) wrappers.add(wrapper);
		}
		for (const wrapper of wrappers) {
			const selected = [...wrapper.childNodes].filter((node) => blocks.some((block) => block === node || node.contains(block)));
			if (blocks.includes(wrapper)) wrapper.replaceWith(...wrapper.childNodes);
			else if (selected.length) {
				const following = wrapper.cloneNode(false);
				following.removeAttribute("id");
				while (selected.at(-1).nextSibling) following.append(selected.at(-1).nextSibling);
				wrapper.after(...selected, following);
				removeEmpty(wrapper);
				removeEmpty(following);
			}
		}
	}

// src/js/config.js
/** @import { EditorLanguage } from './types.js'; */
	var classes = {
		btn: "btn btn-editor btn-sm fs-6 lh-1",
		btnGroup: "btn-group me-1 mb-1",
		btnIcon: "pe-none",
		checkbox: "input-check",
		checkboxLabel: "form-check-label",
		checkboxContainer: "form-check",
		color: "editor-color flex-grow-1 d-block border-0",
		colorBtnContent: "fw-bold d-inline-block px-1 pe-none",
		colorContainerRow: "row g-0",
		colorContainerColumn: "col-6",
		colorDefaultBtn: "btn btn-outline-editor btn-sm d-block w-100 py-0",
		colorLabel: "d-block text-center",
		colorLabelContainer: "p-2",
		colorRow: "d-flex flex-row px-2",
		container: "editor-panel card",
		dropdown: "editor-dropdown dropdown-menu",
		dropdownButtons: "pt-2 pe-1 pb-1 ps-2 text-nowrap",
		dropdownGroup: "btn-group",
		dropdownItem: "dropdown-item",
		dropdownItemDisabled: "disabled",
		dropdownToggle: "dropdown-toggle",
		dropHover: "text-primary",
		dropTarget: "editor-drop-target position-absolute w-100 text-center rounded",
		dropText: "position-absolute top-50 start-50 translate-middle h5 pe-none",
		editor: "editor w-100 p-2",
		editorBody: "card-body d-flex p-0",
		editorContainer: "editor-container position-relative",
		editorDisabled: "editor-disabled",
		editorScroll: "editor-scroll d-block w-100 overflow-auto",
		formError: "form-error",
		formGroup: "mb-2",
		imgCursor: "editor-img-cursor position-absolute pe-none",
		imgHighlight: "editor-img-highlight position-absolute pe-none",
		imgResize: "editor-img-resize position-absolute pe-auto",
		imgSize: "editor-img-size position-absolute bottom-0 end-0 text-end me-2 mb-2 py-1 px-3 rounded",
		input: "input-filled",
		inputContainer: "form-input",
		invalidFeedback: "invalid-feedback",
		linkUrl: "editor-link-url d-inline-block text-truncate me-1",
		modal: "modal",
		modalBody: "modal-body",
		modalBtnClose: "btn-close",
		modalBtnPrimary: "btn btn-primary ripple mb-0",
		modalBtnSecondary: "btn btn-secondary ripple mb-0",
		modalContent: "modal-content shadow",
		modalDialog: "modal-dialog",
		modalFooter: "modal-footer",
		modalFullscreen: "modal-fullscreen",
		modalHeader: "modal-header",
		modalTitle: "modal-title",
		popover: "editor-popover popover",
		popoverArrow: "popover-arrow",
		popoverBody: "popover-body mb-n1 ms-n2 me-n3",
		popoverShow: "show",
		resizeBar: "editor-resize card-footer",
		source: "editor-source font-monospace border-0 p-2 mb-0 w-100",
		sourceContainer: "d-flex h-100",
		sourceLines: "font-monospace bg-body-secondary p-2 mb-0 border-end",
		sourceOuter: "w-100 overflow-hidden",
		sourceScroll: "d-flex w-100",
		styleContent: "mb-1",
		table: "table table-bordered",
		tableCell: "flex-column",
		tableDropdown: "p-2",
		tableHover: "bg-primary",
		tableInfo: "text-body-secondary",
		tableLink: "editor-table-link d-block border p-2 rounded-0",
		tableRow: "d-flex flex-row",
		toolbar: "card-header pt-1 pe-0 pb-0 ps-1",
		toolbarButtons: "btn-toolbar"
	};
	/** @type {EditorLanguage} */
	var lang = {
		resizeEditor: "Resize editor",
		resizeImage: "Image width",
		toolbar: "Formatting",
		contextToolbar: "Context formatting",
		drop: {
			drop: "Drop image or text",
			dropHere: "Drop image or text here"
		},
		dropdowns: {
			colorBackground: "Background Color",
			colorDefault: "Use Default",
			colorForeground: "Foreground Color",
			colorTransparent: "Use Transparent"
		},
		modals: {
			cancel: "Cancel",
			close: "Close",
			imageFile: "Select Files",
			imageUrl: "Image URL",
			insertImage: "Insert Image",
			insertLink: "Insert Link",
			insertVideo: "Insert Video",
			linkNewWindow: "Open in new window",
			linkText: "Link Text",
			linkUrl: "Link URL",
			videoUrl: "Video URL",
			videoUrlInvalid: "Invalid video URL."
		},
		plugins: {
			alignCenter: "Align Center",
			alignJustify: "Justify Full",
			alignLeft: "Align Left",
			alignRight: "Align Right",
			bold: "Bold",
			color: "Font Color",
			font: "Font Family",
			fontSize: "Font Size",
			fullScreen: "Full Screen",
			hr: "Horizontal Rule",
			image: "Image",
			indent: "Indent",
			italic: "Italic",
			link: "Link",
			orderedList: "Ordered List",
			outdent: "Outdent",
			paragraph: "Paragraph",
			redo: "Redo",
			removeFormat: "Remove Formatting",
			source: "View Source",
			strikethrough: "Strikethrough",
			style: "Style",
			subscript: "Subscript",
			superscript: "Superscript",
			table: "Table",
			underline: "Underline",
			undo: "Undo",
			unlink: "Unlink",
			unorderedList: "Unordered List",
			video: "Video"
		},
		popovers: {
			imageFull: "Full Size",
			imageHalf: "Half Size",
			imageOriginal: "Original Size",
			imageQuarter: "Quarter Size",
			imageRemove: "Remove Image",
			floatLeft: "Float Left",
			floatNone: "Remove Float",
			floatRight: "Float Right",
			linkEdit: "Edit Link",
			tableColumnAfter: "Add Column After",
			tableColumnBefore: "Add Column Before",
			tableColumnRemove: "Remove Column",
			tableRemove: "Remove Table",
			tableRowAfter: "Add Row After",
			tableRowBefore: "Add Row Before",
			tableRowRemove: "Remove Row",
			unlink: "Remove Link"
		},
		styles: {
			p: "Paragraph",
			blockquote: "Quote",
			pre: "Code",
			h1: "Header 1",
			h2: "Header 2",
			h3: "Header 3",
			h4: "Header 4",
			h5: "Header 5",
			h6: "Header 6"
		}
	};

// src/js/form.js
/**
	* Emits the existing change contract without reloading our own content.
	* @param {HTMLTextAreaElement} node The native textarea.
	*/
	function notifyChange(node) {
		_fr0st_query.default.triggerEvent(node, "change.ui.editor", { data: { skipUpdate: true } });
	}
	/**
	* Serializes empty editing scaffolding as an empty native value.
	* @param {HTMLElement|DocumentFragment} surface The surface.
	* @param {string} [html] Its serialized HTML.
	* @returns {string} The submitted HTML.
	*/
	function serialize(surface, html = surface.innerHTML) {
		return !surface.textContent.trim() && !surface.querySelector("img, iframe, hr, table") ? "" : html;
	}

// src/js/history.js
/** @import { EditorSelectionData } from './types.js'; */
	/**
	* Gets a descendant by its child indexes, returning null for stale paths.
	* @param {number[]} path The child indexes.
	* @param {HTMLElement} container The editing boundary.
	* @returns {Node|null} The descendant.
	*/
	function getNodeFromPath(path, container) {
		let node = container;
		for (const index of path) node = node?.childNodes[index];
		return node || null;
	}
	/**
	* Gets child indexes from the editing boundary to a descendant.
	* @param {Node} node The descendant.
	* @param {HTMLElement} container The editing boundary.
	* @returns {number[]} The child indexes.
	*/
	function getPathToNode(node, container) {
		const path = [];
		while (node !== container) {
			path.unshift([...node.parentNode.childNodes].indexOf(node));
			node = node.parentNode;
		}
		return path;
	}
	/**
	* Captures a selection owned by this editor, including backward ranges.
	* @param {HTMLElement} container The editing boundary.
	* @returns {EditorSelectionData|null} The saved selection.
	*/
	function getSelectionData(container) {
		const { anchorNode, anchorOffset, focusNode, focusOffset } = window.getSelection();
		if (!anchorNode || !focusNode || !container.contains(anchorNode) || !container.contains(focusNode)) return null;
		return {
			anchorPath: getPathToNode(anchorNode, container),
			anchorOffset,
			focusPath: getPathToNode(focusNode, container),
			focusOffset
		};
	}
	/**
	* Restores a saved selection within the current editing boundary.
	* @param {HTMLElement} container The editing boundary.
	* @param {EditorSelectionData|null} selectionData The saved selection.
	*/
	function restoreSelectionData(container, selectionData) {
		const selection = window.getSelection();
		const anchor = selectionData && getNodeFromPath(selectionData.anchorPath, container);
		const focus = selectionData && getNodeFromPath(selectionData.focusPath, container);
		const length = (node) => node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
		if (anchor && focus) selection.setBaseAndExtent(anchor, Math.min(selectionData.anchorOffset, length(anchor)), focus, Math.min(selectionData.focusOffset, length(focus)));
		else {
			selection.selectAllChildren(container);
			selection.collapseToEnd();
		}
	}

// src/js/icons.js
	var icons_default = {
		alignCenter: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 3h18v2H3V3m4 4h10v2H7V7m-4 4h18v2H3v-2m4 4h10v2H7v-2m-4 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		alignJustify: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 3h18v2H3V3m0 4h18v2H3V7m0 4h18v2H3v-2m0 4h18v2H3v-2m0 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		alignLeft: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 3h18v2H3V3m0 4h12v2H3V7m0 4h18v2H3v-2m0 4h12v2H3v-2m0 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		alignRight: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 3h18v2H3V3m6 4h12v2H9V7m-6 4h18v2H3v-2m6 4h12v2H9v-2m-6 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		bold: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M13.5 15.5H10v-3h3.5A1.5 1.5 0 0 1 15 14a1.5 1.5 0 0 1-1.5 1.5m-3.5-9h3A1.5 1.5 0 0 1 14.5 8A1.5 1.5 0 0 1 13 9.5h-3m5.6 1.29c.97-.68 1.65-1.79 1.65-2.79c0-2.26-1.75-4-4-4H7v14h7.04c2.1 0 3.71-1.7 3.71-3.79c0-1.52-.86-2.82-2.15-3.42z\" fill=\"currentColor\"/></svg>",
		floatLeft: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 7h6v6H3V7m0-4h18v2H3V3m18 4v2H11V7h10m0 4v2H11v-2h10M3 15h14v2H3v-2m0 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		floatNone: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 7h6v6H3V7m0-4h18v2H3V3m18 8v2H11v-2h10M3 15h14v2H3v-2m0 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		floatRight: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M15 7h6v6h-6V7M3 3h18v2H3V3m10 4v2H3V7h10m-4 4v2H3v-2h6m-6 4h14v2H3v-2m0 4h18v2H3v-2z\" fill=\"currentColor\"/></svg>",
		fullScreen: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M9.5 13.09l1.41 1.41l-4.5 4.5H10v2H3v-7h2v3.59l4.5-4.5m1.41-3.59L9.5 10.91L5 6.41V10H3V3h7v2H6.41l4.5 4.5m3.59 3.59l4.5 4.5V14h2v7h-7v-2h3.59l-4.5-4.5l1.41-1.41M13.09 9.5l4.5-4.5H14V3h7v7h-2V6.41l-4.5 4.5l-1.41-1.41z\" fill=\"currentColor\"/></svg>",
		hr: "<span class=\"d-block\" style=\"width: 12px; border-bottom: 2px solid currentColor;\"></span>",
		image: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M8.5 13.5l2.5 3l3.5-4.5l4.5 6H5m16 1V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z\" fill=\"currentColor\"/></svg>",
		imageOriginal: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M12 8c-3.56 0-5.35 4.31-2.83 6.83C11.69 17.35 16 15.56 16 12c0-2.21-1.79-4-4-4m-7 7H3v4c0 1.1.9 2 2 2h4v-2H5M5 5h4V3H5c-1.1 0-2 .9-2 2v4h2m14-6h-4v2h4v4h2V5c0-1.1-.9-2-2-2m0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2\" fill=\"currentColor\"/></svg>",
		imageRemove: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M5 3c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h9.09c-.06-.33-.09-.66-.09-1c0-.68.12-1.36.35-2H5l3.5-4.5l2.5 3l3.5-4.5l2.23 2.97c.97-.63 2.11-.97 3.27-.97c.34 0 .67.03 1 .09V5a2 2 0 0 0-2-2H5m11.47 14.88L18.59 20l-2.12 2.12l1.41 1.42L20 21.41l2.12 2.13l1.42-1.42L21.41 20l2.13-2.12l-1.42-1.42L20 18.59l-2.12-2.12l-1.42 1.41z\" fill=\"currentColor\"/></svg>",
		indent: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M11 17h10v-2H11M3 8v8l4-4m-4 9h18v-2H3v2z\" fill=\"currentColor\"/></svg>",
		italic: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z\" fill=\"currentColor\"/></svg>",
		link: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0-5 5a5 5 0 0 0 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1M8 13h8v-2H8v2m9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1c0 1.71-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 5-5a5 5 0 0 0-5-5z\" fill=\"currentColor\"/></svg>",
		linkEdit: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M5 3c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7H5V5h7V3H5m12.78 1a.69.69 0 0 0-.48.2l-1.22 1.21l2.5 2.5L19.8 6.7c.26-.26.26-.7 0-.95L18.25 4.2c-.13-.13-.3-.2-.47-.2m-2.41 2.12L8 13.5V16h2.5l7.37-7.38l-2.5-2.5z\" fill=\"currentColor\"/></svg>",
		orderedList: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M7 13v-2h14v2H7m0 6v-2h14v2H7M7 7V5h14v2H7M3 8V5H2V4h2v4H3m-1 9v-1h3v4H2v-1h2v-.5H3v-1h1V17H2m2.25-7a.75.75 0 0 1 .75.75c0 .2-.08.39-.21.52L3.12 13H5v1H2v-.92L4 11H2v-1h2.25z\" fill=\"currentColor\"/></svg>",
		outdent: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M3 21h18v-2H3m0-7l4 4V8m4 9h10v-2H11v2z\" fill=\"currentColor\"/></svg>",
		paragraph: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M10 11a4 4 0 0 1-4-4a4 4 0 0 1 4-4h8v2h-2v16h-2V5h-2v16h-2V11z\" fill=\"currentColor\"/></svg>",
		redo: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16a8.002 8.002 0 0 1 7.6-5.5c1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z\" fill=\"currentColor\"/></svg>",
		removeFormat: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M6 5v.18L8.82 8h2.4l-.72 1.68l2.1 2.1L14.21 8H20V5H6M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21L18 19.73L3.55 5.27L3.27 5z\" fill=\"currentColor\"/></svg>",
		source: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M14.6 16.6l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6l-1.4-1.4m-5.2 0L4.8 12l4.6-4.6L8 6l-6 6l6 6l1.4-1.4z\" fill=\"currentColor\"/></svg>",
		strikethrough: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M3 14h18v-2H3m2-8v3h5v3h4V7h5V4m-9 15h4v-3h-4v3z\" fill=\"currentColor\"/></svg>",
		style: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M18.5 4l1.16 4.35l-.96.26c-.45-.87-.91-1.74-1.44-2.18C16.73 6 16.11 6 15.5 6H13v10.5c0 .5 0 1 .33 1.25c.34.25 1 .25 1.67.25v1H9v-1c.67 0 1.33 0 1.67-.25c.33-.25.33-.75.33-1.25V6H8.5c-.61 0-1.23 0-1.76.43c-.53.44-.99 1.31-1.44 2.18l-.96-.26L5.5 4h13z\" fill=\"currentColor\"/></svg>",
		superscript: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6L16 7.41M21.85 9h-4.88V8l.89-.82c.76-.64 1.32-1.18 1.7-1.63c.37-.44.56-.85.57-1.23a.884.884 0 0 0-.27-.7c-.18-.19-.47-.28-.86-.29c-.31.01-.58.07-.84.17l-.66.39l-.45-1.17c.27-.22.59-.39.98-.53S18.85 2 19.32 2c.78 0 1.38.2 1.78.61c.4.39.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.48-.76.93-1.27 1.36l-.64.52v.02h2.58V9z\" fill=\"currentColor\"/></svg>",
		table: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 4v4h6V8H5m8 0v4h6V8h-6m-8 6v4h6v-4H5m8 0v4h6v-4h-6z\" fill=\"currentColor\"/></svg>",
		tableColumnAfter: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M11 2a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H2V2h9m-7 8v4h7v-4H4m0 6v4h7v-4H4M4 4v4h7V4H4m11 7h3V8h2v3h3v2h-3v3h-2v-3h-3v-2z\" fill=\"currentColor\"/></svg>",
		tableColumnBefore: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M13 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9V2h-9m7 8v4h-7v-4h7m0 6v4h-7v-4h7m0-12v4h-7V4h7M9 11H6V8H4v3H1v2h3v3h2v-3h3v-2z\" fill=\"currentColor\"/></svg>",
		tableColumnRemove: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M4 2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 8v4h7v-4H4m0 6v4h7v-4H4M4 4v4h7V4H4m13.59 8L15 9.41L16.41 8L19 10.59L21.59 8L23 9.41L20.41 12L23 14.59L21.59 16L19 13.41L16.41 16L15 14.59L17.59 12z\" fill=\"currentColor\"/></svg>",
		tableRemove: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M15.46 15.88l1.42-1.42L19 16.59l2.12-2.13l1.42 1.42L20.41 18l2.13 2.12l-1.42 1.42L19 19.41l-2.12 2.13l-1.42-1.42L17.59 18l-2.13-2.12M4 3h14a2 2 0 0 1 2 2v7.08a6.01 6.01 0 0 0-4.32.92H12v4h1.08c-.11.68-.11 1.35 0 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m0 4v4h6V7H4m8 0v4h6V7h-6m-8 6v4h6v-4H4z\" fill=\"currentColor\"/></svg>",
		tableRowAfter: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M22 10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3h2v2h4V3h2v2h4V3h2v2h4V3h2v7M4 10h4V7H4v3m6 0h4V7h-4v3m10 0V7h-4v3h4m-9 4h2v3h3v2h-3v3h-2v-3H8v-2h3v-3z\" fill=\"currentColor\"/></svg>",
		tableRowBefore: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M22 14a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7h2v-2h4v2h2v-2h4v2h2v-2h4v2h2v-7M4 14h4v3H4v-3m6 0h4v3h-4v-3m10 0v3h-4v-3h4m-9-4h2V7h3V5h-3V2h-2v3H8v2h3v3z\" fill=\"currentColor\"/></svg>",
		tableRowRemove: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M9.41 13L12 15.59L14.59 13L16 14.41L13.41 17L16 19.59L14.59 21L12 18.41L9.41 21L8 19.59L10.59 17L8 14.41L9.41 13M22 9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3M4 9h4V6H4v3m6 0h4V6h-4v3m6 0h4V6h-4v3z\" fill=\"currentColor\"/></svg>",
		underline: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M5 21h14v-2H5v2m7-4a6 6 0 0 0 6-6V3h-2.5v8a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 11V3H6v8a6 6 0 0 0 6 6z\" fill=\"currentColor\"/></svg>",
		undo: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z\" fill=\"currentColor\"/></svg>",
		unlink: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1c0 1.43-.98 2.63-2.31 3l1.46 1.44C20.88 15.61 22 13.95 22 12a5 5 0 0 0-5-5m-1 4h-2.19l2 2H16v-2M2 4.27l3.11 3.11A4.991 4.991 0 0 0 2 12a5 5 0 0 0 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1c0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4L20 19.74L3.27 3L2 4.27z\" fill=\"currentColor\"/></svg>",
		unorderedList: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M7 5h14v2H7V5m0 8v-2h14v2H7M4 4.5A1.5 1.5 0 0 1 5.5 6A1.5 1.5 0 0 1 4 7.5A1.5 1.5 0 0 1 2.5 6A1.5 1.5 0 0 1 4 4.5m0 6A1.5 1.5 0 0 1 5.5 12A1.5 1.5 0 0 1 4 13.5A1.5 1.5 0 0 1 2.5 12A1.5 1.5 0 0 1 4 10.5M7 19v-2h14v2H7m-3-2.5A1.5 1.5 0 0 1 5.5 18A1.5 1.5 0 0 1 4 19.5A1.5 1.5 0 0 1 2.5 18A1.5 1.5 0 0 1 4 16.5z\" fill=\"currentColor\"/></svg>",
		video: "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" focusable=\"false\" width=\"1em\" height=\"1em\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z\" fill=\"currentColor\"/></svg>"
	};

// src/js/modals.js
/** @import Editor from './editor.js'; */
	/** @import { EditorInputOptions, EditorInputElements, EditorModalOptions } from './types.js'; */
	/**
	* Creates a form checkbox.
	* @param {typeof Editor} Component The component class.
	* @param {EditorInputOptions} options Options for the checkbox.
	* @returns {EditorInputElements} The form elements.
	*/
	function createCheckbox(Component, options) {
		const group = _fr0st_query.default.create("div", { class: Component.classes.formGroup });
		const inputContainer = _fr0st_query.default.create("div", { class: Component.classes.checkboxContainer });
		const input = _fr0st_query.default.create("input", {
			class: Component.classes.checkbox,
			attributes: {
				id: options.id,
				type: "checkbox",
				...options.attributes
			}
		});
		const label = _fr0st_query.default.create("label", {
			text: options.label,
			class: Component.classes.checkboxLabel,
			attributes: { for: options.id }
		});
		_fr0st_query.default.append(inputContainer, input);
		_fr0st_query.default.append(inputContainer, label);
		_fr0st_query.default.append(group, inputContainer);
		return {
			group,
			input
		};
	}
	/**
	* Creates a form file input.
	* @param {typeof Editor} Component The component class.
	* @param {EditorInputOptions} options Options for the file input.
	* @returns {EditorInputElements} The form elements.
	*/
	function createFileInput(Component, options) {
		const group = _fr0st_query.default.create("div", { class: Component.classes.formGroup });
		const label = _fr0st_query.default.create("label", {
			text: options.label,
			attributes: { for: options.id }
		});
		const inputContainer = _fr0st_query.default.create("div", { class: Component.classes.inputContainer });
		const input = _fr0st_query.default.create("input", {
			class: Component.classes.input,
			attributes: {
				id: options.id,
				type: "file",
				...options.attributes
			}
		});
		_fr0st_query.default.append(group, label);
		_fr0st_query.default.append(inputContainer, input);
		_fr0st_query.default.append(group, inputContainer);
		return {
			group,
			input
		};
	}
	/**
	* Creates a form text input.
	* @param {typeof Editor} Component The component class.
	* @param {EditorInputOptions} options Options for the text input.
	* @returns {EditorInputElements} The form elements.
	*/
	function createInput(Component, options) {
		const group = _fr0st_query.default.create("div", { class: Component.classes.formGroup });
		const label = _fr0st_query.default.create("label", {
			text: options.label,
			attributes: { for: options.id }
		});
		const inputContainer = _fr0st_query.default.create("div", { class: Component.classes.inputContainer });
		const input = _fr0st_query.default.create("input", {
			class: Component.classes.input,
			attributes: {
				id: options.id,
				type: options.type || "text",
				...options.attributes
			}
		});
		const invalidFeedback = _fr0st_query.default.create("div", { class: Component.classes.invalidFeedback });
		_fr0st_query.default.append(group, label);
		_fr0st_query.default.append(inputContainer, input);
		_fr0st_query.default.append(group, inputContainer);
		invalidFeedback.id = `${options.id}-error`;
		input.setAttribute("aria-describedby", invalidFeedback.id);
		_fr0st_query.default.append(group, invalidFeedback);
		return {
			group,
			input,
			invalidFeedback
		};
	}
	/**
	* Creates a modal.
	* @param {typeof Editor} Component The component class.
	* @param {EditorModalOptions} options Options for the modal.
	* @returns {HTMLElement} The modal element.
	*/
	function createModal(Component, options) {
		const returnFocus = options.returnFocus || document.activeElement;
		const modal = _fr0st_query.default.create("div", {
			class: Component.classes.modal,
			attributes: {
				"tabindex": -1,
				"role": "dialog",
				"aria-modal": true,
				"aria-label": options.title || Component.lang.plugins.fullScreen
			}
		});
		const modalDialog = _fr0st_query.default.create("div", { class: Component.classes.modalDialog });
		_fr0st_query.default.append(modal, modalDialog);
		if (options.fullScreen) _fr0st_query.default.addClass(modalDialog, Component.classes.modalFullscreen);
		const modalContent = _fr0st_query.default.create("form", { class: Component.classes.modalContent });
		_fr0st_query.default.append(modalDialog, modalContent);
		const modalHeader = _fr0st_query.default.create("div", { class: Component.classes.modalHeader });
		_fr0st_query.default.append(modalContent, modalHeader);
		if (options.title) {
			const modalTitle = _fr0st_query.default.create("h6", {
				class: Component.classes.modalTitle,
				text: options.title
			});
			modalTitle.id = (0, _fr0st_ui.generateId)("editor-dialog");
			modal.setAttribute("aria-labelledby", modalTitle.id);
			_fr0st_query.default.append(modalHeader, modalTitle);
		}
		const closeBtn = _fr0st_query.default.create("button", {
			class: Component.classes.modalBtnClose,
			dataset: { uiDismiss: "modal" },
			attributes: {
				"type": "button",
				"aria-label": Component.lang.modals.close
			}
		});
		_fr0st_query.default.append(modalHeader, closeBtn);
		if (options.content) {
			const modalBody = _fr0st_query.default.create("div", { class: Component.classes.modalBody });
			_fr0st_query.default.append(modalBody, options.content);
			_fr0st_query.default.append(modalContent, modalBody);
		}
		if (options.onSubmit) {
			const modalFooter = _fr0st_query.default.create("div", { class: Component.classes.modalFooter });
			_fr0st_query.default.append(modalContent, modalFooter);
			const cancelButton = _fr0st_query.default.create("button", {
				text: options.cancelText,
				class: Component.classes.modalBtnSecondary,
				dataset: { uiDismiss: "modal" },
				attributes: { type: "button" }
			});
			_fr0st_query.default.append(modalFooter, cancelButton);
			const submitButton = _fr0st_query.default.create("button", {
				text: options.submitText,
				class: Component.classes.modalBtnPrimary,
				attributes: { type: "submit" }
			});
			_fr0st_query.default.append(modalFooter, submitButton);
		}
		_fr0st_query.default.append(document.body, modal);
		const controller = _fr0st_ui.Modal.init(modal);
		if (options.onSubmit) controller.listen(modalContent, "submit", (e) => {
			e.preventDefault();
			if (options.onSubmit(e) === false) return;
			controller.hide();
		});
		if ("onShow" in options) controller.listen(modal, "show.ui.modal", (e) => {
			options.onShow(e);
		});
		if ("onShown" in options) controller.listen(modal, "shown.ui.modal", (e) => {
			options.onShown(e);
		});
		if ("onHide" in options) controller.listen(modal, "hide.ui.modal", (e) => {
			options.onHide(e);
		});
		controller.listen(modal, "hidden.ui.modal", (event) => {
			try {
				options.onHidden?.(event);
			} finally {
				controller.dispose();
				_fr0st_query.default.remove(modal);
				if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
			}
		});
		controller.show(returnFocus);
		return modal;
	}

// src/js/selection.js
/** @import { EditorSelectionMarkers } from './types.js'; */
	/**
	* Gets the current range, optionally restricted to an editing boundary.
	* @param {HTMLElement|null} [container=null] The optional editing boundary.
	* @returns {Range|null} The owned range, or null when the selection is elsewhere.
	*/
	function getRange(container = null) {
		const selection = window.getSelection();
		if (!selection.rangeCount) return null;
		const range = selection.getRangeAt(0);
		return !container || container.contains(range.startContainer) && container.contains(range.endContainer) ? range : null;
	}
	/**
	* Restores a range from markers and removes the markers without losing direction.
	* @param {EditorSelectionMarkers} [markers] The selection markers.
	*/
	function restoreSelection({ start, end, backward = false } = {}) {
		if (!start?.isConnected || !end?.isConnected) {
			start?.remove();
			end?.remove();
			return;
		}
		const range = _fr0st_query.default.createRange();
		range.setStartAfter(start);
		range.setEndBefore(end);
		start.remove();
		end.remove();
		const selection = window.getSelection();
		if (backward) selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
		else selectRange(range);
	}
	/**
	* Saves a range as empty text markers inside an optional editing boundary.
	* @param {HTMLElement|null} [container=null] The optional editing boundary.
	* @returns {EditorSelectionMarkers} The markers and selection direction.
	*/
	function saveSelection(container = null) {
		const range = getRange(container);
		if (!range) return {};
		const selection = window.getSelection();
		const backward = !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
		const start = _fr0st_query.default.createText("");
		const end = _fr0st_query.default.createText("");
		const startRange = range.cloneRange();
		const endRange = range.cloneRange();
		startRange.collapse(true);
		endRange.collapse(false);
		endRange.insertNode(end);
		startRange.insertNode(start);
		return {
			start,
			end,
			backward
		};
	}
	/**
	* Selects a node.
	* @param {HTMLElement} node The element to select.
	* @returns {Range} The selected range.
	*/
	function selectNode(node) {
		const range = _fr0st_query.default.createRange();
		range.selectNode(node);
		selectRange(range);
		return range;
	}
	/**
	* Restores a connected range.
	* @param {Range|null} range The range to select.
	* @param {boolean} [backward=false] Whether to restore a backward selection.
	*/
	function selectRange(range, backward = false) {
		if (!range || !range.startContainer.isConnected || !range.endContainer.isConnected) return;
		const selection = window.getSelection();
		if (backward) selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
		else {
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}
	/**
	* Normalizes text nodes while preserving the live range and its direction.
	* @param {HTMLElement} container The content boundary.
	*/
	function normalizeText(container) {
		const range = getRange(container)?.cloneRange();
		const selection = window.getSelection();
		const backward = range && !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
		_fr0st_query.default.normalize(container);
		if (range) selectRange(range, backward);
	}

// src/js/shared-events.js
/** @import Editor from './editor.js'; */
	/**
	* @typedef {object} EditorSharedEvents
	* @property {() => void} showDropTarget Shows the active drop target.
	* @property {() => void} resetDropTarget Resets and hides the drop target.
	* @property {() => void} removePopover Dismisses the context toolbar.
	* @property {(range: Range|null) => void} selectionChange Updates the owned selection.
	* @property {() => void} resize Updates the component after a viewport resize.
	*/
	/** @type {Map<Editor, EditorSharedEvents>} */
	var editors = /* @__PURE__ */ new Map();
	var cleanups = [];
	var dragCount = 0;
	var session = 0;
	/**
	* Registers a shared listener with its exact removal callback.
	* @param {EventTarget} target The target.
	* @param {string} events The event names.
	* @param {Function} callback The event callback.
	*/
	function listenShared(target, events, callback) {
		_fr0st_query.default.addEvent(target, events, callback);
		cleanups.push(() => _fr0st_query.default.removeEvent(target, events, callback));
	}
	/**
	* Starts shared listeners when the first editor becomes active.
	* @param {Editor} editor The editor to register.
	* @param {EditorSharedEvents} callbacks The callbacks owned by the component.
	*/
	function addEditor(editor, callbacks) {
		if (editors.has(editor)) return;
		editors.set(editor, callbacks);
		if (editors.size > 1) return;
		const generation = ++session;
		dragCount = 0;
		const deferred = (callback) => _fr0st_query.default.debounce(() => {
			if (generation === session) callback();
		});
		listenShared(document.body, "dragenter.ui.editor", () => {
			if (dragCount++ === 0) for (const current of editors.values()) current.showDropTarget();
		});
		listenShared(document.body, "dragleave.ui.editor", () => {
			dragCount = Math.max(0, dragCount - 1);
			if (dragCount === 0) resetDragCount();
		});
		listenShared(document.body, "dragend.ui.editor drop.ui.editor", resetDragCount);
		listenShared(document, "selectionchange.ui.editor", deferred(() => {
			const range = getRange();
			for (const current of editors.values()) current.selectionChange(range);
		}));
		listenShared(window, "click.ui.editor", () => {
			for (const current of editors.values()) current.removePopover();
		});
		listenShared(window, "resize.ui.editor", deferred(() => {
			for (const current of editors.values()) current.resize();
		}));
	}
	/**
	* Removes only this library's listeners when its last editor is disposed.
	* @param {Editor} editor The editor to unregister.
	*/
	function removeEditor(editor) {
		if (!editors.delete(editor) || editors.size) return;
		session++;
		dragCount = 0;
		for (const cleanup of cleanups.splice(0)) cleanup();
	}
	/**
	* Resets drag state and hides drop targets for all active editors.
	*/
	function resetDragCount() {
		dragCount = 0;
		for (const current of editors.values()) current.resetDropTarget();
	}

// src/js/values.js
	var buttons = [
		["style"],
		[
			"bold",
			"italic",
			"underline",
			"removeFormat"
		],
		["font"],
		["color"],
		[
			"unorderedList",
			"orderedList",
			"paragraph"
		],
		["table"],
		[
			"link",
			"image",
			"video"
		],
		["fullScreen", "source"]
	];
	var colors = [
		{
			"Black": "#000000",
			"Tundora": "#424242",
			"Dove Gray": "#636363",
			"Star Dust": "#9C9C94",
			"Pale Slate": "#CEC6CE",
			"Gallery": "#EFEFEF",
			"Alabaster": "#F7F7F7",
			"White": "#FFFFFF"
		},
		{
			"Red": "#FF0000",
			"Orange Peel": "#FF9C00",
			"Yellow": "#FFFF00",
			"Green": "#00FF00",
			"Cyan": "#00FFFF",
			"Blue": "#0000FF",
			"Electric Violet": "#9C00FF",
			"Magenta": "#FF00FF"
		},
		{
			"Azalea": "#F7C6CE",
			"Karry": "#FFE7CE",
			"Egg White": "#FFEFC6",
			"Zanah": "#D6EFD6",
			"Botticelli": "#CEDEE7",
			"Tropical Blue": "#CEE7F7",
			"Mischka": "#D6D6E7",
			"Twilight": "#E7D6DE"
		},
		{
			"Tonys Pink": "#E79C9C",
			"Peach Orange": "#FFC69C",
			"Cream Brulee": "#FFE79C",
			"Sprout": "#B5D6A5",
			"Casper": "#A5C6CE",
			"Perano": "#9CC6EF",
			"Cold Purple": "#B5A5D6",
			"Careys Pink": "#D6A5BD"
		},
		{
			"Mandy": "#E76363",
			"Rajah": "#F7AD6B",
			"Dandelion": "#FFD663",
			"Olivine": "#94BD7B",
			"Gulf Stream": "#73A5AD",
			"Viking": "#6BADDE",
			"Blue Marguerite": "#8C7BC6",
			"Puce": "#C67BA5"
		},
		{
			"Guardsman Red": "#CE0000",
			"Fire Bush": "#E79439",
			"Golden Dream": "#EFC631",
			"Chelsea Cucumber": "#6BA54A",
			"Smalt Blue": "#4A7B8C",
			"Boston Blue": "#3984C6",
			"Butterfly Bush": "#634AA5",
			"Cadillac": "#A54A7B"
		},
		{
			"Sangria": "#9C0000",
			"Mai Tai": "#B56308",
			"Buddha Gold": "#BD9400",
			"Forest Green": "#397B21",
			"Eden": "#104A5A",
			"Venice Blue": "#085294",
			"Meteorite": "#311873",
			"Claret": "#731842"
		},
		{
			"Rosewood": "#630000",
			"Cinnamon": "#7B3900",
			"Olive": "#846300",
			"Parsley": "#295218",
			"Tiber": "#083139",
			"Midnight Blue": "#003163",
			"Valentino": "#21104A",
			"Loulou": "#4A1031"
		}
	];
	var fonts = [
		"Arial",
		"Arial Black",
		"Comic Sans MS",
		"Courier New",
		"Garamond",
		"Georgia",
		"Helvetica",
		"Impact",
		"Tahoma",
		"Times New Roman",
		"Trebuchet MS",
		"Verdana"
	];
	var fontSizes = {
		1: 8,
		2: 13,
		3: 16,
		4: 18,
		5: 24,
		6: 32,
		7: 48
	};
	var styles = [
		"p",
		"blockquote",
		"pre",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6"
	];

// src/js/editor.js
/** @import { EditorOptions, EditorHistoryEntry, EditorPlugin, EditorPopover } from './types.js'; */
	/**
	* A customizable WYSIWYG editor backed by a native textarea.
	* @augments {BaseComponent<EditorOptions>}
	* @fires Editor#init.ui.editor
	* @fires Editor#change.ui.editor
	*/
	var Editor = class extends _fr0st_ui.BaseComponent {
		static buttons = buttons;
		static classes = classes;
		static colors = colors;
		/** @type {EditorOptions} */
		static defaults = {
			buttons: null,
			popovers: {
				image: [
					[
						"imageFull",
						"imageHalf",
						"imageQuarter",
						"imageOriginal"
					],
					[
						"floatLeft",
						"floatRight",
						"floatNone"
					],
					["imageRemove"]
				],
				link: [
					"link",
					["linkEdit"],
					["unlink"]
				],
				table: [[
					"tableRowAfter",
					"tableRowBefore",
					"tableColumnBefore",
					"tableColumnAfter"
				], [
					"tableRowRemove",
					"tableColumnRemove",
					"tableRemove"
				]]
			},
			/**
			* Reads images owned by this editor and inserts successful results.
			* @this {Editor}
			* @param {FileList|File[]} files The files to read.
			* @returns {Promise<void>} Completion after every file has settled.
			*/
			async imageUpload(files) {
				const results = await Promise.allSettled([...files].map((file) => this.#readImage(file)));
				if (!this.node) return;
				for (const result of results) if (result.status === "fulfilled") this.insertImage(result.value);
			},
			/**
			* Handles the default formatting and history shortcuts.
			* @this {Editor}
			* @param {KeyboardEvent} e The keyboard event.
			*/
			keyDown(e) {
				if (!e.ctrlKey && !e.metaKey || e.altKey) return;
				let action;
				switch (e.key.toLowerCase()) {
					case "b":
						action = "bold";
						break;
					case "i":
						action = "italic";
						break;
					case "u":
						action = "underline";
						break;
					case "y":
						action = "redo";
						break;
					case "z":
						action = e.shiftKey ? "redo" : "undo";
						break;
					default: return;
				}
				e.preventDefault();
				this[action]();
			},
			defaultFont: "Arial",
			fonts: null,
			height: "auto",
			resizable: true,
			historyLimit: 1e3
		};
		static fonts = fonts;
		static fontSizes = fontSizes;
		static icons = icons_default;
		static lang = lang;
		/** @type {Record<string, EditorPlugin>} */
		static plugins = {
			alignCenter: { command: "justifyCenter" },
			alignJustify: { command: "justifyFull" },
			alignLeft: { command: "justifyLeft" },
			alignRight: { command: "justifyRight" },
			bold: { command: "bold" },
			color: {
				setContent() {
					const backColor = document.queryCommandValue("backColor");
					const foreColor = document.queryCommandValue("foreColor");
					const span = _fr0st_query.default.create("span", {
						text: "A",
						class: this.constructor.classes.colorBtnContent,
						style: {
							color: foreColor,
							backgroundColor: backColor
						}
					});
					return _fr0st_query.default.getProperty(span, "outerHTML");
				},
				dropdown(dropdown) {
					this.#colorDropdown(dropdown);
				}
			},
			font: {
				setContent() {
					const fontName = document.queryCommandValue("fontName").replace(/"/g, "");
					return this.#fonts.includes(fontName) ? fontName : this.#defaultFont;
				},
				dropdown(dropdown) {
					this.#fontDropdown(dropdown);
				}
			},
			fontSize: {
				setContent() {
					const size = document.queryCommandValue("fontSize");
					if (size) return this.constructor.fontSizes[size];
					const fontSizePx = _fr0st_query.default.css(this.#editor, "fontSize");
					return Math.round(parseFloat(fontSizePx));
				},
				dropdown(dropdown) {
					this.#fontSizeDropdown(dropdown);
				}
			},
			fullScreen: { action() {
				if (this.#fullScreen) {
					_fr0st_ui.Modal.init(this.#fullScreen).hide();
					return;
				}
				this.#fullScreen = createModal(this.constructor, {
					content: this.#container,
					fullScreen: true,
					onShown: (_) => {
						if (_fr0st_query.default.isVisible(this.#sourceContainer)) _fr0st_query.default.focus(this.#source);
						else _fr0st_query.default.focus(this.#editor);
					},
					onHide: (_) => {
						_fr0st_query.default.insertBefore(this.#container, this.node);
						this.#fullScreen = null;
					}
				});
				this.#ownComponent(_fr0st_ui.Modal.init(this.#fullScreen));
			} },
			hr: { command: "insertHorizontalRule" },
			image: { action() {
				this.#showImageModal();
			} },
			indent: { command: "indent" },
			italic: { command: "italic" },
			link: { action() {
				this.#showLinkModal();
			} },
			orderedList: { command: "insertOrderedList" },
			outdent: { command: "outdent" },
			paragraph: { dropdown: [[
				"alignLeft",
				"alignCenter",
				"alignRight",
				"alignJustify"
			], ["indent", "outdent"]] },
			redo: {
				command: "redo",
				disableCheck() {
					return !this.#redoHistory.length;
				}
			},
			removeFormat: { command: "removeFormat" },
			source: { action() {
				const value = _fr0st_query.default.getValue(this.node);
				if (_fr0st_query.default.isVisible(this.#sourceContainer)) {
					this.#observe(false);
					try {
						_fr0st_query.default.setHtml(this.#editor, value);
						this.#normalize();
						this.#checkEmpty();
						const html = _fr0st_query.default.getHtml(this.#editor);
						if (this.#history.at(-1)?.html !== html) {
							this.#redoHistory = [];
							this.#addHistory({ html });
						}
						this.#updateValue();
					} finally {
						this.#observe();
					}
					if (!this.node) return;
					this.#showEditor();
					this.#focusEditor();
				} else {
					_fr0st_query.default.setValue(this.#source, value);
					this.#showSource();
					_fr0st_query.default.focus(this.#source);
				}
				this.#refreshToolbar();
			} },
			strikethrough: { command: "strikethrough" },
			style: { dropdown(dropdown) {
				this.#styleDropdown(dropdown);
			} },
			subscript: { command: "subscript" },
			superscript: { command: "superscript" },
			table: { dropdown(dropdown) {
				this.#tableDropdown(dropdown);
			} },
			underline: { command: "underline" },
			undo: {
				command: "undo",
				disableCheck() {
					return !this.#history.length;
				}
			},
			unlink: { command: "unlink" },
			unorderedList: { command: "insertUnorderedList" },
			video: { action() {
				this.#showVideoModal();
			} }
		};
		/** @type {Record<string, EditorPopover>} */
		static popovers = {
			floatLeft: { action(node) {
				_fr0st_query.default.setStyle(node, { float: "left" });
			} },
			floatRight: { action(node) {
				_fr0st_query.default.setStyle(node, { float: "right" });
			} },
			floatNone: { action(node) {
				_fr0st_query.default.removeStyle(node, "float");
			} },
			imageFull: {
				content: "100%",
				action(node) {
					_fr0st_query.default.setStyle(node, { width: "100%" });
				}
			},
			imageHalf: {
				content: "50%",
				action(node) {
					_fr0st_query.default.setStyle(node, { width: "50%" });
				}
			},
			imageQuarter: {
				content: "25%",
				action(node) {
					_fr0st_query.default.setStyle(node, { width: "25%" });
				}
			},
			imageOriginal: { action(node) {
				_fr0st_query.default.removeStyle(node, "width");
			} },
			imageRemove: { action(node) {
				_fr0st_query.default.detach(node);
				this.#removePopover();
			} },
			link: { render(node) {
				const href = _fr0st_query.default.getAttribute(node, "href");
				return _fr0st_query.default.create("a", {
					text: href,
					class: this.constructor.classes.linkUrl,
					attributes: {
						href,
						target: "_blank"
					}
				});
			} },
			linkEdit: { action(node) {
				this.#showLinkModal(node);
			} },
			tableColumnAfter: { action(node) {
				this.#updateTable(node, (td, _, table) => {
					const index = _fr0st_query.default.index(td);
					const rows = _fr0st_query.default.find(":scope > thead > tr, :scope > tbody > tr", table);
					this.#observe(false);
					for (const row of rows) {
						const newTd = _fr0st_query.default.create("td", { html: "<br>" });
						const cells = _fr0st_query.default.children(row, "th, td");
						_fr0st_query.default.after(cells[index], newTd);
					}
					this.#observe();
					this.#updateValue();
				});
			} },
			tableColumnBefore: { action(node) {
				this.#updateTable(node, (td, _, table) => {
					const index = _fr0st_query.default.index(td);
					const rows = _fr0st_query.default.find(":scope > thead > tr, :scope > tbody > tr", table);
					this.#observe(false);
					for (const row of rows) {
						const newTd = _fr0st_query.default.create("td", { html: "<br>" });
						const cells = _fr0st_query.default.children(row, "th, td");
						_fr0st_query.default.before(cells[index], newTd);
					}
					this.#observe();
					this.#updateValue();
				});
			} },
			tableColumnRemove: { action(node) {
				this.#updateTable(node, (td, _, table) => {
					const index = _fr0st_query.default.index(td);
					const rows = _fr0st_query.default.find(":scope > thead > tr, :scope > tbody > tr", table);
					this.#observe(false);
					for (const row of rows) {
						const cells = _fr0st_query.default.children(row, "th, td");
						_fr0st_query.default.remove(cells[index]);
					}
					this.#observe();
					this.#updateValue();
					this.#removePopover();
				});
			} },
			tableRemove: { action(node) {
				const table = _fr0st_query.default.closest(node, "table", this.#editor).shift();
				_fr0st_query.default.detach(table);
				this.#removePopover();
			} },
			tableRowAfter: { action(node) {
				this.#updateTable(node, (_, tr) => {
					const columns = _fr0st_query.default.children(tr).length;
					const newTr = _fr0st_query.default.create("tr");
					for (let i = 0; i < columns; i++) {
						const newTd = _fr0st_query.default.create("td", { html: "<br>" });
						_fr0st_query.default.append(newTr, newTd);
					}
					_fr0st_query.default.after(tr, newTr);
				});
			} },
			tableRowBefore: { action(node) {
				this.#updateTable(node, (_, tr) => {
					const columns = _fr0st_query.default.children(tr).length;
					const newTr = _fr0st_query.default.create("tr");
					for (let i = 0; i < columns; i++) {
						const newTd = _fr0st_query.default.create("td", { html: "<br>" });
						_fr0st_query.default.append(newTr, newTd);
					}
					_fr0st_query.default.before(tr, newTr);
				});
			} },
			tableRowRemove: { action(node) {
				this.#updateTable(node, (_, tr) => {
					_fr0st_query.default.remove(tr);
					this.#removePopover();
				});
			} },
			unlink: { action(node) {
				_fr0st_query.default.select(node);
				this.unlink();
				getRange().collapse();
			} }
		};
		static styles = styles;
		/** @type {Array<{button: HTMLElement, data: EditorPlugin, type?: string}>} */
		#buttons = [];
		/** @type {Array<() => void>} */
		#cleanups = [];
		/** @type {Set<BaseComponent>} */
		#components = /* @__PURE__ */ new Set();
		/** @type {HTMLElement|null} */
		#container = null;
		/** @type {HTMLElement|null} */
		#currentNode = null;
		/** @type {string} */
		#defaultFont = "sans-serif";
		#disposing = false;
		/** @type {HTMLElement|null} */
		#dropTarget = null;
		/** @type {HTMLElement|null} */
		#dropText = null;
		/** @type {HTMLElement|null} */
		#editor = null;
		/** @type {HTMLElement|null} */
		#editorBody = null;
		/** @type {HTMLElement|null} */
		#editorContainer = null;
		/** @type {HTMLElement|null} */
		#editorScroll = null;
		/** @type {string[]} */
		#fonts = [];
		/** @type {HTMLElement|null} */
		#fullScreen = null;
		/** @type {EditorHistoryEntry[]} */
		#history = [];
		/** @type {Set<HTMLImageElement>} */
		#images = /* @__PURE__ */ new Set();
		/** @type {HTMLElement|null} */
		#imgCursor = null;
		/** @type {HTMLElement|null} */
		#imgHighlight = null;
		/** @type {HTMLElement|null} */
		#imgResize = null;
		/** @type {HTMLElement|null} */
		#imgSize = null;
		/** @type {string|null} */
		#labelledBy = null;
		/** @type {Range|null} */
		#lastRange = null;
		/** @type {HTMLElement|null} */
		#lineNumbers = null;
		/** @type {HTMLElement|null} */
		#modal = null;
		#observationDepth = 0;
		/** @type {MutationObserver|null} */
		#observer = null;
		/** @type {Map<string, string|null>} */
		#originalAttributes = /* @__PURE__ */ new Map();
		/** @type {[number, number, 'forward'|'backward'|'none']|null} */
		#originalSelection = null;
		#pendingMutation = false;
		/** @type {HTMLElement|null} */
		#popover = null;
		/** @type {HTMLElement|null} */
		#popoverArrow = null;
		/** @type {HTMLElement|null} */
		#popoverBody = null;
		/** @type {Popper|null} */
		#popper = null;
		/** @type {Set<FileReader>} */
		#readers = /* @__PURE__ */ new Set();
		/** @type {EditorHistoryEntry[]} */
		#redoHistory = [];
		/** @type {HTMLElement|null} */
		#resizeBar = null;
		/** @type {HTMLTextAreaElement|null} */
		#source = null;
		/** @type {HTMLElement|null} */
		#sourceContainer = null;
		/** @type {HTMLElement|null} */
		#sourceOuter = null;
		/** @type {HTMLElement|null} */
		#sourceScroll = null;
		/** @type {HTMLElement|null} */
		#toolbar = null;
		/** @type {string[][]|null} */
		#toolbarButtons = null;
		/**
		* Creates an Editor.
		* @param {HTMLTextAreaElement} node The native textarea.
		* @param {EditorOptions} [options] The options to create the Editor with.
		* @throws {TypeError} When the input is not a textarea.
		*/
		constructor(node, options) {
			if (!_fr0st_query.default._isElement(node) || !_fr0st_query.default.is(node, "textarea")) throw new TypeError("Editor must be created on a textarea element.");
			super(node, options);
			this.#originalAttributes = new Map([
				"style",
				"tabindex",
				"hidden",
				"aria-hidden"
			].map((name) => [name, node.getAttribute(name)]));
			this.#originalSelection = [
				node.selectionStart,
				node.selectionEnd,
				node.selectionDirection
			];
			const active = document.activeElement;
			const originalRange = getRange()?.cloneRange();
			try {
				this.#toolbarButtons = this.options.buttons || this.constructor.buttons;
				this.#fonts = (this.options.fonts || this.constructor.fonts).filter((font) => document.fonts.check(`12px ${font}`));
				this.#defaultFont = this.#fonts.includes(this.options.defaultFont) ? this.options.defaultFont : this.#fonts[0] || "sans-serif";
				this.#render();
				_fr0st_query.default.setHtml(this.#editor, _fr0st_query.default.getValue(node));
				this.#refreshDisabled();
				this.#checkEmpty();
				this.#events();
				this.#normalize();
				this.#updateValue();
				if (!this.node) return;
				this.#refreshToolbar();
				this.#eventsShared();
				if (active === node) this.#focusEditor();
				else {
					if (active instanceof HTMLElement && active.isConnected && document.activeElement !== active) active.focus({ preventScroll: true });
					selectRange(originalRange);
				}
				if (this.node) _fr0st_query.default.triggerEvent(node, "init.ui.editor");
			} catch (error) {
				try {
					this.dispose();
				} catch {}
				throw error;
			}
		}
		/**
		* Sets the background color.
		* @param {string} value The background color.
		*/
		backColor(value) {
			this.#execCommand("backColor", value);
		}
		/**
		* Toggles bold state.
		*/
		bold() {
			this.#execCommand("bold");
		}
		/**
		* Disables the Editor.
		*/
		disable() {
			_fr0st_query.default.setAttribute(this.node, { disabled: true });
			this.#refreshDisabled();
			this.#refreshToolbar();
		}
		/**
		* Dispose the Editor.
		*/
		dispose() {
			if (!this.node || this.#disposing) return;
			this.#disposing = true;
			const node = this.node;
			const active = document.activeElement;
			const restoreFocus = this.#container?.contains(active) || this.#modal?.contains(active) || this.#fullScreen?.contains(active);
			removeEditor(this);
			this.#observer?.disconnect();
			this.#observer = null;
			super.dispose();
			let failure;
			const release = (callback) => {
				try {
					callback();
				} catch (error) {
					failure ||= error;
				}
			};
			for (const reader of this.#readers) release(() => reader.abort());
			this.#readers.clear();
			for (const image of this.#images) {
				image.onload = null;
				image.onerror = null;
				image.src = "";
			}
			this.#images.clear();
			for (const cleanup of this.#cleanups.splice(0).reverse()) release(cleanup);
			for (const component of this.#components) release(() => component.dispose());
			this.#components.clear();
			release(() => this.#popper?.dispose());
			for (const modal of [this.#modal, this.#fullScreen]) if (modal) {
				release(() => _fr0st_ui.Modal.init(modal).dispose());
				_fr0st_query.default.remove(modal);
			}
			if (this.#container) _fr0st_query.default.remove(this.#container);
			for (const [name, value] of this.#originalAttributes) if (value === null) node.removeAttribute(name);
			else node.setAttribute(name, value);
			if (restoreFocus && node.isConnected && !node.hidden) {
				node.focus({ preventScroll: true });
				node.setSelectionRange(...this.#originalSelection);
			}
			this.#container = null;
			this.#toolbar = null;
			this.#editorBody = null;
			this.#editorContainer = null;
			this.#editorScroll = null;
			this.#editor = null;
			this.#imgHighlight = null;
			this.#imgCursor = null;
			this.#imgResize = null;
			this.#imgSize = null;
			this.#sourceOuter = null;
			this.#sourceContainer = null;
			this.#sourceScroll = null;
			this.#lineNumbers = null;
			this.#source = null;
			this.#popover = null;
			this.#popoverArrow = null;
			this.#popoverBody = null;
			this.#dropTarget = null;
			this.#dropText = null;
			this.#resizeBar = null;
			this.#currentNode = null;
			this.#lastRange = null;
			this.#history = null;
			this.#redoHistory = null;
			this.#buttons = null;
			this.#modal = null;
			this.#fullScreen = null;
			this.#popper = null;
			if (failure) throw failure;
		}
		/**
		* Enables the Editor.
		*/
		enable() {
			_fr0st_query.default.removeAttribute(this.node, "disabled");
			this.#refreshDisabled();
			this.#refreshToolbar();
		}
		/**
		* Sets the font family.
		* @param {string} value The font family.
		*/
		fontName(value) {
			this.#execCommand("fontName", value);
		}
		/**
		* Sets the font size.
		* @param {number|string} value The font size in pixels.
		*/
		fontSize(value) {
			value = Object.keys(this.constructor.fontSizes).find((key) => this.constructor.fontSizes[key] === Number(value));
			this.#execCommand("fontSize", value);
		}
		/**
		* Sets the foreground color.
		* @param {string} value The foreground color.
		*/
		foreColor(value) {
			this.#execCommand("foreColor", value);
		}
		/**
		* Format the selected block level element.
		* @param {string} value The tag name.
		*/
		formatBlock(value) {
			this.#execCommand("formatBlock", value);
		}
		/**
		* Indent the selection.
		*/
		indent() {
			this.#changeIndent(false);
		}
		/**
		* Inserts a horizontal rule.
		*/
		insertHorizontalRule() {
			this.#execCommand("insertHorizontalRule");
		}
		/**
		* Inserts a HTML string.
		* @param {string} value The HTML string.
		*/
		insertHtml(value) {
			if (!this.node || this.node.matches(":disabled") || this.node.readOnly) return;
			this.#execCommand("insertHTML", value);
		}
		/**
		* Inserts an image.
		* @param {string} src The image src.
		*/
		insertImage(src) {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly) return;
			const img = _fr0st_query.default.create("img", { attributes: { src } });
			const newImg = this.insertNode(img);
			if (!newImg) return;
			const image = new Image();
			this.#images.add(image);
			const finish = () => {
				this.#images.delete(image);
				image.onload = null;
				image.onerror = null;
			};
			image.onload = () => {
				if (this.node && this.#editor.contains(newImg)) {
					const maxWidth = _fr0st_query.default.width(this.#editor, { boxSize: _fr0st_query.default.CONTENT_BOX });
					_fr0st_query.default.setStyle(newImg, { width: `${Math.min(image.width, maxWidth)}px` });
				}
				finish();
			};
			image.onerror = finish;
			image.src = src;
		}
		/**
		* Inserts a link.
		* @param {string} href The link href.
		* @param {string} text The link text.
		* @param {boolean} [newWindow] Whether to open the link in a new window.
		*/
		insertLink(href, text, newWindow) {
			const link = _fr0st_query.default.create("a", {
				text,
				attributes: { href }
			});
			if (newWindow) _fr0st_query.default.setAttribute(link, { target: "_blank" });
			this.insertNode(link);
		}
		/**
		* Inserts a trusted DOM element at the current selection.
		* @param {HTMLElement} node The node to insert.
		* @returns {HTMLElement|null} The inserted element, or null when editing is unavailable.
		*/
		insertNode(node) {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly) return null;
			this.#focusEditor();
			if (!this.node) return null;
			const range = getRange(this.#editor);
			if (!range) return null;
			this.#addHistory({
				html: this.#editor.innerHTML,
				selectionData: getSelectionData(this.#editor)
			});
			this.#observe(false);
			try {
				range.deleteContents();
				range.insertNode(node);
				range.setStartAfter(node);
				range.collapse(true);
				selectRange(range);
				this.#normalize();
				this.#updateValue();
			} finally {
				this.#observe();
			}
			return node;
		}
		/**
		* Creates an ordered list for the selection.
		*/
		insertOrderedList() {
			this.#execCommand("insertOrderedList");
		}
		/**
		* Inserts a text string.
		* @param {string} value The text.
		*/
		insertText(value) {
			this.#execCommand("insertText", value);
		}
		/**
		* Creates an unordered list for the selection.
		*/
		insertUnorderedList() {
			this.#execCommand("insertUnorderedList");
		}
		/**
		* Toggles italic state.
		*/
		italic() {
			this.#execCommand("italic");
		}
		/**
		* Center the selection.
		*/
		justifyCenter() {
			this.#execCommand("justifyCenter");
		}
		/**
		* Justify the selection.
		*/
		justifyFull() {
			this.#execCommand("justifyFull");
		}
		/**
		* Align the selection to the left.
		*/
		justifyLeft() {
			this.#execCommand("justifyLeft");
		}
		/**
		* Align the selection to the right.
		*/
		justifyRight() {
			this.#execCommand("justifyRight");
		}
		/**
		* Registers cleanup for resources created by an extension or rendering helper.
		* @param {Function} callback The cleanup callback.
		*/
		onDispose(callback) {
			if (this.node) this.#cleanups.push(callback);
			else callback();
		}
		/**
		* Outdent the selection.
		*/
		outdent() {
			this.#changeIndent(true);
		}
		/**
		* Perform a redo.
		*/
		redo() {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly || !this.#redoHistory.length) return;
			const current = this.#redoHistory.pop();
			this.#addHistory(current);
			this.#restoreHistory(current);
		}
		/**
		* Reload a programmatically assigned textarea value and state.
		*/
		refresh() {
			if (this.node) this.#loadValue();
		}
		/**
		* Removes all formatting from the selection.
		*/
		removeFormat() {
			this.#execCommand("removeFormat");
		}
		/**
		* Toggles strikethrough state.
		*/
		strikethrough() {
			this.#execCommand("strikethrough");
		}
		/**
		* Toggles subscript state.
		*/
		subscript() {
			this.#execCommand("subscript");
		}
		/**
		* Toggles superscript state.
		*/
		superscript() {
			this.#execCommand("superscript");
		}
		/**
		* Toggles underline state.
		*/
		underline() {
			this.#execCommand("underline");
		}
		/**
		* Perform an undo.
		*/
		undo() {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly || this.#history.length <= 1) return;
			const next = this.#history.pop();
			this.#redoHistory.push(next);
			const current = this.#history.at(-1);
			this.#restoreHistory(current);
		}
		/**
		* Removes the selected anchor element.
		*/
		unlink() {
			this.#execCommand("unlink");
		}
		/**
		* Adds a content snapshot, coalescing repeated HTML and bounding history safely.
		* @param {EditorHistoryEntry} data The snapshot.
		*/
		#addHistory({ html, selectionData = null }) {
			if (this.#history.at(-1)?.html === html) {
				this.#history.at(-1).selectionData = selectionData;
				return;
			}
			this.#history.push({
				html,
				selectionData
			});
			const requested = Number(this.options.historyLimit);
			const limit = Number.isFinite(requested) ? Math.max(1, Math.trunc(requested)) : 1e3;
			if (this.#history.length > limit) this.#history.splice(0, this.#history.length - limit);
		}
		/**
		* Binds a drag whose global listeners and active state are owned by the editor.
		* @param {HTMLElement} handle The drag handle.
		* @param {Function} down The start callback.
		* @param {Function} move The move callback.
		* @param {Function} up The finish callback.
		*/
		#bindDrag(handle, down, move, up) {
			let pointer = null;
			this.onDispose(() => {
				pointer = null;
			});
			this.listen(handle, "pointerdown.ui.editor", (event) => {
				if (event.button !== 0 || pointer !== null || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly || down(event) === false) return;
				event.preventDefault();
				pointer = event.pointerId;
			});
			this.listen(window, "pointermove.ui.editor", (event) => {
				if (event.pointerId === pointer) {
					event.preventDefault();
					move(event);
				}
			}, { passive: false });
			this.listen(window, "blur.ui.editor", () => {
				if (pointer !== null) {
					pointer = null;
					up();
				}
			});
			this.listen(window, "pointerup.ui.editor pointercancel.ui.editor", (event) => {
				if (event.pointerId === pointer) {
					pointer = null;
					up(event);
				}
			});
		}
		/**
		* Changes indentation as a single history operation with selection preservation.
		* @param {boolean} outdent Whether to remove one indentation level.
		*/
		#changeIndent(outdent) {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly) return;
			this.#focusEditor();
			if (!this.node) return;
			const range = getRange(this.#editor);
			if (!range) return;
			let blocks = getSelectedBlocks(this.#editor, range);
			if (outdent && !blocks.length) return;
			this.#addHistory({
				html: this.#editor.innerHTML,
				selectionData: getSelectionData(this.#editor)
			});
			this.#observe(false);
			const markers = saveSelection(this.#editor);
			try {
				if (!blocks.length) {
					const paragraph = document.createElement("p");
					let first = markers.start;
					while (first.parentNode !== this.#editor) first = first.parentNode;
					while (first.previousSibling && isPhrasingContent(first.previousSibling)) first = first.previousSibling;
					const inline = [];
					for (let node = first; node && isPhrasingContent(node); node = node.nextSibling) inline.push(node);
					if (inline.length) {
						inline[0].before(paragraph);
						paragraph.append(...inline);
						blocks = [paragraph];
					}
				}
				while (blocks.length) {
					const group = [blocks.shift()];
					while (blocks.length && group.at(-1).nextElementSibling === blocks[0]) group.push(blocks.shift());
					if (outdent) outdentBlocks(group, this.#editor);
					else indentBlocks(group);
				}
			} finally {
				restoreSelection(markers);
				this.#normalize();
				this.#updateValue();
				this.#observe();
			}
		}
		/**
		* Checks if the editor is empty and populate base markup.
		*/
		#checkEmpty() {
			if (this.node && !this.#editor.innerHTML.trim()) _fr0st_query.default.setHtml(this.#editor, "<p><br></p>");
		}
		/**
		* Renders a color dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		#colorDropdown(dropdown) {
			const container = _fr0st_query.default.create("div", { class: this.constructor.classes.colorContainerRow });
			const col1 = _fr0st_query.default.create("div", { class: this.constructor.classes.colorContainerColumn });
			const col2 = _fr0st_query.default.create("div", { class: this.constructor.classes.colorContainerColumn });
			const foreLabel = _fr0st_query.default.create("small", {
				text: this.constructor.lang.dropdowns.colorForeground,
				class: this.constructor.classes.colorLabel
			});
			const backLabel = _fr0st_query.default.create("small", {
				text: this.constructor.lang.dropdowns.colorBackground,
				class: this.constructor.classes.colorLabel
			});
			_fr0st_query.default.append(col1, foreLabel);
			_fr0st_query.default.append(col2, backLabel);
			const foreDefaultContainer = _fr0st_query.default.create("div", { class: this.constructor.classes.colorLabelContainer });
			_fr0st_query.default.append(col1, foreDefaultContainer);
			const backDefaultContainer = _fr0st_query.default.create("div", { class: this.constructor.classes.colorLabelContainer });
			_fr0st_query.default.append(col2, backDefaultContainer);
			const foreDefault = _fr0st_query.default.create("button", {
				text: this.constructor.lang.dropdowns.colorDefault,
				class: this.constructor.classes.colorDefaultBtn,
				attributes: { type: "button" }
			});
			_fr0st_query.default.append(foreDefaultContainer, foreDefault);
			this.#setToolbarData(foreDefault, {
				command: "foreColor",
				value: "initial"
			});
			const backDefault = _fr0st_query.default.create("button", {
				text: this.constructor.lang.dropdowns.colorTransparent,
				class: this.constructor.classes.colorDefaultBtn,
				attributes: { type: "button" }
			});
			_fr0st_query.default.append(backDefaultContainer, backDefault);
			this.#setToolbarData(backDefault, {
				command: "backColor",
				value: "initial"
			});
			for (const colorRow of this.constructor.colors) {
				const foreRow = _fr0st_query.default.create("div", { class: this.constructor.classes.colorRow });
				_fr0st_query.default.append(col1, foreRow);
				const backRow = _fr0st_query.default.create("div", { class: this.constructor.classes.colorRow });
				_fr0st_query.default.append(col2, backRow);
				for (const [colorName, color] of Object.entries(colorRow)) {
					const foreLink = _fr0st_query.default.create("button", {
						class: this.constructor.classes.color,
						style: { backgroundColor: color },
						attributes: {
							"data-ui-title": colorName,
							"type": "button",
							"aria-label": colorName
						}
					});
					_fr0st_query.default.append(foreRow, foreLink);
					this.#ownComponent(_fr0st_ui.Tooltip.init(foreLink, {
						appendTo: document.body,
						placement: "bottom"
					}));
					this.#setToolbarData(foreLink, {
						command: "foreColor",
						value: color
					});
					const backLink = _fr0st_query.default.create("button", {
						class: this.constructor.classes.color,
						style: { backgroundColor: color },
						attributes: {
							"data-ui-title": colorName,
							"type": "button",
							"aria-label": colorName
						}
					});
					_fr0st_query.default.append(backRow, backLink);
					this.#ownComponent(_fr0st_ui.Tooltip.init(backLink, {
						appendTo: document.body,
						placement: "bottom"
					}));
					this.#setToolbarData(backLink, {
						command: "backColor",
						value: color
					});
				}
			}
			_fr0st_query.default.append(container, col1);
			_fr0st_query.default.append(container, col2);
			_fr0st_query.default.setStyle(dropdown, { minInlineSize: "min(350px, calc(100vw - 2rem))" });
			_fr0st_query.default.append(dropdown, container);
		}
		/**
		* Creates a deferred callback that cannot run after disposal.
		* @param {Function} callback The callback to defer.
		* @returns {Function} The guarded callback.
		*/
		#debounce(callback) {
			return _fr0st_query.default.debounce((...args) => {
				if (this.node) callback(...args);
			});
		}
		/**
		* Attaches events for the Editor.
		*/
		#events() {
			this.#eventsForm();
			this.#eventsToolbar();
			this.#eventsEditor();
			this.#eventsPopover();
			this.#eventsSource();
			this.#eventsDrop();
			let tabNavigation = false;
			this.listen(this.#container, "keydown.ui.editor", (event) => {
				if (![this.#editor, this.#source].includes(event.target)) {
					tabNavigation = false;
					return;
				}
				if (event.code === "Escape" && !this.#currentNode && !this.#fullScreen) tabNavigation = true;
				else if (event.code === "Tab" && tabNavigation) {
					tabNavigation = false;
					event.stopPropagation();
				} else if (!["ShiftLeft", "ShiftRight"].includes(event.code)) tabNavigation = false;
			}, { capture: true });
			this.listen(this.#container, "focusout.ui.editor", () => {
				tabNavigation = false;
			});
			this.listen(this.#container, "keydown.ui.editor", (event) => {
				if (event.code === "Escape" && this.#currentNode && !this.#modal) {
					event.preventDefault();
					this.#removePopover();
					this.#focusEditor();
				}
			});
			if (this.options.resizable) this.#eventsResize();
		}
		/**
		* Attaches drop events.
		*/
		#eventsDrop() {
			this.listen(this.#editor, "dragstart.ui.editor", (e) => {
				e.preventDefault();
			}, { delegate: "img" });
			this.listen(this.#dropTarget, "dragenter.ui.editor", (_) => {
				_fr0st_query.default.addClass(this.#dropText, this.constructor.classes.dropHover);
				_fr0st_query.default.setText(this.#dropText, this.constructor.lang.drop.drop);
				_fr0st_query.default.show(this.#dropTarget);
			});
			this.listen(this.#dropTarget, "dragleave.ui.editor", (_) => {
				this.#resetDropText();
			});
			this.listen(this.#dropTarget, "dragover.ui.editor", (e) => {
				e.preventDefault();
			});
			this.listen(this.#dropTarget, "drop.ui.editor", (e) => {
				e.preventDefault();
				resetDragCount();
				this.#resetDropText();
				_fr0st_query.default.hide(this.#dropTarget);
				if (e.dataTransfer.files.length) this.options.imageUpload.call(this, e.dataTransfer.files);
				else {
					const text = e.dataTransfer.getData("text");
					this.insertText(text);
				}
			});
		}
		/**
		* Attaches editor events.
		*/
		#eventsEditor() {
			this.listen(this.#editor, "paste.ui.editor", (event) => {
				event.preventDefault();
				if (event.clipboardData) {
					const html = event.clipboardData.getData("text/html");
					if (html) this.insertHtml(html);
					else this.insertText(event.clipboardData.getData("text/plain"));
				}
			});
			this.listen(this.#editor, "focus.ui.editor", (_) => {
				document.execCommand("defaultParagraphSeparator", false, "p");
				_fr0st_query.default.triggerEvent(this.node, "focus.ui.editor");
			});
			this.listen(this.#editor, "blur.ui.editor", (_) => {
				_fr0st_query.default.triggerEvent(this.node, "blur.ui.editor");
			});
			this.listen(this.#editor, "beforeinput.ui.editor", (e) => {
				if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
					if (e.cancelable) {
						e.preventDefault();
						this[e.inputType === "historyUndo" ? "undo" : "redo"]();
					}
				} else if (this.#history.length) this.#history.at(-1).selectionData = getSelectionData(this.#editor);
			});
			this.listen(this.#editor, "input.ui.editor", (e) => {
				switch (e.inputType) {
					case "historyUndo":
						if (!_fr0st_query.default.isSame(document.activeElement, this.#editor)) return;
						this.undo();
						return;
					case "historyRedo":
						if (!_fr0st_query.default.isSame(document.activeElement, this.#editor)) return;
						this.redo();
						return;
				}
				if (e.inputType !== "insertText") this.#normalize();
				this.#checkEmpty();
				this.#updateValue();
			});
			this.listen(this.#editor, "keydown.ui.editor", (e) => {
				if (this.options.keyDown) this.options.keyDown.call(this, e);
				if (e.defaultPrevented || !this.node) return;
				const selection = window.getSelection();
				const isIndented = (node) => {
					return [node, ..._fr0st_query.default.parents(node, null, this.#editor)].some((ancestor) => _fr0st_query.default.is(ancestor, "li") || parseFloat(_fr0st_query.default.getStyle(ancestor, "marginInlineStart") || _fr0st_query.default.getStyle(ancestor, "marginLeft")) > 0);
				};
				switch (e.code) {
					case "Backspace":
						if (selection.isCollapsed && _fr0st_query.default.isSame(selection.anchorNode, selection.focusNode) && (_fr0st_query.default._isElement(selection.anchorNode) && _fr0st_query.default.getText(selection.anchorNode) === "" && isIndented(selection.anchorNode) || _fr0st_query.default._isText(selection.anchorNode) && selection.anchorOffset === 0 && isIndented(_fr0st_query.default.parent(selection.anchorNode)))) {
							e.preventDefault();
							this.outdent();
						} else if (_fr0st_query.default.contents(this.#editor).length <= 1 && _fr0st_query.default.getText(this.#editor) === "") e.preventDefault();
						break;
					case "Delete":
						if (selection.isCollapsed && _fr0st_query.default.isSame(selection.anchorNode, selection.focusNode) && _fr0st_query.default.getText(selection.anchorNode) === "") {
							const nodes = [selection.anchorNode, ..._fr0st_query.default.parents(selection.anchorNode, null, this.#editor)];
							if (nodes.every((node) => _fr0st_query.default.contents(node).length <= 1)) {
								const lastParent = nodes.pop();
								const nextParent = _fr0st_query.default.next(lastParent).shift();
								let formatElement = "p";
								if (nextParent && _fr0st_query.default.is(nextParent, "h1, h2, h3, h4, h5, h6, pre")) formatElement = _fr0st_query.default.tagName(nextParent);
								this.#observe(false);
								this.#execCommand("formatBlock", formatElement);
								this.#observe();
							}
						}
						break;
					case "Tab": if (!e.ctrlKey && !e.metaKey && !e.altKey && !this.node.readOnly && !this.node.matches(":disabled")) {
						e.preventDefault();
						if (e.shiftKey) this.outdent();
						else this.indent();
					}
				}
			});
			this.listen(this.#editorContainer, "click.ui.editor", (_) => {
				_fr0st_query.default.focus(this.#editor);
			});
			this.listen(this.#editor, "click.ui.editor", (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (this.node.matches(":disabled") || this.node.readOnly) return;
				if (e.currentTarget.matches("img")) selectNode(e.currentTarget);
				this.#refreshPopover(e.currentTarget, e);
				this.#refreshToolbar();
			}, {
				delegate: "a, td, th, img",
				capture: true
			});
			this.#watchContent();
		}
		/**
		* Attaches native form, label, validation, and state synchronization.
		*/
		#eventsForm() {
			const focus = () => {
				if (this.node && !this.node.matches(":disabled")) (_fr0st_query.default.isVisible(this.#sourceContainer) ? this.#source : this.#editor).focus();
			};
			const labels = [...this.node.labels];
			const generated = [];
			for (const label of labels) {
				if (!label.id) {
					label.id = (0, _fr0st_ui.generateId)("editor-label");
					generated.push([label, label.id]);
				}
				this.listen(label, "click.ui.editor", (event) => {
					if (event.target === label || !event.target.closest("a, button, input, select, textarea")) {
						event.preventDefault();
						focus();
					}
				});
			}
			this.#labelledBy = labels.map((label) => label.id).join(" ");
			this.#refreshDisabled();
			this.listen(this.node, "focus.ui.editor", (event) => {
				if (event.target === document.activeElement) focus();
			});
			this.listen(this.node, "invalid.ui.editor", (event) => {
				event.preventDefault();
				this.#editor.setAttribute("aria-invalid", "true");
				this.#source.setAttribute("aria-invalid", "true");
				focus();
			});
			this.listen(this.node, "input.ui.editor change.ui.editor", (event) => {
				if (!event.skipUpdate) this.#loadValue();
			});
			const timers = /* @__PURE__ */ new Set();
			this.listen(this.node.ownerDocument, "reset.ui.editor", (event) => {
				if (event.target !== this.node.form) return;
				const timer = setTimeout(() => {
					timers.delete(timer);
					if (this.node && !event.defaultPrevented) {
						this.#removePopover();
						this.#loadValue(true);
					}
				}, 0);
				timers.add(timer);
			});
			const observer = new MutationObserver(() => {
				if (this.node) {
					this.#refreshDisabled();
					this.#refreshToolbar();
				}
			});
			observer.observe(this.node, { attributes: true });
			for (const fieldset of _fr0st_query.default.parents(this.node, "fieldset")) observer.observe(fieldset, {
				attributes: true,
				attributeFilter: ["disabled"]
			});
			this.onDispose(() => {
				observer.disconnect();
				for (const timer of timers) clearTimeout(timer);
				for (const [label, id] of generated) if (label.id === id) label.removeAttribute("id");
			});
		}
		/**
		* Attaches popover events.
		*/
		#eventsPopover() {
			this.listen(this.#popover, "click.ui.editor", (e) => {
				if (this.node.matches(":disabled") || this.node.readOnly) return;
				const action = _fr0st_query.default.getDataset(e.currentTarget, "uiAction");
				if (!(action in this.constructor.popovers)) throw new Error(`Unknown action ${action}`);
				e.preventDefault();
				e.stopPropagation();
				this.constructor.popovers[action].action.call(this, this.#currentNode);
				this.#refreshPopover(this.#currentNode);
			}, { delegate: "[data-ui-action]" });
			const downEvent = (e) => {
				if (!this.#currentNode || !_fr0st_query.default.is(this.#currentNode, "img")) return false;
				e.stopPropagation();
				_fr0st_query.default.hide(this.#imgCursor);
				_fr0st_query.default.hide(this.#popover);
				this.#observe(false);
			};
			const moveEvent = (e) => {
				const imgRect = _fr0st_query.default.rect(this.#currentNode, { offset: true });
				const ratio = imgRect.width / imgRect.height;
				const width = Math.max(e.pageX - imgRect.x, (e.pageY - imgRect.y) * ratio, 1);
				_fr0st_query.default.setStyle(this.#currentNode, { width: `${Math.round(width)}px` });
				this.#highlightImage(this.#currentNode);
			};
			const upEvent = (_) => {
				if (this.#currentNode?.isConnected && this.#editor.contains(this.#currentNode)) selectNode(this.#currentNode).collapse(false);
				this.#updateValue();
				this.#observe();
			};
			this.#bindDrag(this.#imgResize, downEvent, moveEvent, upEvent);
			this.listen(this.#imgResize, "keydown.ui.editor", (event) => {
				if (!["ArrowLeft", "ArrowRight"].includes(event.code) || !this.#currentNode || this.node.matches(":disabled") || this.node.readOnly) return;
				event.preventDefault();
				const width = Math.max(1, this.#currentNode.getBoundingClientRect().width + (event.code === "ArrowRight" ? 10 : -10));
				this.#currentNode.style.width = `${width}px`;
				this.#highlightImage(this.#currentNode);
				this.#updateValue();
			});
			this.listen(this.#editorBody, "scroll.ui.editor", (_) => {
				this.#removePopover();
			});
		}
		/**
		* Attaches resize events.
		*/
		#eventsResize() {
			let resizeOffset = 0;
			const downEvent = (e) => {
				const barPosition = _fr0st_query.default.position(this.#resizeBar, { offset: true });
				resizeOffset = e.pageY - barPosition.y;
				this.#removePopover();
			};
			const moveEvent = (e) => {
				const editorPosition = _fr0st_query.default.position(this.#editorBody, { offset: true });
				const height = Math.max(0, e.pageY - editorPosition.y - resizeOffset);
				_fr0st_query.default.setStyle(this.#editorBody, { height: `${height}px` });
				this.#resizeBar.setAttribute("aria-valuenow", String(Math.round(height)));
			};
			const upEvent = (_) => {
				resizeOffset = 0;
			};
			this.#bindDrag(this.#resizeBar, downEvent, moveEvent, upEvent);
			this.listen(this.#resizeBar, "keydown.ui.editor", (event) => {
				if (!["ArrowUp", "ArrowDown"].includes(event.code) || this.node.matches(":disabled") || this.node.readOnly) return;
				event.preventDefault();
				const height = Math.max(40, this.#editorBody.getBoundingClientRect().height + (event.code === "ArrowDown" ? 10 : -10));
				this.#editorBody.style.height = `${height}px`;
				this.#resizeBar.setAttribute("aria-valuenow", String(Math.round(height)));
			});
		}
		/**
		* Registers this instance's callbacks for the shared document listeners.
		*/
		#eventsShared() {
			addEditor(this, {
				showDropTarget: () => this.#showDropTarget(),
				resetDropTarget: () => {
					this.#resetDropText();
					_fr0st_query.default.hide(this.#dropTarget);
				},
				removePopover: () => this.#removePopover(),
				selectionChange: (range) => {
					if (!range || !this.#editor.contains(range.startContainer) || !this.#editor.contains(range.endContainer)) {
						this.#removePopover();
						return;
					}
					this.#lastRange = range.cloneRange();
					this.#refreshCursor();
					this.#refreshToolbar();
				},
				resize: () => {
					if (this.#currentNode?.matches("img")) this.#highlightImage(this.#currentNode);
					this.#refreshLineNumbers();
				}
			});
		}
		/**
		* Attaches source events.
		*/
		#eventsSource() {
			this.listen(this.#source, "focus.ui.editor", () => _fr0st_query.default.triggerEvent(this.node, "focus.ui.editor"));
			this.listen(this.#source, "blur.ui.editor", () => _fr0st_query.default.triggerEvent(this.node, "blur.ui.editor"));
			const refreshLineNumbersDebounced = this.#debounce((_) => {
				this.#refreshLineNumbers();
			});
			this.listen(this.#source, "input.ui.editor change.ui.editor", (_) => {
				if (this.node.matches(":disabled") || this.node.readOnly) return;
				refreshLineNumbersDebounced();
				const template = document.createElement("template");
				template.innerHTML = this.#source.value;
				const html = serialize(template.content, template.innerHTML);
				if (this.node.value !== html) {
					this.node.value = html;
					if (this.node.validity.valid && !this.node.hasAttribute("aria-invalid")) {
						this.#source.removeAttribute("aria-invalid");
						this.#editor.removeAttribute("aria-invalid");
					}
					notifyChange(this.node);
				}
			});
			this.listen(this.#source, "keydown.ui.editor", (e) => {
				if (e.code !== "Tab" || e.ctrlKey || e.metaKey || e.altKey || this.node.readOnly || this.node.matches(":disabled")) return;
				e.preventDefault();
				const start = _fr0st_query.default.getProperty(this.#source, "selectionStart");
				const end = _fr0st_query.default.getProperty(this.#source, "selectionEnd");
				const value = _fr0st_query.default.getValue(this.#source);
				const lines = value.split("\n");
				const startLine = value.substring(0, start).split("\n").length - 1;
				const endLine = value.substring(0, end).split("\n").length - 1;
				const lineStarts = [];
				let offset = 0;
				for (const line of lines) {
					lineStarts.push(offset);
					offset += line.length + 1;
				}
				const lastLine = end > start && end === lineStarts[endLine] ? endLine - 1 : endLine;
				const tab = "	";
				let newStart = start;
				let newEnd = end;
				let newValue;
				if (e.shiftKey) {
					for (const [i, line] of lines.entries()) if (i >= startLine && i <= lastLine && line.startsWith(tab)) {
						lines[i] = line.substring(1);
						if (lineStarts[i] < start) newStart--;
						if (lineStarts[i] < end) newEnd--;
					}
					newValue = lines.join("\n");
				} else if (startLine !== endLine) {
					for (const [i, line] of lines.entries()) if (i >= startLine && i <= lastLine) {
						lines[i] = tab + line;
						if (lineStarts[i] < start) newStart++;
						newEnd++;
					}
					newValue = lines.join("\n");
				} else {
					newValue = value.substring(0, start) + "	" + value.substring(end);
					newStart++;
					if (start === end) newEnd++;
					else newEnd = newStart;
				}
				_fr0st_query.default.select(this.#source);
				document.execCommand("insertText", false, newValue);
				this.#source.setSelectionRange(newStart, newEnd);
			});
			this.listen(this.#source, "scroll.ui.editor", this.#debounce((_) => {
				const scrollY = _fr0st_query.default.getScrollY(this.#source);
				_fr0st_query.default.setStyle(this.#lineNumbers, { marginTop: `${-scrollY}px` });
			}));
		}
		/**
		* Attaches toolbar events.
		*/
		#eventsToolbar() {
			this.listen(this.#toolbar, "click.ui.editor", (e) => {
				const action = _fr0st_query.default.getDataset(e.currentTarget, "uiAction");
				if (!(action in this.constructor.plugins)) throw new Error(`Unknown action ${action}`);
				e.preventDefault();
				e.stopPropagation();
				if (_fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly && !["source", "fullScreen"].includes(action) || _fr0st_query.default.is(e.currentTarget, "[aria-disabled=\"true\"]")) return;
				if (this.#lastRange && this.#editor.contains(this.#lastRange.startContainer) && this.#editor.contains(this.#lastRange.endContainer)) {
					const selection = window.getSelection();
					selection.removeAllRanges();
					selection.addRange(this.#lastRange);
				}
				this.constructor.plugins[action].action.call(this);
			}, { delegate: "[data-ui-action]" });
			this.listen(this.#toolbar, "click.ui.editor", (e) => {
				if (this.node.matches(":disabled") || this.node.readOnly || e.currentTarget.matches("[aria-disabled=\"true\"]")) return;
				const command = _fr0st_query.default.getDataset(e.currentTarget, "uiCommand");
				if (!(command in this)) throw new Error(`Unknown command ${command}`);
				e.preventDefault();
				if (this.#lastRange) {
					const selection = window.getSelection();
					selection.removeAllRanges();
					selection.addRange(this.#lastRange);
				}
				const value = _fr0st_query.default.getDataset(e.currentTarget, "uiValue");
				this[command](value);
				this.#refreshToolbar();
			}, { delegate: "[data-ui-command]" });
		}
		/**
		* Executes a command.
		* @param {string} command The command.
		* @param {boolean | string} [value] The command argument.
		*/
		#execCommand(command, value) {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly) return;
			this.#focusEditor();
			if (!this.node) return;
			this.#addHistory({
				html: this.#editor.innerHTML,
				selectionData: getSelectionData(this.#editor)
			});
			this.#observe(false);
			try {
				document.execCommand("styleWithCSS", false, ![
					"bold",
					"indent",
					"italic",
					"outdent",
					"strikethrough",
					"subscript",
					"superscript",
					"underline"
				].includes(command));
				document.execCommand(command, false, value);
				this.#normalize();
				this.#checkEmpty();
				this.#updateValue();
			} finally {
				this.#observe();
			}
		}
		/**
		* Ensures the editor element has focus.
		*/
		#focusEditor() {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled")) return;
			if (document.activeElement === this.#editor && getRange(this.#editor)) return;
			const current = getRange(this.#editor)?.cloneRange();
			const selection = window.getSelection();
			const backward = current && !current.collapsed && selection.anchorNode === current.endContainer && selection.anchorOffset === current.endOffset;
			const saved = this.#lastRange;
			_fr0st_query.default.focus(this.#editor);
			if (!this.node) return;
			if (current) selectRange(current, backward);
			else if (saved && this.#editor.contains(saved.startContainer) && this.#editor.contains(saved.endContainer)) selectRange(saved);
			else {
				const range = document.createRange();
				let target = this.#editor;
				const opaque = (node) => node instanceof Element && node.matches("br, img, hr, iframe, input, video, audio, svg");
				while (target.lastChild && !opaque(target)) target = target.lastChild;
				if (opaque(target)) {
					if (target.matches("br")) range.setStartBefore(target);
					else range.setStartAfter(target);
				} else range.selectNodeContents(target);
				range.collapse(false);
				selectRange(range);
			}
		}
		/**
		* Renders a font dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		#fontDropdown(dropdown) {
			const fonts = this.#fonts.sort();
			for (const font of fonts) {
				const button = _fr0st_query.default.create("button", {
					text: font,
					class: this.constructor.classes.dropdownItem,
					style: { fontFamily: font },
					attributes: {
						"type": "button",
						"aria-label": font
					}
				});
				const data = {
					command: "fontName",
					value: font
				};
				this.#buttons.push({
					button,
					data
				});
				this.#setToolbarData(button, data);
				_fr0st_query.default.append(dropdown, button);
			}
		}
		/**
		* Renders a font size dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		#fontSizeDropdown(dropdown) {
			const sizes = Object.values(this.constructor.fontSizes);
			for (const size of sizes) {
				const button = _fr0st_query.default.create("button", {
					text: size,
					class: this.constructor.classes.dropdownItem,
					attributes: {
						"type": "button",
						"aria-label": size
					}
				});
				const data = {
					command: "fontSize",
					value: size
				};
				this.#buttons.push({
					button,
					data
				});
				this.#setToolbarData(button, data);
				_fr0st_query.default.append(dropdown, button);
			}
		}
		/**
		* Highlights an image.
		* @param {HTMLElement} image The image element.
		*/
		#highlightImage(image) {
			_fr0st_query.default.hide(this.#imgHighlight);
			_fr0st_query.default.hide(this.#imgCursor);
			const imgRect = _fr0st_query.default.rect(image, { offset: true });
			const editorPos = _fr0st_query.default.position(this.#editor, { offset: true });
			const scrollX = _fr0st_query.default.getScrollX(this.#editorScroll);
			const scrollY = _fr0st_query.default.getScrollY(this.#editorScroll);
			const imgX = Math.round(imgRect.x);
			const imgY = Math.round(imgRect.y);
			const imgWidth = Math.round(imgRect.width);
			const imgHeight = Math.round(imgRect.height);
			_fr0st_query.default.setStyle(this.#imgHighlight, {
				top: `${imgY - editorPos.y + scrollY - 2}px`,
				left: `${imgX - editorPos.x + scrollX - 2}px`,
				width: `${imgWidth + 2}px`,
				height: `${imgHeight + 2}px`
			});
			this.#imgResize.setAttribute("aria-valuenow", String(imgWidth));
			_fr0st_query.default.setText(this.#imgSize, `${imgWidth}x${imgHeight}`);
			if (imgWidth < 100 || imgHeight < 50) _fr0st_query.default.hide(this.#imgSize);
			else _fr0st_query.default.show(this.#imgSize);
			_fr0st_query.default.show(this.#imgHighlight);
			_fr0st_query.default.show(this.#imgCursor);
		}
		/**
		* Loads an external value and starts a fresh history after native reset.
		* @param {boolean} [reset=false] Whether to clear history.
		*/
		#loadValue(reset = false) {
			this.#observe(false);
			try {
				this.#editor.innerHTML = this.node.value;
				this.#normalize();
				this.#checkEmpty();
				this.node.value = serialize(this.#editor);
				this.#source.value = this.node.value;
				this.#lastRange = null;
				if (reset) {
					this.#history = [];
					this.#redoHistory = [];
				}
				if (this.#history.at(-1)?.html !== this.#editor.innerHTML) this.#redoHistory = [];
				this.#addHistory({ html: this.#editor.innerHTML });
				this.#refreshDisabled();
				this.#refreshToolbar();
				this.#refreshLineNumbers();
			} finally {
				this.#observe();
			}
		}
		/**
		* Normalizes the editor.
		*/
		#normalize() {
			if (!this.node) return;
			const active = document.activeElement;
			this.#observe(false);
			normalizeText(this.#editor);
			const markers = saveSelection(this.#editor);
			try {
				normalizeStyles(this.#editor);
				normalizeSpans(this.#editor);
				normalizePhrasing(this.#editor);
				joinAdjacentNodes(this.#editor, markers);
			} finally {
				restoreSelection(markers);
				normalizeText(this.#editor);
				this.#observe();
				if (active instanceof HTMLElement && active !== document.body && active.isConnected && !this.#editor?.contains(active) && document.activeElement !== active) active.focus({ preventScroll: true });
			}
		}
		/**
		* Suspends or resumes content observation with balanced nested calls.
		* @param {boolean} [observe=true] Whether to resume observation.
		*/
		#observe(observe = true) {
			if (!this.node || !this.#observer) return;
			if (!observe) {
				if (this.#observationDepth++ === 0) {
					this.#pendingMutation ||= this.#observer.takeRecords().some((record) => record.type !== "attributes" || record.target !== this.#editor);
					this.#observer.disconnect();
				}
				return;
			}
			this.#observationDepth = Math.max(0, this.#observationDepth - 1);
			if (this.#observationDepth === 0) {
				this.#observer.observe(this.#editor, {
					attributes: true,
					childList: true,
					characterData: true,
					subtree: true
				});
				if (this.#pendingMutation) {
					this.#pendingMutation = false;
					this.#debounce(() => {
						if (_fr0st_query.default.isVisible(this.#sourceContainer)) return;
						this.#normalize();
						this.#checkEmpty();
						this.#updateValue();
					})();
				}
			}
		}
		/**
		* Owns a child UI component until disposal.
		* @template {BaseComponent} T
		* @param {T} component The child component.
		* @returns {T} The child component.
		*/
		#ownComponent(component) {
			if (!this.node) {
				component.dispose();
				return component;
			}
			for (const owned of this.#components) if (!owned.node) this.#components.delete(owned);
			this.#components.add(component);
			return component;
		}
		/**
		* Reads an uploaded file and aborts the read when this editor is disposed.
		* @param {File} file The uploaded file.
		* @returns {Promise<string>} The file data URL.
		*/
		#readImage(file) {
			return new Promise((resolve, reject) => {
				if (!this.node) {
					reject(/* @__PURE__ */ new Error("Editor is disposed."));
					return;
				}
				const reader = new FileReader();
				this.#readers.add(reader);
				const finish = () => {
					this.#readers.delete(reader);
					reader.onload = null;
					reader.onerror = null;
					reader.onabort = null;
				};
				reader.onload = () => {
					const value = reader.result;
					finish();
					resolve(value);
				};
				reader.onerror = () => {
					finish();
					reject(/* @__PURE__ */ new Error("Unable to read file."));
				};
				reader.onabort = () => {
					finish();
					reject(/* @__PURE__ */ new Error("File read was canceled."));
				};
				try {
					reader.readAsDataURL(file);
				} catch (error) {
					finish();
					reject(error);
				}
			});
		}
		/**
		* Refreshes the popover at cursor.
		*/
		#refreshCursor() {
			const baseNode = window.getSelection().anchorNode;
			if (!_fr0st_query.default.hasDescendent(this.#editor, baseNode)) {
				this.#removePopover();
				return;
			}
			const range = getRange(this.#editor);
			if (this.#currentNode && range && (!range.collapsed && range.intersectsNode(this.#currentNode) || this.#currentNode.contains(baseNode))) return;
			const currentNode = _fr0st_query.default.is(baseNode, "a") ? baseNode : _fr0st_query.default.closest(baseNode, "a", this.#editor).shift();
			if (!currentNode) {
				this.#removePopover();
				return;
			}
			this.#refreshPopover(currentNode);
		}
		/**
		* Refreshes the editor disabled.
		*/
		#refreshDisabled() {
			const disabled = this.node.matches(":disabled");
			const readOnly = this.node.readOnly;
			if (disabled) _fr0st_query.default.addClass(this.#editor, this.constructor.classes.editorDisabled);
			else _fr0st_query.default.removeClass(this.#editor, this.constructor.classes.editorDisabled);
			this.#editor.setAttribute("contenteditable", String(!disabled && !readOnly));
			this.#editor.setAttribute("tabindex", disabled ? "-1" : this.node.getAttribute("tabindex") || "0");
			this.#source.disabled = disabled;
			this.#source.readOnly = readOnly;
			for (const handle of [this.#imgResize, this.#resizeBar].filter(Boolean)) {
				handle.setAttribute("tabindex", disabled || readOnly ? "-1" : "0");
				handle.setAttribute("aria-disabled", String(disabled || readOnly));
			}
			for (const surface of [this.#editor, this.#source]) {
				surface.setAttribute("aria-disabled", String(disabled));
				surface.setAttribute("aria-readonly", String(readOnly));
				surface.setAttribute("aria-required", String(this.node.required));
				for (const name of [
					"aria-label",
					"aria-labelledby",
					"aria-describedby",
					"aria-errormessage",
					"aria-invalid",
					"dir",
					"lang"
				]) {
					const value = this.node.getAttribute(name) || (name === "aria-labelledby" && !this.node.hasAttribute("aria-label") ? this.#labelledBy : null);
					if (value) surface.setAttribute(name, value);
					else surface.removeAttribute(name);
				}
			}
			this.#container.classList.toggle("form-error", this.node.classList.contains("form-error"));
			if (disabled || readOnly) {
				this.#removePopover();
				for (const toggle of this.#toolbar.querySelectorAll("[data-ui-toggle=\"dropdown\"]")) _fr0st_ui.Dropdown.init(toggle).hide();
			}
		}
		/**
		* Refreshes the source line numbers.
		*/
		#refreshLineNumbers() {
			if (!this.node) return;
			if (!_fr0st_query.default.isVisible(this.#sourceContainer)) return;
			const lineNumbers = _fr0st_query.default.contents(this.#lineNumbers);
			const lines = _fr0st_query.default.getValue(this.#source).split("\n");
			const test = _fr0st_query.default.create("div", { style: {
				width: _fr0st_query.default.width(this.#source, { boxSize: _fr0st_query.default.CONTENT_BOX }),
				padding: 0,
				border: 0,
				font: _fr0st_query.default.css(this.#source, "font"),
				letterSpacing: _fr0st_query.default.css(this.#source, "letterSpacing"),
				whiteSpace: _fr0st_query.default.css(this.#source, "whiteSpace"),
				wordBreak: _fr0st_query.default.css(this.#source, "wordBreak"),
				wordSpacing: _fr0st_query.default.css(this.#source, "wordSpacing"),
				wordWrap: _fr0st_query.default.css(this.#source, "wordWrap")
			} });
			_fr0st_query.default.append(document.body, test);
			for (const [i, line] of lines.entries()) {
				let lineNumber;
				if (i < lineNumbers.length) lineNumber = lineNumbers[i];
				else {
					lineNumber = _fr0st_query.default.create("div", { text: i + 1 });
					_fr0st_query.default.append(this.#lineNumbers, lineNumber);
				}
				_fr0st_query.default.setText(test, line || " ");
				const { height } = _fr0st_query.default.rect(test);
				_fr0st_query.default.setStyle(lineNumber, { height: `${height}px` });
			}
			_fr0st_query.default.detach(test);
			if (lineNumbers.length > lines.length) _fr0st_query.default.detach(lineNumbers.slice(lines.length));
		}
		/**
		* Refreshes the popover.
		* @param {HTMLElement} currentNode The current selected node.
		* @param {Event} [event] The current event.
		*/
		#refreshPopover(currentNode, event) {
			if (!this.node) return;
			if (_fr0st_query.default.isSame(currentNode, this.#currentNode)) return;
			this.#removePopover();
			this.#currentNode = currentNode;
			if (!this.#currentNode) return;
			const tagName = _fr0st_query.default.tagName(this.#currentNode);
			let reference = this.#currentNode;
			if (event && tagName === "img") {
				const editorPos = _fr0st_query.default.position(this.#editor, { offset: true });
				const scrollX = _fr0st_query.default.getScrollX(this.#editorScroll);
				const scrollY = _fr0st_query.default.getScrollY(this.#editorScroll);
				_fr0st_query.default.setStyle(this.#imgCursor, {
					top: `${event.pageY - editorPos.y + scrollY}px`,
					left: `${event.pageX - editorPos.x + scrollX}px`
				});
				reference = this.#imgCursor;
			}
			const originalPlacement = reference.getAttribute("data-ui-placement");
			this.#popper = new _fr0st_ui.Popper(this.#popover, {
				reference,
				arrow: this.#popoverArrow,
				container: this.#editor,
				placement: "bottom",
				position: "start",
				minContact: 0,
				afterUpdate: (_, anchor) => {
					if (this.#editor?.contains(anchor)) {
						if (originalPlacement === null) anchor.removeAttribute("data-ui-placement");
						else anchor.setAttribute("data-ui-placement", originalPlacement);
					}
				}
			});
			_fr0st_query.default.addClass(this.#popover, this.constructor.classes.popoverShow);
			_fr0st_query.default.show(this.#popover);
			switch (tagName) {
				case "a":
					this.#renderPopoverItems(this.options.popovers.link);
					break;
				case "img":
					this.#renderPopoverItems(this.options.popovers.image);
					this.#highlightImage(this.#currentNode);
					_fr0st_query.default.show(this.#imgHighlight);
					break;
				case "td":
				case "th": this.#renderPopoverItems(this.options.popovers.table);
			}
			this.#popper.update();
		}
		/**
		* Refreshes the toolbar.
		*/
		#refreshToolbar() {
			if (!this.node) return;
			const isDisabled = _fr0st_query.default.is(this.node, ":disabled");
			const isSource = _fr0st_query.default.isVisible(this.#sourceContainer);
			for (const { button, data, type } of this.#buttons) {
				if ("setContent" in data) {
					const content = data.setContent.call(this);
					_fr0st_query.default.setHtml(button, content);
				}
				let enabled = false;
				if ("command" in data) enabled = "value" in data ? document.queryCommandValue(data.command) === data.value : document.queryCommandState(data.command);
				if (enabled) {
					_fr0st_query.default.addClass(button, "active");
					_fr0st_query.default.setAttribute(button, { "aria-pressed": true });
				} else {
					_fr0st_query.default.removeClass(button, "active");
					_fr0st_query.default.removeAttribute(button, "aria-pressed");
				}
				if (isDisabled || this.node.readOnly && !["source", "fullScreen"].includes(type) || isSource && !["source", "fullScreen"].includes(type) || "disableCheck" in data && data.disableCheck.call(this)) {
					_fr0st_query.default.addClass(button, "disabled");
					_fr0st_query.default.setAttribute(button, {
						"aria-disabled": true,
						"disabled": true
					});
				} else {
					_fr0st_query.default.removeClass(button, "disabled");
					_fr0st_query.default.removeAttribute(button, "aria-disabled");
					_fr0st_query.default.removeAttribute(button, "disabled");
				}
			}
		}
		/**
		* Removes the modal.
		*/
		#removeModal() {
			if (!this.#modal) return;
			_fr0st_ui.Modal.init(this.#modal).dispose();
			_fr0st_query.default.remove(this.#modal);
			this.#modal = null;
		}
		/**
		* Removes the popover.
		*/
		#removePopover() {
			if (!this.#currentNode) return;
			_fr0st_query.default.hide(this.#imgHighlight);
			_fr0st_query.default.hide(this.#imgCursor);
			_fr0st_query.default.removeClass(this.#popover, this.constructor.classes.popoverShow);
			_fr0st_query.default.hide(this.#popover);
			_fr0st_query.default.empty(this.#popoverBody);
			this.#popper.dispose();
			this.#popper = null;
			this.#currentNode = null;
		}
		/**
		* Renders the editor.
		*/
		#render() {
			this.#container = _fr0st_query.default.create("div", { class: this.constructor.classes.container });
			this.#renderToolbar();
			this.#editorBody = _fr0st_query.default.create("div", {
				class: this.constructor.classes.editorBody,
				style: { height: this.options.height }
			});
			_fr0st_query.default.append(this.#container, this.#editorBody);
			this.#renderEditor();
			this.#renderSource();
			this.#renderPopover();
			this.#renderDrop();
			if (this.options.resizable) this.#renderResize();
			_fr0st_query.default.hide(this.node);
			_fr0st_query.default.setAttribute(this.node, { "aria-hidden": true });
			_fr0st_query.default.insertBefore(this.#container, this.node);
			if (this.#resizeBar) this.#resizeBar.setAttribute("aria-valuenow", String(Math.round(this.#editorBody.getBoundingClientRect().height)));
		}
		/**
		* Renders a button
		* @param {object} data The button data.
		* @returns {HTMLElement} The button.
		*/
		#renderButton(data) {
			const button = _fr0st_query.default.create("button", {
				class: this.constructor.classes.btn,
				attributes: { type: "button" }
			});
			if (data.setTitle) data.title = data.setTitle.call(this);
			if (data.title) {
				_fr0st_query.default.setAttribute(button, {
					"title": data.title,
					"aria-label": data.title
				});
				const tooltip = this.#ownComponent(_fr0st_ui.Tooltip.init(button, {
					appendTo: document.body,
					placement: "bottom"
				}));
				this.listen(button, "click.ui.editor", () => tooltip.hide());
			}
			if ("content" in data) _fr0st_query.default.setHtml(button, data.content);
			else {
				const content = _fr0st_query.default.parseHtml(this.constructor.icons[data.icon]);
				_fr0st_query.default.addClass(content, this.constructor.classes.btnIcon);
				_fr0st_query.default.append(button, content);
			}
			return button;
		}
		/**
		* Renders the drop elements.
		*/
		#renderDrop() {
			this.#dropTarget = _fr0st_query.default.create("div", { class: this.constructor.classes.dropTarget });
			this.#dropText = _fr0st_query.default.create("span", {
				text: this.constructor.lang.drop.dropHere,
				class: this.constructor.classes.dropText
			});
			_fr0st_query.default.append(this.#dropTarget, this.#dropText);
			_fr0st_query.default.hide(this.#dropTarget);
			_fr0st_query.default.append(this.#container, this.#dropTarget);
		}
		/**
		* Renders the editor elements.
		*/
		#renderEditor() {
			this.#editorScroll = _fr0st_query.default.create("div", { class: this.constructor.classes.editorScroll });
			this.#editorContainer = _fr0st_query.default.create("div", { class: this.constructor.classes.editorContainer });
			this.#editor = _fr0st_query.default.create("div", {
				class: this.constructor.classes.editor,
				style: { fontFamily: this.#defaultFont },
				attributes: {
					"role": "textbox",
					"aria-multiline": true,
					"spellcheck": true,
					"autocorrect": true
				}
			});
			this.#imgHighlight = _fr0st_query.default.create("div", { class: this.constructor.classes.imgHighlight });
			this.#imgCursor = _fr0st_query.default.create("div", { class: this.constructor.classes.imgCursor });
			this.#imgSize = _fr0st_query.default.create("div", { class: this.constructor.classes.imgSize });
			this.#imgResize = _fr0st_query.default.create("div", {
				class: this.constructor.classes.imgResize,
				attributes: {
					"role": "slider",
					"tabindex": 0,
					"aria-label": this.constructor.lang.resizeImage,
					"aria-valuemin": 1,
					"aria-valuenow": 1
				}
			});
			_fr0st_query.default.hide(this.#imgHighlight);
			_fr0st_query.default.append(this.#imgHighlight, this.#imgSize);
			_fr0st_query.default.append(this.#imgHighlight, this.#imgResize);
			_fr0st_query.default.append(this.#editorContainer, this.#imgCursor);
			_fr0st_query.default.append(this.#editorContainer, this.#imgHighlight);
			_fr0st_query.default.append(this.#editorContainer, this.#editor);
			_fr0st_query.default.append(this.#editorScroll, this.#editorContainer);
			_fr0st_query.default.append(this.#editorBody, this.#editorScroll);
		}
		/**
		* Renders the popover elements.
		*/
		#renderPopover() {
			this.#popover = _fr0st_query.default.create("div", {
				class: this.constructor.classes.popover,
				attributes: {
					"role": "group",
					"aria-label": this.constructor.lang.contextToolbar
				}
			});
			this.#popoverArrow = _fr0st_query.default.create("div", { class: this.constructor.classes.popoverArrow });
			this.#popoverBody = _fr0st_query.default.create("div", { class: this.constructor.classes.popoverBody });
			_fr0st_query.default.hide(this.#popover);
			_fr0st_query.default.append(this.#popover, this.#popoverArrow);
			_fr0st_query.default.append(this.#popover, this.#popoverBody);
			_fr0st_query.default.append(this.#container, this.#popover);
		}
		/**
		* Renders a popover item.
		* @param {string} type The item type.
		* @param {HTMLElement} parent The parent element.
		*/
		#renderPopoverItem(type, parent) {
			const data = this.constructor.popovers[type];
			let node;
			if (data.render) node = data.render.call(this, this.#currentNode);
			else {
				node = this.#renderButton({
					icon: type,
					title: this.constructor.lang.popovers[type],
					...data
				});
				_fr0st_query.default.setDataset(node, { uiAction: type });
			}
			_fr0st_query.default.append(parent, node);
		}
		/**
		* Renders popover items.
		* @param {Array} items The items to render.
		*/
		#renderPopoverItems(items) {
			for (const item of items) if (_fr0st_query.default._isString(item)) this.#renderPopoverItem(item, this.#popoverBody);
			else {
				const node = _fr0st_query.default.create("div", {
					class: this.constructor.classes.btnGroup,
					attributes: { role: "group" }
				});
				for (const type of item) this.#renderPopoverItem(type, node);
				_fr0st_query.default.append(this.#popoverBody, node);
			}
		}
		/**
		* Renders the resize bar.
		*/
		#renderResize() {
			this.#resizeBar = _fr0st_query.default.create("div", {
				class: this.constructor.classes.resizeBar,
				attributes: {
					"role": "separator",
					"tabindex": 0,
					"aria-label": this.constructor.lang.resizeEditor,
					"aria-orientation": "horizontal",
					"aria-valuenow": 0
				}
			});
			for (let i = 0; i < 3; i++) {
				const hr = _fr0st_query.default.create("hr", { attributes: { "aria-hidden": true } });
				_fr0st_query.default.append(this.#resizeBar, hr);
			}
			_fr0st_query.default.append(this.#container, this.#resizeBar);
		}
		/**
		* Renders the source elements.
		*/
		#renderSource() {
			this.#sourceOuter = _fr0st_query.default.create("div", { class: this.constructor.classes.sourceOuter });
			this.#sourceContainer = _fr0st_query.default.create("div", { class: this.constructor.classes.sourceContainer });
			this.#lineNumbers = _fr0st_query.default.create("div", {
				class: this.constructor.classes.sourceLines,
				attributes: { "aria-hidden": true }
			});
			this.#sourceScroll = _fr0st_query.default.create("div", { class: this.constructor.classes.sourceScroll });
			this.#source = _fr0st_query.default.create("textarea", { class: this.constructor.classes.source });
			_fr0st_query.default.hide(this.#sourceOuter);
			_fr0st_query.default.append(this.#sourceScroll, this.#source);
			_fr0st_query.default.append(this.#sourceContainer, this.#lineNumbers);
			_fr0st_query.default.append(this.#sourceContainer, this.#sourceScroll);
			_fr0st_query.default.append(this.#sourceOuter, this.#sourceContainer);
			_fr0st_query.default.append(this.#editorBody, this.#sourceOuter);
		}
		/**
		* Renders the toolbar.
		*/
		#renderToolbar() {
			const header = _fr0st_query.default.create("div", { class: this.constructor.classes.toolbar });
			this.#toolbar = _fr0st_query.default.create("div", {
				class: this.constructor.classes.toolbarButtons,
				attributes: {
					"role": "toolbar",
					"aria-label": this.constructor.lang.toolbar
				}
			});
			for (const buttons of this.#toolbarButtons) {
				const buttonGroup = _fr0st_query.default.create("div", { class: this.constructor.classes.btnGroup });
				for (const type of buttons) this.#renderToolbarButton(type, buttonGroup);
				_fr0st_query.default.append(this.#toolbar, buttonGroup);
			}
			_fr0st_query.default.append(header, this.#toolbar);
			_fr0st_query.default.append(this.#container, header);
		}
		/**
		* Renders a toolbar button.
		* @param {string} type The button type.
		* @param {HTMLElement} parent The parent element.
		*/
		#renderToolbarButton(type, parent) {
			const data = this.constructor.plugins[type];
			const button = this.#renderButton({
				icon: type,
				title: this.constructor.lang.plugins[type],
				...data
			});
			this.#buttons.push({
				button,
				data,
				type
			});
			this.#setToolbarData(button, data, type);
			if ("dropdown" in data) this.#renderToolbarDropdown(parent, button, data.dropdown);
			else _fr0st_query.default.append(parent, button);
		}
		/**
		* Renders a toolbar dropdown.
		* @param {HTMLElement} buttonGroup The button group element.
		* @param {HTMLElement} button The button element.
		* @param {Array|Function} dropdownContent The dropdown content.
		*/
		#renderToolbarDropdown(buttonGroup, button, dropdownContent) {
			const dropGroup = _fr0st_query.default.create("div", {
				class: this.constructor.classes.dropdownGroup,
				attributes: { role: "group" }
			});
			_fr0st_query.default.addClass(button, this.constructor.classes.dropdownToggle);
			_fr0st_query.default.setDataset(button, { uiToggle: "dropdown" });
			_fr0st_query.default.setAttribute(button, {
				"aria-haspopup": true,
				"aria-expanded": false
			});
			_fr0st_query.default.append(dropGroup, button);
			const dropdown = _fr0st_query.default.create("div", { class: this.constructor.classes.dropdown });
			if (_fr0st_query.default._isArray(dropdownContent)) {
				_fr0st_query.default.addClass(dropdown, this.constructor.classes.dropdownButtons);
				for (const dropdownItems of dropdownContent) {
					const subDropGroup = _fr0st_query.default.create("div", {
						class: this.constructor.classes.btnGroup,
						attributes: { role: "group" }
					});
					for (const type of dropdownItems) this.#renderToolbarButton(type, subDropGroup);
					_fr0st_query.default.append(dropdown, subDropGroup);
				}
			} else if (_fr0st_query.default._isFunction(dropdownContent)) dropdownContent.call(this, dropdown);
			_fr0st_query.default.append(dropGroup, dropdown);
			_fr0st_query.default.append(buttonGroup, dropGroup);
			this.#ownComponent(_fr0st_ui.Dropdown.init(button));
			this.listen(document, "keydown.ui.editor", (event) => {
				if (event.code === "Escape" && dropdown.contains(document.activeElement)) button.focus();
			}, { capture: true });
		}
		/**
		* Resets the drop text.
		*/
		#resetDropText() {
			_fr0st_query.default.removeClass(this.#dropText, this.constructor.classes.dropHover);
			_fr0st_query.default.setText(this.#dropText, this.constructor.lang.drop.dropHere);
		}
		/**
		* Restores content and its selection without creating another history entry.
		* @param {EditorHistoryEntry} data The snapshot.
		*/
		#restoreHistory({ html, selectionData = null }) {
			if (!this.node) return;
			const previous = _fr0st_query.default.getValue(this.node);
			this.#observe(false);
			try {
				_fr0st_query.default.setHtml(this.#editor, html);
				const value = serialize(this.#editor);
				_fr0st_query.default.setValue(this.node, value);
				_fr0st_query.default.setValue(this.#source, value);
				this.#focusEditor();
				if (!this.node) return;
				restoreSelectionData(this.#editor, selectionData);
				this.#checkEmpty();
				this.#refreshDisabled();
				this.#refreshToolbar();
			} finally {
				this.#observe();
			}
			if (this.node && previous !== this.node.value) notifyChange(this.node);
		}
		/**
		* Sets data for a toolbar action.
		* @param {HTMLElement} node The action node.
		* @param {object} data The data to set.
		* @param {string} [type] The action type.
		*/
		#setToolbarData(node, data, type) {
			if (data.command) {
				_fr0st_query.default.setDataset(node, { uiCommand: data.command });
				if (data.value) _fr0st_query.default.setDataset(node, { uiValue: data.value });
			} else if (data.action && type) _fr0st_query.default.setDataset(node, { uiAction: type });
		}
		/**
		* Shows the drop target.
		*/
		#showDropTarget() {
			if (_fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly || _fr0st_query.default.isVisible(this.#sourceContainer)) return;
			_fr0st_query.default.show(this.#dropTarget);
		}
		/**
		* Shows the editor.
		*/
		#showEditor() {
			_fr0st_query.default.show(this.#editorScroll);
			_fr0st_query.default.hide(this.#sourceOuter);
		}
		/**
		* Shows the image modal.
		*/
		#showImageModal() {
			this.#removeModal();
			const returnFocus = document.activeElement;
			const container = _fr0st_query.default.create("div");
			const { group: fileGroup, input: fileInput } = createFileInput(this.constructor, {
				id: (0, _fr0st_ui.generateId)("editor-image-file"),
				label: this.constructor.lang.modals.imageFile,
				attributes: {
					accept: "image/*",
					multiple: true
				}
			});
			const { group: urlGroup, input: urlInput } = createInput(this.constructor, {
				id: (0, _fr0st_ui.generateId)("editor-image-url"),
				label: this.constructor.lang.modals.imageUrl
			});
			_fr0st_query.default.append(container, fileGroup);
			_fr0st_query.default.append(container, urlGroup);
			const originalRange = getRange()?.cloneRange();
			this.#focusEditor();
			const range = getRange();
			range.collapse();
			this.#modal = createModal(this.constructor, {
				returnFocus,
				title: this.constructor.lang.modals.insertImage,
				content: container,
				cancelText: this.constructor.lang.modals.cancel,
				submitText: this.constructor.lang.modals.insertImage,
				onSubmit: (_) => {
					selectRange(range);
					const files = _fr0st_query.default.getProperty(fileInput, "files");
					const src = _fr0st_query.default.getValue(urlInput);
					if (files.length) this.options.imageUpload.call(this, files);
					else if (src) this.insertImage(src);
				},
				onShown: (_) => {
					_fr0st_query.default.focus(fileInput);
				},
				onHidden: (_) => {
					this.#removeModal();
					if (this.node) {
						selectRange(originalRange);
						if (!returnFocus?.isConnected) this.#focusEditor();
					}
				}
			});
			this.#ownComponent(_fr0st_ui.Modal.init(this.#modal));
		}
		/**
		* Shows the link modal.
		* @param {HTMLElement} [link] The current link.
		*/
		#showLinkModal(link) {
			this.#removeModal();
			const returnFocus = document.activeElement;
			const container = _fr0st_query.default.create("div");
			const { group: textGroup, input: textInput } = createInput(this.constructor, {
				id: (0, _fr0st_ui.generateId)("editor-link-text"),
				label: this.constructor.lang.modals.linkText
			});
			const { group: urlGroup, input: urlInput } = createInput(this.constructor, {
				id: (0, _fr0st_ui.generateId)("editor-link-url"),
				label: this.constructor.lang.modals.linkUrl
			});
			const { group: newWindowGroup, input: newWindowInput } = createCheckbox(this.constructor, {
				id: (0, _fr0st_ui.generateId)("editor-link-new-window"),
				label: this.constructor.lang.modals.linkNewWindow
			});
			if (link) {
				const text = _fr0st_query.default.getText(link);
				const href = _fr0st_query.default.getAttribute(link, "href");
				const newWindow = _fr0st_query.default.getAttribute(link, "target");
				_fr0st_query.default.setValue(textInput, text);
				_fr0st_query.default.setValue(urlInput, href);
				if (newWindow === "_blank") _fr0st_query.default.setProperty(newWindowInput, { checked: true });
			}
			let hasText = false;
			_fr0st_query.default.append(container, textGroup);
			_fr0st_query.default.append(container, urlGroup);
			_fr0st_query.default.append(container, newWindowGroup);
			const originalRange = getRange()?.cloneRange();
			let range;
			if (link) range = selectNode(link);
			else {
				this.#focusEditor();
				range = getRange();
			}
			this.#modal = createModal(this.constructor, {
				returnFocus,
				title: this.constructor.lang.modals.insertLink,
				content: container,
				cancelText: this.constructor.lang.modals.cancel,
				submitText: this.constructor.lang.modals.insertLink,
				onSubmit: (_) => {
					selectRange(range);
					const text = _fr0st_query.default.getValue(textInput);
					const href = _fr0st_query.default.getValue(urlInput);
					const newWindow = _fr0st_query.default.is(newWindowInput, ":checked");
					this.insertLink(href, text, newWindow);
				},
				onShown: (_) => {
					_fr0st_query.default.focus(urlInput);
				},
				onHidden: (_) => {
					this.#removeModal();
					if (this.node) {
						selectRange(originalRange);
						if (!returnFocus?.isConnected) this.#focusEditor();
					}
				}
			});
			const controller = this.#ownComponent(_fr0st_ui.Modal.init(this.#modal));
			controller.listen(textInput, "input.ui.editor", (_) => {
				hasText = !!_fr0st_query.default.getValue(textInput);
			});
			controller.listen(urlInput, "input.ui.editor", (_) => {
				if (hasText) return;
				const url = _fr0st_query.default.getValue(urlInput);
				_fr0st_query.default.setValue(textInput, url);
			});
		}
		/**
		* Shows the source.
		*/
		#showSource() {
			_fr0st_query.default.show(this.#sourceOuter);
			_fr0st_query.default.setStyle(this.#editorScroll, { display: "none" }, null, { important: true });
			_fr0st_query.default.hide(this.#imgHighlight);
			this.#refreshLineNumbers();
		}
		/**
		* Shows the video modal.
		*/
		#showVideoModal() {
			this.#removeModal();
			const returnFocus = document.activeElement;
			const container = _fr0st_query.default.create("div");
			const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = createInput(this.constructor, {
				id: (0, _fr0st_ui.generateId)("editor-video-url"),
				label: this.constructor.lang.modals.videoUrl
			});
			_fr0st_query.default.append(container, urlGroup);
			const originalRange = getRange()?.cloneRange();
			this.#focusEditor();
			const range = getRange();
			this.#modal = createModal(this.constructor, {
				returnFocus,
				title: this.constructor.lang.modals.insertVideo,
				content: container,
				cancelText: this.constructor.lang.modals.cancel,
				submitText: this.constructor.lang.modals.insertVideo,
				onSubmit: (_) => {
					selectRange(range);
					const url = _fr0st_query.default.getValue(urlInput);
					let id;
					try {
						const parsed = new URL(url);
						if (parsed.protocol === "https:" && (parsed.hostname === "youtu.be" || ["youtube.com", "www.youtube.com"].includes(parsed.hostname) && parsed.pathname === "/watch")) id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
					} catch {}
					if (!id || !/^[\w-]+$/.test(id)) {
						urlInput.setAttribute("aria-invalid", "true");
						_fr0st_query.default.addClass(urlGroup, this.constructor.classes.formError);
						_fr0st_query.default.setText(urlInvalidFeedback, this.constructor.lang.modals.videoUrlInvalid);
						return false;
					}
					_fr0st_query.default.removeClass(urlGroup, this.constructor.classes.formError);
					urlInput.removeAttribute("aria-invalid");
					const video = _fr0st_query.default.create("iframe", { attributes: {
						width: 560,
						height: 315,
						src: `https://www.youtube.com/embed/${id}`,
						frameborder: 0,
						allowfullscreen: true,
						title: this.constructor.lang.modals.insertVideo
					} });
					const html = _fr0st_query.default.getProperty(video, "outerHTML");
					this.insertHtml(html);
				},
				onShown: (_) => {
					_fr0st_query.default.focus(urlInput);
				},
				onHidden: (_) => {
					this.#removeModal();
					if (this.node) {
						selectRange(originalRange);
						if (!returnFocus?.isConnected) this.#focusEditor();
					}
				}
			});
			this.#ownComponent(_fr0st_ui.Modal.init(this.#modal));
		}
		/**
		* Renders a style dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		#styleDropdown(dropdown) {
			for (const tag of this.constructor.styles) {
				const button = _fr0st_query.default.create("button", {
					class: this.constructor.classes.dropdownItem,
					attributes: {
						"type": "button",
						"aria-label": this.constructor.lang.styles[tag]
					}
				});
				const content = _fr0st_query.default.create(tag, {
					text: this.constructor.lang.styles[tag],
					class: this.constructor.classes.styleContent
				});
				_fr0st_query.default.append(button, content);
				const data = {
					command: "formatBlock",
					value: tag.toUpperCase()
				};
				this.#buttons.push({
					button,
					data
				});
				this.#setToolbarData(button, data);
				_fr0st_query.default.append(dropdown, button);
			}
		}
		/**
		* Renders a table dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		#tableDropdown(dropdown) {
			const container = _fr0st_query.default.create("div");
			for (let i = 0; i < 10; i++) {
				const row = _fr0st_query.default.create("div", { class: this.constructor.classes.tableRow });
				_fr0st_query.default.append(container, row);
				for (let j = 0; j < 10; j++) {
					const cell = _fr0st_query.default.create("div", { class: this.constructor.classes.tableCell });
					_fr0st_query.default.append(row, cell);
					if (i > 4 || j > 4) _fr0st_query.default.hide(cell);
					const link = _fr0st_query.default.create("button", {
						class: this.constructor.classes.tableLink,
						attributes: {
							"type": "button",
							"aria-label": `${i + 1} × ${j + 1} table`
						},
						dataset: {
							uiColumn: j,
							uiRow: i
						}
					});
					_fr0st_query.default.append(cell, link);
				}
			}
			const info = _fr0st_query.default.create("span", { class: this.constructor.classes.tableInfo });
			_fr0st_query.default.addClass(dropdown, this.constructor.classes.tableDropdown);
			_fr0st_query.default.append(dropdown, container);
			_fr0st_query.default.append(dropdown, info);
			this.listen(container, "click.ui.editor", (e) => {
				const cols = _fr0st_query.default.getDataset(e.currentTarget, "uiColumn");
				const rows = _fr0st_query.default.getDataset(e.currentTarget, "uiRow");
				const container = _fr0st_query.default.create("div");
				const table = _fr0st_query.default.create("table", { class: this.constructor.classes.table });
				const tbody = _fr0st_query.default.create("tbody");
				for (let i = 0; i <= rows; i++) {
					const tr = _fr0st_query.default.create("tr");
					for (let j = 0; j <= cols; j++) {
						const td = _fr0st_query.default.create("td", { html: "<br>" });
						_fr0st_query.default.append(tr, td);
					}
					_fr0st_query.default.append(tbody, tr);
				}
				_fr0st_query.default.append(table, tbody);
				_fr0st_query.default.append(container, table);
				const br = _fr0st_query.default.create("br");
				_fr0st_query.default.append(container, br);
				const html = _fr0st_query.default.getHtml(container);
				this.insertHtml(html);
			}, { delegate: "button" });
			this.listen(container, "mouseover.ui.editor focusin.ui.editor", (e) => {
				const targetCol = _fr0st_query.default.getDataset(e.currentTarget, "uiColumn");
				const targetRow = _fr0st_query.default.getDataset(e.currentTarget, "uiRow");
				const colMin = Math.max(targetCol + 1, 4);
				const rowMin = Math.max(targetRow + 1, 4);
				const links = _fr0st_query.default.find("button", container);
				for (const element of links) {
					const col = _fr0st_query.default.getDataset(element, "uiColumn");
					const row = _fr0st_query.default.getDataset(element, "uiRow");
					if (col <= targetCol && row <= targetRow) _fr0st_query.default.addClass(element, this.constructor.classes.tableHover);
					else _fr0st_query.default.removeClass(element, this.constructor.classes.tableHover);
					const parent = _fr0st_query.default.parent(element);
					if (col <= colMin && row <= rowMin) _fr0st_query.default.show(parent);
					else _fr0st_query.default.hide(parent);
				}
				_fr0st_query.default.setText(info, `${targetCol + 1} x ${targetRow + 1}`);
			}, { delegate: "button" });
		}
		/**
		* Updates a table element.
		* @param {HTMLElement} td The td element.
		* @param {Function} callback The callback.
		*/
		#updateTable(td, callback) {
			const table = td.closest("table");
			if (!table || !this.#editor.contains(table)) return;
			this.#observe(false);
			try {
				callback(td, td.closest("tr"), table);
				if (this.#editor.contains(td)) selectNode(td).collapse(true);
				this.#normalize();
				this.#updateValue();
			} finally {
				this.#observe();
			}
		}
		/**
		* Updates the input value.
		*/
		#updateValue() {
			if (!this.node) return;
			const html = _fr0st_query.default.getHtml(this.#editor);
			const value = serialize(this.#editor);
			if (value === _fr0st_query.default.getValue(this.node)) {
				if (!this.#history.length) this.#addHistory({
					html,
					selectionData: getSelectionData(this.#editor)
				});
				return;
			}
			this.#redoHistory = [];
			this.#addHistory({
				html,
				selectionData: getSelectionData(this.#editor)
			});
			_fr0st_query.default.setValue(this.node, value);
			_fr0st_query.default.setValue(this.#source, value);
			if (this.node.validity.valid && !this.node.hasAttribute("aria-invalid")) {
				this.#editor.removeAttribute("aria-invalid");
				this.#source.removeAttribute("aria-invalid");
			}
			notifyChange(this.node);
		}
		/**
		* Starts observing content changes owned by this editor.
		*/
		#watchContent() {
			const changed = this.#debounce(() => {
				if (_fr0st_query.default.isVisible(this.#sourceContainer)) return;
				this.#normalize();
				this.#checkEmpty();
				this.#updateValue();
			});
			this.#observer = new MutationObserver((records) => {
				if (records.some((record) => record.type !== "attributes" || record.target !== this.#editor)) changed();
			});
			this.#observe();
		}
	};

// src/js/index.js
	(0, _fr0st_ui.initComponent)("editor", Editor);
	var js_default = Editor;

exports.Editor = js_default;
});
//# sourceMappingURL=frost-ui-editor.js.map