import { BaseComponent, Modal, Popper, Tooltip, generateId, initComponent } from "@fr0st/ui";
import $ from "@fr0st/query";

// src/js/selection.js
/**
* Get the current selected range.
* @returns {Range} The Range object.
*/
function getRange() {
	const selection = window.getSelection();
	if (!selection.rangeCount) return null;
	return selection.getRangeAt(0);
}
/**
* Restore the selection from selection markers.
* @param {object} markers The selection markers.
* @param {Text} [markers.start] The start marker.
* @param {Text} [markers.end] The end marker.
*/
function restoreSelection({ start, end } = {}) {
	if (!start && !end) return;
	const range = $.createRange();
	if (start && $.isConnected(start)) {
		range.setStartAfter(start);
		$.detach(start);
	}
	if (end && $.isConnected(end)) {
		range.setEndBefore(end);
		$.detach(end);
	}
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
}
/**
* Save the selection and return the selection markers.
* @returns {object} The selection markers.
*/
function saveSelection() {
	const selection = window.getSelection();
	let start;
	let end;
	if (selection.rangeCount) {
		start = $.createText("");
		end = $.createText("");
		const range = selection.getRangeAt(0);
		const rangeStart = range.cloneRange();
		const rangeEnd = range.cloneRange();
		rangeStart.collapse(true);
		rangeEnd.collapse(false);
		rangeStart.insertNode(start);
		rangeEnd.insertNode(end);
	}
	return {
		start,
		end
	};
}
/**
* Select a node.
* @param {HTMLElement} node The element to select.
* @returns {Range} The Range object.
*/
function selectNode(node) {
	const range = $.createRange();
	range.selectNode(node);
	selectRange(range);
	return range;
}
/**
* Select a range.
* @param {Range} range The range to select.
*/
function selectRange(range) {
	if (!range) return;
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
}

// src/js/helpers.js
var running = false;
var dragCount = 0;
var editors = /* @__PURE__ */ new Set();
/**
* Add an Editor.
* @param {Editor} editor The editor to add.
*/
function addEditor(editor) {
	editors.add(editor);
	if (running) return;
	dragCount = 0;
	$.addEvent(document.body, "dragenter.ui.editor", (_) => {
		if (dragCount === 0) for (const editor of editors) editor._showDropTarget();
		dragCount++;
	});
	$.addEvent(document.body, "dragleave.ui.editor", (_) => {
		dragCount--;
		if (dragCount === 0) for (const editor of editors) {
			editor._resetDropText();
			$.hide(editor._dropTarget);
		}
	});
	$.addEvent(document.body, "dragend.ui.editor drop.ui.editor", (_) => {
		dragCount = 0;
	});
	$.addEvent(document, "selectionchange.ui.editor", $.debounce(() => {
		const range = getRange();
		if (!range) return;
		const ancestor = range.commonAncestorContainer;
		for (const editor of editors) {
			if (!$.isSame(editor._editor, ancestor) && !$.hasDescendent(editor._editor, ancestor)) {
				editor._removePopover();
				continue;
			}
			editor._lastRange = range;
			editor._refreshCursor();
			editor._refreshToolbar();
		}
	}));
	$.addEvent(document, "beforeinput.ui.editor", (e) => {
		switch (e.inputType) {
			case "historyUndo":
			case "historyRedo": break;
			default: return;
		}
		for (const editor of editors) editor._observe(false);
	});
	$.addEvent(document, "input.ui.editor", (e) => {
		switch (e.inputType) {
			case "historyUndo":
			case "historyRedo": break;
			default: return;
		}
		for (const editor of editors) {
			if ($.isSame(editor._editor, document.activeElement)) {
				const { html } = editor._history.at(-1);
				$.setHtml(editor._editor, html);
				$.blur(editor._editor);
			}
			editor._observe();
		}
	}, { capture: true });
	$.addEvent(window, "click.ui.editor", (_) => {
		for (const editor of editors) editor._removePopover();
	});
	$.addEvent(window, "resize.ui.editor", $.debounce((_) => {
		for (const editor of editors) {
			if (editor._currentNode && $.is(editor._currentNode, "img")) editor._highlightImage(editor._currentNode);
			editor._refreshLineNumbers();
		}
	}));
	running = true;
}
/**
* Remove a Editor.
* @param {Editor} editor The editor to remove.
*/
function removeEditor(editor) {
	editors.delete(editor);
	if (editors.size) return;
	$.removeEvent(document.body, "dragenter.ui.editor");
	$.removeEvent(document.body, "dragleave.ui.editor");
	$.removeEvent(document.body, "dragend.ui.editor");
	$.removeEvent(document, "selectionchange.ui.editor");
	$.removeEvent(document, "beforeinput.ui.editor");
	$.removeEvent(document, "input.ui.editor");
	$.removeEvent(window, "click.ui.editor");
	$.removeEvent(window, "resize.ui.editor");
	running = false;
}
/**
* Reset the drag count.
*/
function resetDragCount() {
	dragCount = 0;
}

// src/js/nodes.js
/**
* Replaces an element while preserving its children, attributes, styles, and classes.
* @param {HTMLElement} oldElement The element to replace.
* @param {HTMLElement} newElement The replacement element.
*/
function replaceElement(oldElement, newElement) {
	const newStyles = {
		...$.getStyle(oldElement),
		...$.getStyle(newElement)
	};
	const newClasses = [$.getAttribute(oldElement, "class") || "", $.getAttribute(newElement, "class") || ""];
	$.setAttribute(newElement, {
		...$.getAttribute(oldElement),
		...$.getAttribute(newElement)
	});
	$.setStyle(newElement, newStyles);
	$.addClass(newElement, newClasses);
	$.append(newElement, $.contents(oldElement));
	$.before(oldElement, newElement);
	$.detach(oldElement);
}
/**
* Replaces element tags while retaining their content and attributes.
* @param {HTMLElement[]} elements The elements to replace.
* @param {string} tagName The replacement tag name.
* @returns {HTMLElement[]} The replacement elements.
*/
function swapTags(elements, tagName) {
	const results = [];
	for (const element of elements) {
		const newElement = $.create(tagName);
		replaceElement(element, newElement);
		results.push(newElement);
	}
	return results;
}

