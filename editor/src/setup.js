'use strict';

import { openPrompt } from './proseutil/prose-prompt';
import viewSource from './plugins/view-source';

import {
    addColumnBefore, addColumnAfter, deleteColumn, addRowBefore,
    deleteRow, deleteTable, mergeCells, splitCell, toggleHeaderColumn, toggleHeaderRow, toggleHeaderCell, addRowAfter, columnResizing, tableEditing, goToNextCell
} from 'prosemirror-tables';
import { htmlToDoc, domToDoc, docToHtml } from './proseutil/doc-utils';
import { linkSelector } from './plugins/ss-link-selector';
import { markItem, wrapListItem, canInsert, markWrappingInputRule, cmdItem } from './proseutil/editor-utils';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { clearMarks } from './plugins/clear-marks';
import { imageSelector } from './plugins/ss-image-selector';
import { imagePaste } from './plugins/image-paste';
import { insertShortcode, ShortcodeNodeView } from './plugins/shortcodes';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';

import schema from './schema';

var prosemirrorKeymap = require('prosemirror-keymap');
var prosemirrorHistory = require('prosemirror-history');
var prosemirrorCommands = require('prosemirror-commands');
var prosemirrorState = require('prosemirror-state');
var prosemirrorDropcursor = require('prosemirror-dropcursor');
var prosemirrorGapcursor = require('prosemirror-gapcursor');
var prosemirrorMenu = require('prosemirror-menu');
var prosemirrorSchemaList = require('prosemirror-schema-list');
var prosemirrorInputrules = require('prosemirror-inputrules');
var autoComplete = require('./vendor/auto-complete');

var mockupPages = require('./data/mockup-pages');

// table plugin support in FF
document.execCommand("enableObjectResizing", false, "false")
document.execCommand("enableInlineTableEditing", false, "false")


function injectAutoComplete(name) {
    const pages = mockupPages.default;
    let options = [];
    const hasPages = pages && pages.length > 0;
    if (hasPages) {
        for (let page of pages) {
            options.push({
                value: page.link,
                label: page.title
            });
        };
    }
    const ac = new autoComplete({
        selector: `input[name="${name}"]`,
        minChars: 2,
        source: function (term, suggest) {
            term = term.toLowerCase();
            var choices = options;
            var matches = [];
            for (let i = 0; i < choices.length; i++)
                if (~choices[i].label.toLowerCase().indexOf(term)) matches.push(choices[i]);
            suggest(matches);
        },
        renderItem: function (item) {
            return `
            <div class="autocomplete-suggestion" data-link="${item.value}" data-val="${item.label}">
                <b>${item.label}</b>
            </div>
            `;
        },
        onSelect: function (e, term, item) {
            e.preventDefault();
            // TODO add the value
            e.stopPropagation();
            const acField = document.querySelector(`input[name="${name}"]`);
            if (!acField) {
                return;
            }
            acField.value = item.getAttribute('data-link');
        }
    });
}



// Helpers to create specific types of items


function insertLink(nodeType) {
    return new prosemirrorMenu.MenuItem({
        title: "Insert link",
        label: "Page Link",
        // enable: function enable() { return hasPages },
        run: function run(state, _, view) {
            var attrs = null;
            if (state.selection instanceof prosemirrorState.NodeSelection && state.selection.node.type == nodeType) {
                attrs = state.selection.node.attrs;
            }
            openPrompt({
                title: "Insert page",
                fields: {
                    pageLink: new TextField({
                        name: "search-page",
                        label: "Search page",
                        required: false,
                        autocomplete: true,
                        value: attrs && attrs.href
                    }),
                    externalLink: new TextField({
                        label: "External URL",
                        required: false,
                        value: attrs && attrs.href
                    }),
                    text: new TextField({
                        label: "Text",
                        required: false,
                        value: attrs && attrs.text
                    }),
                    title: new TextField({
                        label: "Description",
                        required: false,
                        value: attrs && attrs.title
                    }),
                    target: new SelectField({
                        label: "Open target",
                        required: false,
                        options: [
                            { value: '', label: 'default' },
                            { value: '_blank', label: '_blank' },
                            { value: '_self', label: '_self' },
                            { value: '_parent', label: '_parent' },
                            { value: '_top', label: '_top' },
                        ]
                    }),
                },
                callback: function callback(attrs) {
                    const schema = view.state.schema;
                    attrs.href = attrs.externalLink ? attrs.externalLink : attrs.pageLink;
                    const node = schema.text(attrs.text, [schema.marks.link.create(attrs)])
                    view.dispatch(view.state.tr.replaceSelectionWith(node, false));
                    view.focus();
                }
            });
        }
    })
}


