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
	/**
	* Determine if a node is phrasing content.
	* https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
	* @param {Node} node The input node.
	* @returns {boolean} TRUE if the node is phrasing content, otherwise FALSE.
	*/
	var isPhrasingContent = (node) => _fr0st_query.default._isText(node) || _fr0st_query.default.is(node, "a, abbr, area, audio, b, bdi, bdo, br, button, cite, code, data, datalist, del, dfn, em, embed, i, iframe, img, input, ins, kbd, label, map, mark, math, meter, noscript, object, output, picture, progress, q, ruby, s, samp, script, select, slot, small, span, strong, sub, sup, svg, template, textarea, time, u, var, video, wbr");
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
	* Normalize phrasing containers.
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
	* Normalize span elements.
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
	* Normalize style attributes.
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

// src/js/commands.js
/** @import Editor from './editor.js'; */
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
	function selectedBlocks(root, range) {
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
	/**
	* Changes indentation as a single history operation with selection preservation.
	* @param {Editor} editor The editor.
	* @param {boolean} outdent Whether to remove one indentation level.
	*/
	function changeIndent(editor, outdent) {
		if (!editor.node || _fr0st_query.default.is(editor.node, ":disabled") || editor.node.readOnly) return;
		editor._focusEditor();
		if (!editor.node) return;
		const range = getRange(editor._editor);
		if (!range) return;
		let blocks = selectedBlocks(editor._editor, range);
		if (outdent && !blocks.length) return;
		editor._addHistory({
			html: editor._editor.innerHTML,
			selectionData: editor._getSelectionData()
		});
		editor._observe(false);
		const markers = saveSelection(editor._editor);
		try {
			if (!blocks.length) {
				const paragraph = document.createElement("p");
				let first = markers.start;
				while (first.parentNode !== editor._editor) first = first.parentNode;
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
				if (outdent) outdentBlocks(group, editor._editor);
				else indentBlocks(group);
			}
		} finally {
			restoreSelection(markers);
			editor._normalize();
			editor._updateValue();
			editor._observe();
		}
	}

// src/js/sanitize.js
	var tags = Object.fromEntries("a abbr b bdi bdo blockquote br caption cite code col colgroup dd del div dl dt em figcaption figure font h1 h2 h3 h4 h5 h6 hr i iframe img ins kbd li mark ol p pre q s samp small span strong sub sup table tbody td tfoot th thead time tr u ul var wbr".split(" ").map((tag) => [tag, []]));
	Object.assign(tags, {
		"*": [
			"class",
			"title",
			"dir",
			"lang",
			"style"
		],
		"a": [
			"href",
			"target",
			"rel"
		],
		"font": [
			"face",
			"size",
			"color"
		],
		"img": [
			"src",
			"alt",
			"width",
			"height"
		],
		"iframe": [
			"src",
			"title",
			"width",
			"height",
			"allowfullscreen",
			"frameborder"
		],
		"ol": [
			"start",
			"reversed",
			"type"
		],
		"li": ["value"],
		"td": ["colspan", "rowspan"],
		"th": [
			"colspan",
			"rowspan",
			"scope"
		],
		"col": ["span"],
		"colgroup": ["span"]
	});
	var styles$1 = new Set("color background-color font-family font-size font-weight font-style text-decoration text-decoration-line text-align vertical-align white-space margin-left margin-right margin-inline-start margin-inline-end width height max-width max-height inline-size block-size max-inline-size max-block-size float".split(" "));
	/**
	* Checks an editor URL, including relative links and raster image uploads.
	* @param {string} value The URL.
	* @param {'link'|'image'|'video'} [kind='link'] The destination type.
	* @returns {boolean} Whether the URL is supported.
	*/
	function isSafeURL(value, kind = "link") {
		try {
			const url = new URL(value, document.baseURI);
			if (kind === "video") return url.protocol === "https:" && ["www.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname) && /^\/embed\/[\w-]+$/.test(url.pathname);
			if (kind === "image" && /^data:image\/(?:png|gif|jpeg|webp|avif);base64,[a-z\d+/=\s]+$/i.test(value)) return true;
			return ["http:", "https:"].includes(url.protocol) || kind === "link" && ["mailto:", "tel:"].includes(url.protocol);
		} catch {
			return false;
		}
	}
	/**
	* Sanitizes supported editor markup before it reaches the live DOM.
	* @param {string} html Untrusted HTML.
	* @returns {string} Supported HTML with safe URLs and presentation styles.
	*/
	function sanitizeHTML(html) {
		const template = document.createElement("template");
		template.innerHTML = _fr0st_query.default.sanitize(html, tags);
		for (const node of template.content.querySelectorAll("*")) {
			for (const property of [...node.style]) {
				const value = node.style.getPropertyValue(property);
				if (!styles$1.has(property) || /url\s*\(|expression\s*\(|var\s*\(|[\\@]/i.test(value)) node.style.removeProperty(property);
			}
			if (!node.style.length) node.removeAttribute("style");
			for (const [attribute, kind] of [["href", "link"], ["src", node.localName === "iframe" ? "video" : "image"]]) if (node.hasAttribute(attribute) && !isSafeURL(node.getAttribute(attribute), kind)) node.removeAttribute(attribute);
			if (node.localName === "iframe") {
				if (!node.hasAttribute("src")) {
					node.remove();
					continue;
				}
				node.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
				node.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
				if (!node.hasAttribute("title")) node.setAttribute("title", "YouTube video");
			}
			if (node.localName === "a") {
				if (node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
				else node.removeAttribute("target");
			}
		}
		return template.innerHTML;
	}

// src/js/config.js
/** @import Editor from './editor.js'; */
	/** @import { EditorOptions, EditorLanguage } from './types.js'; */
	/** @type {EditorOptions} */
	var defaults = {
		buttons: null,
		sanitize: sanitizeHTML,
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
			const results = await Promise.allSettled([...files].map((file) => this._readImage(file)));
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
		container: "card shadow-sm",
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
			videoUrlInvalid: "Invalid video URL.",
			urlInvalid: "Enter a supported URL."
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
/** @import Editor from './editor.js'; */
	/**
	* Emits the existing change contract without reloading our own content.
	* @param {Editor} editor The editor.
	*/
	function notifyChange(editor) {
		_fr0st_query.default.triggerEvent(editor.node, "change.ui.editor", { data: { skipUpdate: true } });
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
	/**
	* Loads an external value and starts a fresh history after native reset.
	* @param {Editor} editor The editor.
	* @param {boolean} [reset=false] Whether to clear history.
	*/
	function loadValue(editor, reset = false) {
		editor._observe(false);
		try {
			editor._editor.innerHTML = editor.options.sanitize(editor.node.value);
			editor._normalize();
			editor._checkEmpty();
			editor.node.value = serialize(editor._editor);
			editor._source.value = editor.node.value;
			editor._lastRange = null;
			if (reset) {
				editor._history = [];
				editor._redoHistory = [];
			}
			if (editor._history.at(-1)?.html !== editor._editor.innerHTML) editor._redoHistory = [];
			editor._addHistory({ html: editor._editor.innerHTML });
			editor._refreshDisabled();
			editor._refreshToolbar();
			editor._refreshLineNumbers();
		} finally {
			editor._observe();
		}
	}
	/**
	* Attaches native form, label, validation, and state synchronization.
	* @param {Editor} editor The editor.
	*/
	function eventsForm(editor) {
		const focus = () => {
			if (editor.node && !editor.node.matches(":disabled")) (_fr0st_query.default.isVisible(editor._sourceContainer) ? editor._source : editor._editor).focus();
		};
		const labels = [...editor.node.labels];
		const generated = [];
		for (const label of labels) {
			if (!label.id) {
				label.id = (0, _fr0st_ui.generateId)("editor-label");
				generated.push([label, label.id]);
			}
			editor.listen(label, "click.ui.editor", (event) => {
				if (event.target === label || !event.target.closest("a, button, input, select, textarea")) {
					event.preventDefault();
					focus();
				}
			});
		}
		editor._labelledBy = labels.map((label) => label.id).join(" ");
		editor._refreshDisabled();
		editor.listen(editor.node, "focus.ui.editor", (event) => {
			if (event.target === document.activeElement) focus();
		});
		editor.listen(editor.node, "invalid.ui.editor", (event) => {
			event.preventDefault();
			editor._editor.setAttribute("aria-invalid", "true");
			editor._source.setAttribute("aria-invalid", "true");
			focus();
		});
		editor.listen(editor.node, "input.ui.editor change.ui.editor", (event) => {
			if (!event.skipUpdate) loadValue(editor);
		});
		const timers = /* @__PURE__ */ new Set();
		editor.listen(editor.node.ownerDocument, "reset.ui.editor", (event) => {
			if (event.target !== editor.node.form) return;
			const timer = setTimeout(() => {
				timers.delete(timer);
				if (editor.node && !event.defaultPrevented) {
					editor._removePopover();
					loadValue(editor, true);
				}
			}, 0);
			timers.add(timer);
		});
		const observer = new MutationObserver(() => {
			if (editor.node) {
				editor._refreshDisabled();
				editor._refreshToolbar();
			}
		});
		observer.observe(editor.node, { attributes: true });
		for (const fieldset of _fr0st_query.default.parents(editor.node, "fieldset")) observer.observe(fieldset, {
			attributes: true,
			attributeFilter: ["disabled"]
		});
		editor._onDispose(() => {
			observer.disconnect();
			for (const timer of timers) clearTimeout(timer);
			for (const [label, id] of generated) if (label.id === id) label.removeAttribute("id");
		});
	}

// src/js/content.js
/** @import Editor from './editor.js'; */
	/**
	* Check if the editor is empty and populate base markup.
	* @param {Editor} editor The editor instance.
	*/
	function checkEmpty(editor) {
		if (editor.node && !editor._editor.innerHTML.trim()) _fr0st_query.default.setHtml(editor._editor, "<p><br></p>");
	}
	/**
	* Execute a command.
	* @param {Editor} editor The editor instance.
	* @param {string} command The command.
	* @param {boolean | string} [value] The command argument.
	*/
	function execCommand(editor, command, value) {
		if (!editor.node || _fr0st_query.default.is(editor.node, ":disabled") || editor.node.readOnly) return;
		editor._focusEditor();
		if (!editor.node) return;
		editor._addHistory({
			html: editor._editor.innerHTML,
			selectionData: editor._getSelectionData()
		});
		editor._observe(false);
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
			editor._normalize();
			editor._checkEmpty();
			editor._updateValue();
		} finally {
			editor._observe();
		}
	}
	/**
	* Ensure the editor element has focus.
	* @param {Editor} editor The editor instance.
	*/
	function focusEditor(editor) {
		if (!editor.node || _fr0st_query.default.is(editor.node, ":disabled")) return;
		if (document.activeElement === editor._editor && getRange(editor._editor)) return;
		const current = getRange(editor._editor)?.cloneRange();
		const selection = window.getSelection();
		const backward = current && !current.collapsed && selection.anchorNode === current.endContainer && selection.anchorOffset === current.endOffset;
		const saved = editor._lastRange;
		_fr0st_query.default.focus(editor._editor);
		if (!editor.node) return;
		if (current) selectRange(current, backward);
		else if (saved && editor._editor.contains(saved.startContainer) && editor._editor.contains(saved.endContainer)) selectRange(saved);
		else {
			const range = document.createRange();
			let target = editor._editor;
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
	* Refresh the popover at cursor.
	* @param {Editor} editor The editor instance.
	*/
	function refreshCursor(editor) {
		const baseNode = window.getSelection().anchorNode;
		if (!_fr0st_query.default.hasDescendent(editor._editor, baseNode)) {
			editor._removePopover();
			return;
		}
		const range = getRange(editor._editor);
		if (editor._currentNode && range && (!range.collapsed && range.intersectsNode(editor._currentNode) || editor._currentNode.contains(baseNode))) return;
		const currentNode = _fr0st_query.default.is(baseNode, "a") ? baseNode : _fr0st_query.default.closest(baseNode, "a", editor._editor).shift();
		if (!currentNode) {
			editor._removePopover();
			return;
		}
		editor._refreshPopover(currentNode);
	}
	/**
	* Refresh the editor disabled.
	* @param {Editor} editor The editor instance.
	*/
	function refreshDisabled(editor) {
		const disabled = editor.node.matches(":disabled");
		const readOnly = editor.node.readOnly;
		if (disabled) _fr0st_query.default.addClass(editor._editor, editor.constructor.classes.editorDisabled);
		else _fr0st_query.default.removeClass(editor._editor, editor.constructor.classes.editorDisabled);
		editor._editor.setAttribute("contenteditable", String(!disabled && !readOnly));
		editor._editor.setAttribute("tabindex", disabled ? "-1" : editor.node.getAttribute("tabindex") || "0");
		editor._source.disabled = disabled;
		editor._source.readOnly = readOnly;
		for (const handle of [editor._imgResize, editor._resizeBar].filter(Boolean)) {
			handle.setAttribute("tabindex", disabled || readOnly ? "-1" : "0");
			handle.setAttribute("aria-disabled", String(disabled || readOnly));
		}
		for (const surface of [editor._editor, editor._source]) {
			surface.setAttribute("aria-disabled", String(disabled));
			surface.setAttribute("aria-readonly", String(readOnly));
			surface.setAttribute("aria-required", String(editor.node.required));
			for (const name of [
				"aria-label",
				"aria-labelledby",
				"aria-describedby",
				"aria-errormessage",
				"aria-invalid",
				"dir",
				"lang"
			]) {
				const value = editor.node.getAttribute(name) || (name === "aria-labelledby" && !editor.node.hasAttribute("aria-label") ? editor._labelledBy : null);
				if (value) surface.setAttribute(name, value);
				else surface.removeAttribute(name);
			}
		}
		editor._container.classList.toggle("form-error", editor.node.classList.contains("form-error"));
		if (disabled || readOnly) {
			editor._removePopover();
			for (const toggle of editor._toolbar.querySelectorAll("[data-ui-toggle=\"dropdown\"]")) _fr0st_ui.Dropdown.init(toggle).hide();
		}
	}
	/**
	* Refresh the source line numbers.
	* @param {Editor} editor The editor instance.
	*/
	function refreshLineNumbers(editor) {
		if (!editor.node) return;
		if (!_fr0st_query.default.isVisible(editor._sourceContainer)) return;
		const lineNumbers = _fr0st_query.default.contents(editor._lineNumbers);
		const lines = _fr0st_query.default.getValue(editor._source).split("\n");
		const test = _fr0st_query.default.create("div", { style: {
			width: _fr0st_query.default.width(editor._source, { boxSize: _fr0st_query.default.CONTENT_BOX }),
			padding: 0,
			border: 0,
			font: _fr0st_query.default.css(editor._source, "font"),
			letterSpacing: _fr0st_query.default.css(editor._source, "letterSpacing"),
			whiteSpace: _fr0st_query.default.css(editor._source, "whiteSpace"),
			wordBreak: _fr0st_query.default.css(editor._source, "wordBreak"),
			wordSpacing: _fr0st_query.default.css(editor._source, "wordSpacing"),
			wordWrap: _fr0st_query.default.css(editor._source, "wordWrap")
		} });
		_fr0st_query.default.append(document.body, test);
		for (const [i, line] of lines.entries()) {
			let lineNumber;
			if (i < lineNumbers.length) lineNumber = lineNumbers[i];
			else {
				lineNumber = _fr0st_query.default.create("div", { text: i + 1 });
				_fr0st_query.default.append(editor._lineNumbers, lineNumber);
			}
			_fr0st_query.default.setText(test, line || " ");
			const { height } = _fr0st_query.default.rect(test);
			_fr0st_query.default.setStyle(lineNumber, { height: `${height}px` });
		}
		_fr0st_query.default.detach(test);
		if (lineNumbers.length > lines.length) _fr0st_query.default.detach(lineNumbers.slice(lines.length));
	}
	/**
	* Refresh the toolbar.
	* @param {Editor} editor The editor instance.
	*/
	function refreshToolbar(editor) {
		if (!editor.node) return;
		const isDisabled = _fr0st_query.default.is(editor.node, ":disabled");
		const isSource = _fr0st_query.default.isVisible(editor._sourceContainer);
		for (const { button, data, type } of editor._buttons) {
			if ("setContent" in data) {
				const content = data.setContent.bind(editor)();
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
			if (isDisabled || editor.node.readOnly && !["source", "fullScreen"].includes(type) || isSource && !["source", "fullScreen"].includes(type) || "disableCheck" in data && data.disableCheck.bind(editor)()) {
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
	* Reset the drop text.
	* @param {Editor} editor The editor instance.
	*/
	function resetDropText(editor) {
		_fr0st_query.default.removeClass(editor._dropText, editor.constructor.classes.dropHover);
		_fr0st_query.default.setText(editor._dropText, editor.constructor.lang.drop.dropHere);
	}
	/**
	* Show the drop target.
	* @param {Editor} editor The editor instance.
	*/
	function showDropTarget(editor) {
		if (_fr0st_query.default.is(editor.node, ":disabled") || editor.node.readOnly || _fr0st_query.default.isVisible(editor._sourceContainer)) return;
		_fr0st_query.default.show(editor._dropTarget);
	}
	/**
	* Show the editor.
	* @param {Editor} editor The editor instance.
	*/
	function showEditor(editor) {
		_fr0st_query.default.show(editor._editorScroll);
		_fr0st_query.default.hide(editor._sourceOuter);
	}
	/**
	* Show the source.
	* @param {Editor} editor The editor instance.
	*/
	function showSource(editor) {
		_fr0st_query.default.show(editor._sourceOuter);
		_fr0st_query.default.setStyle(editor._editorScroll, { display: "none" }, null, { important: true });
		_fr0st_query.default.hide(editor._imgHighlight);
		editor._refreshLineNumbers();
	}
	/**
	* Update the input value.
	* @param {Editor} editor The editor instance.
	*/
	function updateValue(editor) {
		if (!editor.node) return;
		const html = _fr0st_query.default.getHtml(editor._editor);
		const value = serialize(editor._editor);
		if (value === _fr0st_query.default.getValue(editor.node)) {
			if (!editor._history.length) editor._addHistory({
				html,
				selectionData: editor._getSelectionData()
			});
			return;
		}
		editor._redoHistory = [];
		editor._addHistory({
			html,
			selectionData: editor._getSelectionData()
		});
		_fr0st_query.default.setValue(editor.node, value);
		_fr0st_query.default.setValue(editor._source, value);
		if (editor.node.validity.valid && !editor.node.hasAttribute("aria-invalid")) {
			editor._editor.removeAttribute("aria-invalid");
			editor._source.removeAttribute("aria-invalid");
		}
		notifyChange(editor);
	}
	/**
	* Insert a (cloned) node into the editor.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} node The node to insert.
	* @returns {HTMLElement} The new node.
	*/
	function insertNode(editor, node) {
		if (!editor.node || _fr0st_query.default.is(editor.node, ":disabled") || editor.node.readOnly) return null;
		editor._focusEditor();
		if (!editor.node) return null;
		const range = getRange(editor._editor);
		if (!range) return null;
		editor._addHistory({
			html: editor._editor.innerHTML,
			selectionData: editor._getSelectionData()
		});
		editor._observe(false);
		try {
			range.deleteContents();
			range.insertNode(node);
			range.setStartAfter(node);
			range.collapse(true);
			selectRange(range);
			editor._normalize();
			editor._updateValue();
		} finally {
			editor._observe();
		}
		return node;
	}
	/**
	* Normalize the editor.
	* @param {Editor} editor The editor instance.
	*/
	function normalize(editor) {
		if (!editor.node) return;
		const active = document.activeElement;
		editor._observe(false);
		normalizeText(editor._editor);
		const markers = saveSelection(editor._editor);
		try {
			normalizeStyles(editor._editor);
			normalizeSpans(editor._editor);
			normalizePhrasing(editor._editor);
			joinAdjacentNodes(editor._editor, markers);
		} finally {
			restoreSelection(markers);
			normalizeText(editor._editor);
			editor._observe();
			if (active instanceof HTMLElement && active !== document.body && active.isConnected && !editor._editor?.contains(active) && document.activeElement !== active) active.focus({ preventScroll: true });
		}
	}
	/**
	* Update a table element.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} td The td element.
	* @param {Function} callback The callback.
	*/
	function updateTable(editor, td, callback) {
		const table = td.closest("table");
		if (!table || !editor._editor.contains(table)) return;
		editor._observe(false);
		try {
			callback(td, td.closest("tr"), table);
			if (editor._editor.contains(td)) selectNode(td).collapse(true);
			editor._normalize();
			editor._updateValue();
		} finally {
			editor._observe();
		}
	}

// src/js/helpers.js
/** @import Editor from './editor.js'; */
	/** @import { EventTargetInput, EventCallback, EventOptions } from '@fr0st/query/src/events/event-handlers.js'; */
	/** @type {Set<Editor>} */
	var editors = /* @__PURE__ */ new Set();
	var cleanups = [];
	var dragCount = 0;
	var session = 0;
	/**
	* Registers a shared listener with its exact removal callback.
	* @param {EventTargetInput} target The target.
	* @param {string} events The event names.
	* @param {EventCallback} callback The listener.
	* @param {EventOptions} [options] The listener options.
	*/
	function listenShared(target, events, callback, options = {}) {
		_fr0st_query.default.addEvent(target, events, callback, options);
		cleanups.push(() => _fr0st_query.default.removeEvent(target, events, callback, options));
	}
	/**
	* Starts shared listeners when the first editor becomes active.
	* @param {Editor} editor The editor to register.
	*/
	function addEditor(editor) {
		if (editors.has(editor)) return;
		editors.add(editor);
		if (editors.size > 1) return;
		const generation = ++session;
		dragCount = 0;
		const deferred = (callback) => _fr0st_query.default.debounce(() => {
			if (generation === session) callback();
		});
		listenShared(document.body, "dragenter.ui.editor", () => {
			if (dragCount++ === 0) for (const current of editors) current._showDropTarget();
		});
		listenShared(document.body, "dragleave.ui.editor", () => {
			dragCount = Math.max(0, dragCount - 1);
			if (dragCount === 0) resetDragCount();
		});
		listenShared(document.body, "dragend.ui.editor drop.ui.editor", resetDragCount);
		listenShared(document, "selectionchange.ui.editor", deferred(() => {
			const range = getRange();
			for (const current of editors) {
				if (!range || !current._editor.contains(range.startContainer) || !current._editor.contains(range.endContainer)) {
					current._removePopover();
					continue;
				}
				current._lastRange = range.cloneRange();
				current._refreshCursor();
				current._refreshToolbar();
			}
		}));
		listenShared(window, "click.ui.editor", () => {
			for (const current of editors) current._removePopover();
		});
		listenShared(window, "resize.ui.editor", deferred(() => {
			for (const current of editors) {
				if (current._currentNode?.matches("img")) current._highlightImage(current._currentNode);
				current._refreshLineNumbers();
			}
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
		for (const current of editors) {
			current._resetDropText();
			_fr0st_query.default.hide(current._dropTarget);
		}
	}

// src/js/events.js
/** @import Editor from './editor.js'; */
	/**
	* Attach events for the Editor.
	* @param {Editor} editor The editor instance.
	*/
	function events(editor) {
		eventsForm(editor);
		editor._eventsToolbar();
		editor._eventsEditor();
		editor._eventsPopover();
		editor._eventsSource();
		editor._eventsDrop();
		editor.listen(editor._container, "keydown.ui.editor", (event) => {
			if (event.code === "Escape" && editor._currentNode && !editor._modal) {
				event.preventDefault();
				editor._removePopover();
				editor._focusEditor();
			}
		});
		if (editor.options.resizable) editor._eventsResize();
	}
	/**
	* Attach drop events.
	* @param {Editor} editor The editor instance.
	*/
	function eventsDrop(editor) {
		editor.listen(editor._editor, "dragstart.ui.editor", (e) => {
			e.preventDefault();
		}, { delegate: "img" });
		editor.listen(editor._dropTarget, "dragenter.ui.editor", (_) => {
			_fr0st_query.default.addClass(editor._dropText, editor.constructor.classes.dropHover);
			_fr0st_query.default.setText(editor._dropText, editor.constructor.lang.drop.drop);
			_fr0st_query.default.show(editor._dropTarget);
		});
		editor.listen(editor._dropTarget, "dragleave.ui.editor", (_) => {
			editor._resetDropText();
		});
		editor.listen(editor._dropTarget, "dragover.ui.editor", (e) => {
			e.preventDefault();
		});
		editor.listen(editor._dropTarget, "drop.ui.editor", (e) => {
			e.preventDefault();
			resetDragCount();
			editor._resetDropText();
			_fr0st_query.default.hide(editor._dropTarget);
			if (e.dataTransfer.files.length) editor.options.imageUpload.bind(editor)(e.dataTransfer.files);
			else {
				const text = e.dataTransfer.getData("text");
				editor.insertText(text);
			}
		});
	}
	/**
	* Attach editor events.
	* @param {Editor} editor The editor instance.
	*/
	function eventsEditor(editor) {
		editor.listen(editor._editor, "paste.ui.editor", (event) => {
			event.preventDefault();
			if (event.clipboardData) {
				const html = event.clipboardData.getData("text/html");
				if (html) editor.insertHTML(html);
				else editor.insertText(event.clipboardData.getData("text/plain"));
			}
		});
		editor.listen(editor._editor, "focus.ui.editor", (_) => {
			document.execCommand("defaultParagraphSeparator", false, "p");
			_fr0st_query.default.triggerEvent(editor.node, "focus.ui.editor");
		});
		editor.listen(editor._editor, "blur.ui.editor", (_) => {
			_fr0st_query.default.triggerEvent(editor.node, "blur.ui.editor");
		});
		editor.listen(editor._editor, "beforeinput.ui.editor", (e) => {
			if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
				if (e.cancelable) {
					e.preventDefault();
					editor[e.inputType === "historyUndo" ? "undo" : "redo"]();
				}
			} else if (editor._history.length) editor._history.at(-1).selectionData = editor._getSelectionData();
		});
		editor.listen(editor._editor, "input.ui.editor", (e) => {
			switch (e.inputType) {
				case "historyUndo":
					if (!_fr0st_query.default.isSame(document.activeElement, editor._editor)) return;
					editor.undo();
					return;
				case "historyRedo":
					if (!_fr0st_query.default.isSame(document.activeElement, editor._editor)) return;
					editor.redo();
					return;
			}
			if (e.inputType !== "insertText") editor._normalize();
			editor._checkEmpty();
			editor._updateValue();
		});
		editor.listen(editor._editor, "keydown.ui.editor", (e) => {
			if (editor.options.keyDown) editor.options.keyDown.bind(editor)(e);
			if (e.defaultPrevented || !editor.node) return;
			const selection = window.getSelection();
			const isIndented = (node) => {
				return [node, ..._fr0st_query.default.parents(node, null, editor._editor)].some((ancestor) => _fr0st_query.default.is(ancestor, "li") || parseFloat(_fr0st_query.default.getStyle(ancestor, "marginInlineStart") || _fr0st_query.default.getStyle(ancestor, "marginLeft")) > 0);
			};
			switch (e.code) {
				case "Backspace":
					if (selection.isCollapsed && _fr0st_query.default.isSame(selection.anchorNode, selection.focusNode) && (_fr0st_query.default._isElement(selection.anchorNode) && _fr0st_query.default.getText(selection.anchorNode) === "" && isIndented(selection.anchorNode) || _fr0st_query.default._isText(selection.anchorNode) && selection.anchorOffset === 0 && isIndented(_fr0st_query.default.parent(selection.anchorNode)))) {
						e.preventDefault();
						editor.outdent();
					} else if (_fr0st_query.default.contents(editor._editor).length <= 1 && _fr0st_query.default.getText(editor._editor) === "") e.preventDefault();
					break;
				case "Delete":
					if (selection.isCollapsed && _fr0st_query.default.isSame(selection.anchorNode, selection.focusNode) && _fr0st_query.default.getText(selection.anchorNode) === "") {
						const nodes = [selection.anchorNode, ..._fr0st_query.default.parents(selection.anchorNode, null, editor._editor)];
						if (nodes.every((node) => _fr0st_query.default.contents(node).length <= 1)) {
							const lastParent = nodes.pop();
							const nextParent = _fr0st_query.default.next(lastParent).shift();
							let formatElement = "p";
							if (nextParent && _fr0st_query.default.is(nextParent, "h1, h2, h3, h4, h5, h6, pre")) formatElement = _fr0st_query.default.tagName(nextParent);
							editor._observe(false);
							editor._execCommand("formatBlock", formatElement);
							editor._observe();
						}
					}
					break;
				case "Tab": if (document.queryCommandState("insertOrderedList") || document.queryCommandState("insertUnorderedList")) {
					e.preventDefault();
					if (e.shiftKey) editor.outdent();
					else editor.indent();
				}
			}
		});
		editor.listen(editor._editorContainer, "click.ui.editor", (_) => {
			_fr0st_query.default.focus(editor._editor);
		});
		editor.listen(editor._editor, "click.ui.editor", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (editor.node.matches(":disabled") || editor.node.readOnly) return;
			if (e.currentTarget.matches("img")) selectNode(e.currentTarget);
			editor._refreshPopover(e.currentTarget, e);
			editor._refreshToolbar();
		}, {
			delegate: "a, td, img",
			capture: true
		});
		editor._watchContent();
	}
	/**
	* Attach popover events.
	* @param {Editor} editor The editor instance.
	*/
	function eventsPopover(editor) {
		editor.listen(editor._popover, "click.ui.editor", (e) => {
			if (editor.node.matches(":disabled") || editor.node.readOnly) return;
			const action = _fr0st_query.default.getDataset(e.currentTarget, "uiAction");
			if (!(action in editor.constructor.popovers)) throw new Error(`Unknown action ${action}`);
			e.preventDefault();
			e.stopPropagation();
			editor.constructor.popovers[action].action.bind(editor)(editor._currentNode);
			editor._refreshPopover(editor._currentNode);
		}, { delegate: "[data-ui-action]" });
		const downEvent = (e) => {
			if (!editor._currentNode || !_fr0st_query.default.is(editor._currentNode, "img")) return false;
			e.stopPropagation();
			_fr0st_query.default.hide(editor._imgCursor);
			_fr0st_query.default.hide(editor._popover);
			editor._observe(false);
		};
		const moveEvent = (e) => {
			const imgRect = _fr0st_query.default.rect(editor._currentNode, { offset: true });
			const ratio = imgRect.width / imgRect.height;
			const width = Math.max(e.pageX - imgRect.x, (e.pageY - imgRect.y) * ratio, 1);
			_fr0st_query.default.setStyle(editor._currentNode, { width: `${Math.round(width)}px` });
			editor._highlightImage(editor._currentNode);
		};
		const upEvent = (_) => {
			if (editor._currentNode?.isConnected && editor._editor.contains(editor._currentNode)) selectNode(editor._currentNode).collapse(false);
			editor._updateValue();
			editor._observe();
		};
		bindDrag(editor, editor._imgResize, downEvent, moveEvent, upEvent);
		editor.listen(editor._imgResize, "keydown.ui.editor", (event) => {
			if (!["ArrowLeft", "ArrowRight"].includes(event.code) || !editor._currentNode || editor.node.matches(":disabled") || editor.node.readOnly) return;
			event.preventDefault();
			const width = Math.max(1, editor._currentNode.getBoundingClientRect().width + (event.code === "ArrowRight" ? 10 : -10));
			editor._currentNode.style.width = `${width}px`;
			editor._highlightImage(editor._currentNode);
			editor._updateValue();
		});
		editor.listen(editor._editorBody, "scroll.ui.editor", (_) => {
			editor._removePopover();
		});
	}
	/**
	* Attach resize events.
	* @param {Editor} editor The editor instance.
	*/
	function eventsResize(editor) {
		let resizeOffset = 0;
		const downEvent = (e) => {
			const barPosition = _fr0st_query.default.position(editor._resizeBar, { offset: true });
			resizeOffset = e.pageY - barPosition.y;
			editor._removePopover();
		};
		const moveEvent = (e) => {
			const editorPosition = _fr0st_query.default.position(editor._editorBody, { offset: true });
			const height = Math.max(0, e.pageY - editorPosition.y - resizeOffset);
			_fr0st_query.default.setStyle(editor._editorBody, { height: `${height}px` });
			editor._resizeBar.setAttribute("aria-valuenow", String(Math.round(height)));
		};
		const upEvent = (_) => {
			resizeOffset = 0;
		};
		bindDrag(editor, editor._resizeBar, downEvent, moveEvent, upEvent);
		editor.listen(editor._resizeBar, "keydown.ui.editor", (event) => {
			if (!["ArrowUp", "ArrowDown"].includes(event.code) || editor.node.matches(":disabled") || editor.node.readOnly) return;
			event.preventDefault();
			const height = Math.max(40, editor._editorBody.getBoundingClientRect().height + (event.code === "ArrowDown" ? 10 : -10));
			editor._editorBody.style.height = `${height}px`;
			editor._resizeBar.setAttribute("aria-valuenow", String(Math.round(height)));
		});
	}
	/**
	* Attach source events.
	* @param {Editor} editor The editor instance.
	*/
	function eventsSource(editor) {
		editor.listen(editor._source, "focus.ui.editor", () => _fr0st_query.default.triggerEvent(editor.node, "focus.ui.editor"));
		editor.listen(editor._source, "blur.ui.editor", () => _fr0st_query.default.triggerEvent(editor.node, "blur.ui.editor"));
		const refreshLineNumbersDebounced = editor._debounce((_) => {
			editor._refreshLineNumbers();
		});
		editor.listen(editor._source, "input.ui.editor change.ui.editor", (_) => {
			if (editor.node.matches(":disabled") || editor.node.readOnly) return;
			refreshLineNumbersDebounced();
			const template = document.createElement("template");
			template.innerHTML = editor.options.sanitize(editor._source.value);
			const html = serialize(template.content, template.innerHTML);
			if (editor.node.value !== html) {
				editor.node.value = html;
				if (editor.node.validity.valid && !editor.node.hasAttribute("aria-invalid")) {
					editor._source.removeAttribute("aria-invalid");
					editor._editor.removeAttribute("aria-invalid");
				}
				notifyChange(editor);
			}
		});
		editor.listen(editor._source, "keydown.ui.editor", (e) => {
			if (e.code !== "Tab" || !e.ctrlKey || editor.node.readOnly || editor.node.matches(":disabled")) return;
			e.preventDefault();
			const start = _fr0st_query.default.getProperty(editor._source, "selectionStart");
			const end = _fr0st_query.default.getProperty(editor._source, "selectionEnd");
			const value = _fr0st_query.default.getValue(editor._source);
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
			_fr0st_query.default.select(editor._source);
			document.execCommand("insertText", false, newValue);
			editor._source.setSelectionRange(newStart, newEnd);
		});
		editor.listen(editor._source, "scroll.ui.editor", editor._debounce((_) => {
			const scrollY = _fr0st_query.default.getScrollY(editor._source);
			_fr0st_query.default.setStyle(editor._lineNumbers, { marginTop: `${-scrollY}px` });
		}));
	}
	/**
	* Attach toolbar events.
	* @param {Editor} editor The editor instance.
	*/
	function eventsToolbar(editor) {
		editor.listen(editor._toolbar, "click.ui.editor", (e) => {
			const action = _fr0st_query.default.getDataset(e.currentTarget, "uiAction");
			if (!(action in editor.constructor.plugins)) throw new Error(`Unknown action ${action}`);
			e.preventDefault();
			e.stopPropagation();
			if (_fr0st_query.default.is(editor.node, ":disabled") || editor.node.readOnly && !["source", "fullScreen"].includes(action) || _fr0st_query.default.is(e.currentTarget, "[aria-disabled=\"true\"]")) return;
			if (editor._lastRange && editor._editor.contains(editor._lastRange.startContainer) && editor._editor.contains(editor._lastRange.endContainer)) {
				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(editor._lastRange);
			}
			editor.constructor.plugins[action].action.bind(editor)();
		}, { delegate: "[data-ui-action]" });
		editor.listen(editor._toolbar, "click.ui.editor", (e) => {
			if (editor.node.matches(":disabled") || editor.node.readOnly || e.currentTarget.matches("[aria-disabled=\"true\"]")) return;
			const command = _fr0st_query.default.getDataset(e.currentTarget, "uiCommand");
			if (!(command in editor)) throw new Error(`Unknown command ${command}`);
			e.preventDefault();
			if (editor._lastRange) {
				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(editor._lastRange);
			}
			const value = _fr0st_query.default.getDataset(e.currentTarget, "uiValue");
			editor[command](value);
			editor._refreshToolbar();
		}, { delegate: "[data-ui-command]" });
	}
	/**
	* Binds a drag whose global listeners and active state are owned by the editor.
	* @param {Editor} editor The editor.
	* @param {HTMLElement} handle The drag handle.
	* @param {Function} down The start callback.
	* @param {Function} move The move callback.
	* @param {Function} up The finish callback.
	*/
	function bindDrag(editor, handle, down, move, up) {
		let pointer = null;
		editor._onDispose(() => {
			pointer = null;
		});
		editor.listen(handle, "pointerdown.ui.editor", (event) => {
			if (event.button !== 0 || pointer !== null || _fr0st_query.default.is(editor.node, ":disabled") || editor.node.readOnly || down(event) === false) return;
			event.preventDefault();
			pointer = event.pointerId;
		});
		editor.listen(window, "pointermove.ui.editor", (event) => {
			if (event.pointerId === pointer) {
				event.preventDefault();
				move(event);
			}
		}, { passive: false });
		editor.listen(window, "blur.ui.editor", () => {
			if (pointer !== null) {
				pointer = null;
				up();
			}
		});
		editor.listen(window, "pointerup.ui.editor pointercancel.ui.editor", (event) => {
			if (event.pointerId === pointer) {
				pointer = null;
				up(event);
			}
		});
	}

// src/js/history.js
/** @import Editor from './editor.js'; */
	/** @import { EditorHistoryEntry, EditorSelectionData } from './types.js'; */
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
	* Adds a content snapshot, coalescing repeated HTML and bounding history safely.
	* @param {Editor} editor The editor.
	* @param {EditorHistoryEntry} data The snapshot.
	*/
	function addHistory(editor, { html, selectionData = null }) {
		if (editor._history.at(-1)?.html === html) {
			editor._history.at(-1).selectionData = selectionData;
			return;
		}
		editor._history.push({
			html,
			selectionData
		});
		const requested = Number(editor.options.historyLimit);
		const limit = Number.isFinite(requested) ? Math.max(1, Math.trunc(requested)) : 1e3;
		if (editor._history.length > limit) editor._history.splice(0, editor._history.length - limit);
	}
	/**
	* Captures a selection owned by this editor, including backward ranges.
	* @param {Editor} editor The editor.
	* @returns {EditorSelectionData|null} The saved selection.
	*/
	function getSelectionData(editor) {
		const { anchorNode, anchorOffset, focusNode, focusOffset } = window.getSelection();
		if (!anchorNode || !focusNode || !editor._editor.contains(anchorNode) || !editor._editor.contains(focusNode)) return null;
		return {
			anchorPath: getPathToNode(anchorNode, editor._editor),
			anchorOffset,
			focusPath: getPathToNode(focusNode, editor._editor),
			focusOffset
		};
	}
	/**
	* Restores content and its selection without creating another history entry.
	* @param {Editor} editor The editor.
	* @param {EditorHistoryEntry} data The snapshot.
	*/
	function restoreHistory(editor, { html, selectionData = null }) {
		if (!editor.node) return;
		const previous = _fr0st_query.default.getValue(editor.node);
		editor._observe(false);
		try {
			_fr0st_query.default.setHtml(editor._editor, html);
			const value = serialize(editor._editor);
			_fr0st_query.default.setValue(editor.node, value);
			_fr0st_query.default.setValue(editor._source, value);
			editor._focusEditor();
			if (!editor.node) return;
			const selection = window.getSelection();
			const anchor = selectionData && getNodeFromPath(selectionData.anchorPath, editor._editor);
			const focus = selectionData && getNodeFromPath(selectionData.focusPath, editor._editor);
			const length = (node) => node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
			if (anchor && focus) selection.setBaseAndExtent(anchor, Math.min(selectionData.anchorOffset, length(anchor)), focus, Math.min(selectionData.focusOffset, length(focus)));
			else {
				selection.selectAllChildren(editor._editor);
				selection.collapseToEnd();
			}
			editor._checkEmpty();
			editor._refreshDisabled();
			editor._refreshToolbar();
		} finally {
			editor._observe();
		}
		if (editor.node && previous !== editor.node.value) notifyChange(editor);
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
	* Remove the modal.
	* @param {Editor} editor The editor instance.
	*/
	function removeModal(editor) {
		if (!editor._modal) return;
		_fr0st_ui.Modal.init(editor._modal).dispose();
		_fr0st_query.default.remove(editor._modal);
		editor._modal = null;
	}
	/**
	* Show the image modal.
	* @param {Editor} editor The editor instance.
	*/
	function showImageModal(editor) {
		editor._removeModal();
		const returnFocus = document.activeElement;
		const container = _fr0st_query.default.create("div");
		const { group: fileGroup, input: fileInput } = editor.constructor._createFileInput({
			id: (0, _fr0st_ui.generateId)("editor-image-file"),
			label: editor.constructor.lang.modals.imageFile,
			attributes: {
				accept: "image/*",
				multiple: true
			}
		});
		const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = editor.constructor._createInput({
			id: (0, _fr0st_ui.generateId)("editor-image-url"),
			label: editor.constructor.lang.modals.imageUrl
		});
		_fr0st_query.default.append(container, fileGroup);
		_fr0st_query.default.append(container, urlGroup);
		const originalRange = getRange()?.cloneRange();
		editor._focusEditor();
		const range = getRange();
		range.collapse();
		editor._modal = editor.constructor._createModal({
			returnFocus,
			title: editor.constructor.lang.modals.insertImage,
			content: container,
			cancelText: editor.constructor.lang.modals.cancel,
			submitText: editor.constructor.lang.modals.insertImage,
			onSubmit: (_) => {
				selectRange(range);
				const files = _fr0st_query.default.getProperty(fileInput, "files");
				const src = _fr0st_query.default.getValue(urlInput);
				if (files.length) editor.options.imageUpload.bind(editor)(files);
				else if (src) {
					if (!isSafeURL(src, "image")) {
						urlInput.setAttribute("aria-invalid", "true");
						_fr0st_query.default.addClass(urlGroup, editor.constructor.classes.formError);
						_fr0st_query.default.setText(urlInvalidFeedback, editor.constructor.lang.modals.urlInvalid);
						return false;
					}
					editor.insertImage(src);
				}
			},
			onShown: (_) => {
				_fr0st_query.default.focus(fileInput);
			},
			onHidden: (_) => {
				editor._removeModal();
				if (editor.node) {
					selectRange(originalRange);
					if (!returnFocus?.isConnected) editor._focusEditor();
				}
			}
		});
		editor._ownComponent(_fr0st_ui.Modal.init(editor._modal));
	}
	/**
	* Show the link modal.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} [link] The current link.
	*/
	function showLinkModal(editor, link) {
		editor._removeModal();
		const returnFocus = document.activeElement;
		const container = _fr0st_query.default.create("div");
		const { group: textGroup, input: textInput } = editor.constructor._createInput({
			id: (0, _fr0st_ui.generateId)("editor-link-text"),
			label: editor.constructor.lang.modals.linkText
		});
		const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = editor.constructor._createInput({
			id: (0, _fr0st_ui.generateId)("editor-link-url"),
			label: editor.constructor.lang.modals.linkUrl
		});
		const { group: newWindowGroup, input: newWindowInput } = editor.constructor._createCheckbox({
			id: (0, _fr0st_ui.generateId)("editor-link-new-window"),
			label: editor.constructor.lang.modals.linkNewWindow
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
			editor._focusEditor();
			range = getRange();
		}
		editor._modal = editor.constructor._createModal({
			returnFocus,
			title: editor.constructor.lang.modals.insertLink,
			content: container,
			cancelText: editor.constructor.lang.modals.cancel,
			submitText: editor.constructor.lang.modals.insertLink,
			onSubmit: (_) => {
				selectRange(range);
				const text = _fr0st_query.default.getValue(textInput);
				const href = _fr0st_query.default.getValue(urlInput);
				const newWindow = _fr0st_query.default.is(newWindowInput, ":checked");
				if (!isSafeURL(href)) {
					urlInput.setAttribute("aria-invalid", "true");
					_fr0st_query.default.addClass(urlGroup, editor.constructor.classes.formError);
					_fr0st_query.default.setText(urlInvalidFeedback, editor.constructor.lang.modals.urlInvalid);
					return false;
				}
				editor.insertLink(href, text, newWindow);
			},
			onShown: (_) => {
				_fr0st_query.default.focus(urlInput);
			},
			onHidden: (_) => {
				editor._removeModal();
				if (editor.node) {
					selectRange(originalRange);
					if (!returnFocus?.isConnected) editor._focusEditor();
				}
			}
		});
		const controller = editor._ownComponent(_fr0st_ui.Modal.init(editor._modal));
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
	* Show the video modal.
	* @param {Editor} editor The editor instance.
	*/
	function showVideoModal(editor) {
		editor._removeModal();
		const returnFocus = document.activeElement;
		const container = _fr0st_query.default.create("div");
		const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = editor.constructor._createInput({
			id: (0, _fr0st_ui.generateId)("editor-video-url"),
			label: editor.constructor.lang.modals.videoUrl
		});
		_fr0st_query.default.append(container, urlGroup);
		const originalRange = getRange()?.cloneRange();
		editor._focusEditor();
		const range = getRange();
		editor._modal = editor.constructor._createModal({
			returnFocus,
			title: editor.constructor.lang.modals.insertVideo,
			content: container,
			cancelText: editor.constructor.lang.modals.cancel,
			submitText: editor.constructor.lang.modals.insertVideo,
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
					_fr0st_query.default.addClass(urlGroup, editor.constructor.classes.formError);
					_fr0st_query.default.setText(urlInvalidFeedback, editor.constructor.lang.modals.videoUrlInvalid);
					return false;
				}
				_fr0st_query.default.removeClass(urlGroup, editor.constructor.classes.formError);
				urlInput.removeAttribute("aria-invalid");
				const video = _fr0st_query.default.create("iframe", { attributes: {
					width: 560,
					height: 315,
					src: `https://www.youtube.com/embed/${id}`,
					frameborder: 0,
					allowfullscreen: true
				} });
				const html = _fr0st_query.default.getProperty(video, "outerHTML");
				editor.insertHTML(html);
			},
			onShown: (_) => {
				_fr0st_query.default.focus(urlInput);
			},
			onHidden: (_) => {
				editor._removeModal();
				if (editor.node) {
					selectRange(originalRange);
					if (!returnFocus?.isConnected) editor._focusEditor();
				}
			}
		});
		editor._ownComponent(_fr0st_ui.Modal.init(editor._modal));
	}
	/**
	* Create a form checkbox.
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
	* Create a form file input.
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
	* Create a form text input.
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
	* Create a modal.
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

// src/js/plugins.js
/** @import { EditorPlugin } from './types.js'; */
	/** @type {Record<string, EditorPlugin>} */
	var plugins_default = {
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
				this._colorDropdown(dropdown);
			}
		},
		font: {
			setContent() {
				const fontName = document.queryCommandValue("fontName").replace(/"/g, "");
				return this._fonts.includes(fontName) ? fontName : this._defaultFont;
			},
			dropdown(dropdown) {
				this._fontDropdown(dropdown);
			}
		},
		fontSize: {
			setContent() {
				const size = document.queryCommandValue("fontSize");
				if (size) return this.constructor.fontSizes[size];
				const fontSizePx = _fr0st_query.default.css(this._editor, "fontSize");
				return Math.round(parseFloat(fontSizePx));
			},
			dropdown(dropdown) {
				this._fontSizeDropdown(dropdown);
			}
		},
		fullScreen: { action() {
			if (this._fullScreen) {
				_fr0st_ui.Modal.init(this._fullScreen).hide();
				return;
			}
			this._fullScreen = this.constructor._createModal({
				content: this._container,
				fullScreen: true,
				onShown: (_) => {
					if (_fr0st_query.default.isVisible(this._sourceContainer)) _fr0st_query.default.focus(this._source);
					else _fr0st_query.default.focus(this._editor);
				},
				onHide: (_) => {
					_fr0st_query.default.insertBefore(this._container, this.node);
					this._fullScreen = null;
				}
			});
			this._ownComponent(_fr0st_ui.Modal.init(this._fullScreen));
		} },
		hr: { command: "insertHorizontalRule" },
		image: { action() {
			this._showImageModal();
		} },
		indent: { command: "indent" },
		italic: { command: "italic" },
		link: { action() {
			this._showLinkModal();
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
				return !this._redoHistory.length;
			}
		},
		removeFormat: { command: "removeFormat" },
		source: { action() {
			const value = _fr0st_query.default.getValue(this.node);
			if (_fr0st_query.default.isVisible(this._sourceContainer)) {
				this._observe(false);
				try {
					_fr0st_query.default.setHtml(this._editor, this.options.sanitize(value));
					this._normalize();
					this._checkEmpty();
					const html = _fr0st_query.default.getHtml(this._editor);
					if (this._history.at(-1)?.html !== html) {
						this._redoHistory = [];
						this._addHistory({ html });
					}
					this._updateValue();
				} finally {
					this._observe();
				}
				if (!this.node) return;
				this._showEditor();
				this._focusEditor();
			} else {
				_fr0st_query.default.setValue(this._source, value);
				this._showSource();
				_fr0st_query.default.focus(this._source);
			}
			this._refreshToolbar();
		} },
		strikethrough: { command: "strikethrough" },
		style: { dropdown(dropdown) {
			this._styleDropdown(dropdown);
		} },
		subscript: { command: "subscript" },
		superscript: { command: "superscript" },
		table: { dropdown(dropdown) {
			this._tableDropdown(dropdown);
		} },
		underline: { command: "underline" },
		undo: {
			command: "undo",
			disableCheck() {
				return !this._history.length;
			}
		},
		unlink: { command: "unlink" },
		unorderedList: { command: "insertUnorderedList" },
		video: { action() {
			this._showVideoModal();
		} }
	};

// src/js/popovers.js
/** @import { EditorPopover } from './types.js'; */
	/** @type {Record<string, EditorPopover>} */
	var popovers_default = {
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
			this._removePopover();
		} },
		link: { render(node) {
			const href = _fr0st_query.default.getAttribute(node, "href");
			return _fr0st_query.default.create("a", {
				text: href,
				class: this.constructor.classes.linkUrl,
				attributes: {
					href,
					target: "_blank",
					rel: "noopener noreferrer"
				}
			});
		} },
		linkEdit: { action(node) {
			this._showLinkModal(node);
		} },
		tableColumnAfter: { action(node) {
			this._updateTable(node, (td, _, table) => {
				const index = _fr0st_query.default.index(td);
				const rows = _fr0st_query.default.find(":scope > thead > tr, :scope > tbody > tr", table);
				this._observe(false);
				for (const row of rows) {
					const newTd = _fr0st_query.default.create("td", { html: "<br>" });
					const cells = _fr0st_query.default.children(row, "th, td");
					_fr0st_query.default.after(cells[index], newTd);
				}
				this._observe();
				this._updateValue();
			});
		} },
		tableColumnBefore: { action(node) {
			this._updateTable(node, (td, _, table) => {
				const index = _fr0st_query.default.index(td);
				const rows = _fr0st_query.default.find(":scope > thead > tr, :scope > tbody > tr", table);
				this._observe(false);
				for (const row of rows) {
					const newTd = _fr0st_query.default.create("td", { html: "<br>" });
					const cells = _fr0st_query.default.children(row, "th, td");
					_fr0st_query.default.before(cells[index], newTd);
				}
				this._observe();
				this._updateValue();
			});
		} },
		tableColumnRemove: { action(node) {
			this._updateTable(node, (td, _, table) => {
				const index = _fr0st_query.default.index(td);
				const rows = _fr0st_query.default.find(":scope > thead > tr, :scope > tbody > tr", table);
				this._observe(false);
				for (const row of rows) {
					const cells = _fr0st_query.default.children(row, "th, td");
					_fr0st_query.default.remove(cells[index]);
				}
				this._observe();
				this._updateValue();
				this._removePopover();
			});
		} },
		tableRemove: { action(node) {
			const table = _fr0st_query.default.closest(node, "table", this._editor).shift();
			_fr0st_query.default.detach(table);
			this._removePopover();
		} },
		tableRowAfter: { action(node) {
			this._updateTable(node, (_, tr) => {
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
			this._updateTable(node, (_, tr) => {
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
			this._updateTable(node, (_, tr) => {
				_fr0st_query.default.remove(tr);
				this._removePopover();
			});
		} },
		unlink: { action(node) {
			_fr0st_query.default.select(node);
			this.unlink();
			getRange().collapse();
		} }
	};

// src/js/positioning.js
/** @import Editor from './editor.js'; */
	/**
	* Highlight an image.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} image The image element.
	*/
	function highlightImage(editor, image) {
		_fr0st_query.default.hide(editor._imgHighlight);
		_fr0st_query.default.hide(editor._imgCursor);
		const imgRect = _fr0st_query.default.rect(image, { offset: true });
		const editorPos = _fr0st_query.default.position(editor._editor, { offset: true });
		const scrollX = _fr0st_query.default.getScrollX(editor._editorScroll);
		const scrollY = _fr0st_query.default.getScrollY(editor._editorScroll);
		const imgX = Math.round(imgRect.x);
		const imgY = Math.round(imgRect.y);
		const imgWidth = Math.round(imgRect.width);
		const imgHeight = Math.round(imgRect.height);
		_fr0st_query.default.setStyle(editor._imgHighlight, {
			top: `${imgY - editorPos.y + scrollY - 2}px`,
			left: `${imgX - editorPos.x + scrollX - 2}px`,
			width: `${imgWidth + 2}px`,
			height: `${imgHeight + 2}px`
		});
		editor._imgResize.setAttribute("aria-valuenow", String(imgWidth));
		_fr0st_query.default.setText(editor._imgSize, `${imgWidth}x${imgHeight}`);
		if (imgWidth < 100 || imgHeight < 50) _fr0st_query.default.hide(editor._imgSize);
		else _fr0st_query.default.show(editor._imgSize);
		_fr0st_query.default.show(editor._imgHighlight);
		_fr0st_query.default.show(editor._imgCursor);
	}
	/**
	* Refresh the popover.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} currentNode The current selected node.
	* @param {Event} [event] The current event.
	*/
	function refreshPopover(editor, currentNode, event) {
		if (!editor.node) return;
		if (_fr0st_query.default.isSame(currentNode, editor._currentNode)) return;
		editor._removePopover();
		editor._currentNode = currentNode;
		if (!editor._currentNode) return;
		const tagName = _fr0st_query.default.tagName(editor._currentNode);
		let reference = editor._currentNode;
		if (event && tagName === "img") {
			const editorPos = _fr0st_query.default.position(editor._editor, { offset: true });
			const scrollX = _fr0st_query.default.getScrollX(editor._editorScroll);
			const scrollY = _fr0st_query.default.getScrollY(editor._editorScroll);
			_fr0st_query.default.setStyle(editor._imgCursor, {
				top: `${event.pageY - editorPos.y + scrollY}px`,
				left: `${event.pageX - editorPos.x + scrollX}px`
			});
			reference = editor._imgCursor;
		}
		const originalPlacement = reference.getAttribute("data-ui-placement");
		editor._popper = new _fr0st_ui.Popper(editor._popover, {
			reference,
			arrow: editor._popoverArrow,
			container: editor._editor,
			placement: "bottom",
			position: "start",
			minContact: 0,
			afterUpdate(_, anchor) {
				if (editor._editor?.contains(anchor)) {
					if (originalPlacement === null) anchor.removeAttribute("data-ui-placement");
					else anchor.setAttribute("data-ui-placement", originalPlacement);
				}
			}
		});
		_fr0st_query.default.show(editor._popover);
		switch (tagName) {
			case "a":
				editor._renderPopoverItems(editor.options.popovers.link);
				break;
			case "img":
				editor._renderPopoverItems(editor.options.popovers.image);
				editor._highlightImage(editor._currentNode);
				_fr0st_query.default.show(editor._imgHighlight);
				break;
			case "td": editor._renderPopoverItems(editor.options.popovers.table);
		}
		editor._popper.update();
	}
	/**
	* Remove the popover.
	* @param {Editor} editor The editor instance.
	*/
	function removePopover(editor) {
		if (!editor._currentNode) return;
		_fr0st_query.default.hide(editor._imgHighlight);
		_fr0st_query.default.hide(editor._imgCursor);
		_fr0st_query.default.hide(editor._popover);
		_fr0st_query.default.empty(editor._popoverBody);
		editor._popper.dispose();
		editor._popper = null;
		editor._currentNode = null;
	}

// src/js/render/dropdowns.js
/** @import Editor from './../editor.js'; */
	/**
	* Render a color dropdown.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	function colorDropdown(editor, dropdown) {
		const container = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorContainerRow });
		const col1 = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorContainerColumn });
		const col2 = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorContainerColumn });
		const foreLabel = _fr0st_query.default.create("small", {
			text: editor.constructor.lang.dropdowns.colorForeground,
			class: editor.constructor.classes.colorLabel
		});
		const backLabel = _fr0st_query.default.create("small", {
			text: editor.constructor.lang.dropdowns.colorBackground,
			class: editor.constructor.classes.colorLabel
		});
		_fr0st_query.default.append(col1, foreLabel);
		_fr0st_query.default.append(col2, backLabel);
		const foreDefaultContainer = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorLabelContainer });
		_fr0st_query.default.append(col1, foreDefaultContainer);
		const backDefaultContainer = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorLabelContainer });
		_fr0st_query.default.append(col2, backDefaultContainer);
		const foreDefault = _fr0st_query.default.create("button", {
			text: editor.constructor.lang.dropdowns.colorDefault,
			class: editor.constructor.classes.colorDefaultBtn,
			attributes: { type: "button" }
		});
		_fr0st_query.default.append(foreDefaultContainer, foreDefault);
		editor._setToolbarData(foreDefault, {
			command: "foreColor",
			value: "initial"
		});
		const backDefault = _fr0st_query.default.create("button", {
			text: editor.constructor.lang.dropdowns.colorTransparent,
			class: editor.constructor.classes.colorDefaultBtn,
			attributes: { type: "button" }
		});
		_fr0st_query.default.append(backDefaultContainer, backDefault);
		editor._setToolbarData(backDefault, {
			command: "backColor",
			value: "initial"
		});
		for (const colorRow of editor.constructor.colors) {
			const foreRow = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorRow });
			_fr0st_query.default.append(col1, foreRow);
			const backRow = _fr0st_query.default.create("div", { class: editor.constructor.classes.colorRow });
			_fr0st_query.default.append(col2, backRow);
			for (const [colorName, color] of Object.entries(colorRow)) {
				const foreLink = _fr0st_query.default.create("button", {
					class: editor.constructor.classes.color,
					style: { backgroundColor: color },
					attributes: {
						"data-ui-title": colorName,
						"type": "button",
						"aria-label": colorName
					}
				});
				_fr0st_query.default.append(foreRow, foreLink);
				editor._ownComponent(_fr0st_ui.Tooltip.init(foreLink, {
					appendTo: document.body,
					placement: "bottom"
				}));
				editor._setToolbarData(foreLink, {
					command: "foreColor",
					value: color
				});
				const backLink = _fr0st_query.default.create("button", {
					class: editor.constructor.classes.color,
					style: { backgroundColor: color },
					attributes: {
						"data-ui-title": colorName,
						"type": "button",
						"aria-label": colorName
					}
				});
				_fr0st_query.default.append(backRow, backLink);
				editor._ownComponent(_fr0st_ui.Tooltip.init(backLink, {
					appendTo: document.body,
					placement: "bottom"
				}));
				editor._setToolbarData(backLink, {
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
	* Render a font dropdown.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	function fontDropdown(editor, dropdown) {
		const fonts = editor._fonts.sort();
		for (const font of fonts) {
			const button = _fr0st_query.default.create("button", {
				text: font,
				class: editor.constructor.classes.dropdownItem,
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
			editor._buttons.push({
				button,
				data
			});
			editor._setToolbarData(button, data);
			_fr0st_query.default.append(dropdown, button);
		}
	}
	/**
	* Render a font size dropdown.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	function fontSizeDropdown(editor, dropdown) {
		const sizes = Object.values(editor.constructor.fontSizes);
		for (const size of sizes) {
			const button = _fr0st_query.default.create("button", {
				text: size,
				class: editor.constructor.classes.dropdownItem,
				attributes: {
					"type": "button",
					"aria-label": size
				}
			});
			const data = {
				command: "fontSize",
				value: size
			};
			editor._buttons.push({
				button,
				data
			});
			editor._setToolbarData(button, data);
			_fr0st_query.default.append(dropdown, button);
		}
	}
	/**
	* Render a style dropdown.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	function styleDropdown(editor, dropdown) {
		for (const tag of editor.constructor.styles) {
			const button = _fr0st_query.default.create("button", {
				class: editor.constructor.classes.dropdownItem,
				attributes: {
					"type": "button",
					"aria-label": editor.constructor.lang.styles[tag]
				}
			});
			const content = _fr0st_query.default.create(tag, {
				text: editor.constructor.lang.styles[tag],
				class: editor.constructor.classes.styleContent
			});
			_fr0st_query.default.append(button, content);
			const data = {
				command: "formatBlock",
				value: tag.toUpperCase()
			};
			editor._buttons.push({
				button,
				data
			});
			editor._setToolbarData(button, data);
			_fr0st_query.default.append(dropdown, button);
		}
	}
	/**
	* Render a table dropdown.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	function tableDropdown(editor, dropdown) {
		const container = _fr0st_query.default.create("div");
		for (let i = 0; i < 10; i++) {
			const row = _fr0st_query.default.create("div", { class: editor.constructor.classes.tableRow });
			_fr0st_query.default.append(container, row);
			for (let j = 0; j < 10; j++) {
				const cell = _fr0st_query.default.create("div", { class: editor.constructor.classes.tableCell });
				_fr0st_query.default.append(row, cell);
				if (i > 4 || j > 4) _fr0st_query.default.hide(cell);
				const link = _fr0st_query.default.create("button", {
					class: editor.constructor.classes.tableLink,
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
		const info = _fr0st_query.default.create("span", { class: editor.constructor.classes.tableInfo });
		_fr0st_query.default.addClass(dropdown, editor.constructor.classes.tableDropdown);
		_fr0st_query.default.append(dropdown, container);
		_fr0st_query.default.append(dropdown, info);
		editor.listen(container, "click.ui.editor", (e) => {
			const cols = _fr0st_query.default.getDataset(e.currentTarget, "uiColumn");
			const rows = _fr0st_query.default.getDataset(e.currentTarget, "uiRow");
			const container = _fr0st_query.default.create("div");
			const table = _fr0st_query.default.create("table", { class: editor.constructor.classes.table });
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
			editor.insertHTML(html);
		}, { delegate: "button" });
		editor.listen(container, "mouseover.ui.editor focusin.ui.editor", (e) => {
			const targetCol = _fr0st_query.default.getDataset(e.currentTarget, "uiColumn");
			const targetRow = _fr0st_query.default.getDataset(e.currentTarget, "uiRow");
			const colMin = Math.max(targetCol + 1, 4);
			const rowMin = Math.max(targetRow + 1, 4);
			const links = _fr0st_query.default.find("button", container);
			for (const element of links) {
				const col = _fr0st_query.default.getDataset(element, "uiColumn");
				const row = _fr0st_query.default.getDataset(element, "uiRow");
				if (col <= targetCol && row <= targetRow) _fr0st_query.default.addClass(element, editor.constructor.classes.tableHover);
				else _fr0st_query.default.removeClass(element, editor.constructor.classes.tableHover);
				const parent = _fr0st_query.default.parent(element);
				if (col <= colMin && row <= rowMin) _fr0st_query.default.show(parent);
				else _fr0st_query.default.hide(parent);
			}
			_fr0st_query.default.setText(info, `${targetCol + 1} x ${targetRow + 1}`);
		}, { delegate: "button" });
	}

// src/js/render/editor.js
/** @import Editor from './../editor.js'; */
	/**
	* Render the editor.
	* @param {Editor} editor The editor instance.
	*/
	function render(editor) {
		editor._container = _fr0st_query.default.create("div", { class: editor.constructor.classes.container });
		editor._renderToolbar();
		editor._editorBody = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.editorBody,
			style: { height: editor.options.height }
		});
		_fr0st_query.default.append(editor._container, editor._editorBody);
		editor._renderEditor();
		editor._renderSource();
		editor._renderPopover();
		editor._renderDrop();
		if (editor.options.resizable) editor._renderResize();
		_fr0st_query.default.hide(editor.node);
		_fr0st_query.default.setAttribute(editor.node, { "aria-hidden": true });
		_fr0st_query.default.insertBefore(editor._container, editor.node);
		if (editor._resizeBar) editor._resizeBar.setAttribute("aria-valuenow", String(Math.round(editor._editorBody.getBoundingClientRect().height)));
	}
	/**
	* Render a button
	* @param {Editor} editor The editor instance.
	* @param {object} data The button data.
	* @returns {HTMLElement} The button.
	*/
	function renderButton(editor, data) {
		const button = _fr0st_query.default.create("button", {
			class: editor.constructor.classes.btn,
			attributes: { type: "button" }
		});
		if (data.setTitle) data.title = data.setTitle.bind(editor)();
		if (data.title) {
			_fr0st_query.default.setAttribute(button, {
				"title": data.title,
				"aria-label": data.title
			});
			const tooltip = editor._ownComponent(_fr0st_ui.Tooltip.init(button, {
				appendTo: document.body,
				placement: "bottom"
			}));
			editor.listen(button, "click.ui.editor", () => tooltip.hide());
		}
		if ("content" in data) _fr0st_query.default.setHtml(button, data.content);
		else {
			const content = _fr0st_query.default.parseHtml(editor.constructor.icons[data.icon]);
			_fr0st_query.default.addClass(content, editor.constructor.classes.btnIcon);
			_fr0st_query.default.append(button, content);
		}
		return button;
	}
	/**
	* Render the drop elements.
	* @param {Editor} editor The editor instance.
	*/
	function renderDrop(editor) {
		editor._dropTarget = _fr0st_query.default.create("div", { class: editor.constructor.classes.dropTarget });
		editor._dropText = _fr0st_query.default.create("span", {
			text: editor.constructor.lang.drop.dropHere,
			class: editor.constructor.classes.dropText
		});
		_fr0st_query.default.append(editor._dropTarget, editor._dropText);
		_fr0st_query.default.hide(editor._dropTarget);
		_fr0st_query.default.append(editor._container, editor._dropTarget);
	}
	/**
	* Render the editor elements.
	* @param {Editor} editor The editor instance.
	*/
	function renderEditor(editor) {
		editor._editorScroll = _fr0st_query.default.create("div", { class: editor.constructor.classes.editorScroll });
		editor._editorContainer = _fr0st_query.default.create("div", { class: editor.constructor.classes.editorContainer });
		editor._editor = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.editor,
			style: { fontFamily: editor._defaultFont },
			attributes: {
				"role": "textbox",
				"aria-multiline": true,
				"spellcheck": true,
				"autocorrect": true
			}
		});
		editor._imgHighlight = _fr0st_query.default.create("div", { class: editor.constructor.classes.imgHighlight });
		editor._imgCursor = _fr0st_query.default.create("div", { class: editor.constructor.classes.imgCursor });
		editor._imgSize = _fr0st_query.default.create("div", { class: editor.constructor.classes.imgSize });
		editor._imgResize = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.imgResize,
			attributes: {
				"role": "slider",
				"tabindex": 0,
				"aria-label": editor.constructor.lang.resizeImage,
				"aria-valuemin": 1,
				"aria-valuenow": 1
			}
		});
		_fr0st_query.default.hide(editor._imgHighlight);
		_fr0st_query.default.append(editor._imgHighlight, editor._imgSize);
		_fr0st_query.default.append(editor._imgHighlight, editor._imgResize);
		_fr0st_query.default.append(editor._editorContainer, editor._imgCursor);
		_fr0st_query.default.append(editor._editorContainer, editor._imgHighlight);
		_fr0st_query.default.append(editor._editorContainer, editor._editor);
		_fr0st_query.default.append(editor._editorScroll, editor._editorContainer);
		_fr0st_query.default.append(editor._editorBody, editor._editorScroll);
	}
	/**
	* Render the resize bar.
	* @param {Editor} editor The editor instance.
	*/
	function renderResize(editor) {
		editor._resizeBar = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.resizeBar,
			attributes: {
				"role": "separator",
				"tabindex": 0,
				"aria-label": editor.constructor.lang.resizeEditor,
				"aria-orientation": "horizontal",
				"aria-valuenow": 0
			}
		});
		for (let i = 0; i < 3; i++) {
			const hr = _fr0st_query.default.create("hr", { attributes: { "aria-hidden": true } });
			_fr0st_query.default.append(editor._resizeBar, hr);
		}
		_fr0st_query.default.append(editor._container, editor._resizeBar);
	}
	/**
	* Render the source elements.
	* @param {Editor} editor The editor instance.
	*/
	function renderSource(editor) {
		editor._sourceOuter = _fr0st_query.default.create("div", { class: editor.constructor.classes.sourceOuter });
		editor._sourceContainer = _fr0st_query.default.create("div", { class: editor.constructor.classes.sourceContainer });
		editor._lineNumbers = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.sourceLines,
			attributes: { "aria-hidden": true }
		});
		editor._sourceScroll = _fr0st_query.default.create("div", { class: editor.constructor.classes.sourceScroll });
		editor._source = _fr0st_query.default.create("textarea", { class: editor.constructor.classes.source });
		_fr0st_query.default.hide(editor._sourceOuter);
		_fr0st_query.default.append(editor._sourceScroll, editor._source);
		_fr0st_query.default.append(editor._sourceContainer, editor._lineNumbers);
		_fr0st_query.default.append(editor._sourceContainer, editor._sourceScroll);
		_fr0st_query.default.append(editor._sourceOuter, editor._sourceContainer);
		_fr0st_query.default.append(editor._editorBody, editor._sourceOuter);
	}

// src/js/render/popover.js
/** @import Editor from './../editor.js'; */
	/**
	* Render the popover elements.
	* @param {Editor} editor The editor instance.
	*/
	function renderPopover(editor) {
		editor._popover = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.popover,
			attributes: {
				"role": "group",
				"aria-label": editor.constructor.lang.contextToolbar
			}
		});
		editor._popoverArrow = _fr0st_query.default.create("div", { class: editor.constructor.classes.popoverArrow });
		editor._popoverBody = _fr0st_query.default.create("div", { class: editor.constructor.classes.popoverBody });
		_fr0st_query.default.hide(editor._popover);
		_fr0st_query.default.append(editor._popover, editor._popoverArrow);
		_fr0st_query.default.append(editor._popover, editor._popoverBody);
		_fr0st_query.default.append(editor._container, editor._popover);
	}
	/**
	* Render a popover item.
	* @param {Editor} editor The editor instance.
	* @param {string} type The item type.
	* @param {HTMLElement} parent The parent element.
	*/
	function renderPopoverItem(editor, type, parent) {
		const data = editor.constructor.popovers[type];
		let node;
		if (data.render) node = data.render.bind(editor)(editor._currentNode);
		else {
			node = editor._renderButton({
				icon: type,
				title: editor.constructor.lang.popovers[type],
				...data
			});
			_fr0st_query.default.setDataset(node, { uiAction: type });
		}
		_fr0st_query.default.append(parent, node);
	}
	/**
	* Render popover items.
	* @param {Editor} editor The editor instance.
	* @param {Array} items The items to render.
	*/
	function renderPopoverItems(editor, items) {
		for (const item of items) if (_fr0st_query.default._isString(item)) editor._renderPopoverItem(item, editor._popoverBody);
		else {
			const node = _fr0st_query.default.create("div", {
				class: editor.constructor.classes.btnGroup,
				attributes: { role: "group" }
			});
			for (const type of item) editor._renderPopoverItem(type, node);
			_fr0st_query.default.append(editor._popoverBody, node);
		}
	}

// src/js/render/toolbar.js
/** @import Editor from './../editor.js'; */
	/**
	* Render the toolbar.
	* @param {Editor} editor The editor instance.
	*/
	function renderToolbar(editor) {
		const header = _fr0st_query.default.create("div", { class: editor.constructor.classes.toolbar });
		editor._toolbar = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.toolbarButtons,
			attributes: {
				"role": "toolbar",
				"aria-label": editor.constructor.lang.toolbar
			}
		});
		for (const buttons of editor._toolbarButtons) {
			const buttonGroup = _fr0st_query.default.create("div", { class: editor.constructor.classes.btnGroup });
			for (const type of buttons) editor._renderToolbarButton(type, buttonGroup);
			_fr0st_query.default.append(editor._toolbar, buttonGroup);
		}
		_fr0st_query.default.append(header, editor._toolbar);
		_fr0st_query.default.append(editor._container, header);
	}
	/**
	* Render a toolbar button.
	* @param {Editor} editor The editor instance.
	* @param {string} type The button type.
	* @param {HTMLElement} parent The parent element.
	*/
	function renderToolbarButton(editor, type, parent) {
		const data = editor.constructor.plugins[type];
		const button = editor._renderButton({
			icon: type,
			title: editor.constructor.lang.plugins[type],
			...data
		});
		editor._buttons.push({
			button,
			data,
			type
		});
		editor._setToolbarData(button, data, type);
		if ("dropdown" in data) editor._renderToolbarDropdown(parent, button, data.dropdown);
		else _fr0st_query.default.append(parent, button);
	}
	/**
	* Render a toolbar dropdown.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} buttonGroup The button group element.
	* @param {HTMLElement} button The button element.
	* @param {Array|Function} dropdownContent The dropdown content.
	*/
	function renderToolbarDropdown(editor, buttonGroup, button, dropdownContent) {
		const dropGroup = _fr0st_query.default.create("div", {
			class: editor.constructor.classes.dropdownGroup,
			attributes: { role: "group" }
		});
		_fr0st_query.default.addClass(button, editor.constructor.classes.dropdownToggle);
		_fr0st_query.default.setDataset(button, { uiToggle: "dropdown" });
		_fr0st_query.default.setAttribute(button, {
			"aria-haspopup": true,
			"aria-expanded": false
		});
		_fr0st_query.default.append(dropGroup, button);
		const dropdown = _fr0st_query.default.create("div", { class: editor.constructor.classes.dropdown });
		if (_fr0st_query.default._isArray(dropdownContent)) {
			_fr0st_query.default.addClass(dropdown, editor.constructor.classes.dropdownButtons);
			for (const dropdownItems of dropdownContent) {
				const subDropGroup = _fr0st_query.default.create("div", {
					class: editor.constructor.classes.btnGroup,
					attributes: { role: "group" }
				});
				for (const type of dropdownItems) editor._renderToolbarButton(type, subDropGroup);
				_fr0st_query.default.append(dropdown, subDropGroup);
			}
		} else if (_fr0st_query.default._isFunction(dropdownContent)) dropdownContent.bind(editor)(dropdown);
		_fr0st_query.default.append(dropGroup, dropdown);
		_fr0st_query.default.append(buttonGroup, dropGroup);
		editor._ownComponent(_fr0st_ui.Dropdown.init(button));
		editor.listen(document, "keydown.ui.editor", (event) => {
			if (event.code === "Escape" && dropdown.contains(document.activeElement)) button.focus();
		}, { capture: true });
	}
	/**
	* Set data for a toolbar action.
	* @param {Editor} editor The editor instance.
	* @param {HTMLElement} node The action node.
	* @param {object} data The data to set.
	* @param {string} [type] The action type.
	*/
	function setToolbarData(editor, node, data, type) {
		if (data.command) {
			_fr0st_query.default.setDataset(node, { uiCommand: data.command });
			if (data.value) _fr0st_query.default.setDataset(node, { uiValue: data.value });
		} else if (data.action && type) _fr0st_query.default.setDataset(node, { uiAction: type });
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
/** @import { EditorOptions, EditorHistoryEntry, EditorSelectionData, EditorPlugin, EditorPopover, EditorInputOptions, EditorInputElements, EditorModalOptions } from './types.js'; */
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
		static defaults = defaults;
		static fonts = fonts;
		static fontSizes = fontSizes;
		static icons = icons_default;
		static lang = lang;
		/** @type {Record<string, EditorPlugin>} */
		static plugins = plugins_default;
		/** @type {Record<string, EditorPopover>} */
		static popovers = popovers_default;
		static styles = styles;
		/** @type {Array<{button: HTMLElement, data: EditorPlugin, type?: string}>} */
		_buttons = [];
		/** @type {EditorHistoryEntry[]} */
		_history = [];
		/** @type {EditorHistoryEntry[]} */
		_redoHistory = [];
		/** @type {Array<() => void>} */
		#cleanups = [];
		/** @type {Set<BaseComponent>} */
		#components = /* @__PURE__ */ new Set();
		#disposing = false;
		/** @type {Set<HTMLImageElement>} */
		#images = /* @__PURE__ */ new Set();
		#observationDepth = 0;
		/** @type {MutationObserver|null} */
		#observer = null;
		/** @type {Map<string, string|null>} */
		#originalAttributes = /* @__PURE__ */ new Map();
		/** @type {[number, number, 'forward'|'backward'|'none']|null} */
		#originalSelection = null;
		#pendingMutation = false;
		/** @type {Set<FileReader>} */
		#readers = /* @__PURE__ */ new Set();
		/**
		* Create a form checkbox.
		* @param {EditorInputOptions} options Options for the checkbox.
		* @returns {EditorInputElements} The form elements.
		*/
		static _createCheckbox(options) {
			return createCheckbox(this, options);
		}
		/**
		* Create a form file input.
		* @param {EditorInputOptions} options Options for the file input.
		* @returns {EditorInputElements} The form elements.
		*/
		static _createFileInput(options) {
			return createFileInput(this, options);
		}
		/**
		* Create a form text input.
		* @param {EditorInputOptions} options Options for the text input.
		* @returns {EditorInputElements} The form elements.
		*/
		static _createInput(options) {
			return createInput(this, options);
		}
		/**
		* Create a modal.
		* @param {EditorModalOptions} options Options for the modal.
		* @returns {HTMLElement} The modal element.
		*/
		static _createModal(options) {
			return createModal(this, options);
		}
		/**
		* New Editor constructor.
		* @param {HTMLElement} node The input node.
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
				this._toolbarButtons = this.options.buttons || this.constructor.buttons;
				this._fonts = (this.options.fonts || this.constructor.fonts).filter((font) => document.fonts.check(`12px ${font}`));
				this._defaultFont = this._fonts.includes(this.options.defaultFont) ? this.options.defaultFont : this._fonts[0] || "sans-serif";
				this._render();
				_fr0st_query.default.setHtml(this._editor, this.options.sanitize(_fr0st_query.default.getValue(node)));
				this._refreshDisabled();
				this._checkEmpty();
				this._events();
				this._normalize();
				this._updateValue();
				if (!this.node) return;
				this._refreshToolbar();
				addEditor(this);
				if (active === node) this._focusEditor();
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
		* Add an item to the history.
		* @param {EditorHistoryEntry} data The history snapshot.
		*/
		_addHistory(data) {
			addHistory(this, data);
		}
		/**
		* Check if the editor is empty and populate base markup.
		*/
		_checkEmpty() {
			checkEmpty(this);
		}
		/**
		* Render a color dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		_colorDropdown(dropdown) {
			colorDropdown(this, dropdown);
		}
		/**
		* Creates a deferred callback that cannot run after disposal.
		* @param {Function} callback The callback to defer.
		* @returns {Function} The guarded callback.
		*/
		_debounce(callback) {
			return _fr0st_query.default.debounce((...args) => {
				if (this.node) callback(...args);
			});
		}
		/**
		* Attach events for the Editor.
		*/
		_events() {
			events(this);
		}
		/**
		* Attach drop events.
		*/
		_eventsDrop() {
			eventsDrop(this);
		}
		/**
		* Attach editor events.
		*/
		_eventsEditor() {
			eventsEditor(this);
		}
		/**
		* Attach popover events.
		*/
		_eventsPopover() {
			eventsPopover(this);
		}
		/**
		* Attach resize events.
		*/
		_eventsResize() {
			eventsResize(this);
		}
		/**
		* Attach source events.
		*/
		_eventsSource() {
			eventsSource(this);
		}
		/**
		* Attach toolbar events.
		*/
		_eventsToolbar() {
			eventsToolbar(this);
		}
		/**
		* Execute a command.
		* @param {string} command The command.
		* @param {boolean | string} [value] The command argument.
		*/
		_execCommand(command, value) {
			execCommand(this, command, value);
		}
		/**
		* Ensure the editor element has focus.
		*/
		_focusEditor() {
			focusEditor(this);
		}
		/**
		* Render a font dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		_fontDropdown(dropdown) {
			fontDropdown(this, dropdown);
		}
		/**
		* Render a font size dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		_fontSizeDropdown(dropdown) {
			fontSizeDropdown(this, dropdown);
		}
		/**
		* Get selection data for history.
		* @returns {EditorSelectionData|null} The selection data.
		*/
		_getSelectionData() {
			return getSelectionData(this);
		}
		/**
		* Highlight an image.
		* @param {HTMLElement} image The image element.
		*/
		_highlightImage(image) {
			highlightImage(this, image);
		}
		/**
		* Insert a (cloned) node into the editor.
		* @param {HTMLElement} node The node to insert.
		* @returns {HTMLElement} The new node.
		*/
		_insertNode(node) {
			return insertNode(this, node);
		}
		/**
		* Normalize the editor.
		*/
		_normalize() {
			normalize(this);
		}
		/**
		* Suspends or resumes content observation with balanced nested calls.
		* @param {boolean} [observe=true] Whether to resume observation.
		*/
		_observe(observe = true) {
			if (!this.node || !this.#observer) return;
			if (!observe) {
				if (this.#observationDepth++ === 0) {
					this.#pendingMutation ||= this.#observer.takeRecords().some((record) => record.type !== "attributes" || record.target !== this._editor);
					this.#observer.disconnect();
				}
				return;
			}
			this.#observationDepth = Math.max(0, this.#observationDepth - 1);
			if (this.#observationDepth === 0) {
				this.#observer.observe(this._editor, {
					attributes: true,
					childList: true,
					characterData: true,
					subtree: true
				});
				if (this.#pendingMutation) {
					this.#pendingMutation = false;
					this._debounce(() => {
						if (_fr0st_query.default.isVisible(this._sourceContainer)) return;
						this._normalize();
						this._checkEmpty();
						this._updateValue();
					})();
				}
			}
		}
		/**
		* Registers cleanup for resources created by an extension or rendering helper.
		* @param {Function} callback The cleanup callback.
		*/
		_onDispose(callback) {
			if (this.node) this.#cleanups.push(callback);
			else callback();
		}
		/**
		* Owns a child UI component until disposal.
		* @template {BaseComponent} T
		* @param {T} component The child component.
		* @returns {T} The child component.
		*/
		_ownComponent(component) {
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
		_readImage(file) {
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
		* Refresh the popover at cursor.
		*/
		_refreshCursor() {
			refreshCursor(this);
		}
		/**
		* Refresh the editor disabled.
		*/
		_refreshDisabled() {
			refreshDisabled(this);
		}
		/**
		* Refresh the source line numbers.
		*/
		_refreshLineNumbers() {
			refreshLineNumbers(this);
		}
		/**
		* Refresh the popover.
		* @param {HTMLElement} currentNode The current selected node.
		* @param {Event} [event] The current event.
		*/
		_refreshPopover(currentNode, event) {
			refreshPopover(this, currentNode, event);
		}
		/**
		* Refresh the toolbar.
		*/
		_refreshToolbar() {
			refreshToolbar(this);
		}
		/**
		* Remove the modal.
		*/
		_removeModal() {
			removeModal(this);
		}
		/**
		* Remove the popover.
		*/
		_removePopover() {
			removePopover(this);
		}
		/**
		* Render the editor.
		*/
		_render() {
			render(this);
		}
		/**
		* Render a button
		* @param {object} data The button data.
		* @returns {HTMLElement} The button.
		*/
		_renderButton(data) {
			return renderButton(this, data);
		}
		/**
		* Render the drop elements.
		*/
		_renderDrop() {
			renderDrop(this);
		}
		/**
		* Render the editor elements.
		*/
		_renderEditor() {
			renderEditor(this);
		}
		/**
		* Render the popover elements.
		*/
		_renderPopover() {
			renderPopover(this);
		}
		/**
		* Render a popover item.
		* @param {string} type The item type.
		* @param {HTMLElement} parent The parent element.
		*/
		_renderPopoverItem(type, parent) {
			renderPopoverItem(this, type, parent);
		}
		/**
		* Render popover items.
		* @param {Array} items The items to render.
		*/
		_renderPopoverItems(items) {
			renderPopoverItems(this, items);
		}
		/**
		* Render the resize bar.
		*/
		_renderResize() {
			renderResize(this);
		}
		/**
		* Render the source elements.
		*/
		_renderSource() {
			renderSource(this);
		}
		/**
		* Render the toolbar.
		*/
		_renderToolbar() {
			renderToolbar(this);
		}
		/**
		* Render a toolbar button.
		* @param {string} type The button type.
		* @param {HTMLElement} parent The parent element.
		*/
		_renderToolbarButton(type, parent) {
			renderToolbarButton(this, type, parent);
		}
		/**
		* Render a toolbar dropdown.
		* @param {HTMLElement} buttonGroup The button group element.
		* @param {HTMLElement} button The button element.
		* @param {Array|Function} dropdownContent The dropdown content.
		*/
		_renderToolbarDropdown(buttonGroup, button, dropdownContent) {
			renderToolbarDropdown(this, buttonGroup, button, dropdownContent);
		}
		/**
		* Reset the drop text.
		*/
		_resetDropText() {
			resetDropText(this);
		}
		/**
		* Restore an item from history.
		* @param {EditorHistoryEntry} data The history snapshot.
		*/
		_restoreHistory(data) {
			restoreHistory(this, data);
		}
		/**
		* Set data for a toolbar action.
		* @param {HTMLElement} node The action node.
		* @param {object} data The data to set.
		* @param {string} [type] The action type.
		*/
		_setToolbarData(node, data, type) {
			setToolbarData(this, node, data, type);
		}
		/**
		* Show the drop target.
		*/
		_showDropTarget() {
			showDropTarget(this);
		}
		/**
		* Show the editor.
		*/
		_showEditor() {
			showEditor(this);
		}
		/**
		* Show the image modal.
		*/
		_showImageModal() {
			showImageModal(this);
		}
		/**
		* Show the link modal.
		* @param {HTMLElement} [link] The current link.
		*/
		_showLinkModal(link) {
			showLinkModal(this, link);
		}
		/**
		* Show the source.
		*/
		_showSource() {
			showSource(this);
		}
		/**
		* Show the video modal.
		*/
		_showVideoModal() {
			showVideoModal(this);
		}
		/**
		* Render a style dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		_styleDropdown(dropdown) {
			styleDropdown(this, dropdown);
		}
		/**
		* Render a table dropdown.
		* @param {HTMLElement} dropdown The dropdown.
		*/
		_tableDropdown(dropdown) {
			tableDropdown(this, dropdown);
		}
		/**
		* Update a table element.
		* @param {HTMLElement} td The td element.
		* @param {Function} callback The callback.
		*/
		_updateTable(td, callback) {
			updateTable(this, td, callback);
		}
		/**
		* Update the input value.
		*/
		_updateValue() {
			updateValue(this);
		}
		/**
		* Starts observing content changes owned by this editor.
		*/
		_watchContent() {
			const changed = this._debounce(() => {
				if (_fr0st_query.default.isVisible(this._sourceContainer)) return;
				this._normalize();
				this._checkEmpty();
				this._updateValue();
			});
			this.#observer = new MutationObserver((records) => {
				if (records.some((record) => record.type !== "attributes" || record.target !== this._editor)) changed();
			});
			this._observe();
		}
		/**
		* Set the background color.
		* @param {string} value The background color.
		*/
		backColor(value) {
			this._execCommand("backColor", value);
		}
		/**
		* Toggle bold state.
		*/
		bold() {
			this._execCommand("bold");
		}
		/**
		* Disable the Editor.
		*/
		disable() {
			_fr0st_query.default.setAttribute(this.node, { disabled: true });
			this._refreshDisabled();
			this._refreshToolbar();
		}
		/**
		* Dispose the Editor.
		*/
		dispose() {
			if (!this.node || this.#disposing) return;
			this.#disposing = true;
			const node = this.node;
			const active = document.activeElement;
			const restoreFocus = this._container?.contains(active) || this._modal?.contains(active) || this._fullScreen?.contains(active);
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
			release(() => this._popper?.dispose());
			for (const modal of [this._modal, this._fullScreen]) if (modal) {
				release(() => _fr0st_ui.Modal.init(modal).dispose());
				_fr0st_query.default.remove(modal);
			}
			if (this._container) _fr0st_query.default.remove(this._container);
			for (const [name, value] of this.#originalAttributes) if (value === null) node.removeAttribute(name);
			else node.setAttribute(name, value);
			if (restoreFocus && node.isConnected && !node.hidden) {
				node.focus({ preventScroll: true });
				node.setSelectionRange(...this.#originalSelection);
			}
			for (const key of [
				"_container",
				"_toolbar",
				"_editorBody",
				"_editorContainer",
				"_editorScroll",
				"_editor",
				"_imgHighlight",
				"_imgCursor",
				"_imgResize",
				"_imgSize",
				"_sourceOuter",
				"_sourceContainer",
				"_sourceScroll",
				"_lineNumbers",
				"_source",
				"_popover",
				"_popoverArrow",
				"_popoverBody",
				"_dropTarget",
				"_dropText",
				"_resizeBar",
				"_currentNode",
				"_lastRange",
				"_history",
				"_redoHistory",
				"_buttons",
				"_modal",
				"_fullScreen",
				"_popper"
			]) this[key] = null;
			if (failure) throw failure;
		}
		/**
		* Enable the Editor.
		*/
		enable() {
			_fr0st_query.default.removeAttribute(this.node, "disabled");
			this._refreshDisabled();
			this._refreshToolbar();
		}
		/**
		* Set the font family.
		* @param {string} value The font family.
		*/
		fontName(value) {
			this._execCommand("fontName", value);
		}
		/**
		* Set the font size.
		* @param {number|string} value The font size in pixels.
		*/
		fontSize(value) {
			value = Object.keys(this.constructor.fontSizes).find((key) => this.constructor.fontSizes[key] === Number(value));
			this._execCommand("fontSize", value);
		}
		/**
		* Set the foreground color.
		* @param {string} value The foreground color.
		*/
		foreColor(value) {
			this._execCommand("foreColor", value);
		}
		/**
		* Format the selected block level element.
		* @param {string} value The tag name.
		*/
		formatBlock(value) {
			this._execCommand("formatBlock", value);
		}
		/**
		* Indent the selection.
		*/
		indent() {
			changeIndent(this, false);
		}
		/**
		* Insert a horizontal rule.
		*/
		insertHorizontalRule() {
			this._execCommand("insertHorizontalRule");
		}
		/**
		* Insert a HTML string.
		* @param {string} value The HTML string.
		*/
		insertHTML(value) {
			if (!this.node || this.node.matches(":disabled") || this.node.readOnly) return;
			this._execCommand("insertHTML", this.options.sanitize(value));
		}
		/**
		* Insert an image.
		* @param {string} src The image src.
		*/
		insertImage(src) {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly) return;
			if (!isSafeURL(src, "image")) return;
			const img = _fr0st_query.default.create("img", { attributes: { src } });
			const newImg = this._insertNode(img);
			if (!newImg) return;
			const image = new Image();
			this.#images.add(image);
			const finish = () => {
				this.#images.delete(image);
				image.onload = null;
				image.onerror = null;
			};
			image.onload = () => {
				if (this.node && this._editor.contains(newImg)) {
					const maxWidth = _fr0st_query.default.width(this._editor, { boxSize: _fr0st_query.default.CONTENT_BOX });
					_fr0st_query.default.setStyle(newImg, { width: `${Math.min(image.width, maxWidth)}px` });
				}
				finish();
			};
			image.onerror = finish;
			image.src = src;
		}
		/**
		* Insert a link.
		* @param {string} href The link href.
		* @param {string} text The link text.
		* @param {boolean} [newWindow] Whether to open the link in a new window.
		*/
		insertLink(href, text, newWindow) {
			if (!isSafeURL(href)) return;
			const link = _fr0st_query.default.create("a", {
				text,
				attributes: { href }
			});
			if (newWindow) _fr0st_query.default.setAttribute(link, {
				target: "_blank",
				rel: "noopener noreferrer"
			});
			this._insertNode(link);
		}
		/**
		* Create an ordered list for the selection.
		*/
		insertOrderedList() {
			this._execCommand("insertOrderedList");
		}
		/**
		* Insert a text string.
		* @param {string} value The text.
		*/
		insertText(value) {
			this._execCommand("insertText", value);
		}
		/**
		* Create an unordered list for the selection.
		*/
		insertUnorderedList() {
			this._execCommand("insertUnorderedList");
		}
		/**
		* Toggle italic state.
		*/
		italic() {
			this._execCommand("italic");
		}
		/**
		* Center the selection.
		*/
		justifyCenter() {
			this._execCommand("justifyCenter");
		}
		/**
		* Justify the selection.
		*/
		justifyFull() {
			this._execCommand("justifyFull");
		}
		/**
		* Align the selection to the left.
		*/
		justifyLeft() {
			this._execCommand("justifyLeft");
		}
		/**
		* Align the selection to the right.
		*/
		justifyRight() {
			this._execCommand("justifyRight");
		}
		/**
		* Outdent the selection.
		*/
		outdent() {
			changeIndent(this, true);
		}
		/**
		* Perform a redo.
		*/
		redo() {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly || !this._redoHistory.length) return;
			const current = this._redoHistory.pop();
			this._addHistory(current);
			this._restoreHistory(current);
		}
		/**
		* Reload a programmatically assigned textarea value and state.
		*/
		refresh() {
			if (this.node) loadValue(this);
		}
		/**
		* Remove all formatting from the selection.
		*/
		removeFormat() {
			this._execCommand("removeFormat");
		}
		/**
		* Toggle strikethrough state.
		*/
		strikethrough() {
			this._execCommand("strikethrough");
		}
		/**
		* Toggle subscript state.
		*/
		subscript() {
			this._execCommand("subscript");
		}
		/**
		* Toggle superscript state.
		*/
		superscript() {
			this._execCommand("superscript");
		}
		/**
		* Toggle underline state.
		*/
		underline() {
			this._execCommand("underline");
		}
		/**
		* Perform an undo.
		*/
		undo() {
			if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || this.node.readOnly || this._history.length <= 1) return;
			const next = this._history.pop();
			this._redoHistory.push(next);
			const current = this._history.at(-1);
			this._restoreHistory(current);
		}
		/**
		* Remove the selected anchor element.
		*/
		unlink() {
			this._execCommand("unlink");
		}
	};

// src/js/index.js
	(0, _fr0st_ui.initComponent)("editor", Editor);
	var js_default = Editor;

exports.Editor = js_default;
});
//# sourceMappingURL=frost-ui-editor.js.map