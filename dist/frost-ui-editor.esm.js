import { BaseComponent, Dropdown, Modal, Popper, Tooltip, generateId, initComponent } from "@fr0st/ui";
import $ from "@fr0st/query";

// src/js/helpers.js
/**
* Checks whether a node is the parent itself or one of its descendants.
* @param {Node|null|undefined} parent The parent node.
* @param {Node|null|undefined} node The node to check.
* @returns {boolean} Whether the parent contains the node.
*/
function containsNode(parent, node) {
	return Boolean(parent && node) && ($.isSame(parent, node) || $.hasDescendent(parent, node));
}

// src/js/normalize.js
/** @import { EditorSelectionMarkers } from './types.js'; */
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
* @returns {boolean} Whether the node is phrasing content.
*/
var isPhrasingContent = (node) => $._isText(node) || $.is(node, phrasingSelector);
/**
* Determines whether a node is a form element.
* https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
* @param {Node} node The input node.
* @returns {boolean} Whether the node is a form element.
*/
var isFormElement = (node) => $.is(node, "button, fieldset, input, object, output, select, textarea");
/**
* Determines whether a node is a void element.
* https://developer.mozilla.org/en-US/docs/Glossary/Void_element
* @param {Node} node The input node.
* @returns {boolean} Whether the node is a void element.
*/
var isVoidElement = (node) => $.is(node, "area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr");
/**
* Determines whether a node is a phrasing container.
* @param {Node} node The input node.
* @returns {boolean} Whether the node is a phrasing container.
*/
var isPhrasingContainer = (node) => !$._isText(node) && isPhrasingContent(node) && !isVoidElement(node) && !isFormElement(node);
/**
* Joins adjacent inline elements.
* @param {HTMLElement} container The container.
* @param {EditorSelectionMarkers} markers The selection markers.
*/
function joinAdjacentNodes(container, markers) {
	const elements = $.find("*", container);
	const isMarker = (node) => node === markers.start || node === markers.end;
	for (const element of elements) {
		if (!containsNode(container, element) || !isPhrasingContainer(element)) continue;
		const moveMarkers = [];
		let next = element.nextSibling;
		while (next && isMarker(next)) {
			moveMarkers.push(next);
			next = next.nextSibling;
		}
		if (!next || !isPhrasingContainer(next) || !$.isEqual(element, next, { shallow: true })) continue;
		$.prepend(next, [...$.contents(element), ...moveMarkers]);
		$.detach(element);
	}
}
/**
* Normalizes phrasing containers.
* @param {HTMLElement} container The container.
*/
function normalizePhrasing(container) {
	const elements = $.find("h1, h2, h3, h4, h5, h6, p, pre", container);
	for (const element of elements) {
		if (!containsNode(container, element)) continue;
		const contents = $.contents(element);
		if (!contents.length) continue;
		for (const [i, child] of contents.entries()) {
			if (isPhrasingContent(child)) continue;
			const nextSiblings = contents.splice(i);
			$.after(element, nextSiblings);
			const tagName = $.tagName(element);
			const wrapContents = (parent, nodes) => {
				const stack = [];
				let lastNode;
				for (const node of nodes) {
					if (isPhrasingContent(node)) {
						stack.push(node);
						continue;
					}
					if (stack.length) {
						const clone = $.clone(element, { deep: false });
						const tempNodes = stack.splice(0);
						$.append(clone, tempNodes);
						$.before(node, clone);
					}
					lastNode = node;
					if ($.is(element, "p") || $.is(node, tagName)) continue;
					if ($.is(node, "h1, h2, h3, h4, h5, h6, p, pre")) {
						const clone = $.clone(element, { deep: false });
						const styles = {
							...$.getStyle(node),
							...$.getStyle(clone)
						};
						$.before(node, clone);
						$.setStyle(clone, styles);
						$.append(clone, $.contents(node));
						$.detach(node);
						lastNode = clone;
						continue;
					}
					wrapContents(node, $.contents(node));
				}
				if (stack.length) {
					const clone = $.clone(element, { deep: false });
					$.append(clone, stack);
					if (lastNode) $.after(lastNode, clone);
					else $.append(parent, clone);
				}
			};
			wrapContents(element, nextSiblings);
			break;
		}
		if (!contents.length) $.detach(element);
	}
}
/**
* Normalizes span elements.
* @param {HTMLElement} container The container.
*/
function normalizeSpans(container) {
	const elements = $.find("span", container);
	for (const element of elements) {
		if ([...$.getProperty(element, "attributes")].length) continue;
		const contents = $.contents(element);
		if (contents.length) $.after(element, contents);
		$.detach(element);
	}
}
/**
* Normalizes style attributes.
* @param {HTMLElement} container The container.
*/
function normalizeStyles(container) {
	const elements = $.find("[style]", container);
	for (const element of elements) {
		const styles = $.getStyle(element);
		for (const [style, value] of Object.entries(styles)) {
			if (value === "inherit") {
				$.removeStyle(element, style);
				continue;
			}
			const clone = $.clone(element, { deep: false });
			$.after(element, clone);
			$.removeAttribute(clone, "style");
			let testValue = $.css(clone, style);
			$.detach(clone);
			if (style === "background-color" && testValue === transparent) testValue = [container, ...$.parents(element, null, container)].map((parent) => $.css(parent, style)).filter((parentStyle) => parentStyle !== transparent).pop();
			if ($.css(element, style) === testValue) $.removeStyle(element, style);
		}
		if ($.getAttribute(element, "style") === "") $.removeAttribute(element, "style");
	}
}