// :: (Schema) → Object
// Given a schema, look for default mark and node types in it and
// return an object with relevant menu items relating to those marks:
//
// **`toggleStrong`**`: MenuItem`
//   : A menu item to toggle the [strong mark](#schema-basic.StrongMark).
//
// **`toggleEm`**`: MenuItem`
//   : A menu item to toggle the [emphasis mark](#schema-basic.EmMark).
//
// **`toggleCode`**`: MenuItem`
//   : A menu item to toggle the [code font mark](#schema-basic.CodeMark).
//
// **`toggleLink`**`: MenuItem`
//   : A menu item to toggle the [link mark](#schema-basic.LinkMark).
//
// **`insertImage`**`: MenuItem`
//   : A menu item to insert an [image](#schema-basic.Image).
//
// **`wrapBulletList`**`: MenuItem`
//   : A menu item to wrap the selection in a [bullet list](#schema-list.BulletList).
//
// **`wrapOrderedList`**`: MenuItem`
//   : A menu item to wrap the selection in an [ordered list](#schema-list.OrderedList).
//
// **`wrapBlockQuote`**`: MenuItem`
//   : A menu item to wrap the selection in a [block quote](#schema-basic.BlockQuote).
//
// **`makeParagraph`**`: MenuItem`
//   : A menu item to set the current textblock to be a normal
//     [paragraph](#schema-basic.Paragraph).
//
// **`makeCodeBlock`**`: MenuItem`
//   : A menu item to set the current textblock to be a
//     [code block](#schema-basic.CodeBlock).
//
// **`makeHead[N]`**`: MenuItem`
//   : Where _N_ is 1 to 6. Menu items to set the current textblock to
//     be a [heading](#schema-basic.Heading) of level _N_.
//
// **`insertHorizontalRule`**`: MenuItem`
//   : A menu item to insert a horizontal rule.
//
// The return value also contains some prefabricated menu elements and
// menus, that you can use instead of composing your own menu from
// scratch:
//
// **`insertMenu`**`: Dropdown`
//   : A dropdown containing the `insertImage` and
//     `insertHorizontalRule` items.
//
// **`typeMenu`**`: Dropdown`
//   : A dropdown containing the items for making the current
//     textblock a paragraph, code block, or heading.
//
// **`fullMenu`**`: [[MenuElement]]`
//   : An array of arrays of menu elements for use as the full menu
//     for, for example the [menu bar](https://github.com/prosemirror/prosemirror-menu#user-content-menubar).
export function buildMenuItems(schema) {
    var r = {}, type;
    if (type = schema.marks.strong) { r.toggleStrong = markItem(type, { title: "Toggle strong style", icon: prosemirrorMenu.icons.strong }); }
    if (type = schema.marks.em) { r.toggleEm = markItem(type, { title: "Toggle emphasis", icon: prosemirrorMenu.icons.em }); }
    // if (type = schema.marks.code) { r.toggleCode = markItem(type, { title: "Toggle code font", icon: prosemirrorMenu.icons.code }); }

    r.clearMarks = clearMarks();

    if (type = schema.marks.link) {
        r.toggleLink = linkSelector(type);
    }

    if (type = schema.nodes.image) { r.insertImage = imageSelector(type); }
    if (type = schema.nodes.bullet_list) {
        r.wrapBulletList = wrapListItem(type, {
            title: "Wrap in bullet list",
            icon: prosemirrorMenu.icons.bulletList
        });
    }
    if (type = schema.nodes.ordered_list) {
        r.wrapOrderedList = wrapListItem(type, {
            title: "Wrap in ordered list",
            icon: prosemirrorMenu.icons.orderedList
        });
    }
    if (type = schema.nodes.blockquote) {
        r.wrapBlockQuote = prosemirrorMenu.wrapItem(type, {
            title: "Wrap in block quote",
            icon: prosemirrorMenu.icons.blockquote
        });
    }
    if (type = schema.nodes.paragraph) {
        r.makeParagraph = prosemirrorMenu.blockTypeItem(type, {
            title: "Change to paragraph",
            label: "Plain"
        });
    }
    if (type = schema.nodes.code_block) {
        r.makeCodeBlock = prosemirrorMenu.blockTypeItem(type, {
            title: "Change to code block",
            label: "Code"
        });
    }
    if (type = schema.nodes.heading) {
        for (var i = 1; i <= 10; i++) {
            r["makeHead" + i] = prosemirrorMenu.blockTypeItem(type, {
                title: "Change to heading " + i,
                label: "Level " + i,
                attrs: { level: i }
            });
        }
    }
    if (type = schema.nodes.horizontal_rule) {
        var hr = type;
        r.insertHorizontalRule = new prosemirrorMenu.MenuItem({
            title: "Insert horizontal rule",
            label: "Horizontal rule",
            enable: function enable(state) { return canInsert(state, hr) },
            run: function run(state, dispatch) {
                dispatch(state.tr.replaceSelectionWith(hr.create()));
            }
        });
    }

    let tableMenu = [];

    if (type = schema.nodes.table) {
        function item(label, cmd) {
            return new prosemirrorMenu.MenuItem({
                title: label,
                label,
                // select: cmd,
                run: cmd
            });
        }
        tableMenu = [
            item("Insert column before", addColumnBefore),
            item("Insert column after", addColumnAfter),
            item("Delete column", deleteColumn),
            item("Insert row before", addRowBefore),
            item("Insert row after", addRowAfter),
            item("Delete row", deleteRow),
            item("Delete table", deleteTable),
            item("Merge cells", mergeCells),
            item("Split cell", splitCell),
            item("Toggle header column", toggleHeaderColumn),
            item("Toggle header row", toggleHeaderRow),
            item("Toggle header cells", toggleHeaderCell)
        ]

        r.insertTable = item("Table", function (state, _, view) {
            const schema = view.state.schema;
            // attrs.href = attrs.externalLink ? attrs.externalLink : attrs.pageLink;
            const node = htmlToDoc('<table><tr><td></td><td></td></tr></table>')
            view.dispatch(view.state.tr.replaceSelectionWith(node, false));
            view.focus();
        });
    }

    if (type = schema.nodes.inline_shortcode) {
        const showFieldArgs = {
            'field': 'text',
            'id': 'text'
        };
        const listingArgs = {
            'id': 'text',
            'source_id': 'text',
        }

        r.insertInlineShortcode = cmdItem(insertShortcode('show_field', showFieldArgs, schema.nodes.inline_shortcode), {
            title: "Page field",
        });

        r.insertBlockShortcode = cmdItem(insertShortcode('listing', listingArgs, schema.nodes.block_shortcode), {
            title: "Block shortcode",
        });
    }

    r.viewSource = viewSource();

    const shortcodeDropdown = [
        r.insertInlineShortcode,
        r.insertBlockShortcode
    ];

    const insertDropdown = [
        r.insertTable,
        r.insertHorizontalRule,
    ]


    var cut = function (arr) { return arr.filter(function (x) { return x; }); };

    r.tableMenu = new prosemirrorMenu.Dropdown(cut(tableMenu), { label: "Table" });
    r.insertMenu = new prosemirrorMenu.Dropdown(cut(insertDropdown), { label: "Insert" });
    r.shortcodeMenu = new prosemirrorMenu.Dropdown(cut(shortcodeDropdown), { label: "Shortcodes" });

    r.typeMenu = new prosemirrorMenu.Dropdown(cut([r.makeParagraph, r.makeCodeBlock, r.makeHead1 && new prosemirrorMenu.DropdownSubmenu(cut([
        r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6
    ]), { label: "Heading" })]), { label: "Type..." });

    r.inlineMenu = [cut([r.clearMarks, r.toggleStrong, r.toggleEm, r.toggleLink, r.insertImage])];
    r.blockMenu = [cut([r.wrapBulletList, r.wrapOrderedList, r.wrapBlockQuote, prosemirrorMenu.joinUpItem,
    prosemirrorMenu.liftItem, prosemirrorMenu.selectParentNodeItem, r.shortcodeMenu, r.tableMenu, r.viewSource])];

    r.fullMenu = r.inlineMenu.concat(
        [[r.insertMenu, r.typeMenu]],

        [[prosemirrorMenu.undoItem, prosemirrorMenu.redoItem]],
        r.blockMenu
    );

    return r;
}