// src/js/editor.js
/**
* Editor
* @class
*/
var Editor = class extends BaseComponent {
	/**
	* New Editor constructor.
	* @param {HTMLElement} node The input node.
	* @param {object} [options] The options to create the Editor with.
	*/
	constructor(node, options) {
		super(node, options);
		this._toolbarButtons = this.options.buttons || this.constructor.buttons;
		this._fonts = this.options.fonts || this.constructor.fonts;
		this._defaultFont = this.options.defaultFont;
		this._fonts = this._fonts.filter((font) => document.fonts.check(`12px ${font}`));
		if (!this._fonts.includes(this._defaultFont)) this._defaultFont = this._fonts.slice().shift();
		this._buttons = [];
		this._history = [];
		this._redoHistory = [];
		this._render();
		const html = $.getValue(this.node);
		$.setHtml(this._editor, html);
		const range = getRange();
		this._focusEditor();
		this._execCommand("defaultParagraphSeparator", "p");
		this._checkEmpty();
		this._refreshToolbar();
		selectRange(range);
		this._events();
		this._normalize();
		this._updateValue();
		this._refreshDisabled();
		addEditor(this);
		$.triggerEvent(this.node, "init.ui.editor");
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
		$.setAttribute(this.node, { disabled: true });
		this._refreshDisabled();
		this._refreshToolbar();
	}
	/**
	* Dispose the Editor.
	*/
	dispose() {
		removeEditor(this);
		if (this._popper) {
			this._popper.dispose();
			this._popper = null;
		}
		if (this._modal) {
			Modal.init(this._modal).dispose();
			$.remove(this._modal);
			this._modal = null;
		}
		if (this._fullScreen) {
			Modal.init(this._fullScreen).dispose();
			$.remove(this._fullScreen);
			this._fullScreen = null;
		}
		this._observer.disconnect();
		this._observer = null;
		this._observe = null;
		$.remove(this._container);
		$.show(this.node);
		$.removeAttribute(this.node, "tabindex");
		this._buttons = null;
		this._container = null;
		this._toolbar = null;
		this._editorBody = null;
		this._editorContainer = null;
		this._editorScroll = null;
		this._editor = null;
		this._imgHighlight = null;
		this._imgCursor = null;
		this._imgResize = null;
		this._imgSize = null;
		this._sourceOuter = null;
		this._sourceContainer = null;
		this._sourceScroll = null;
		this._lineNumbers = null;
		this._source = null;
		this._popover = null;
		this._popoverArrow = null;
		this._popoverBody = null;
		this._dropTarget = null;
		this._dropText = null;
		this._resizeBar = null;
		this._currentNode = null;
		this._lastRange = null;
		this._history = null;
		this._redoHistory = null;
		super.dispose();
	}
	/**
	* Enable the Editor.
	*/
	enable() {
		$.removeAttribute(this.node, "disabled");
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
	* @param {string} value The font size.
	*/
	fontSize(value) {
		value = Object.keys(this.constructor.fontSizes).find((key) => this.constructor.fontSizes[key] === value);
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
		if ($.is(this.node, ":disabled")) return;
		this._observe(false);
		this._focusEditor();
		const markers = saveSelection();
		const selection = getSelection();
		const getSelectedNodes = (parent) => {
			const nodes = [];
			const contents = $.contents(parent);
			for (const content of contents) {
				if (!selection.containsNode(content, true)) continue;
				if ($._isText(content) || selection.containsNode(content)) {
					nodes.push(content);
					continue;
				}
				const containedNodes = getSelectedNodes(content);
				const childContents = $.contents(content);
				if (containedNodes.length === childContents.length) nodes.push(content);
				else nodes.push(...containedNodes);
			}
			return nodes;
		};
		const nodes = getSelectedNodes(this._editor);
		while (nodes.length) {
			const subNodes = [];
			subNodes.push(nodes.shift());
			while (nodes.length && $.isSame(nodes[0], subNodes.at(-1).nextSibling)) subNodes.push(nodes.shift());
			const parent = $.parent(subNodes[0]).shift();
			if ($.is(parent, "ol, ul")) {
				const tagName = $.tagName(parent);
				const element = $.create(tagName);
				$.before(subNodes[0], element);
				$.append(element, subNodes);
				continue;
			}
			const container = $.create("div", { style: {
				marginLeft: "2em",
				marginBottom: 0
			} });
			$.before(subNodes[0], container);
			$.append(container, subNodes);
		}
		restoreSelection(markers);
		this._normalize();
		this._updateValue();
		this._observe();
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
		this._execCommand("insertHTML", value);
	}
	/**
	* Insert an image.
	* @param {string} src The image src.
	*/
	insertImage(src) {
		const img = $.create("img", { attributes: { src } });
		const newImg = this._insertNode(img);
		const image = new Image();
		image.onload = (_) => {
			const maxWidth = $.width(this._editor, { boxSize: $.CONTENT_BOX });
			const width = Math.min(image.width, maxWidth);
			$.setStyle(newImg, "width", `${width}px`);
		};
		image.src = src;
	}
	/**
	* Insert a link.
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
		if ($.is(this.node, ":disabled")) return;
		this._observe(false);
		this._focusEditor();
		const markers1 = saveSelection();
		const blockquotes = $.find(".blockquote", this._editor);
		const tempDivs = swapTags(blockquotes, "div");
		restoreSelection(markers1);
		this._execCommand("outdent");
		const markers2 = saveSelection();
		swapTags(tempDivs, "blockquote");
		restoreSelection(markers2);
		this._normalize();
		this._updateValue();
		this._observe();
	}
	/**
	* Perform a redo.
	*/
	redo() {
		if (!this._redoHistory.length) return;
		const current = this._redoHistory.pop();
		this._addHistory(current);
		this._restoreHistory(current);
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
		if (this._history.length <= 1) return;
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

// src/js/plugins.js
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
			const fontSizePx = $.css(this._editor, "fontSize");
			return Math.round(parseFloat(fontSizePx));
		},
		dropdown(dropdown) {
			this._fontSizeDropdown(dropdown);
		}
	},
	fullScreen: { action() {
		if (this._fullScreen) {
			Modal.init(this._fullScreen).hide();
			return;
		}
		this._fullScreen = this.constructor._createModal({
			content: this._container,
			fullScreen: true,
			onShown: (_) => {
				if ($.isVisible(this._sourceContainer)) $.focus(this._source);
				else $.focus(this._editor);
			},
			onHide: (_) => {
				$.insertBefore(this._container, this.node);
				this._fullScreen = null;
			}
		});
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
		const value = $.getValue(this.node);
		if ($.isVisible(this._sourceContainer)) {
			this._addHistory({ html: value });
			$.setHtml(this._editor, value);
			this._showEditor();
			$.focus(this._editor);
		} else {
			$.setValue(this._source, value);
			this._showSource();
			$.focus(this._source);
		}
		this._refreshToolbar();
	} },
	strikethrough: { command: "strikeThrough" },
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
var popovers_default = {
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
		this._removePopover();
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
		this._showLinkModal(node);
	} },
	tableColumnAfter: { action(node) {
		this._updateTable(node, (td, _, table) => {
			const index = $.index(td);
			const rows = $.find(":scope > thead > tr, :scope > tbody > tr", table);
			this._observe(false);
			for (const row of rows) {
				const newTd = $.create("td", { html: "<br>" });
				const cells = $.children(row, "th, td");
				$.after(cells[index], newTd);
			}
			this._observe();
			this._updateValue();
		});
	} },
	tableColumnBefore: { action(node) {
		this._updateTable(node, (td, _, table) => {
			const index = $.index(td);
			const rows = $.find(":scope > thead > tr, :scope > tbody > tr", table);
			this._observe(false);
			for (const row of rows) {
				const newTd = $.create("td", { html: "<br>" });
				const cells = $.children(row, "th, td");
				$.before(cells[index], newTd);
			}
			this._observe();
			this._updateValue();
		});
	} },
	tableColumnRemove: { action(node) {
		this._updateTable(node, (td, _, table) => {
			const index = $.index(td);
			const rows = $.find(":scope > thead > tr, :scope > tbody > tr", table);
			this._observe(false);
			for (const row of rows) {
				const cells = $.children(row, "th, td");
				$.remove(cells[index]);
			}
			this._observe();
			this._updateValue();
			this._removePopover();
		});
	} },
	tableRemove: { action(node) {
		const table = $.closest(node, "table", this._editor).shift();
		$.detach(table);
		this._removePopover();
	} },
	tableRowAfter: { action(node) {
		this._updateTable(node, (_, tr) => {
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
		this._updateTable(node, (_, tr) => {
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
		this._updateTable(node, (_, tr) => {
			$.remove(tr);
			this._removePopover();
		});
	} },
	unlink: { action(node) {
		$.select(node);
		this.unlink();
		getRange().collapse();
	} }
};

// src/js/prototype/events.js
/**
* Attach events for the Editor.
*/
function _events() {
	this._eventsToolbar();
	this._eventsEditor();
	this._eventsPopover();
	this._eventsSource();
	this._eventsDrop();
	if (this.options.resizable) this._eventsResize();
}
/**
* Attach drop events.
*/
function _eventsDrop() {
	$.addEventDelegate(this._editor, "dragstart.ui.editor", "img", (e) => {
		e.preventDefault();
	});
	$.addEvent(this._dropTarget, "dragenter.ui.editor", (_) => {
		$.addClass(this._dropText, this.constructor.classes.dropHover);
		$.setText(this._dropText, this.constructor.lang.drop.drop);
		$.show(this._dropTarget);
	});
	$.addEvent(this._dropTarget, "dragleave.ui.editor", (_) => {
		this._resetDropText();
	});
	$.addEvent(this._dropTarget, "dragover.ui.editor", (e) => {
		e.preventDefault();
	});
	$.addEvent(this._dropTarget, "drop.ui.editor", (e) => {
		e.preventDefault();
		resetDragCount();
		this._resetDropText();
		$.hide(this._dropTarget);
		if (e.dataTransfer.files.length) this.options.imageUpload.bind(this)(e.dataTransfer.files);
		else {
			const text = e.dataTransfer.getData("text");
			this.insertText(text);
		}
	});
}
/**
* Attach editor events.
*/
function _eventsEditor() {
	$.addEvent(this._editor, "focus.ui.editor", (_) => {
		$.triggerEvent(this.node, "focus.ui.editor");
	});
	$.addEvent(this._editor, "blur.ui.editor", (_) => {
		$.triggerEvent(this.node, "blur.ui.editor");
	});
	$.addEvent(this._editor, "input.ui.editor", (e) => {
		switch (e.inputType) {
			case "historyUndo":
				if (!$.isSame(document.activeElement, this._editor)) return;
				this.undo();
				break;
			case "historyRedo":
				if (!$.isSame(document.activeElement, this._editor)) return;
				this.redo();
		}
		if (e.inputType !== "insertText") this._normalize();
		this._updateValue();
		this._checkEmpty();
	});
	$.addEvent(this._editor, "keydown.ui.editor", (e) => {
		if (this.options.keyDown) this.options.keyDown.bind(this)(e);
		const selection = window.getSelection();
		const isIndented = (node) => {
			return $.is(node, "li") || $.getStyle(node, "marginLeft");
		};
		switch (e.code) {
			case "Backspace":
				if (selection.isCollapsed && $.isSame(selection.anchorNode, selection.focusNode) && ($._isElement(selection.anchorNode) && $.getText(selection.anchorNode) === "" && isIndented(selection.anchorNode) || $._isText(selection.anchorNode) && selection.anchorOffset === 0 && isIndented($.parent(selection.anchorNode)))) {
					e.preventDefault();
					this.outdent();
				} else if ($.contents(this._editor).length <= 1 && $.getText(this._editor) === "") e.preventDefault();
				break;
			case "Delete":
				if (selection.isCollapsed && $.isSame(selection.anchorNode, selection.focusNode) && $.getText(selection.anchorNode) === "") {
					const nodes = [selection.anchorNode, ...$.parents(selection.anchorNode, null, this._editor)];
					if (nodes.every((node) => $.contents(node).length <= 1)) {
						const lastParent = nodes.pop();
						const nextParent = $.next(lastParent).shift();
						let formatElement = "p";
						if (nextParent && $.is(nextParent, "h1, h2, h3, h4, h5, h6, pre")) formatElement = $.tagName(nextParent);
						this._observe(false);
						this._execCommand("formatBlock", formatElement);
						this._observe();
					}
				}
				break;
			case "Tab": if (document.queryCommandState("insertOrderedList") || document.queryCommandState("insertUnorderedList")) {
				e.preventDefault();
				if (e.shiftKey) this.outdent();
				else this.indent();
			}
		}
	});
	$.addEvent(this._editorContainer, "click.ui.editor", (_) => {
		$.focus(this._editor);
	});
	$.addEventDelegate(this._editor, "click.ui.editor", "a, td, img", (e) => {
		e.preventDefault();
		e.stopPropagation();
		this._refreshPopover(e.currentTarget, e);
		this._refreshToolbar();
	}, { capture: true });
	const mutationHandler = () => {
		this._normalize();
		this._updateValue();
		this._checkEmpty();
	};
	this._observer = new MutationObserver(mutationHandler);
	let observeLevel = 0;
	let pendingMutations = [];
	this._observe = (observe = true) => {
		if (observe) {
			observeLevel++;
			if (observeLevel === 1) {
				this._observer.observe(this._editor, {
					attributes: true,
					childList: true,
					subtree: true
				});
				if (pendingMutations.length) {
					mutationHandler(pendingMutations);
					pendingMutations = [];
				}
			}
		} else {
			observeLevel--;
			if (observeLevel === 0) {
				this._observer.disconnect();
				pendingMutations = this._observer.takeRecords();
			}
		}
	};
	this._observe();
}
/**
* Attach popover events.
*/
function _eventsPopover() {
	$.addEventDelegate(this._popover, "click.ui.editor", "[data-ui-action]", (e) => {
		const action = $.getDataset(e.currentTarget, "uiAction");
		if (!(action in this.constructor.popovers)) throw new Error(`Unknown action ${action}`);
		e.preventDefault();
		this.constructor.popovers[action].action.bind(this)(this._currentNode);
		this._refreshPopover(this._currentNode);
	});
	const downEvent = (e) => {
		if (!this._currentNode || !$.is(this._currentNode, "img")) return false;
		e.stopPropagation();
		$.hide(this._imgCursor);
		$.hide(this._popover);
		this._observe(false);
	};
	const moveEvent = (e) => {
		const imgRect = $.rect(this._currentNode, { offset: true });
		const ratio = imgRect.width / imgRect.height;
		const width = Math.max(e.pageX - imgRect.x, (e.pageY - imgRect.y) * ratio, 1);
		$.setStyle(this._currentNode, { width: `${Math.round(width)}px` });
		this._highlightImage(this._currentNode);
	};
	const upEvent = (_) => {
		selectNode(this._currentNode);
		getRange().collapse(false);
		this._updateValue();
		this._observe();
	};
	const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent);
	$.addEvent(this._imgResize, "mousedown.ui.editor", dragEvent);
	$.addEvent(this._editorBody, "scroll.ui.editor", (_) => {
		this._removePopover();
	});
}
/**
* Attach resize events.
*/
function _eventsResize() {
	let resizeOffset = 0;
	const downEvent = (e) => {
		const barPosition = $.position(this._resizeBar, { offset: true });
		resizeOffset = e.pageY - barPosition.y;
		this._removePopover();
	};
	const moveEvent = (e) => {
		const editorPosition = $.position(this._editorBody, { offset: true });
		const height = Math.max(0, e.pageY - editorPosition.y - resizeOffset);
		$.setStyle(this._editorBody, { height: `${height}px` });
	};
	const upEvent = (_) => {
		resizeOffset = 0;
	};
	const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent);
	$.addEvent(this._resizeBar, "mousedown.ui.editor", dragEvent);
}
/**
* Attach source events.
*/
function _eventsSource() {
	const refreshLineNumbersDebounced = $.debounce((_) => {
		this._refreshLineNumbers();
	});
	$.addEvent(this._source, "input.ui.editor", (_) => {
		refreshLineNumbersDebounced();
	});
	$.addEvent(this._source, "change.ui.editor", (_) => {
		const html = $.getValue(this._source);
		refreshLineNumbersDebounced();
		$.setValue(this.node, html);
		$.triggerEvent(this.node, "change.ui.editor");
	});
	$.addEvent(this._source, "keydown.ui.editor", (e) => {
		if (e.code !== "Tab") return;
		e.preventDefault();
		const start = $.getProperty(this._source, "selectionStart");
		const end = $.getProperty(this._source, "selectionEnd");
		const value = $.getValue(this._source);
		const lines = value.split("\n");
		const startLine = value.substring(0, start).split("\n").length - 1;
		const endLine = value.substring(0, end).split("\n").length - 1;
		const tab = "	";
		let newStart = start;
		let newEnd = end;
		let newValue;
		if (e.shiftKey) {
			for (const [i, line] of lines.entries()) if (i >= startLine && i <= endLine && line.startsWith(tab)) {
				lines[i] = line.substring(1);
				if (i === startLine) newStart--;
				if (i < endLine) newEnd--;
			}
			newValue = lines.join("\n");
		} else if (startLine !== endLine) {
			for (const [i, line] of lines.entries()) if (i >= startLine && i <= endLine && (i < endLine || lines[i])) {
				lines[i] = tab + line;
				if (i < endLine) newEnd++;
			}
			newValue = lines.join("\n");
		} else {
			newValue = value.substring(0, start) + "	" + value.substring(end);
			newStart++;
			if (start === end) newEnd++;
			else newEnd = newStart;
		}
		$.select(this._source);
		document.execCommand("insertText", false, newValue);
		this._source.setSelectionRange(newStart, newEnd);
	});
	$.addEvent(this._source, "scroll.ui.editor", $.debounce((_) => {
		const scrollY = $.getScrollY(this._source);
		$.setStyle(this._lineNumbers, { marginTop: `${-scrollY}px` });
	}));
}
/**
* Attach toolbar events.
*/
function _eventsToolbar() {
	$.addEventDelegate(this._toolbar, "click.ui.editor", "[data-ui-action]", (e) => {
		const action = $.getDataset(e.currentTarget, "uiAction");
		if (!(action in this.constructor.plugins)) throw new Error(`Unknown action ${action}`);
		e.preventDefault();
		if (this._lastRange) {
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(this._lastRange);
		}
		this.constructor.plugins[action].action.bind(this)();
	});
	$.addEventDelegate(this._toolbar, "click.ui.editor", "[data-ui-command]", (e) => {
		const command = $.getDataset(e.currentTarget, "uiCommand");
		if (!(command in this)) throw new Error(`Unknown command ${command}`);
		e.preventDefault();
		if (this._lastRange) {
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(this._lastRange);
		}
		const value = $.getDataset(e.currentTarget, "uiValue");
		this[command](value);
		this._refreshToolbar();
	});
}

// src/js/prototype/helpers.js
/**
* Check if the editor is empty and populate base markup.
*/
function _checkEmpty() {
	if ($.getValue(this.node).trim()) return;
	$.setHtml(this._editor, "<p><br></p>");
}
/**
* Execute a command.
* @param {string} command The command.
* @param {boolean | string} [value] The command argument.
*/
function _execCommand(command, value) {
	if ($.is(this.node, ":disabled")) return;
	this._focusEditor();
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
}
/**
* Ensure the editor element has focus.
*/
function _focusEditor() {
	if ($.isSame(this._editor, document.activeElement) || $.hasDescendent(this._editor, document.activeElement)) return;
	const selection = window.getSelection();
	if (selection.anchorNode && $.hasDescendent(this._editor, selection.anchorNode)) return;
	$.focus(this._editor);
}
/**
* Refresh the popover at cursor.
*/
function _refreshCursor() {
	const baseNode = window.getSelection().baseNode;
	if (!$.hasDescendent(this._editor, baseNode)) {
		this._removePopover();
		return;
	}
	const currentNode = $.is(baseNode, "a") ? baseNode : $.closest(baseNode, "a", this._editor).shift();
	if (!currentNode) {
		this._removePopover();
		return;
	}
	this._refreshPopover(currentNode);
}
/**
* Refresh the editor disabled.
*/
function _refreshDisabled() {
	if ($.is(this.node, ":disabled")) {
		$.addClass(this._editor, this.constructor.classes.editorDisabled);
		$.setStyle(this._editor, { opacity: .5 });
		$.removeAttribute(this._editor, "contenteditable");
		$.setAttribute(this._editor, { "aria-disabled": true });
		$.setAttribute(this._source, { disabled: true });
	} else {
		$.removeClass(this._editor, this.constructor.classes.editorDisabled);
		$.setStyle(this._editor, { opacity: "" });
		$.setAttribute(this._editor, { contenteditable: true });
		$.removeAttribute(this._editor, "aria-disabled");
		$.removeAttribute(this._source, "disabled");
	}
}
/**
* Refresh the source line numbers.
*/
function _refreshLineNumbers() {
	if (!$.isVisible(this._sourceContainer)) return;
	const lineNumbers = $.contents(this._lineNumbers);
	const lines = $.getValue(this._source).split("\n");
	const test = $.create("div", { style: {
		width: $.width(this._source, { boxSize: $.CONTENT_BOX }),
		padding: 0,
		border: 0,
		font: $.css(this._source, "font"),
		letterSpacing: $.css(this._source, "letterSpacing"),
		whiteSpace: $.css(this._source, "whiteSpace"),
		wordBreak: $.css(this._source, "wordBreak"),
		wordSpacing: $.css(this._source, "wordSpacing"),
		wordWrap: $.css(this._source, "wordWrap")
	} });
	$.append(document.body, test);
	for (const [i, line] of lines.entries()) {
		let lineNumber;
		if (i < lineNumbers.length) lineNumber = lineNumbers[i];
		else {
			lineNumber = $.create("div", { text: i + 1 });
			$.append(this._lineNumbers, lineNumber);
		}
		$.setText(test, line || " ");
		const { height } = $.rect(test);
		$.setStyle(lineNumber, { height: `${height}px` });
	}
	$.detach(test);
	if (lineNumbers.length > lines.length) $.detach(lineNumbers.slice(lines.length));
}
/**
* Refresh the toolbar.
*/
function _refreshToolbar() {
	this._focusEditor();
	const isDisabled = $.is(this.node, ":disabled");
	const isSource = $.isVisible(this._sourceContainer);
	for (const { button, data, type } of this._buttons) {
		if ("setContent" in data) {
			const content = data.setContent.bind(this)();
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
		if (isDisabled || isSource && !["source", "fullScreen"].includes(type) || "disableCheck" in data && data.disableCheck.bind(this)()) {
			$.addClass(button, "disabled");
			$.setAttribute(button, { "aria-disabled": true });
		} else {
			$.removeClass(button, "disabled");
			$.removeAttribute(button, "aria-disabled");
		}
	}
}
/**
* Reset the drop text.
*/
function _resetDropText() {
	$.removeClass(this._dropText, this.constructor.classes.dropHover);
	$.setText(this._dropText, this.constructor.lang.drop.dropHere);
}
/**
* Show the drop target.
*/
function _showDropTarget() {
	if ($.is(this.node, ":disabled") || $.isVisible(this._sourceContainer)) return;
	$.show(this._dropTarget);
}
/**
* Show the editor.
*/
function _showEditor() {
	$.show(this._editorScroll);
	$.hide(this._sourceOuter);
}
/**
* Show the source.
*/
function _showSource() {
	$.show(this._sourceOuter);
	$.setStyle(this._editorScroll, { display: "none" }, null, { important: true });
	$.hide(this._imgHighlight);
	this._refreshLineNumbers();
}
/**
* Update the input value.
*/
function _updateValue() {
	const html = $.getHtml(this._editor);
	if (html === $.getValue(this.node)) return;
	this._redoHistory = [];
	const selectionData = this._getSelectionData();
	this._addHistory({
		html,
		selectionData
	});
	$.setValue(this.node, html);
	$.triggerEvent(this.node, "change.ui.editor");
}

// src/js/prototype/history.js
/**
* Get a node from a container path.
* @param {Array} path The path.
* @param {HTMLElement} container The container.
* @returns {Node|HTMLElement} The node.
*/
function getNodeFromPath(path, container) {
	let current = container;
	for (const index of path) current = $.contents(current)[index];
	return current;
}
/**
* Get the path to a node from a container.
* @param {Node|HTMLElement} node The node.
* @param {HTMLElement} container The container.
* @returns {Array} The path.
*/
function getPathToNode(node, container) {
	if ($.isSame(node, container)) return [];
	return [...$.parents(node, null, container), node].map((node) => $.contents($.parent(node).shift()).indexOf(node));
}
/**
* Add an item to the history.
* @param {object} [data] The history data.
* @param {string} data.html The serialized editor content.
* @param {object|null} [data.selectionData=null] The saved selection paths and offsets.
*/
function _addHistory({ html, selectionData = null } = {}) {
	this._history.push({
		html,
		selectionData
	});
	while (this._history.length > this.options.historyLimit) this._history.shift();
}
/**
* Get selection data for history.
* @returns {object} The selection data.
*/
function _getSelectionData() {
	const { anchorNode, anchorOffset, focusNode, focusOffset } = window.getSelection();
	if (!anchorNode || !focusNode || !$.isSame(this._editor, anchorNode) && !$.hasDescendent(this._editor, anchorNode) || !$.isSame(this._editor, focusNode) && !$.hasDescendent(this._editor, focusNode)) return null;
	return {
		anchorPath: getPathToNode(anchorNode, this._editor),
		anchorOffset,
		focusPath: getPathToNode(focusNode, this._editor),
		focusOffset
	};
}
/**
* Restore an item from history.
* @param {object} [data] The history data.
* @param {string} data.html The serialized editor content.
* @param {object|null} [data.selectionData=null] The saved selection paths and offsets.
*/
function _restoreHistory({ html, selectionData = null } = {}) {
	this._observe(false);
	$.setHtml(this._editor, html);
	$.setValue(this.node, html);
	const selection = window.getSelection();
	if (selectionData) {
		const anchorNode = getNodeFromPath(selectionData.anchorPath, this._editor);
		const focusNode = getNodeFromPath(selectionData.focusPath, this._editor);
		selection.setBaseAndExtent(anchorNode, selectionData.anchorOffset, focusNode, selectionData.focusOffset);
	} else {
		selection.selectAllChildren(this._editor);
		selection.collapseToEnd();
	}
	this._checkEmpty();
	this._observe();
}

// src/js/prototype/modals.js
/**
* Remove the modal.
*/
function _removeModal() {
	if (!this._modal) return;
	Modal.init(this._modal).dispose();
	$.remove(this._modal);
	this._modal = null;
}
/**
* Show the image modal.
*/
function _showImageModal() {
	const container = $.create("div");
	const { group: fileGroup, input: fileInput } = this.constructor._createFileInput({
		id: generateId("editor-image-file"),
		label: this.constructor.lang.modals.imageFile,
		attributes: {
			accept: "image/*",
			multiple: true
		}
	});
	const { group: urlGroup, input: urlInput } = this.constructor._createInput({
		id: generateId("editor-image-url"),
		label: this.constructor.lang.modals.imageUrl
	});
	$.append(container, fileGroup);
	$.append(container, urlGroup);
	const originalRange = getRange();
	this._focusEditor();
	const range = getRange();
	range.collapse();
	this._modal = this.constructor._createModal({
		title: this.constructor.lang.modals.insertImage,
		content: container,
		cancelText: this.constructor.lang.modals.cancel,
		submitText: this.constructor.lang.modals.insertImage,
		onSubmit: (_) => {
			selectRange(range);
			const files = $.getProperty(fileInput, "files");
			const src = $.getValue(urlInput);
			if (files.length) this.options.imageUpload.bind(this)(files);
			else if (src) this.insertImage(src);
		},
		onShown: (_) => {
			$.focus(fileInput);
		},
		onHidden: (_) => {
			this._removeModal();
			selectRange(originalRange);
		}
	});
}
/**
* Show the link modal.
* @param {HTMLElement} [link] The current link.
*/
function _showLinkModal(link) {
	const container = $.create("div");
	const { group: textGroup, input: textInput } = this.constructor._createInput({
		id: generateId("editor-link-text"),
		label: this.constructor.lang.modals.linkText
	});
	const { group: urlGroup, input: urlInput } = this.constructor._createInput({
		id: generateId("editor-link-url"),
		label: this.constructor.lang.modals.linkUrl
	});
	const { group: newWindowGroup, input: newWindowInput } = this.constructor._createCheckbox({
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
	$.addEvent(textInput, "input.ui.editor", (_) => {
		hasText = !!$.getValue(textInput);
	});
	$.addEvent(urlInput, "input.ui.editor", (_) => {
		if (hasText) return;
		const url = $.getValue(urlInput);
		$.setValue(textInput, url);
	});
	$.append(container, textGroup);
	$.append(container, urlGroup);
	$.append(container, newWindowGroup);
	const originalRange = getRange();
	let range;
	if (link) range = selectNode(link);
	else {
		this._focusEditor();
		range = getRange();
	}
	this._modal = this.constructor._createModal({
		title: this.constructor.lang.modals.insertLink,
		content: container,
		cancelText: this.constructor.lang.modals.cancel,
		submitText: this.constructor.lang.modals.insertLink,
		onSubmit: (_) => {
			selectRange(range);
			const text = $.getValue(textInput);
			const href = $.getValue(urlInput);
			const newWindow = $.is(newWindowInput, ":checked");
			this.insertLink(href, text, newWindow);
		},
		onShown: (_) => {
			$.focus(urlInput);
		},
		onHidden: (_) => {
			this._removeModal();
			selectRange(originalRange);
		}
	});
}
/**
* Show the video modal.
*/
function _showVideoModal() {
	const container = $.create("div");
	const { group: urlGroup, input: urlInput, invalidFeedback: urlInvalidFeedback } = this.constructor._createInput({
		id: generateId("editor-video-url"),
		label: this.constructor.lang.modals.videoUrl
	});
	$.append(container, urlGroup);
	const originalRange = getRange();
	this._focusEditor();
	const range = getRange();
	this._modal = this.constructor._createModal({
		title: this.constructor.lang.modals.insertVideo,
		content: container,
		cancelText: this.constructor.lang.modals.cancel,
		submitText: this.constructor.lang.modals.insertVideo,
		onSubmit: (_) => {
			selectRange(range);
			const match = $.getValue(urlInput).match(/youtube\.com\/watch\?v=([\w]+)/i);
			if (!match) {
				$.addClass(urlGroup, this.constructor.classes.formError);
				$.setText(urlInvalidFeedback, this.constructor.lang.modals.videoUrlInvalid);
				return false;
			}
			$.removeClass(urlGroup, this.constructor.classes.formError);
			const id = match[1];
			const video = $.create("iframe", { attributes: {
				width: 560,
				height: 315,
				src: `https://www.youtube.com/embed/${id}`,
				frameborder: 0,
				allowfullscreen: true
			} });
			const html = $.getProperty(video, "outerHTML");
			this.insertHTML(html);
		},
		onShown: (_) => {
			$.focus(urlInput);
		},
		onHidden: (_) => {
			this._removeModal();
			selectRange(originalRange);
		}
	});
}

// src/js/normalize.js
var transparent = "rgba(0, 0, 0, 0)";
/**
* Determine if a node is phrasing content.
* https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
* @param {Node} node The input node.
* @returns {boolean} TRUE if the node is phrasing content, otherwise FALSE.
*/
var isPhrasingContent = (node) => $._isText(node) || $.is(node, "a, abbr, area, audio, b, bdi, bdo, br, button, cite, code, data, datalist, del, dfn, em, embed, i, iframe, img, input, ins, kbd, label, map, mark, math, meter, noscript, object, output, picture, progress, q, ruby, s, samp, script, select, slot, small, span, strong, sub, sup, svg, template, textarea, time, u, var, video, wbr");
/**
* Determine if a node is a form element.
* https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
* @param {Node} node The input node.
* @returns {boolean} TRUE if the node is a form element, otherwise FALSE.
*/
var isFormElement = (node) => $.is(node, "button, fieldset, input, object, output, select, textarea");
/**
* Determine if a node is a void element.
* https://developer.mozilla.org/en-US/docs/Glossary/Void_element
* @param {Node} node The input node.
* @returns {boolean} TRUE if the node is a void element, otherwise FALSE.
*/
var isVoidElement = (node) => $.is(node, "area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr");
/**
* Determine if a node is a phrasing container.
* @param {Node} node The input node.
* @returns {boolean} TRUE if the node is a phrasing container, otherwise FALSE.
*/
var isPhrasingContainer = (node) => !$._isText(node) && isPhrasingContent(node) && !isVoidElement(node) && !isFormElement(node);
/**
* Join adjacent inline elements.
* @param {HTMLElement} container The container.
* @param {object} markers The selection markers.
*/
function joinAdjacentNodes(container, markers) {
	const elements = $.find("*", container);
	const isMarker = (node) => markers.start && $.isSame(node, markers.start) || markers.end && $.isSame(node, markers.end);
	for (const element of elements) {
		if (isMarker(element) || !isPhrasingContainer(element)) continue;
		const moveMarkers = [];
		let next = element.nextSibling;
		while (next && isMarker(next)) {
			moveMarkers.push(next);
			next = next.nextSibling;
		}
		if (!next || !isPhrasingContainer(next) || !$.isEqual(element, next, { shallow: true })) continue;
		$.prepend(next, $.contents(element));
		if (moveMarkers.length) $.prepend(next, moveMarkers);
		$.detach(element);
	}
}
/**
* Normalize phrasing containers.
* @param {HTMLElement} container The container.
*/
function normalizePhrasing(container) {
	const elements = $.find("h1, h2, h3, h4, h5, h6, p, pre", container);
	for (const element of elements) {
		const contents = $.contents(element);
		if (!contents.length) continue;
		for (const [i, child] of contents.entries()) {
			if (isPhrasingContent(child)) continue;
			const nextSiblings = contents.splice(i);
			$.after(element, nextSiblings);
			if ($.is(element, "p")) break;
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
					if ($.is(node, tagName)) continue;
					if ($.is(node, "h1, h2, h3, h4, h5, h6, p, pre")) {
						const clone = $.clone(element, { deep: false });
						replaceElement(node, clone);
						lastNode = clone;
						continue;
					}
					const contents = $.contents(node);
					wrapContents(node, contents);
				}
				if (stack.length) {
					const clone = $.clone(element, { deep: false });
					$.append(clone, stack);
					if (lastNode) $.after(lastNode, clone);
					else $.append(parent, clone);
				}
				return stack;
			};
			wrapContents(element, nextSiblings);
			break;
		}
		if (!contents.length) $.detach(element);
	}
}
/**
* Normalize span elements.
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
* Normalize style attributes.
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

// src/js/prototype/nodes.js
/**
* Insert a (cloned) node into the editor.
* @param {HTMLElement} node The node to insert.
* @returns {HTMLElement} The new node.
*/
function _insertNode(node) {
	this._focusEditor();
	const range = getRange();
	range.deleteContents();
	range.insertNode(node);
	range.collapse(false);
	return node;
}
/**
* Normalize the editor.
*/
function _normalize() {
	this._observe(false);
	$.normalize(this._editor);
	const markers = saveSelection();
	normalizeStyles(this._editor);
	normalizeSpans(this._editor);
	normalizePhrasing(this._editor);
	joinAdjacentNodes(this._editor, markers);
	restoreSelection(markers);
	$.normalize(this._editor);
	this._observe();
}
/**
* Update a table element.
* @param {HTMLElement} td The td element.
* @param {Function} callback The callback.
*/
function _updateTable(td, callback) {
	const table = $.closest(td, "table", this._editor).shift();
	if (!table) return;
	callback(td, $.closest(td, "tr", this._editor).shift(), table);
	selectNode(td).collapse(true);
}

// src/js/prototype/popovers.js
/**
* Highlight an image.
* @param {HTMLElement} image The image element.
*/
function _highlightImage(image) {
	$.hide(this._imgHighlight);
	$.hide(this._imgCursor);
	const imgRect = $.rect(image, { offset: true });
	const editorPos = $.position(this._editor, { offset: true });
	const scrollX = $.getScrollX(this._editorScroll);
	const scrollY = $.getScrollY(this._editorScroll);
	const imgX = Math.round(imgRect.x);
	const imgY = Math.round(imgRect.y);
	const imgWidth = Math.round(imgRect.width);
	const imgHeight = Math.round(imgRect.height);
	$.setStyle(this._imgHighlight, {
		top: `${imgY - editorPos.y + scrollY - 2}px`,
		left: `${imgX - editorPos.x + scrollX - 2}px`,
		width: `${imgWidth + 2}px`,
		height: `${imgHeight + 2}px`
	});
	$.setText(this._imgSize, `${imgWidth}x${imgHeight}`);
	if (imgWidth < 100 || imgHeight < 50) $.hide(this._imgSize);
	else $.show(this._imgSize);
	$.show(this._imgHighlight);
	$.show(this._imgCursor);
}
/**
* Refresh the popover.
* @param {HTMLElement} currentNode The current selected node.
* @param {Event} [event] The current event.
*/
function _refreshPopover(currentNode, event) {
	if ($.isSame(currentNode, this._currentNode)) return;
	this._removePopover();
	this._currentNode = currentNode;
	if (!this._currentNode) return;
	const tagName = $.tagName(this._currentNode);
	let reference = this._currentNode;
	if (event && tagName === "img") {
		const editorPos = $.position(this._editor, { offset: true });
		const scrollX = $.getScrollX(this._editorScroll);
		const scrollY = $.getScrollY(this._editorScroll);
		$.setStyle(this._imgCursor, {
			top: `${event.pageY - editorPos.y + scrollY}px`,
			left: `${event.pageX - editorPos.x + scrollX}px`
		});
		reference = this._imgCursor;
	}
	this._popper = new Popper(this._popover, {
		reference,
		arrow: this._popoverArrow,
		container: this._editor,
		placement: "bottom",
		position: "left",
		minContact: 0,
		noAttributes: true
	});
	$.show(this._popover);
	switch (tagName) {
		case "a":
			this._renderPopoverItems(this.options.popovers.link);
			break;
		case "img":
			this._renderPopoverItems(this.options.popovers.image);
			this._highlightImage(this._currentNode);
			$.show(this._imgHighlight);
			break;
		case "td": this._renderPopoverItems(this.options.popovers.table);
	}
	this._popper.update();
}
/**
* Remove the popover.
*/
function _removePopover() {
	if (!this._currentNode) return;
	$.hide(this._imgHighlight);
	$.hide(this._imgCursor);
	$.hide(this._popover);
	$.empty(this._popoverBody);
	this._popper.dispose();
	this._popper = null;
	this._currentNode = null;
}

// src/js/prototype/render-dropdowns.js
/**
* Render a color dropdown.
* @param {HTMLElement} dropdown The dropdown.
*/
function _colorDropdown(dropdown) {
	const container = $.create("li", { class: this.constructor.classes.colorContainerRow });
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
	this._setToolbarData(foreDefault, {
		command: "foreColor",
		value: "initial"
	});
	const backDefault = $.create("button", {
		text: this.constructor.lang.dropdowns.colorTransparent,
		class: this.constructor.classes.colorDefaultBtn,
		attributes: { type: "button" }
	});
	$.append(backDefaultContainer, backDefault);
	this._setToolbarData(backDefault, {
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
			Tooltip.init(foreLink, {
				appendTo: document.body,
				placement: "bottom"
			});
			this._setToolbarData(foreLink, {
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
			Tooltip.init(backLink, {
				appendTo: document.body,
				placement: "bottom"
			});
			this._setToolbarData(backLink, {
				command: "backColor",
				value: color
			});
		}
	}
	$.append(container, col1);
	$.append(container, col2);
	$.setStyle(dropdown, { minWidth: "350px" });
	$.append(dropdown, container);
}
/**
* Render a font dropdown.
* @param {HTMLElement} dropdown The dropdown.
*/
function _fontDropdown(dropdown) {
	const fonts = this._fonts.sort();
	for (const font of fonts) {
		const button = $.create("li", {
			text: font,
			class: this.constructor.classes.dropdownItem,
			style: { fontFamily: font },
			attributes: {
				"role": "button",
				"aria-label": font
			}
		});
		const data = {
			command: "fontName",
			value: font
		};
		this._buttons.push({
			button,
			data
		});
		this._setToolbarData(button, data);
		$.append(dropdown, button);
	}
}
/**
* Render a font size dropdown.
* @param {HTMLElement} dropdown The dropdown.
*/
function _fontSizeDropdown(dropdown) {
	const sizes = Object.values(this.constructor.fontSizes);
	for (const size of sizes) {
		const button = $.create("li", {
			text: size,
			class: this.constructor.classes.dropdownItem,
			attributes: {
				"role": "button",
				"aria-label": size
			}
		});
		const data = {
			command: "fontSize",
			value: size
		};
		this._buttons.push({
			button,
			data
		});
		this._setToolbarData(button, data);
		$.append(dropdown, button);
	}
}
/**
* Render a style dropdown.
* @param {HTMLElement} dropdown The dropdown.
*/
function _styleDropdown(dropdown) {
	for (const tag of this.constructor.styles) {
		const button = $.create("li", {
			class: this.constructor.classes.dropdownItem,
			attributes: {
				"role": "button",
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
		this._buttons.push({
			button,
			data
		});
		this._setToolbarData(button, data);
		$.append(dropdown, button);
	}
}
/**
* Render a table dropdown.
* @param {HTMLElement} dropdown The dropdown.
*/
function _tableDropdown(dropdown) {
	const container = $.create("li");
	for (let i = 0; i < 10; i++) {
		const row = $.create("div", { class: this.constructor.classes.tableRow });
		$.append(container, row);
		for (let j = 0; j < 10; j++) {
			const cell = $.create("div", { class: this.constructor.classes.tableCell });
			$.append(row, cell);
			if (i > 4 || j > 4) $.hide(cell);
			const link = $.create("a", {
				class: this.constructor.classes.tableLink,
				attributes: { href: "#" },
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
	$.addEventDelegate(container, "click.ui.editor", "a", (e) => {
		const cols = $.getDataset(e.currentTarget, "uiColumn");
		const rows = $.getDataset(e.currentTarget, "uiRow");
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
		this.insertHTML(html);
	});
	$.addEventDelegate(container, "mouseover.ui.editor", "a", (e) => {
		const targetCol = $.getDataset(e.currentTarget, "uiColumn");
		const targetRow = $.getDataset(e.currentTarget, "uiRow");
		const colMin = Math.max(targetCol + 1, 4);
		const rowMin = Math.max(targetRow + 1, 4);
		const links = $.find("a", container);
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
	});
}

// src/js/prototype/render-popover.js
/**
* Render the popover elements.
*/
function _renderPopover() {
	this._popover = $.create("div", {
		class: this.constructor.classes.popover,
		attributes: { role: "tooltip" }
	});
	this._popoverArrow = $.create("div", { class: this.constructor.classes.popoverArrow });
	this._popoverBody = $.create("div", { class: this.constructor.classes.popoverBody });
	$.hide(this._popover);
	$.append(this._popover, this._popoverArrow);
	$.append(this._popover, this._popoverBody);
	$.append(this._container, this._popover);
}
/**
* Render a popover item.
* @param {string} type The item type.
* @param {HTMLElement} parent The parent element.
*/
function _renderPopoverItem(type, parent) {
	const data = this.constructor.popovers[type];
	let node;
	if (data.render) node = data.render.bind(this)(this._currentNode);
	else {
		node = this._renderButton({
			icon: type,
			title: this.constructor.lang.popovers[type],
			...data
		});
		$.setDataset(node, { uiAction: type });
	}
	$.append(parent, node);
}
/**
* Render popover items.
* @param {Array} items The items to render.
*/
function _renderPopoverItems(items) {
	for (const item of items) if ($._isString(item)) this._renderPopoverItem(item, this._popoverBody);
	else {
		const node = $.create("div", {
			class: this.constructor.classes.btnGroup,
			attributes: { role: "group" }
		});
		for (const type of item) this._renderPopoverItem(type, node);
		$.append(this._popoverBody, node);
	}
}

// src/js/prototype/render-toolbar.js
/**
* Render the toolbar.
*/
function _renderToolbar() {
	const header = $.create("div", { class: this.constructor.classes.toolbar });
	this._toolbar = $.create("div", {
		class: this.constructor.classes.toolbarButtons,
		attributes: { role: "toolbar" }
	});
	for (const buttons of this._toolbarButtons) {
		const buttonGroup = $.create("div", { class: this.constructor.classes.btnGroup });
		for (const type of buttons) this._renderToolbarButton(type, buttonGroup);
		$.append(this._toolbar, buttonGroup);
	}
	$.append(header, this._toolbar);
	$.append(this._container, header);
}
/**
* Render a toolbar button.
* @param {string} type The button type.
* @param {HTMLElement} parent The parent element.
*/
function _renderToolbarButton(type, parent) {
	const data = this.constructor.plugins[type];
	const button = this._renderButton({
		icon: type,
		title: this.constructor.lang.plugins[type],
		...data
	});
	this._buttons.push({
		button,
		data,
		type
	});
	this._setToolbarData(button, data, type);
	if ("dropdown" in data) this._renderToolbarDropdown(parent, button, data.dropdown);
	else $.append(parent, button);
}
/**
* Render a toolbar dropdown.
* @param {HTMLElement} buttonGroup The button group element.
* @param {HTMLElement} button The button element.
* @param {Array|Function} dropdownContent The dropdown content.
*/
function _renderToolbarDropdown(buttonGroup, button, dropdownContent) {
	const dropGroup = $.create("div", {
		class: this.constructor.classes.dropdownGroup,
		attributes: { role: "group" }
	});
	$.addClass(button, this.constructor.classes.dropdownToggle);
	$.setDataset(button, { uiToggle: "dropdown" });
	$.setAttribute(button, {
		"aria-has-popup": true,
		"aria-expanded": false
	});
	$.append(dropGroup, button);
	const dropdown = $.create("ul", { class: this.constructor.classes.dropdown });
	if ($._isArray(dropdownContent)) {
		$.addClass(dropdown, this.constructor.classes.dropdownButtons);
		for (const dropdownItems of dropdownContent) {
			const subDropGroup = $.create("div", {
				class: this.constructor.classes.btnGroup,
				attributes: { role: "group" }
			});
			for (const type of dropdownItems) this._renderToolbarButton(type, subDropGroup);
			$.append(dropdown, subDropGroup);
		}
	} else if ($._isFunction(dropdownContent)) dropdownContent.bind(this)(dropdown);
	$.append(dropGroup, dropdown);
	$.append(buttonGroup, dropGroup);
}
/**
* Set data for a toolbar action.
* @param {HTMLElement} node The action node.
* @param {object} data The data to set.
* @param {string} [type] The action type.
*/
function _setToolbarData(node, data, type) {
	if (data.command) {
		$.setDataset(node, { uiCommand: data.command });
		if (data.value) $.setDataset(node, { uiValue: data.value });
	} else if (data.action && type) $.setDataset(node, { uiAction: type });
}

// src/js/prototype/render.js
/**
* Render the editor.
*/
function _render() {
	this._container = $.create("div", { class: this.constructor.classes.container });
	this._renderToolbar();
	this._editorBody = $.create("div", {
		class: this.constructor.classes.editorBody,
		style: { height: this.options.height }
	});
	$.append(this._container, this._editorBody);
	this._renderEditor();
	this._renderSource();
	this._renderPopover();
	this._renderDrop();
	if (this.options.resizable) this._renderResize();
	$.hide(this.node);
	$.setAttribute(this.node, { tabindex: -1 });
	$.insertBefore(this._container, this.node);
}
/**
* Render a button
* @param {object} data The button data.
* @returns {HTMLElement} The button.
*/
function _renderButton(data) {
	const button = $.create("button", { class: this.constructor.classes.btn });
	if (data.setTitle) data.title = data.setTitle.bind(this)();
	if (data.title) {
		$.setAttribute(button, {
			"title": data.title,
			"aria-label": data.title
		});
		Tooltip.init(button, {
			appendTo: document.body,
			placement: "bottom"
		});
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
* Render the drop elements.
*/
function _renderDrop() {
	this._dropTarget = $.create("div", { class: this.constructor.classes.dropTarget });
	this._dropText = $.create("span", {
		text: this.constructor.lang.drop.dropHere,
		class: this.constructor.classes.dropText
	});
	$.append(this._dropTarget, this._dropText);
	$.hide(this._dropTarget);
	$.append(this._container, this._dropTarget);
}
/**
* Render the editor elements.
*/
function _renderEditor() {
	this._editorScroll = $.create("div", { class: this.constructor.classes.editorScroll });
	this._editorContainer = $.create("div", { class: this.constructor.classes.editorContainer });
	this._editor = $.create("div", {
		class: this.constructor.classes.editor,
		style: { fontFamily: this._defaultFont },
		attributes: {
			"role": "textbox",
			"aria-multline": true,
			"spellcheck": true,
			"autocorrect": true
		}
	});
	this._imgHighlight = $.create("div", { class: this.constructor.classes.imgHighlight });
	this._imgCursor = $.create("div", { class: this.constructor.classes.imgCursor });
	this._imgSize = $.create("div", { class: this.constructor.classes.imgSize });
	this._imgResize = $.create("div", { class: this.constructor.classes.imgResize });
	$.hide(this._imgHighlight);
	$.append(this._imgHighlight, this._imgSize);
	$.append(this._imgHighlight, this._imgResize);
	$.append(this._editorContainer, this._imgCursor);
	$.append(this._editorContainer, this._imgHighlight);
	$.append(this._editorContainer, this._editor);
	$.append(this._editorScroll, this._editorContainer);
	$.append(this._editorBody, this._editorScroll);
}
/**
* Render the resize bar.
*/
function _renderResize() {
	this._resizeBar = $.create("div", { class: this.constructor.classes.resizeBar });
	for (let i = 0; i < 3; i++) {
		const hr = $.create("hr");
		$.append(this._resizeBar, hr);
	}
	$.append(this._container, this._resizeBar);
}
/**
* Render the source elements.
*/
function _renderSource() {
	this._sourceOuter = $.create("div", { class: this.constructor.classes.sourceOuter });
	this._sourceContainer = $.create("div", { class: this.constructor.classes.sourceContainer });
	this._lineNumbers = $.create("div", { class: this.constructor.classes.sourceLines });
	this._sourceScroll = $.create("div", { class: this.constructor.classes.sourceScroll });
	this._source = $.create("textarea", { class: this.constructor.classes.source });
	$.hide(this._sourceOuter);
	$.append(this._sourceScroll, this._source);
	$.append(this._sourceContainer, this._lineNumbers);
	$.append(this._sourceContainer, this._sourceScroll);
	$.append(this._sourceOuter, this._sourceContainer);
	$.append(this._editorBody, this._sourceOuter);
}

// src/js/static/modals.js
/**
* Create a form checkbox.
* @param {object} options Options for the checkbox.
* @returns {object} An object containing the form elements.
*/
function _createCheckbox(options) {
	const group = $.create("div", { class: this.classes.formGroup });
	const inputContainer = $.create("div", { class: this.classes.checkboxContainer });
	const input = $.create("input", {
		class: this.classes.checkbox,
		attributes: {
			id: options.id,
			type: "checkbox",
			...options.attributes
		}
	});
	const label = $.create("label", {
		text: options.label,
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
* Create a form file input.
* @param {object} options Options for the file input.
* @returns {object} An object containing the form elements.
*/
function _createFileInput(options) {
	const group = $.create("div", { class: this.classes.formGroup });
	const label = $.create("label", {
		text: options.label,
		attributes: { for: options.id }
	});
	const inputContainer = $.create("div", { class: this.classes.inputContainer });
	const input = $.create("input", { attributes: {
		id: options.id,
		type: "file",
		...options.attributes
	} });
	$.append(group, label);
	$.append(inputContainer, input);
	$.append(group, inputContainer);
	return {
		group,
		input
	};
}
/**
* Create a form text input.
* @param {object} options Options for the text input.
* @returns {object} An object containing the form elements.
*/
function _createInput(options) {
	const group = $.create("div", { class: this.classes.formGroup });
	const label = $.create("label", {
		text: options.label,
		attributes: { for: options.id }
	});
	const inputContainer = $.create("div", { class: this.classes.inputContainer });
	const input = $.create("input", {
		class: this.classes.input,
		attributes: {
			id: options.id,
			type: options.type || "text",
			...options.attributes
		}
	});
	const ripple = $.create("div", { class: this.classes.inputRipple });
	const invalidFeedback = $.create("div", { class: this.classes.invalidFeedback });
	$.append(group, label);
	$.append(inputContainer, input);
	$.append(inputContainer, ripple);
	$.append(group, inputContainer);
	$.append(group, invalidFeedback);
	return {
		group,
		input,
		invalidFeedback
	};
}
/**
* Create a modal.
* @param {object} options Options for the modal.
* @returns {HTMLElement} The modal element.
*/
function _createModal(options) {
	const modal = $.create("div", {
		class: this.classes.modal,
		attributes: {
			"tabindex": -1,
			"role": "dialog",
			"aria-model": true
		}
	});
	const modalDialog = $.create("div", { class: this.classes.modalDialog });
	$.append(modal, modalDialog);
	if (options.fullScreen) $.addClass(modalDialog, this.classes.modalFullscreen);
	const modalContent = $.create("form", { class: this.classes.modalContent });
	$.append(modalDialog, modalContent);
	const modalHeader = $.create("div", { class: this.classes.modalHeader });
	$.append(modalContent, modalHeader);
	if (options.title) {
		const modalTitle = $.create("h6", {
			class: this.classes.modalTitle,
			text: options.title
		});
		$.append(modalHeader, modalTitle);
	}
	const closeBtn = $.create("button", {
		class: this.classes.modalBtnClose,
		dataset: { uiDismiss: "modal" },
		attributes: {
			"type": "button",
			"aria-label": this.lang.modals.close
		}
	});
	$.append(modalHeader, closeBtn);
	if (options.content) {
		const modalBody = $.create("div", { class: this.classes.modalBody });
		$.append(modalBody, options.content);
		$.append(modalContent, modalBody);
	}
	if (options.onSubmit) {
		const modalFooter = $.create("div", { class: this.classes.modalFooter });
		$.append(modalContent, modalFooter);
		const cancelButton = $.create("button", {
			text: options.cancelText,
			class: this.classes.modalBtnSecondary,
			dataset: { uiDismiss: "modal" },
			attributes: { type: "button" }
		});
		$.append(modalFooter, cancelButton);
		const submitButton = $.create("button", {
			text: options.submitText,
			class: this.classes.modalBtnPrimary,
			attributes: { type: "submit" }
		});
		$.append(modalFooter, submitButton);
		$.addEvent(modalContent, "submit", (e) => {
			e.preventDefault();
			if (options.onSubmit(e) === false) return;
			Modal.init(modal).hide();
		});
	}
	$.append(document.body, modal);
	if ("onShow" in options) $.addEvent(modal, "show.ui.modal", (e) => {
		options.onShow(e);
	});
	if ("onShown" in options) $.addEvent(modal, "shown.ui.modal", (e) => {
		options.onShown(e);
	});
	if ("onHide" in options) $.addEvent(modal, "hide.ui.modal", (e) => {
		options.onHide(e);
	});
	if ("onHidden" in options) $.addEvent(modal, "hidden.ui.modal", (e) => {
		options.onHidden(e);
	});
	Modal.init(modal).show();
	return modal;
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

// src/js/index.js
Editor.defaults = {
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
	imageUpload(files) {
		const promises = [];
		for (const file of files) promises.push(new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (_) => {
				resolve(reader.result);
			};
			reader.onerror = (_) => {
				reject(/* @__PURE__ */ new Error("Unable to read file"));
			};
			reader.readAsDataURL(file);
		}));
		Promise.allSettled(promises).then((results) => {
			for (const result of results) {
				if (result.status !== "fulfilled") continue;
				this.insertImage(result.value);
			}
		});
	},
	keyDown(e) {
		if (!e.ctrlKey) return;
		let action;
		switch (e.key) {
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
				action = "undo";
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
Editor.classes = {
	btn: "btn btn-editor btn-sm fs-6 lh-1",
	btnGroup: "btn-group me-1 mb-1",
	btnIcon: "pe-none",
	checkbox: "input-check",
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
	dropdown: "dropdown-menu",
	dropdownButtons: "pt-2 pe-1 pb-1 ps-2 text-nowrap",
	dropdownGroup: "btn-group",
	dropdownItem: "dropdown-item",
	dropdownItemDisabled: "disabled",
	dropdownToggle: "dropdown-toggle",
	dropHover: "text-primary",
	dropTarget: "editor-drop-target position-absolute w-100 text-center rounded",
	dropText: "position-absolute top-50 translate-middle h5 pe-none",
	editor: "editor w-100 p-2 outline-0",
	editorBody: "card-body d-flex p-0",
	editorContainer: "editor-container position-relative",
	editorDisabled: "bg-body-tertiary pe-none",
	editorScroll: "editor-scroll d-block w-100 overflow-auto",
	formError: "form-error",
	formGroup: "mb-2",
	imgCursor: "editor-img-cursor position-absolute translate-middle pe-none",
	imgHighlight: "editor-img-highlight position-absolute pe-none",
	imgResize: "editor-img-resize position-absolute top-100 start-100 translate-middle pe-auto",
	imgSize: "editor-img-size position-absolute bottom-0 end-0 text-end me-2 mb-2 py-1 px-3 rounded",
	input: "input-filled",
	inputContainer: "form-input",
	inputRipple: "ripple-line",
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
	source: "editor-source font-monospace outline-0 border-0 p-2 mb-0 w-100",
	sourceContainer: "d-flex h-100",
	sourceLines: "font-monospace bg-body-secondary p-2 mb-0 border-end",
	sourceOuter: "w-100 overflow-hidden",
	sourceScroll: "d-flex w-100",
	styleContent: "mb-1",
	table: "table table-bordered",
	tableCell: "flex-column",
	tableDropdown: "p-2",
	tableHover: "bg-primary",
	tableInfo: "text-muted",
	tableLink: "editor-table-link d-block border border-dark p-2 rounded-0",
	tableRow: "d-flex flex-row",
	toolbar: "card-header pt-1 pe-0 pb-0 ps-1",
	toolbarButtons: "btn-toolbar"
};
Editor.lang = {
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
Editor.buttons = buttons;
Editor.colors = colors;
Editor.fonts = fonts;
Editor.fontSizes = fontSizes;
Editor.icons = icons_default;
Editor.plugins = plugins_default;
Editor.popovers = popovers_default;
Editor.styles = styles;
Editor._createCheckbox = _createCheckbox;
Editor._createFileInput = _createFileInput;
Editor._createInput = _createInput;
Editor._createModal = _createModal;
var proto = Editor.prototype;
proto._addHistory = _addHistory;
proto._checkEmpty = _checkEmpty;
proto._colorDropdown = _colorDropdown;
proto._events = _events;
proto._eventsDrop = _eventsDrop;
proto._eventsEditor = _eventsEditor;
proto._eventsPopover = _eventsPopover;
proto._eventsResize = _eventsResize;
proto._eventsSource = _eventsSource;
proto._eventsToolbar = _eventsToolbar;
proto._execCommand = _execCommand;
proto._focusEditor = _focusEditor;
proto._fontDropdown = _fontDropdown;
proto._fontSizeDropdown = _fontSizeDropdown;
proto._getSelectionData = _getSelectionData;
proto._highlightImage = _highlightImage;
proto._insertNode = _insertNode;
proto._normalize = _normalize;
proto._refreshCursor = _refreshCursor;
proto._refreshDisabled = _refreshDisabled;
proto._refreshLineNumbers = _refreshLineNumbers;
proto._refreshPopover = _refreshPopover;
proto._refreshToolbar = _refreshToolbar;
proto._removeModal = _removeModal;
proto._removePopover = _removePopover;
proto._render = _render;
proto._renderButton = _renderButton;
proto._renderDrop = _renderDrop;
proto._renderEditor = _renderEditor;
proto._renderPopover = _renderPopover;
proto._renderPopoverItem = _renderPopoverItem;
proto._renderPopoverItems = _renderPopoverItems;
proto._renderResize = _renderResize;
proto._renderSource = _renderSource;
proto._renderToolbar = _renderToolbar;
proto._renderToolbarButton = _renderToolbarButton;
proto._renderToolbarDropdown = _renderToolbarDropdown;
proto._resetDropText = _resetDropText;
proto._restoreHistory = _restoreHistory;
proto._setToolbarData = _setToolbarData;
proto._showDropTarget = _showDropTarget;
proto._showEditor = _showEditor;
proto._showImageModal = _showImageModal;
proto._showLinkModal = _showLinkModal;
proto._showSource = _showSource;
proto._showVideoModal = _showVideoModal;
proto._styleDropdown = _styleDropdown;
proto._tableDropdown = _tableDropdown;
proto._updateTable = _updateTable;
proto._updateValue = _updateValue;
initComponent("editor", Editor);
var js_default = Editor;

export { js_default as default };
//# sourceMappingURL=frost-ui-editor.esm.js.map