// src/js/commands.js
var window$4 = $.getWindow();
/**
* Tests whether a range includes content inside a block rather than just its boundary.
* @param {Range} range The selected range.
* @param {HTMLElement} block The block to test.
* @returns {boolean} Whether the block contains selected content.
*/
function intersects(range, block) {
	if (range.collapsed) return containsNode(block, range.startContainer);
	const start = range.cloneRange();
	const end = range.cloneRange();
	start.collapse(true);
	end.collapse(false);
	const blockStart = $.createRange();
	blockStart.selectNodeContents(block);
	const blockEnd = blockStart.cloneRange();
	blockStart.collapse(true);
	blockEnd.collapse(false);
	if (start.compareBoundaryPoints(window$4.Range.START_TO_START, blockEnd) >= 0 || end.compareBoundaryPoints(window$4.Range.START_TO_START, blockStart) <= 0) return false;
	const overlap = range.cloneRange();
	if (start.compareBoundaryPoints(window$4.Range.START_TO_START, blockStart) < 0) overlap.setStart(block, 0);
	if (end.compareBoundaryPoints(window$4.Range.START_TO_START, blockEnd) > 0) overlap.setEnd(block, block.childNodes.length);
	return Boolean(overlap.toString() || $.find("br, img, hr, iframe, video, audio, svg, input", block).some((node) => overlap.intersectsNode(node)) || !block.childNodes.length);
}
/**
* Gets the block units affected by a selection.
* @param {HTMLElement} root The editing boundary.
* @param {Range} range The selected range.
* @returns {HTMLElement[]} The selected blocks or sibling list items.
*/
function getSelectedBlocks(root, range) {
	const anchor = range.startContainer.nodeType === window$4.Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
	const item = $.closest(anchor, "li")[0];
	if (item && containsNode(root, item)) return [...item.parentElement.children].filter((node) => $.is(node, "li") && intersects(range, node));
	const blocks = [];
	const visit = (parent) => {
		for (const child of [...parent.children]) {
			if (!range.intersectsNode(child)) continue;
			if ($.is(child, "p, h1, h2, h3, h4, h5, h6, pre, li") || $.is(child, "div, blockquote, td, th") && [...child.childNodes].every(isPhrasingContent)) {
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
	if (!node.children.length && !$.getText(node).trim()) $.replaceWith(node, node.childNodes);
}
/**
* Indents sibling blocks or list items.
* @param {HTMLElement[]} blocks The consecutive selected blocks.
*/
function indentBlocks(blocks) {
	const first = blocks[0];
	const parent = first.parentElement;
	if ($.is(first, "li")) {
		const previous = first.previousElementSibling;
		if (!$.is(previous, "li")) return;
		let list = previous.lastElementChild;
		if (!list || list.tagName !== parent.tagName) {
			list = $.create(parent.localName);
			$.append(previous, list);
		}
		$.append(list, blocks);
		return;
	}
	const wrapper = $.create("div");
	$.setStyle(wrapper, "marginInlineStart", "2em");
	$.before(first, wrapper);
	$.append(wrapper, blocks);
}
/**
* Moves list items out of one nesting level, retaining following items as children.
* @param {HTMLElement[]} blocks The consecutive selected list items.
*/
function outdentItems(blocks) {
	const list = blocks[0].parentElement;
	const parentItem = list.parentElement;
	const following = $.clone(list, { deep: false })[0];
	$.removeAttribute(following, "id");
	while (blocks.at(-1).nextSibling) $.append(following, blocks.at(-1).nextSibling);
	if ($.is(parentItem, "li")) {
		if (following.children.length) $.append(blocks.at(-1), following);
		$.after(parentItem, blocks);
	} else {
		const content = $.createFragment();
		for (const item of blocks) {
			const paragraph = $.create("p");
			while (item.firstChild && isPhrasingContent(item.firstChild)) $.append(paragraph, item.firstChild);
			if (paragraph.childNodes.length) $.append(content, paragraph);
			$.append(content, item.childNodes);
			$.remove(item);
		}
		if (following.children.length) $.append(content, following);
		$.after(list, content);
	}
	removeEmpty(list);
}
/**
* Outdents a selection from a margin wrapper without modifying surrounding blocks.
* @param {HTMLElement[]} blocks The selected blocks.
* @param {HTMLElement} root The editing boundary.
*/
function outdentBlocks(blocks, root) {
	if ($.is(blocks[0], "li")) {
		outdentItems(blocks);
		return;
	}
	const wrappers = /* @__PURE__ */ new Set();
	for (const block of blocks) {
		let wrapper = block;
		while (wrapper && wrapper !== root && !(parseFloat($.getStyle(wrapper, "marginInlineStart") || $.getStyle(wrapper, "marginLeft")) > 0)) wrapper = wrapper.parentElement;
		if (wrapper && wrapper !== root) wrappers.add(wrapper);
	}
	for (const wrapper of wrappers) {
		const selected = [...wrapper.childNodes].filter((node) => blocks.some((block) => containsNode(node, block)));
		if (blocks.includes(wrapper)) $.replaceWith(wrapper, wrapper.childNodes);
		else if (selected.length) {
			const following = $.clone(wrapper, { deep: false })[0];
			$.removeAttribute(following, "id");
			while (selected.at(-1).nextSibling) $.append(following, selected.at(-1).nextSibling);
			$.after(wrapper, [...selected, following]);
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

// src/js/history.js
/** @import { EditorSelectionData } from './types.js'; */
var window$3 = $.getWindow();
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
	const { anchorNode, anchorOffset, focusNode, focusOffset } = window$3.getSelection();
	if (!anchorNode || !focusNode || !containsNode(container, anchorNode) || !containsNode(container, focusNode)) return null;
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
	const selection = window$3.getSelection();
	const anchor = selectionData && getNodeFromPath(selectionData.anchorPath, container);
	const focus = selectionData && getNodeFromPath(selectionData.focusPath, container);
	const length = (node) => node.nodeType === window$3.Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
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
var document$2 = $.getContext();
/**
* Creates a form checkbox.
* @param {typeof Editor} Component The component class.
* @param {EditorInputOptions} options Options for the checkbox.
* @returns {EditorInputElements} The form elements.
*/
function createCheckbox(Component, options) {
	const group = $.create("div", { class: Component.classes.formGroup });
	const inputContainer = $.create("div", { class: Component.classes.checkboxContainer });
	const input = $.create("input", {
		class: Component.classes.checkbox,
		attributes: {
			id: options.id,
			type: "checkbox",
			...options.attributes
		}
	});
	const label = $.create("label", {
		text: options.label,
		class: Component.classes.checkboxLabel,
		attributes: { for: options.id }
	});
	$.append(inputContainer, input);
	$.append(inputContainer, label);
	$.append(group, inputContainer);
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
	const group = $.create("div", { class: Component.classes.formGroup });
	const label = $.create("label", {
		text: options.label,
		attributes: { for: options.id }
	});
	const inputContainer = $.create("div", { class: Component.classes.inputContainer });
	const input = $.create("input", {
		class: Component.classes.input,
		attributes: {
			id: options.id,
			type: "file",
			...options.attributes
		}
	});
	$.append(group, label);
	$.append(inputContainer, input);
	$.append(group, inputContainer);
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
	const group = $.create("div", { class: Component.classes.formGroup });
	const label = $.create("label", {
		text: options.label,
		attributes: { for: options.id }
	});
	const inputContainer = $.create("div", { class: Component.classes.inputContainer });
	const input = $.create("input", {
		class: Component.classes.input,
		attributes: {
			id: options.id,
			type: options.type || "text",
			...options.attributes
		}
	});
	const invalidFeedback = $.create("div", { class: Component.classes.invalidFeedback });
	$.append(group, label);
	$.append(inputContainer, input);
	$.append(group, inputContainer);
	invalidFeedback.id = `${options.id}-error`;
	$.setAttribute(input, "aria-describedby", invalidFeedback.id);
	$.append(group, invalidFeedback);
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
	const returnFocus = options.returnFocus || document$2.activeElement;
	const modal = $.create("div", {
		class: Component.classes.modal,
		attributes: {
			"tabindex": -1,
			"role": "dialog",
			"aria-modal": true,
			"aria-label": options.title || Component.lang.plugins.fullScreen
		}
	});
	const modalDialog = $.create("div", { class: Component.classes.modalDialog });
	$.append(modal, modalDialog);
	if (options.fullScreen) $.addClass(modalDialog, Component.classes.modalFullscreen);
	const modalContent = $.create("form", { class: Component.classes.modalContent });
	$.append(modalDialog, modalContent);
	const modalHeader = $.create("div", { class: Component.classes.modalHeader });
	$.append(modalContent, modalHeader);
	if (options.title) {
		const modalTitle = $.create("h6", {
			class: Component.classes.modalTitle,
			text: options.title
		});
		modalTitle.id = generateId("editor-dialog");
		$.setAttribute(modal, "aria-labelledby", modalTitle.id);
		$.append(modalHeader, modalTitle);
	}
	const closeBtn = $.create("button", {
		class: Component.classes.modalBtnClose,
		dataset: { uiDismiss: "modal" },
		attributes: {
			"type": "button",
			"aria-label": Component.lang.modals.close
		}
	});
	$.append(modalHeader, closeBtn);
	if (options.content) {
		const modalBody = $.create("div", { class: Component.classes.modalBody });
		$.append(modalBody, options.content);
		$.append(modalContent, modalBody);
	}
	if (options.onSubmit) {
		const modalFooter = $.create("div", { class: Component.classes.modalFooter });
		$.append(modalContent, modalFooter);
		const cancelButton = $.create("button", {
			text: options.cancelText,
			class: Component.classes.modalBtnSecondary,
			dataset: { uiDismiss: "modal" },
			attributes: { type: "button" }
		});
		$.append(modalFooter, cancelButton);
		const submitButton = $.create("button", {
			text: options.submitText,
			class: Component.classes.modalBtnPrimary,
			attributes: { type: "submit" }
		});
		$.append(modalFooter, submitButton);
	}
	$.append(document$2.body, modal);
	const controller = Modal.init(modal);
	if (options.onSubmit) controller.listen(modalContent, "submit", (event) => {
		event.preventDefault();
		if (options.onSubmit(event) === false) return;
		controller.hide();
	});
	if ("onShow" in options) controller.listen(modal, "show.ui.modal", (event) => {
		options.onShow(event);
	});
	if ("onShown" in options) controller.listen(modal, "shown.ui.modal", (event) => {
		options.onShown(event);
	});
	if ("onHide" in options) controller.listen(modal, "hide.ui.modal", (event) => {
		options.onHide(event);
	});
	controller.listen(modal, "hidden.ui.modal", (event) => {
		try {
			options.onHidden?.(event);
		} finally {
			controller.dispose();
			$.remove(modal);
			if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
		}
	});
	controller.show(returnFocus);
	return modal;
}

// src/js/selection.js
/** @import { EditorSelectionMarkers } from './types.js'; */
var window$2 = $.getWindow();
/**
* Gets the current range, optionally restricted to an editing boundary.
* @param {HTMLElement|null} [container=null] The optional editing boundary.
* @returns {Range|null} The owned range, or null when the selection is elsewhere.
*/
function getRange(container = null) {
	const selection = window$2.getSelection();
	if (!selection.rangeCount) return null;
	const range = selection.getRangeAt(0);
	return !container || containsNode(container, range.startContainer) && containsNode(container, range.endContainer) ? range : null;
}
/**
* Restores a range from markers and removes the markers without losing direction.
* @param {EditorSelectionMarkers} [markers={}] The selection markers.
*/
function restoreSelection({ start, end, backward = false } = {}) {
	if (!start?.isConnected || !end?.isConnected) {
		$.remove(start);
		$.remove(end);
		return;
	}
	const range = $.createRange();
	range.setStartAfter(start);
	range.setEndBefore(end);
	$.remove(start);
	$.remove(end);
	const selection = window$2.getSelection();
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
	const selection = window$2.getSelection();
	const backward = !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
	const start = $.createText("");
	const end = $.createText("");
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
* @param {Node} node The node to select.
* @returns {Range} The selected range.
*/
function selectNode(node) {
	const range = $.createRange();
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
	const selection = window$2.getSelection();
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
	const selection = window$2.getSelection();
	const backward = range && !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
	$.normalize(container);
	if (range) selectRange(range, backward);
}

// src/js/shared-events.js
/** @import Editor from './editor.js'; */
var document$1 = $.getContext();
var window$1 = $.getWindow();
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
* @param {(event: Event) => void} callback The event callback.
*/
function listenShared(target, events, callback) {
	$.addEvent(target, events, callback);
	cleanups.push(() => $.removeEvent(target, events, callback));
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
	const deferred = (callback) => $.debounce(() => {
		if (generation === session) callback();
	});
	listenShared(document$1.body, "dragenter.ui.editor", () => {
		if (dragCount++ === 0) for (const current of editors.values()) current.showDropTarget();
	});
	listenShared(document$1.body, "dragleave.ui.editor", () => {
		dragCount = Math.max(0, dragCount - 1);
		if (dragCount === 0) resetDragCount();
	});
	listenShared(document$1.body, "dragend.ui.editor drop.ui.editor", resetDragCount);
	listenShared(document$1, "selectionchange.ui.editor", deferred(() => {
		const range = getRange();
		for (const current of editors.values()) current.selectionChange(range);
	}));
	listenShared(window$1, "click.ui.editor", () => {
		for (const current of editors.values()) current.removePopover();
	});
	listenShared(window$1, "resize.ui.editor", deferred(() => {
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
/** @import { EditorOptions, EditorHistoryEntry, EditorPlugin, EditorPopover, EditorDropdownCallback } from './types.js'; */
var document = $.getContext();
var window = $.getWindow();
/**
* A customizable WYSIWYG editor backed by a native textarea.
* @augments {BaseComponent<EditorOptions>}
* @fires Editor#init.ui.editor
* @fires Editor#change.ui.editor
*/
var Editor = class extends BaseComponent {
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
		* @param {KeyboardEvent} event The keyboard event.
		*/
		keyDown(event) {
			if (!event.ctrlKey && !event.metaKey || event.altKey) return;
			let action;
			switch (event.key.toLowerCase()) {
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
					action = event.shiftKey ? "redo" : "undo";
					break;
				default: return;
			}
			event.preventDefault();
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
				const span = $.create("span", {
					text: "A",
					class: this.constructor.classes.colorBtnContent,
					style: {
						color: foreColor,
						backgroundColor: backColor
					}
				});
				return $.getProperty(span, "outerHTML");
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
				const fontSizePx = $.css(this.#editor, "fontSize");
				return Math.round(parseFloat(fontSizePx));
			},
			dropdown(dropdown) {
				this.#fontSizeDropdown(dropdown);
			}
		},
		fullScreen: { action() {
			if (this.#fullScreen) {
				Modal.init(this.#fullScreen).hide();
				return;
			}
			this.#fullScreen = createModal(this.constructor, {
				content: this.#container,
				fullScreen: true,
				onShown: () => {
					if ($.isVisible(this.#sourceContainer)) $.focus(this.#source);
					else $.focus(this.#editor);
				},
				onHide: () => {
					$.insertBefore(this.#container, this.node);
					this.#fullScreen = null;
				}
			});
			this.#ownComponent(Modal.init(this.#fullScreen));
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
			const value = $.getValue(this.node);
			if ($.isVisible(this.#sourceContainer)) {
				this.#observe(false);
				try {
					$.setHtml(this.#editor, value);
					this.#normalize();
					this.#checkEmpty();
					const html = $.getHtml(this.#editor);
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
				$.setValue(this.#source, value);
				this.#showSource();
				$.focus(this.#source);
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
			$.setStyle(node, { float: "left" });
		} },
		floatRight: { action(node) {
			$.setStyle(node, { float: "right" });
		} },
		floatNone: { action(node) {
			$.removeStyle(node, "float");
		} },
		imageFull: {
			content: "100%",
			action(node) {
				$.setStyle(node, { width: "100%" });
			}
		},
		imageHalf: {
			content: "50%",
			action(node) {
				$.setStyle(node, { width: "50%" });
			}
		},
		imageQuarter: {
			content: "25%",
			action(node) {
				$.setStyle(node, { width: "25%" });
			}
		},
		imageOriginal: { action(node) {
			$.removeStyle(node, "width");
		} },
		imageRemove: { action(node) {
			$.detach(node);
			this.#removePopover();
		} },
		link: { render(node) {
			const href = $.getAttribute(node, "href");
			return $.create("a", {
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
				const index = $.index(td);
				const rows = $.find(":scope > thead > tr, :scope > tbody > tr", table);
				this.#observe(false);
				for (const row of rows) {
					const newTd = $.create("td", { html: "<br>" });
					const cells = $.children(row, "th, td");
					$.after(cells[index], newTd);
				}
				this.#observe();
				this.#updateValue();
			});
		} },
		tableColumnBefore: { action(node) {
			this.#updateTable(node, (td, _, table) => {
				const index = $.index(td);
				const rows = $.find(":scope > thead > tr, :scope > tbody > tr", table);
				this.#observe(false);
				for (const row of rows) {
					const newTd = $.create("td", { html: "<br>" });
					const cells = $.children(row, "th, td");
					$.before(cells[index], newTd);
				}
				this.#observe();
				this.#updateValue();
			});
		} },
		tableColumnRemove: { action(node) {
			this.#updateTable(node, (td, _, table) => {
				const index = $.index(td);
				const rows = $.find(":scope > thead > tr, :scope > tbody > tr", table);
				this.#observe(false);
				for (const row of rows) {
					const cells = $.children(row, "th, td");
					$.remove(cells[index]);
				}
				this.#observe();
				this.#updateValue();
				this.#removePopover();
			});
		} },
		tableRemove: { action(node) {
			const table = $.closest(node, "table", this.#editor).shift();
			$.detach(table);
			this.#removePopover();
		} },
		tableRowAfter: { action(node) {
			this.#updateTable(node, (_, tr) => {
				const columns = $.children(tr).length;
				const newTr = $.create("tr");
				for (let i = 0; i < columns; i++) {
					const newTd = $.create("td", { html: "<br>" });
					$.append(newTr, newTd);
				}
				$.after(tr, newTr);
			});
		} },
		tableRowBefore: { action(node) {
			this.#updateTable(node, (_, tr) => {
				const columns = $.children(tr).length;
				const newTr = $.create("tr");
				for (let i = 0; i < columns; i++) {
					const newTd = $.create("td", { html: "<br>" });
					$.append(newTr, newTd);
				}
				$.before(tr, newTr);
			});
		} },
		tableRowRemove: { action(node) {
			this.#updateTable(node, (_, tr) => {
				$.remove(tr);
				this.#removePopover();
			});
		} },
		unlink: { action(node) {
			$.select(node);
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
	#originalStyle = false;
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
	#releaseDisplay = null;
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
		if (!$._isElement(node) || !$.is(node, "textarea")) throw new TypeError("Editor must be created on a textarea element.");
		super(node, options);
		this.#originalStyle = $.hasAttribute(node, "style");
		this.#originalAttributes = new Map([
			"tabindex",
			"hidden",
			"aria-hidden"
		].map((name) => [name, $.getAttribute(node, name)]));
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
			$.setHtml(this.#editor, $.getValue(node));
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
				if (active instanceof window.HTMLElement && active.isConnected && document.activeElement !== active) active.focus({ preventScroll: true });
				selectRange(originalRange);
			}
			if (this.node) $.triggerEvent(node, "init.ui.editor");
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
		$.setAttribute(this.node, { disabled: true });
		this.#refreshDisabled();
		this.#refreshToolbar();
	}
	/** @inheritdoc */
	dispose() {
		if (!this.node || this.#disposing) return;
		this.#disposing = true;
		const node = this.node;
		const active = document.activeElement;
		const restoreFocus = containsNode(this.#container, active) || containsNode(this.#modal, active) || containsNode(this.#fullScreen, active);
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
			release(() => Modal.init(modal).dispose());
			$.remove(modal);
		}
		if (this.#container) $.remove(this.#container);
		this.#releaseDisplay?.();
		this.#releaseDisplay = null;
		if (!this.#originalStyle && !$.getAttribute(node, "style")) $.removeAttribute(node, "style");
		for (const [name, value] of this.#originalAttributes) if (value === null) $.removeAttribute(node, name);
		else $.setAttribute(node, name, value);
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
		$.removeAttribute(this.node, "disabled");
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
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly) return;
		this.#execCommand("insertHTML", value);
	}
	/**
	* Inserts an image.
	* @param {string} src The image src.
	*/
	insertImage(src) {
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly) return;
		const img = $.create("img", { attributes: { src } });
		const newImg = this.insertNode(img);
		if (!newImg) return;
		const image = new window.Image();
		this.#images.add(image);
		const finish = () => {
			this.#images.delete(image);
			image.onload = null;
			image.onerror = null;
		};
		image.onload = () => {
			if (this.node && containsNode(this.#editor, newImg)) {
				const maxWidth = $.width(this.#editor, { boxSize: $.CONTENT_BOX });
				$.setStyle(newImg, { width: `${Math.min(image.width, maxWidth)}px` });
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
		const link = $.create("a", {
			text,
			attributes: { href }
		});
		if (newWindow) $.setAttribute(link, { target: "_blank" });
		this.insertNode(link);
	}
	/**
	* Inserts a trusted DOM element at the current selection.
	* @param {HTMLElement} node The node to insert.
	* @returns {HTMLElement|null} The inserted element, or null when editing is unavailable.
	*/
	insertNode(node) {
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly) return null;
		this.#focusEditor();
		if (!this.node) return null;
		const range = getRange(this.#editor);
		if (!range) return null;
		this.#addHistory({
			html: $.getHtml(this.#editor),
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
	* @param {() => void} callback The cleanup callback.
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
	* Restores the next history snapshot.
	*/
	redo() {
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly || !this.#redoHistory.length) return;
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
	* Restores the previous history snapshot.
	*/
	undo() {
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly || this.#history.length <= 1) return;
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
	* @param {(event: PointerEvent) => boolean|void} down The start callback; false cancels the drag.
	* @param {(event: PointerEvent) => void} move The move callback.
	* @param {(event?: PointerEvent) => void} up The finish callback; window blur supplies no event.
	*/
	#bindDrag(handle, down, move, up) {
		let pointer = null;
		this.onDispose(() => {
			pointer = null;
		});
		this.listen(handle, "pointerdown.ui.editor", (event) => {
			if (event.button !== 0 || pointer !== null || $.is(this.node, ":disabled") || this.node.readOnly || down(event) === false) return;
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
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly) return;
		this.#focusEditor();
		if (!this.node) return;
		const range = getRange(this.#editor);
		if (!range) return;
		let blocks = getSelectedBlocks(this.#editor, range);
		if (outdent && !blocks.length) return;
		this.#addHistory({
			html: $.getHtml(this.#editor),
			selectionData: getSelectionData(this.#editor)
		});
		this.#observe(false);
		const markers = saveSelection(this.#editor);
		try {
			if (!blocks.length) {
				const paragraph = $.create("p");
				let first = markers.start;
				while (first.parentNode !== this.#editor) first = first.parentNode;
				while (first.previousSibling && isPhrasingContent(first.previousSibling)) first = first.previousSibling;
				const inline = [];
				for (let node = first; node && isPhrasingContent(node); node = node.nextSibling) inline.push(node);
				if (inline.length) {
					$.before(inline[0], paragraph);
					$.append(paragraph, inline);
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
	* Checks whether the editor is empty and populates base markup.
	*/
	#checkEmpty() {
		if (this.node && !$.getHtml(this.#editor).trim()) $.setHtml(this.#editor, "<p><br></p>");
	}
	/**
	* Renders a color dropdown.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	#colorDropdown(dropdown) {
		const container = $.create("div", { class: this.constructor.classes.colorContainerRow });
		const col1 = $.create("div", { class: this.constructor.classes.colorContainerColumn });
		const col2 = $.create("div", { class: this.constructor.classes.colorContainerColumn });
		const foreLabel = $.create("small", {
			text: this.constructor.lang.dropdowns.colorForeground,
			class: this.constructor.classes.colorLabel
		});
		const backLabel = $.create("small", {
			text: this.constructor.lang.dropdowns.colorBackground,
			class: this.constructor.classes.colorLabel
		});
		$.append(col1, foreLabel);
		$.append(col2, backLabel);
		const foreDefaultContainer = $.create("div", { class: this.constructor.classes.colorLabelContainer });
		$.append(col1, foreDefaultContainer);
		const backDefaultContainer = $.create("div", { class: this.constructor.classes.colorLabelContainer });
		$.append(col2, backDefaultContainer);
		const foreDefault = $.create("button", {
			text: this.constructor.lang.dropdowns.colorDefault,
			class: this.constructor.classes.colorDefaultBtn,
			attributes: { type: "button" }
		});
		$.append(foreDefaultContainer, foreDefault);
		this.#setToolbarData(foreDefault, {
			command: "foreColor",
			value: "initial"
		});
		const backDefault = $.create("button", {
			text: this.constructor.lang.dropdowns.colorTransparent,
			class: this.constructor.classes.colorDefaultBtn,
			attributes: { type: "button" }
		});
		$.append(backDefaultContainer, backDefault);
		this.#setToolbarData(backDefault, {
			command: "backColor",
			value: "initial"
		});
		for (const colorRow of this.constructor.colors) {
			const foreRow = $.create("div", { class: this.constructor.classes.colorRow });
			$.append(col1, foreRow);
			const backRow = $.create("div", { class: this.constructor.classes.colorRow });
			$.append(col2, backRow);
			for (const [colorName, color] of Object.entries(colorRow)) {
				const foreLink = $.create("button", {
					class: this.constructor.classes.color,
					style: { backgroundColor: color },
					attributes: {
						"data-ui-title": colorName,
						"type": "button",
						"aria-label": colorName
					}
				});
				$.append(foreRow, foreLink);
				this.#ownComponent(Tooltip.init(foreLink, {
					appendTo: document.body,
					placement: "bottom"
				}));
				this.#setToolbarData(foreLink, {
					command: "foreColor",
					value: color
				});
				const backLink = $.create("button", {
					class: this.constructor.classes.color,
					style: { backgroundColor: color },
					attributes: {
						"data-ui-title": colorName,
						"type": "button",
						"aria-label": colorName
					}
				});
				$.append(backRow, backLink);
				this.#ownComponent(Tooltip.init(backLink, {
					appendTo: document.body,
					placement: "bottom"
				}));
				this.#setToolbarData(backLink, {
					command: "backColor",
					value: color
				});
			}
		}
		$.append(container, col1);
		$.append(container, col2);
		$.setStyle(dropdown, { minInlineSize: "min(350px, calc(100vw - 2rem))" });
		$.append(dropdown, container);
	}
	/**
	* Creates a deferred callback that cannot run after disposal.
	* @param {() => void} callback The callback to defer.
	* @returns {ReturnType<typeof $.debounce>} The guarded callback.
	*/
	#debounce(callback) {
		return $.debounce((...args) => {
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
		this.listen(this.#editor, "dragstart.ui.editor", (event) => {
			event.preventDefault();
		}, { delegate: "img" });
		this.listen(this.#dropTarget, "dragenter.ui.editor", () => {
			$.addClass(this.#dropText, this.constructor.classes.dropHover);
			$.setText(this.#dropText, this.constructor.lang.drop.drop);
			$.show(this.#dropTarget);
		});
		this.listen(this.#dropTarget, "dragleave.ui.editor", () => {
			this.#resetDropText();
		});
		this.listen(this.#dropTarget, "dragover.ui.editor", (event) => {
			event.preventDefault();
		});
		this.listen(this.#dropTarget, "drop.ui.editor", (event) => {
			event.preventDefault();
			resetDragCount();
			this.#resetDropText();
			$.hide(this.#dropTarget);
			if (event.dataTransfer.files.length) this.options.imageUpload.call(this, event.dataTransfer.files);
			else {
				const text = event.dataTransfer.getData("text");
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
		this.listen(this.#editor, "focus.ui.editor", () => {
			document.execCommand("defaultParagraphSeparator", false, "p");
			$.triggerEvent(this.node, "focus.ui.editor");
		});
		this.listen(this.#editor, "blur.ui.editor", () => {
			$.triggerEvent(this.node, "blur.ui.editor");
		});
		this.listen(this.#editor, "beforeinput.ui.editor", (event) => {
			if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
				if (event.cancelable) {
					event.preventDefault();
					this[event.inputType === "historyUndo" ? "undo" : "redo"]();
				}
			} else if (this.#history.length) this.#history.at(-1).selectionData = getSelectionData(this.#editor);
		});
		this.listen(this.#editor, "input.ui.editor", (event) => {
			switch (event.inputType) {
				case "historyUndo":
					if (!$.isSame(document.activeElement, this.#editor)) return;
					this.undo();
					return;
				case "historyRedo":
					if (!$.isSame(document.activeElement, this.#editor)) return;
					this.redo();
					return;
			}
			if (event.inputType !== "insertText") this.#normalize();
			this.#checkEmpty();
			this.#updateValue();
		});
		this.listen(this.#editor, "keydown.ui.editor", (event) => {
			if (this.options.keyDown) this.options.keyDown.call(this, event);
			if (event.defaultPrevented || !this.node) return;
			const selection = window.getSelection();
			const isIndented = (node) => {
				return [node, ...$.parents(node, null, this.#editor)].some((ancestor) => $.is(ancestor, "li") || parseFloat($.getStyle(ancestor, "marginInlineStart") || $.getStyle(ancestor, "marginLeft")) > 0);
			};
			switch (event.code) {
				case "Backspace":
					if (selection.isCollapsed && $.isSame(selection.anchorNode, selection.focusNode) && ($._isElement(selection.anchorNode) && $.getText(selection.anchorNode) === "" && isIndented(selection.anchorNode) || $._isText(selection.anchorNode) && selection.anchorOffset === 0 && isIndented($.parent(selection.anchorNode)))) {
						event.preventDefault();
						this.outdent();
					} else if ($.contents(this.#editor).length <= 1 && $.getText(this.#editor) === "") event.preventDefault();
					break;
				case "Delete":
					if (selection.isCollapsed && $.isSame(selection.anchorNode, selection.focusNode) && $.getText(selection.anchorNode) === "") {
						const nodes = [selection.anchorNode, ...$.parents(selection.anchorNode, null, this.#editor)];
						if (nodes.every((node) => $.contents(node).length <= 1)) {
							const lastParent = nodes.pop();
							const nextParent = $.next(lastParent).shift();
							let formatElement = "p";
							if (nextParent && $.is(nextParent, "h1, h2, h3, h4, h5, h6, pre")) formatElement = $.tagName(nextParent);
							this.#observe(false);
							this.#execCommand("formatBlock", formatElement);
							this.#observe();
						}
					}
					break;
				case "Tab": if (!event.ctrlKey && !event.metaKey && !event.altKey && !this.node.readOnly && !$.is(this.node, ":disabled")) {
					event.preventDefault();
					if (event.shiftKey) this.outdent();
					else this.indent();
				}
			}
		});
		this.listen(this.#editorContainer, "click.ui.editor", () => {
			$.focus(this.#editor);
		});
		this.listen(this.#editor, "click.ui.editor", (event) => {
			event.preventDefault();
			event.stopPropagation();
			if ($.is(this.node, ":disabled") || this.node.readOnly) return;
			if ($.is(event.currentTarget, "img")) selectNode(event.currentTarget);
			this.#refreshPopover(event.currentTarget, event);
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
			if (this.node && !$.is(this.node, ":disabled")) $.focus($.isVisible(this.#sourceContainer) ? this.#source : this.#editor);
		};
		const labels = [...this.node.labels];
		const generated = [];
		for (const label of labels) {
			if (!label.id) {
				label.id = generateId("editor-label");
				generated.push([label, label.id]);
			}
			this.listen(label, "click.ui.editor", (event) => {
				if (event.target === label || !$.closest(event.target, "a, button, input, select, textarea")[0]) {
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
			$.setAttribute(this.#editor, "aria-invalid", "true");
			$.setAttribute(this.#source, "aria-invalid", "true");
			focus();
		});
		this.listen(this.node, "input.ui.editor change.ui.editor", (event) => {
			if (!event.skipUpdate) this.#loadValue();
		});
		const timers = /* @__PURE__ */ new Set();
		this.listen(this.node.ownerDocument, "reset.ui.editor", (event) => {
			if (event.target !== this.node.form) return;
			const timer = window.setTimeout(() => {
				timers.delete(timer);
				if (this.node && !event.defaultPrevented) {
					this.#removePopover();
					this.#loadValue(true);
				}
			}, 0);
			timers.add(timer);
		});
		const observer = new window.MutationObserver(() => {
			if (this.node) {
				this.#refreshDisabled();
				this.#refreshToolbar();
			}
		});
		observer.observe(this.node, { attributes: true });
		for (const fieldset of $.parents(this.node, "fieldset")) observer.observe(fieldset, {
			attributes: true,
			attributeFilter: ["disabled"]
		});
		this.onDispose(() => {
			observer.disconnect();
			for (const timer of timers) window.clearTimeout(timer);
			for (const [label, id] of generated) if (label.id === id) $.removeAttribute(label, "id");
		});
	}
	/**
	* Attaches popover events.
	*/
	#eventsPopover() {
		this.listen(this.#popover, "click.ui.editor", (event) => {
			if ($.is(this.node, ":disabled") || this.node.readOnly) return;
			const action = $.getDataset(event.currentTarget, "uiAction");
			if (!(action in this.constructor.popovers)) throw new Error(`Unknown action ${action}`);
			event.preventDefault();
			event.stopPropagation();
			this.constructor.popovers[action].action.call(this, this.#currentNode);
			this.#refreshPopover(this.#currentNode);
		}, { delegate: "[data-ui-action]" });
		const downEvent = (event) => {
			if (!this.#currentNode || !$.is(this.#currentNode, "img")) return false;
			event.stopPropagation();
			$.hide(this.#imgCursor);
			$.hide(this.#popover);
			this.#observe(false);
		};
		const moveEvent = (event) => {
			const imgRect = $.rect(this.#currentNode, { offset: true });
			const ratio = imgRect.width / imgRect.height;
			const width = Math.max(event.pageX - imgRect.x, (event.pageY - imgRect.y) * ratio, 1);
			$.setStyle(this.#currentNode, { width: `${Math.round(width)}px` });
			this.#highlightImage(this.#currentNode);
		};
		const upEvent = () => {
			if (this.#currentNode?.isConnected && containsNode(this.#editor, this.#currentNode)) selectNode(this.#currentNode).collapse(false);
			this.#updateValue();
			this.#observe();
		};
		this.#bindDrag(this.#imgResize, downEvent, moveEvent, upEvent);
		this.listen(this.#imgResize, "keydown.ui.editor", (event) => {
			if (!["ArrowLeft", "ArrowRight"].includes(event.code) || !this.#currentNode || $.is(this.node, ":disabled") || this.node.readOnly) return;
			event.preventDefault();
			const width = Math.max(1, $.rect(this.#currentNode).width + (event.code === "ArrowRight" ? 10 : -10));
			$.setStyle(this.#currentNode, "width", `${width}px`);
			this.#highlightImage(this.#currentNode);
			this.#updateValue();
		});
		this.listen(this.#editorBody, "scroll.ui.editor", () => {
			this.#removePopover();
		});
	}
	/**
	* Attaches resize events.
	*/
	#eventsResize() {
		let resizeOffset = 0;
		const downEvent = (event) => {
			const barPosition = $.position(this.#resizeBar, { offset: true });
			resizeOffset = event.pageY - barPosition.y;
			this.#removePopover();
		};
		const moveEvent = (event) => {
			const editorPosition = $.position(this.#editorBody, { offset: true });
			const height = Math.max(0, event.pageY - editorPosition.y - resizeOffset);
			$.setStyle(this.#editorBody, { height: `${height}px` });
			$.setAttribute(this.#resizeBar, "aria-valuenow", String(Math.round(height)));
		};
		const upEvent = () => {
			resizeOffset = 0;
		};
		this.#bindDrag(this.#resizeBar, downEvent, moveEvent, upEvent);
		this.listen(this.#resizeBar, "keydown.ui.editor", (event) => {
			if (!["ArrowUp", "ArrowDown"].includes(event.code) || $.is(this.node, ":disabled") || this.node.readOnly) return;
			event.preventDefault();
			const height = Math.max(40, $.rect(this.#editorBody).height + (event.code === "ArrowDown" ? 10 : -10));
			$.setStyle(this.#editorBody, "height", `${height}px`);
			$.setAttribute(this.#resizeBar, "aria-valuenow", String(Math.round(height)));
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
				$.hide(this.#dropTarget);
			},
			removePopover: () => this.#removePopover(),
			selectionChange: (range) => {
				if (!range || !containsNode(this.#editor, range.startContainer) || !containsNode(this.#editor, range.endContainer)) {
					this.#removePopover();
					return;
				}
				this.#lastRange = range.cloneRange();
				this.#refreshCursor();
				this.#refreshToolbar();
			},
			resize: () => {
				if ($.is(this.#currentNode, "img")) this.#highlightImage(this.#currentNode);
				this.#refreshLineNumbers();
			}
		});
	}
	/**
	* Attaches source events.
	*/
	#eventsSource() {
		this.listen(this.#source, "focus.ui.editor", () => $.triggerEvent(this.node, "focus.ui.editor"));
		this.listen(this.#source, "blur.ui.editor", () => $.triggerEvent(this.node, "blur.ui.editor"));
		const refreshLineNumbersDebounced = this.#debounce(() => {
			this.#refreshLineNumbers();
		});
		this.listen(this.#source, "input.ui.editor change.ui.editor", () => {
			if ($.is(this.node, ":disabled") || this.node.readOnly) return;
			refreshLineNumbersDebounced();
			const html = $.getValue(this.#source);
			if ($.getValue(this.node) !== html) {
				$.setValue(this.node, html);
				if (this.node.validity.valid && !$.hasAttribute(this.node, "aria-invalid")) {
					$.removeAttribute(this.#source, "aria-invalid");
					$.removeAttribute(this.#editor, "aria-invalid");
				}
				$.triggerEvent(this.node, "change.ui.editor", { data: { skipUpdate: true } });
			}
		});
		this.listen(this.#source, "keydown.ui.editor", (event) => {
			if (event.code !== "Tab" || event.ctrlKey || event.metaKey || event.altKey || this.node.readOnly || $.is(this.node, ":disabled")) return;
			event.preventDefault();
			const start = $.getProperty(this.#source, "selectionStart");
			const end = $.getProperty(this.#source, "selectionEnd");
			const value = $.getValue(this.#source);
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
			if (event.shiftKey) {
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
			$.select(this.#source);
			document.execCommand("insertText", false, newValue);
			this.#source.setSelectionRange(newStart, newEnd);
		});
		this.listen(this.#source, "scroll.ui.editor", this.#debounce(() => {
			const scrollY = $.getScrollY(this.#source);
			$.setStyle(this.#lineNumbers, { marginTop: `${-scrollY}px` });
		}));
	}
	/**
	* Attaches toolbar events.
	*/
	#eventsToolbar() {
		this.listen(this.#toolbar, "click.ui.editor", (event) => {
			const action = $.getDataset(event.currentTarget, "uiAction");
			if (!(action in this.constructor.plugins)) throw new Error(`Unknown action ${action}`);
			event.preventDefault();
			event.stopPropagation();
			if ($.is(this.node, ":disabled") || this.node.readOnly && !["source", "fullScreen"].includes(action) || $.is(event.currentTarget, "[aria-disabled=\"true\"]")) return;
			if (this.#lastRange && containsNode(this.#editor, this.#lastRange.startContainer) && containsNode(this.#editor, this.#lastRange.endContainer)) {
				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(this.#lastRange);
			}
			this.constructor.plugins[action].action.call(this);
		}, { delegate: "[data-ui-action]" });
		this.listen(this.#toolbar, "click.ui.editor", (event) => {
			if ($.is(this.node, ":disabled") || this.node.readOnly || $.is(event.currentTarget, "[aria-disabled=\"true\"]")) return;
			const command = $.getDataset(event.currentTarget, "uiCommand");
			if (!(command in this)) throw new Error(`Unknown command ${command}`);
			event.preventDefault();
			if (this.#lastRange) {
				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(this.#lastRange);
			}
			const value = $.getDataset(event.currentTarget, "uiValue");
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
		if (!this.node || $.is(this.node, ":disabled") || this.node.readOnly) return;
		this.#focusEditor();
		if (!this.node) return;
		this.#addHistory({
			html: $.getHtml(this.#editor),
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
		if (!this.node || $.is(this.node, ":disabled")) return;
		if (document.activeElement === this.#editor && getRange(this.#editor)) return;
		const current = getRange(this.#editor)?.cloneRange();
		const selection = window.getSelection();
		const backward = current && !current.collapsed && selection.anchorNode === current.endContainer && selection.anchorOffset === current.endOffset;
		const saved = this.#lastRange;
		$.focus(this.#editor);
		if (!this.node) return;
		if (current) selectRange(current, backward);
		else if (saved && containsNode(this.#editor, saved.startContainer) && containsNode(this.#editor, saved.endContainer)) selectRange(saved);
		else {
			const range = $.createRange();
			let target = this.#editor;
			const opaque = (node) => $.is(node, "br, img, hr, iframe, input, video, audio, svg");
			while (target.lastChild && !opaque(target)) target = target.lastChild;
			if (opaque(target)) {
				if ($.is(target, "br")) range.setStartBefore(target);
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
			const button = $.create("button", {
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
			$.append(dropdown, button);
		}
	}
	/**
	* Renders a font size dropdown.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	#fontSizeDropdown(dropdown) {
		const sizes = Object.values(this.constructor.fontSizes);
		for (const size of sizes) {
			const button = $.create("button", {
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
			$.append(dropdown, button);
		}
	}
	/**
	* Highlights an image.
	* @param {HTMLElement} image The image element.
	*/
	#highlightImage(image) {
		$.hide(this.#imgHighlight);
		$.hide(this.#imgCursor);
		const imgRect = $.rect(image, { offset: true });
		const editorPos = $.position(this.#editor, { offset: true });
		const scrollX = $.getScrollX(this.#editorScroll);
		const scrollY = $.getScrollY(this.#editorScroll);
		const imgX = Math.round(imgRect.x);
		const imgY = Math.round(imgRect.y);
		const imgWidth = Math.round(imgRect.width);
		const imgHeight = Math.round(imgRect.height);
		$.setStyle(this.#imgHighlight, {
			top: `${imgY - editorPos.y + scrollY - 2}px`,
			left: `${imgX - editorPos.x + scrollX - 2}px`,
			width: `${imgWidth + 2}px`,
			height: `${imgHeight + 2}px`
		});
		$.setAttribute(this.#imgResize, "aria-valuenow", String(imgWidth));
		$.setText(this.#imgSize, `${imgWidth}x${imgHeight}`);
		if (imgWidth < 100 || imgHeight < 50) $.hide(this.#imgSize);
		else $.show(this.#imgSize);
		$.show(this.#imgHighlight);
		$.show(this.#imgCursor);
	}
	/**
	* Loads an external value and starts a fresh history after native reset.
	* @param {boolean} [reset=false] Whether to clear history.
	*/
	#loadValue(reset = false) {
		this.#observe(false);
		try {
			$.setHtml(this.#editor, $.getValue(this.node));
			this.#normalize();
			this.#checkEmpty();
			$.setValue(this.node, $.getHtml(this.#editor));
			$.setValue(this.#source, $.getValue(this.node));
			this.#lastRange = null;
			if (reset) {
				this.#history = [];
				this.#redoHistory = [];
			}
			if (this.#history.at(-1)?.html !== $.getHtml(this.#editor)) this.#redoHistory = [];
			this.#addHistory({ html: $.getHtml(this.#editor) });
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
			if (active instanceof window.HTMLElement && active !== document.body && active.isConnected && !containsNode(this.#editor, active) && document.activeElement !== active) active.focus({ preventScroll: true });
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
					if ($.isVisible(this.#sourceContainer)) return;
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
			const reader = new window.FileReader();
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
	* Refreshes the popover at the cursor.
	*/
	#refreshCursor() {
		const baseNode = window.getSelection().anchorNode;
		if (!$.hasDescendent(this.#editor, baseNode)) {
			this.#removePopover();
			return;
		}
		const range = getRange(this.#editor);
		if (this.#currentNode && range && (!range.collapsed && range.intersectsNode(this.#currentNode) || containsNode(this.#currentNode, baseNode))) return;
		const currentNode = $.is(baseNode, "a") ? baseNode : $.closest(baseNode, "a", this.#editor).shift();
		if (!currentNode) {
			this.#removePopover();
			return;
		}
		this.#refreshPopover(currentNode);
	}
	/**
	* Synchronizes disabled, readonly, and accessible state.
	*/
	#refreshDisabled() {
		const disabled = $.is(this.node, ":disabled");
		const readOnly = this.node.readOnly;
		if (disabled) $.addClass(this.#editor, this.constructor.classes.editorDisabled);
		else $.removeClass(this.#editor, this.constructor.classes.editorDisabled);
		$.setAttribute(this.#editor, "contenteditable", String(!disabled && !readOnly));
		$.setAttribute(this.#editor, "tabindex", disabled ? "-1" : $.getAttribute(this.node, "tabindex") || "0");
		this.#source.disabled = disabled;
		this.#source.readOnly = readOnly;
		for (const handle of [this.#imgResize, this.#resizeBar].filter(Boolean)) {
			$.setAttribute(handle, "tabindex", disabled || readOnly ? "-1" : "0");
			$.setAttribute(handle, "aria-disabled", String(disabled || readOnly));
		}
		for (const surface of [this.#editor, this.#source]) {
			$.setAttribute(surface, "aria-disabled", String(disabled));
			$.setAttribute(surface, "aria-readonly", String(readOnly));
			$.setAttribute(surface, "aria-required", String(this.node.required));
			for (const name of [
				"aria-label",
				"aria-labelledby",
				"aria-describedby",
				"aria-errormessage",
				"aria-invalid",
				"dir",
				"lang"
			]) {
				const value = $.getAttribute(this.node, name) || (name === "aria-labelledby" && !$.hasAttribute(this.node, "aria-label") ? this.#labelledBy : null);
				if (value) $.setAttribute(surface, name, value);
				else $.removeAttribute(surface, name);
			}
		}
		$[$.hasClass(this.node, "form-error") ? "addClass" : "removeClass"](this.#container, "form-error");
		if (disabled || readOnly) {
			this.#removePopover();
			for (const toggle of $.find("[data-ui-toggle=\"dropdown\"]", this.#toolbar)) Dropdown.init(toggle).hide();
		}
	}
	/**
	* Refreshes the source line numbers.
	*/
	#refreshLineNumbers() {
		if (!this.node) return;
		if (!$.isVisible(this.#sourceContainer)) return;
		const lineNumbers = $.contents(this.#lineNumbers);
		const lines = $.getValue(this.#source).split("\n");
		const test = $.create("div", { style: {
			width: $.width(this.#source, { boxSize: $.CONTENT_BOX }),
			padding: 0,
			border: 0,
			font: $.css(this.#source, "font"),
			letterSpacing: $.css(this.#source, "letterSpacing"),
			whiteSpace: $.css(this.#source, "whiteSpace"),
			wordBreak: $.css(this.#source, "wordBreak"),
			wordSpacing: $.css(this.#source, "wordSpacing"),
			wordWrap: $.css(this.#source, "wordWrap")
		} });
		$.append(document.body, test);
		for (const [i, line] of lines.entries()) {
			let lineNumber;
			if (i < lineNumbers.length) lineNumber = lineNumbers[i];
			else {
				lineNumber = $.create("div", { text: i + 1 });
				$.append(this.#lineNumbers, lineNumber);
			}
			$.setText(test, line || " ");
			const { height } = $.rect(test);
			$.setStyle(lineNumber, { height: `${height}px` });
		}
		$.detach(test);
		if (lineNumbers.length > lines.length) $.detach(lineNumbers.slice(lines.length));
	}
	/**
	* Refreshes the popover.
	* @param {HTMLElement} currentNode The current selected node.
	* @param {Event} [event] The current event.
	*/
	#refreshPopover(currentNode, event) {
		if (!this.node) return;
		if ($.isSame(currentNode, this.#currentNode)) {
			if ($.is(currentNode, "img")) this.#highlightImage(currentNode);
			this.#popper?.update();
			return;
		}
		this.#removePopover();
		this.#currentNode = currentNode;
		if (!this.#currentNode) return;
		const tagName = $.tagName(this.#currentNode);
		let reference = this.#currentNode;
		if (event && tagName === "img") {
			const editorPos = $.position(this.#editor, { offset: true });
			const scrollX = $.getScrollX(this.#editorScroll);
			const scrollY = $.getScrollY(this.#editorScroll);
			$.setStyle(this.#imgCursor, {
				top: `${event.pageY - editorPos.y + scrollY}px`,
				left: `${event.pageX - editorPos.x + scrollX}px`
			});
			reference = this.#imgCursor;
		}
		const originalPlacement = $.getAttribute(reference, "data-ui-placement");
		this.#popper = new Popper(this.#popover, {
			reference,
			arrow: this.#popoverArrow,
			container: this.#editor,
			placement: "bottom",
			position: "start",
			minContact: 0,
			afterUpdate: (_, anchor) => {
				if (containsNode(this.#editor, anchor)) {
					if (originalPlacement === null) $.removeAttribute(anchor, "data-ui-placement");
					else $.setAttribute(anchor, "data-ui-placement", originalPlacement);
				}
			}
		});
		$.addClass(this.#popover, this.constructor.classes.popoverShow);
		$.show(this.#popover);
		switch (tagName) {
			case "a":
				this.#renderPopoverItems(this.options.popovers.link);
				break;
			case "img":
				this.#renderPopoverItems(this.options.popovers.image);
				this.#highlightImage(this.#currentNode);
				$.show(this.#imgHighlight);
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
		const isDisabled = $.is(this.node, ":disabled");
		const isSource = $.isVisible(this.#sourceContainer);
		for (const { button, data, type } of this.#buttons) {
			if ("setContent" in data) {
				const content = data.setContent.call(this);
				$.setHtml(button, content);
			}
			let enabled = false;
			if ("command" in data) enabled = "value" in data ? document.queryCommandValue(data.command) === data.value : document.queryCommandState(data.command);
			if (enabled) {
				$.addClass(button, "active");
				$.setAttribute(button, { "aria-pressed": true });
			} else {
				$.removeClass(button, "active");
				$.removeAttribute(button, "aria-pressed");
			}
			if (isDisabled || this.node.readOnly && !["source", "fullScreen"].includes(type) || isSource && !["source", "fullScreen"].includes(type) || "disableCheck" in data && data.disableCheck.call(this)) {
				$.addClass(button, "disabled");
				$.setAttribute(button, {
					"aria-disabled": true,
					"disabled": true
				});
			} else {
				$.removeClass(button, "disabled");
				$.removeAttribute(button, "aria-disabled");
				$.removeAttribute(button, "disabled");
			}
		}
	}
	/**
	* Removes the modal.
	*/
	#removeModal() {
		if (!this.#modal) return;
		Modal.init(this.#modal).dispose();
		$.remove(this.#modal);
		this.#modal = null;
	}
	/**
	* Removes the popover.
	*/
	#removePopover() {
		if (!this.#currentNode) return;
		$.hide(this.#imgHighlight);
		$.hide(this.#imgCursor);
		$.removeClass(this.#popover, this.constructor.classes.popoverShow);
		$.hide(this.#popover);
		$.empty(this.#popoverBody);
		this.#popper.dispose();
		this.#popper = null;
		this.#currentNode = null;
	}
	/**
	* Renders the editor.
	*/
	#render() {
		this.#container = $.create("div", { class: this.constructor.classes.container });
		this.#renderToolbar();
		this.#editorBody = $.create("div", {
			class: this.constructor.classes.editorBody,
			style: { height: this.options.height }
		});
		$.append(this.#container, this.#editorBody);
		this.#renderEditor();
		this.#renderSource();
		this.#renderPopover();
		this.#renderDrop();
		if (this.options.resizable) this.#renderResize();
		this.#releaseDisplay = $.setStyleLock(this.node, "display", "none", { important: true });
		$.setAttribute(this.node, { "aria-hidden": true });
		$.insertBefore(this.#container, this.node);
		if (this.#resizeBar) $.setAttribute(this.#resizeBar, "aria-valuenow", String(Math.round($.rect(this.#editorBody).height)));
	}
	/**
	* Renders a button.
	* @param {EditorPlugin|EditorPopover} data The button configuration.
	* @returns {HTMLButtonElement} The button.
	*/
	#renderButton(data) {
		const button = $.create("button", {
			class: this.constructor.classes.btn,
			attributes: { type: "button" }
		});
		if (data.setTitle) data.title = data.setTitle.call(this);
		if (data.title) {
			$.setAttribute(button, {
				"title": data.title,
				"aria-label": data.title
			});
			const tooltip = this.#ownComponent(Tooltip.init(button, {
				appendTo: document.body,
				placement: "bottom"
			}));
			this.listen(button, "click.ui.editor", () => tooltip.hide());
		}
		if ("content" in data) $.setHtml(button, data.content);
		else {
			const content = $.parseHtml(this.constructor.icons[data.icon]);
			$.addClass(content, this.constructor.classes.btnIcon);
			$.append(button, content);
		}
		return button;
	}
	/**
	* Renders the drop elements.
	*/
	#renderDrop() {
		this.#dropTarget = $.create("div", { class: this.constructor.classes.dropTarget });
		this.#dropText = $.create("span", {
			text: this.constructor.lang.drop.dropHere,
			class: this.constructor.classes.dropText
		});
		$.append(this.#dropTarget, this.#dropText);
		$.hide(this.#dropTarget);
		$.append(this.#container, this.#dropTarget);
	}
	/**
	* Renders the editor elements.
	*/
	#renderEditor() {
		this.#editorScroll = $.create("div", { class: this.constructor.classes.editorScroll });
		this.#editorContainer = $.create("div", { class: this.constructor.classes.editorContainer });
		this.#editor = $.create("div", {
			class: this.constructor.classes.editor,
			style: { fontFamily: this.#defaultFont },
			attributes: {
				"role": "textbox",
				"aria-multiline": true,
				"spellcheck": true,
				"autocorrect": true
			}
		});
		this.#imgHighlight = $.create("div", { class: this.constructor.classes.imgHighlight });
		this.#imgCursor = $.create("div", { class: this.constructor.classes.imgCursor });
		this.#imgSize = $.create("div", { class: this.constructor.classes.imgSize });
		this.#imgResize = $.create("div", {
			class: this.constructor.classes.imgResize,
			attributes: {
				"role": "slider",
				"tabindex": 0,
				"aria-label": this.constructor.lang.resizeImage,
				"aria-valuemin": 1,
				"aria-valuenow": 1
			}
		});
		$.hide(this.#imgHighlight);
		$.append(this.#imgHighlight, this.#imgSize);
		$.append(this.#imgHighlight, this.#imgResize);
		$.append(this.#editorContainer, this.#imgCursor);
		$.append(this.#editorContainer, this.#imgHighlight);
		$.append(this.#editorContainer, this.#editor);
		$.append(this.#editorScroll, this.#editorContainer);
		$.append(this.#editorBody, this.#editorScroll);
	}
	/**
	* Renders the popover elements.
	*/
	#renderPopover() {
		this.#popover = $.create("div", {
			class: this.constructor.classes.popover,
			attributes: {
				"role": "group",
				"aria-label": this.constructor.lang.contextToolbar
			}
		});
		this.#popoverArrow = $.create("div", { class: this.constructor.classes.popoverArrow });
		this.#popoverBody = $.create("div", { class: this.constructor.classes.popoverBody });
		$.hide(this.#popover);
		$.append(this.#popover, this.#popoverArrow);
		$.append(this.#popover, this.#popoverBody);
		$.append(this.#container, this.#popover);
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
			$.setDataset(node, { uiAction: type });
		}
		$.append(parent, node);
	}
	/**
	* Renders popover items.
	* @param {Array<string|string[]>} items The popover actions and groups to render.
	*/
	#renderPopoverItems(items) {
		for (const item of items) if ($._isString(item)) this.#renderPopoverItem(item, this.#popoverBody);
		else {
			const node = $.create("div", {
				class: this.constructor.classes.btnGroup,
				attributes: { role: "group" }
			});
			for (const type of item) this.#renderPopoverItem(type, node);
			$.append(this.#popoverBody, node);
		}
	}
	/**
	* Renders the resize bar.
	*/
	#renderResize() {
		this.#resizeBar = $.create("div", {
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
			const hr = $.create("hr", { attributes: { "aria-hidden": true } });
			$.append(this.#resizeBar, hr);
		}
		$.append(this.#container, this.#resizeBar);
	}
	/**
	* Renders the source elements.
	*/
	#renderSource() {
		this.#sourceOuter = $.create("div", { class: this.constructor.classes.sourceOuter });
		this.#sourceContainer = $.create("div", { class: this.constructor.classes.sourceContainer });
		this.#lineNumbers = $.create("div", {
			class: this.constructor.classes.sourceLines,
			attributes: { "aria-hidden": true }
		});
		this.#sourceScroll = $.create("div", { class: this.constructor.classes.sourceScroll });
		this.#source = $.create("textarea", { class: this.constructor.classes.source });
		$.hide(this.#sourceOuter);
		$.append(this.#sourceScroll, this.#source);
		$.append(this.#sourceContainer, this.#lineNumbers);
		$.append(this.#sourceContainer, this.#sourceScroll);
		$.append(this.#sourceOuter, this.#sourceContainer);
		$.append(this.#editorBody, this.#sourceOuter);
	}
	/**
	* Renders the toolbar.
	*/
	#renderToolbar() {
		const header = $.create("div", { class: this.constructor.classes.toolbar });
		this.#toolbar = $.create("div", {
			class: this.constructor.classes.toolbarButtons,
			attributes: {
				"role": "toolbar",
				"aria-label": this.constructor.lang.toolbar
			}
		});
		for (const buttons of this.#toolbarButtons) {
			const buttonGroup = $.create("div", { class: this.constructor.classes.btnGroup });
			for (const type of buttons) this.#renderToolbarButton(type, buttonGroup);
			$.append(this.#toolbar, buttonGroup);
		}
		$.append(header, this.#toolbar);
		$.append(this.#container, header);
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
		else $.append(parent, button);
	}
	/**
	* Renders a toolbar dropdown.
	* @param {HTMLElement} buttonGroup The button group element.
	* @param {HTMLElement} button The button element.
	* @param {string[][]|EditorDropdownCallback} dropdownContent The toolbar groups or dropdown renderer.
	*/
	#renderToolbarDropdown(buttonGroup, button, dropdownContent) {
		const dropGroup = $.create("div", {
			class: this.constructor.classes.dropdownGroup,
			attributes: { role: "group" }
		});
		$.addClass(button, this.constructor.classes.dropdownToggle);
		$.setDataset(button, { uiToggle: "dropdown" });
		$.setAttribute(button, {
			"aria-haspopup": true,
			"aria-expanded": false
		});
		$.append(dropGroup, button);
		const dropdown = $.create("div", { class: this.constructor.classes.dropdown });
		if ($._isArray(dropdownContent)) {
			$.addClass(dropdown, this.constructor.classes.dropdownButtons);
			for (const dropdownItems of dropdownContent) {
				const subDropGroup = $.create("div", {
					class: this.constructor.classes.btnGroup,
					attributes: { role: "group" }
				});
				for (const type of dropdownItems) this.#renderToolbarButton(type, subDropGroup);
				$.append(dropdown, subDropGroup);
			}
		} else if ($._isFunction(dropdownContent)) dropdownContent.call(this, dropdown);
		$.append(dropGroup, dropdown);
		$.append(buttonGroup, dropGroup);
		this.#ownComponent(Dropdown.init(button));
		this.listen(document, "keydown.ui.editor", (event) => {
			if (event.code === "Escape" && containsNode(dropdown, document.activeElement)) $.focus(button);
		}, { capture: true });
	}
	/**
	* Resets the drop text.
	*/
	#resetDropText() {
		$.removeClass(this.#dropText, this.constructor.classes.dropHover);
		$.setText(this.#dropText, this.constructor.lang.drop.dropHere);
	}
	/**
	* Restores content and its selection without creating another history entry.
	* @param {EditorHistoryEntry} data The snapshot.
	*/
	#restoreHistory({ html, selectionData = null }) {
		if (!this.node) return;
		const previous = $.getValue(this.node);
		this.#observe(false);
		try {
			$.setHtml(this.#editor, html);
			$.setValue(this.node, html);
			$.setValue(this.#source, html);
			this.#focusEditor();
			if (!this.node) return;
			restoreSelectionData(this.#editor, selectionData);
			this.#checkEmpty();
			this.#refreshDisabled();
			this.#refreshToolbar();
		} finally {
			this.#observe();
		}
		if (this.node && previous !== $.getValue(this.node)) $.triggerEvent(this.node, "change.ui.editor", { data: { skipUpdate: true } });
	}
	/**
	* Sets data for a toolbar action.
	* @param {HTMLElement} node The action node.
	* @param {EditorPlugin|EditorPopover} data The action configuration.
	* @param {string} [type] The action type.
	*/
	#setToolbarData(node, data, type) {
		if (data.command) {
			$.setDataset(node, { uiCommand: data.command });
			if (data.value) $.setDataset(node, { uiValue: data.value });
		} else if (data.action && type) $.setDataset(node, { uiAction: type });
	}
	/**
	* Shows the drop target.
	*/
	#showDropTarget() {
		if ($.is(this.node, ":disabled") || this.node.readOnly || $.isVisible(this.#sourceContainer)) return;
		$.show(this.#dropTarget);
	}
	/**
	* Shows the editor.
	*/
	#showEditor() {
		$.show(this.#editorScroll);
		$.hide(this.#sourceOuter);
	}
	/**
	* Shows the image modal.
	*/
	#showImageModal() {
		this.#removeModal();
		const returnFocus = document.activeElement;
		const container = $.create("div");
		const { group: fileGroup, input: fileInput } = createFileInput(this.constructor, {
			id: generateId("editor-image-file"),
			label: this.constructor.lang.modals.imageFile,
			attributes: {
				accept: "image/*",
				multiple: true
			}
		});
		const { group: urlGroup, input: urlInput } = createInput(this.constructor, {
			id: generateId("editor-image-url"),
			label: this.constructor.lang.modals.imageUrl
		});
		$.append(container, fileGroup);
		$.append(container, urlGroup);
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
			onSubmit: () => {
				selectRange(range);
				const files = $.getProperty(fileInput, "files");
				const src = $.getValue(urlInput);
				if (files.length) this.options.imageUpload.call(this, files);
				else if (src) this.insertImage(src);
			},
			onShown: () => {
				$.focus(fileInput);
			},
			onHidden: () => {
				this.#removeModal();
				if (this.node) {
					selectRange(originalRange);
					if (!returnFocus?.isConnected) this.#focusEditor();
				}
			}
		});
		this.#ownComponent(Modal.init(this.#modal));
	}
	/**
	* Shows the link modal.
	* @param {HTMLElement} [link] The current link.
	*/
	#showLinkModal(link) {
		this.#removeModal();
		const returnFocus = document.activeElement;
		const container = $.create("div");
		const { group: textGroup, input: textInput } = createInput(this.constructor, {
			id: generateId("editor-link-text"),
			label: this.constructor.lang.modals.linkText
		});
		const { group: urlGroup, input: urlInput } = createInput(this.constructor, {
			id: generateId("editor-link-url"),
			label: this.constructor.lang.modals.linkUrl
		});
		const { group: newWindowGroup, input: newWindowInput } = createCheckbox(this.constructor, {
			id: generateId("editor-link-new-window"),
			label: this.constructor.lang.modals.linkNewWindow
		});
		if (link) {
			const text = $.getText(link);
			const href = $.getAttribute(link, "href");
			const newWindow = $.getAttribute(link, "target");
			$.setValue(textInput, text);
			$.setValue(urlInput, href);
			if (newWindow === "_blank") $.setProperty(newWindowInput, { checked: true });
		}
		let hasText = false;
		$.append(container, textGroup);
		$.append(container, urlGroup);
		$.append(container, newWindowGroup);
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
			onSubmit: () => {
				selectRange(range);
				const text = $.getValue(textInput);
				const href = $.getValue(urlInput);
				const newWindow = $.is(newWindowInput, ":checked");
				this.insertLink(href, text, newWindow);
			},
			onShown: () => {
				$.focus(urlInput);
			},
			onHidden: () => {
				this.#removeModal();
				if (this.node) {
					selectRange(originalRange);
					if (!returnFocus?.isConnected) this.#focusEditor();
				}
			}
		});
		const controller = this.#ownComponent(Modal.init(this.#modal));
		controller.listen(textInput, "input.ui.editor", () => {
			hasText = !!$.getValue(textInput);
		});
		controller.listen(urlInput, "input.ui.editor", () => {
			if (hasText) return;
			const url = $.getValue(urlInput);
			$.setValue(textInput, url);
		});
	}
	/**
	* Shows the source.
	*/
	#showSource() {
		$.show(this.#sourceOuter);
		$.setStyle(this.#editorScroll, { display: "none" }, null, { important: true });
		$.hide(this.#imgHighlight);
		this.#refreshLineNumbers();
	}
	/**
	* Shows the video modal.
	*/
	#showVideoModal() {
		this.#removeModal();
		const returnFocus = document.activeElement;
		const container = $.create("div");
		const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = createInput(this.constructor, {
			id: generateId("editor-video-url"),
			label: this.constructor.lang.modals.videoUrl
		});
		$.append(container, urlGroup);
		const originalRange = getRange()?.cloneRange();
		this.#focusEditor();
		const range = getRange();
		this.#modal = createModal(this.constructor, {
			returnFocus,
			title: this.constructor.lang.modals.insertVideo,
			content: container,
			cancelText: this.constructor.lang.modals.cancel,
			submitText: this.constructor.lang.modals.insertVideo,
			onSubmit: () => {
				selectRange(range);
				const url = $.getValue(urlInput);
				let id;
				try {
					const parsed = new URL(url);
					if (parsed.protocol === "https:" && (parsed.hostname === "youtu.be" || ["youtube.com", "www.youtube.com"].includes(parsed.hostname) && parsed.pathname === "/watch")) id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
				} catch {}
				if (!id || !/^[\w-]+$/.test(id)) {
					$.setAttribute(urlInput, "aria-invalid", "true");
					$.addClass(urlGroup, this.constructor.classes.formError);
					$.setText(urlInvalidFeedback, this.constructor.lang.modals.videoUrlInvalid);
					return false;
				}
				$.removeClass(urlGroup, this.constructor.classes.formError);
				$.removeAttribute(urlInput, "aria-invalid");
				const video = $.create("iframe", { attributes: {
					width: 560,
					height: 315,
					src: `https://www.youtube.com/embed/${id}`,
					frameborder: 0,
					allowfullscreen: true,
					title: this.constructor.lang.modals.insertVideo
				} });
				const html = $.getProperty(video, "outerHTML");
				this.insertHtml(html);
			},
			onShown: () => {
				$.focus(urlInput);
			},
			onHidden: () => {
				this.#removeModal();
				if (this.node) {
					selectRange(originalRange);
					if (!returnFocus?.isConnected) this.#focusEditor();
				}
			}
		});
		this.#ownComponent(Modal.init(this.#modal));
	}
	/**
	* Renders a style dropdown.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	#styleDropdown(dropdown) {
		for (const tag of this.constructor.styles) {
			const button = $.create("button", {
				class: this.constructor.classes.dropdownItem,
				attributes: {
					"type": "button",
					"aria-label": this.constructor.lang.styles[tag]
				}
			});
			const content = $.create(tag, {
				text: this.constructor.lang.styles[tag],
				class: this.constructor.classes.styleContent
			});
			$.append(button, content);
			const data = {
				command: "formatBlock",
				value: tag.toUpperCase()
			};
			this.#buttons.push({
				button,
				data
			});
			this.#setToolbarData(button, data);
			$.append(dropdown, button);
		}
	}
	/**
	* Renders a table dropdown.
	* @param {HTMLElement} dropdown The dropdown.
	*/
	#tableDropdown(dropdown) {
		const container = $.create("div");
		for (let i = 0; i < 10; i++) {
			const row = $.create("div", { class: this.constructor.classes.tableRow });
			$.append(container, row);
			for (let j = 0; j < 10; j++) {
				const cell = $.create("div", { class: this.constructor.classes.tableCell });
				$.append(row, cell);
				if (i > 4 || j > 4) $.hide(cell);
				const link = $.create("button", {
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
				$.append(cell, link);
			}
		}
		const info = $.create("span", { class: this.constructor.classes.tableInfo });
		$.addClass(dropdown, this.constructor.classes.tableDropdown);
		$.append(dropdown, container);
		$.append(dropdown, info);
		this.listen(container, "click.ui.editor", (event) => {
			const cols = $.getDataset(event.currentTarget, "uiColumn");
			const rows = $.getDataset(event.currentTarget, "uiRow");
			const container = $.create("div");
			const table = $.create("table", { class: this.constructor.classes.table });
			const tbody = $.create("tbody");
			for (let i = 0; i <= rows; i++) {
				const tr = $.create("tr");
				for (let j = 0; j <= cols; j++) {
					const td = $.create("td", { html: "<br>" });
					$.append(tr, td);
				}
				$.append(tbody, tr);
			}
			$.append(table, tbody);
			$.append(container, table);
			const br = $.create("br");
			$.append(container, br);
			const html = $.getHtml(container);
			this.insertHtml(html);
		}, { delegate: "button" });
		this.listen(container, "mouseover.ui.editor focusin.ui.editor", (event) => {
			const targetCol = $.getDataset(event.currentTarget, "uiColumn");
			const targetRow = $.getDataset(event.currentTarget, "uiRow");
			const colMin = Math.max(targetCol + 1, 4);
			const rowMin = Math.max(targetRow + 1, 4);
			const links = $.find("button", container);
			for (const element of links) {
				const col = $.getDataset(element, "uiColumn");
				const row = $.getDataset(element, "uiRow");
				if (col <= targetCol && row <= targetRow) $.addClass(element, this.constructor.classes.tableHover);
				else $.removeClass(element, this.constructor.classes.tableHover);
				const parent = $.parent(element);
				if (col <= colMin && row <= rowMin) $.show(parent);
				else $.hide(parent);
			}
			$.setText(info, `${targetCol + 1} x ${targetRow + 1}`);
		}, { delegate: "button" });
	}
	/**
	* Updates a table element.
	* @param {HTMLTableCellElement} td The table cell.
	* @param {(cell: HTMLTableCellElement, row: HTMLTableRowElement, table: HTMLTableElement) => void} callback The callback.
	*/
	#updateTable(td, callback) {
		const table = $.closest(td, "table")[0];
		if (!table || !containsNode(this.#editor, table)) return;
		this.#observe(false);
		try {
			callback(td, $.closest(td, "tr")[0], table);
			if (containsNode(this.#editor, td)) selectNode(td).collapse(true);
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
		const html = $.getHtml(this.#editor);
		if (html === $.getValue(this.node)) {
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
		$.setValue(this.node, html);
		$.setValue(this.#source, html);
		if (this.node.validity.valid && !$.hasAttribute(this.node, "aria-invalid")) {
			$.removeAttribute(this.#editor, "aria-invalid");
			$.removeAttribute(this.#source, "aria-invalid");
		}
		$.triggerEvent(this.node, "change.ui.editor", { data: { skipUpdate: true } });
	}
	/**
	* Starts observing content changes owned by this editor.
	*/
	#watchContent() {
		const changed = this.#debounce(() => {
			if ($.isVisible(this.#sourceContainer)) return;
			this.#normalize();
			this.#checkEmpty();
			this.#updateValue();
		});
		this.#observer = new window.MutationObserver((records) => {
			if (records.some((record) => record.type !== "attributes" || record.target !== this.#editor)) changed();
		});
		this.#observe();
	}
};

// src/js/index.js
initComponent("editor", Editor);
var js_default = Editor;

export { js_default as default };
//# sourceMappingURL=frost-ui-editor.esm.js.map