var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;

// :: (Schema, ?Object) → Object
// Inspect the given schema looking for marks and nodes from the
// basic schema, and if found, add key bindings related to them.
// This will add:
//
// * **Mod-b** for toggling [strong](#schema-basic.StrongMark)
// * **Mod-i** for toggling [emphasis](#schema-basic.EmMark)
// * **Mod-`** for toggling [code font](#schema-basic.CodeMark)
// * **Ctrl-Shift-0** for making the current textblock a paragraph
// * **Ctrl-Shift-1** to **Ctrl-Shift-Digit6** for making the current
//   textblock a heading of the corresponding level
// * **Ctrl-Shift-Backslash** to make the current textblock a code block
// * **Ctrl-Shift-8** to wrap the selection in an ordered list
// * **Ctrl-Shift-9** to wrap the selection in a bullet list
// * **Ctrl->** to wrap the selection in a block quote
// * **Enter** to split a non-empty textblock in a list item while at
//   the same time splitting the list item
// * **Mod-Enter** to insert a hard break
// * **Mod-_** to insert a horizontal rule
// * **Backspace** to undo an input rule
// * **Alt-ArrowUp** to `joinUp`
// * **Alt-ArrowDown** to `joinDown`
// * **Mod-BracketLeft** to `lift`
// * **Escape** to `selectParentNode`
//
// You can suppress or map these bindings by passing a `mapKeys`
// argument, which maps key names (say `"Mod-B"` to either `false`, to
// remove the binding, or a new key name string.
export function buildKeymap(schema, mapKeys) {
    var keys = {}, type;
    function bind(key, cmd) {
        if (mapKeys) {
            var mapped = mapKeys[key];
            if (mapped === false) { return }
            if (mapped) { key = mapped; }
        }
        keys[key] = cmd;
    }


    bind("Mod-z", prosemirrorHistory.undo);
    bind("Shift-Mod-z", prosemirrorHistory.redo);
    bind("Backspace", prosemirrorInputrules.undoInputRule);
    if (!mac) { bind("Mod-y", prosemirrorHistory.redo); }

    bind("Alt-ArrowUp", prosemirrorCommands.joinUp);
    bind("Alt-ArrowDown", prosemirrorCommands.joinDown);
    bind("Mod-BracketLeft", prosemirrorCommands.lift);
    bind("Escape", prosemirrorCommands.selectParentNode);

    if (type = schema.marks.strong) { bind("Mod-b", prosemirrorCommands.toggleMark(type)); }
    if (type = schema.marks.em) { bind("Mod-i", prosemirrorCommands.toggleMark(type)); }
    if (type = schema.marks.code) { bind("Mod-`", prosemirrorCommands.toggleMark(type)); }

    if (type = schema.nodes.bullet_list) { bind("Shift-Ctrl-8", prosemirrorSchemaList.wrapInList(type)); }
    if (type = schema.nodes.ordered_list) { bind("Shift-Ctrl-9", prosemirrorSchemaList.wrapInList(type)); }
    if (type = schema.nodes.blockquote) { bind("Ctrl->", prosemirrorCommands.wrapIn(type)); }
    if (type = schema.nodes.hard_break) {
        var br = type, cmd = prosemirrorCommands.chainCommands(prosemirrorCommands.exitCode, function (state, dispatch) {
            dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
            return true
        });
        bind("Mod-Enter", cmd);
        bind("Shift-Enter", cmd);
        if (mac) { bind("Ctrl-Enter", cmd); }
    }
    if (type = schema.nodes.list_item) {
        bind("Enter", prosemirrorSchemaList.splitListItem(type));
        bind("Mod-[", prosemirrorSchemaList.liftListItem(type));
        bind("Mod-]", prosemirrorSchemaList.sinkListItem(type));
    }
    if (type = schema.nodes.paragraph) { bind("Shift-Ctrl-0", prosemirrorCommands.setBlockType(type)); }
    if (type = schema.nodes.code_block) { bind("Shift-Ctrl-\\", prosemirrorCommands.setBlockType(type)); }
    if (type = schema.nodes.heading) { for (var i = 1; i <= 6; i++) { bind("Shift-Ctrl-" + i, prosemirrorCommands.setBlockType(type, { level: i })); } }
    if (type = schema.nodes.horizontal_rule) {
        var hr = type;
        bind("Mod-_", function (state, dispatch) {
            dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView());
            return true
        });
    }

    return keys
}

// : (NodeType) → InputRule
// Given a blockquote node type, returns an input rule that turns `"> "`
// at the start of a textblock into a blockquote.
function blockQuoteRule(nodeType) {
    return prosemirrorInputrules.wrappingInputRule(/^\s*>\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a number
// followed by a dot at the start of a textblock into an ordered list.
function orderedListRule(nodeType) {
    return prosemirrorInputrules.wrappingInputRule(/^(\d+)\.\s$/, nodeType, function (match) { return ({ order: +match[1] }); },
        function (match, node) { return node.childCount + node.attrs.order == +match[1]; })
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a bullet
// (dash, plush, or asterisk) at the start of a textblock into a
// bullet list.
function bulletListRule(nodeType) {
    return prosemirrorInputrules.wrappingInputRule(/^\s*([-+*])\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
function codeBlockRule(nodeType) {
    return prosemirrorInputrules.textblockTypeInputRule(/^```$/, nodeType)
}

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
function headingRule(nodeType, maxLevel) {
    return prosemirrorInputrules.textblockTypeInputRule(new RegExp("^(#{1," + maxLevel + "})\\s$"),
        nodeType, function (match) { return ({ level: match[1].length }); })
}

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export function buildInputRules(schema) {
    var rules = [prosemirrorInputrules.ellipsis, prosemirrorInputrules.emDash], type; // prosemirrorInputrules.smartQuotes.concat(prosemirrorInputrules.ellipsis, prosemirrorInputrules.emDash), type;
    if (type = schema.nodes.blockquote) { rules.push(blockQuoteRule(type)); }
    if (type = schema.nodes.ordered_list) { rules.push(orderedListRule(type)); }
    if (type = schema.nodes.bullet_list) { rules.push(bulletListRule(type)); }
    if (type = schema.nodes.code_block) { rules.push(codeBlockRule(type)); }
    if (type = schema.nodes.heading) { rules.push(headingRule(type, 6)); }

    if (type = schema.marks.code) {
        rules.push(markWrappingInputRule(/`([^`\\]+)` /, type));
    }
    if (type = schema.marks.strike) {
        rules.push(markWrappingInputRule(/~([^~\\]+)~ /, type));
    }
    if (type = schema.marks.em) {
        rules.push(markWrappingInputRule(/_([^_\\]+)_ /, type));
    }
    if (type = schema.marks.strong) {
        rules.push(markWrappingInputRule(/\*\*([^\*\\]+)\*\* /, type));
    }
    return prosemirrorInputrules.inputRules({ rules: rules })
}

// !! This module exports helper functions for deriving a set of basic
// menu items, input rules, or key bindings from a schema. These
// values need to know about the schema for two reasons—they need
// access to specific instances of node and mark types, and they need
// to know which of the node and mark types that they know about are
// actually present in the schema.
//
// The `exampleSetup` plugin ties these together into a plugin that
// will automatically enable this basic functionality in an editor.

// :: (Object) → [Plugin]
// A convenience plugin that bundles together a simple menu with basic
// key bindings, input rules, and styling for the example schema.
// Probably only useful for quickly setting up a passable
// editor—you'll need more control over your settings in most
// real-world situations.
//
//   options::- The following options are recognized:
//
//     schema:: Schema
//     The schema to generate key bindings and menu items for.
//
//     mapKeys:: ?Object
//     Can be used to [adjust](#example-setup.buildKeymap) the key bindings created.
//
//     menuBar:: ?bool
//     Set to false to disable the menu bar.
//
//     history:: ?bool
//     Set to false to disable the history plugin.
//
//     floatingMenu:: ?bool
//     Set to false to make the menu bar non-floating.
//
//     menuContent:: [[MenuItem]]
//     Can be used to override the menu content.
function setupPlugins(options) {
    var plugins = [
        buildInputRules(options.schema),
        prosemirrorKeymap.keymap(buildKeymap(options.schema, options.mapKeys)),
        prosemirrorKeymap.keymap(prosemirrorCommands.baseKeymap),
        prosemirrorDropcursor.dropCursor(),
        prosemirrorGapcursor.gapCursor(),
        imagePaste,
        columnResizing(),
        tableEditing(),
        prosemirrorKeymap.keymap(
            {
                "Tab": goToNextCell(1),
                "Shift-Tab": goToNextCell(-1)
            }
        )
    ];
    if (options.menuBar !== false) {
        plugins.push(prosemirrorMenu.menuBar({
            floating: options.floatingMenu !== false,
            content: buildMenuItems(options.schema).fullMenu
        }));
    }
    if (options.history !== false) { plugins.push(prosemirrorHistory.history()); }

    return plugins.concat(new prosemirrorState.Plugin({
        props: {
            attributes: { class: "ProseMirror-example-setup-style" }
        }
    }))
}

export function setupEditor(editorNode, valueNode, storageNode) {
    let editorView = new EditorView(editorNode, {
        state: EditorState.create({
            doc: domToDoc(valueNode),
            plugins: setupPlugins({
                schema: schema,
                menuBar: true,
                history: true
            })
        }),
        nodeViews: {
            inline_shortcode: function (node, view, getPos) {
                return new ShortcodeNodeView(node, view, getPos)
            },
            block_shortcode: function (node, view, getPos) {
                return new ShortcodeNodeView(node, view, getPos)
            }
        },
        dispatchTransaction: function (tr) {
            // console.log(this);
            // console.log(tr);
            this.updateState(this.state.apply(tr));
            const newValue = docToHtml(this.state.doc);
            if (newValue != storageNode.value) {
                storageNode.value = newValue;
                var event = document.createEvent('Event');
                event.initEvent('change', true, true); //can bubble, and is cancellable
                storageNode.dispatchEvent(event);
            }
        }
    });
    return editorView;
}
//# sourceMappingURL=index.js.map
