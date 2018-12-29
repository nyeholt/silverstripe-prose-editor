'use strict';

import { openPrompt, TextField } from './proseutil/prose-prompt';
import viewSource from './plugins/view-source';

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

function canInsert(state, nodeType) {
    var $from = state.selection.$from;
    for (var d = $from.depth; d >= 0; d--) {
        var index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) { return true }
    }
    return false
}

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

function insertImageItem(nodeType) {
    return new prosemirrorMenu.MenuItem({
        title: "Insert image",
        label: "Image",
        enable: function enable(state) { return canInsert(state, nodeType) },
        run: function run(state, _, view) {
            var ref = state.selection;
            var from = ref.from;
            var to = ref.to;
            var attrs = null;
            if (state.selection instanceof prosemirrorState.NodeSelection && state.selection.node.type == nodeType) { attrs = state.selection.node.attrs; }
            openPrompt({
                title: "Insert image",
                fields: {
                    src: new TextField({ label: "Location", required: true, value: attrs && attrs.src }),
                    title: new TextField({ label: "Title", value: attrs && attrs.title }),
                    alt: new TextField({
                        label: "Description",
                        value: attrs ? attrs.alt : state.doc.textBetween(from, to, " ")
                    })
                },
                callback: function callback(attrs) {
                    view.dispatch(view.state.tr.replaceSelectionWith(nodeType.createAndFill(attrs)));
                    view.focus();
                }
            });
        }
    })
}

function cmdItem(cmd, options) {
    var passedOptions = {
        label: options.title,
        run: cmd
    };
    for (var prop in options) { passedOptions[prop] = options[prop]; }
    if ((!options.enable || options.enable === true) && !options.select) { passedOptions[options.enable ? "enable" : "select"] = function (state) { return cmd(state); }; }

    return new prosemirrorMenu.MenuItem(passedOptions)
}

function markActive(state, type) {
    var ref = state.selection;
    var from = ref.from;
    var $from = ref.$from;
    var to = ref.to;
    var empty = ref.empty;
    if (empty) { return type.isInSet(state.storedMarks || $from.marks()) }
    else { return state.doc.rangeHasMark(from, to, type) }
}

function markItem(markType, options) {
    var passedOptions = {
        active: function active(state) { return markActive(state, markType) },
        enable: true
    };
    for (var prop in options) { passedOptions[prop] = options[prop]; }
    return cmdItem(prosemirrorCommands.toggleMark(markType), passedOptions)
}

function linkItem(markType) {
    return new prosemirrorMenu.MenuItem({
        title: "Add or remove link",
        icon: prosemirrorMenu.icons.link,
        active: function active(state) { return markActive(state, markType) },
        enable: function enable(state) { return !state.selection.empty },
        run: function run(state, dispatch, view) {
            if (markActive(state, markType)) {
                prosemirrorCommands.toggleMark(markType)(state, dispatch);
                return true
            }
            openPrompt({
                title: "Create a link",
                fields: {
                    href: new TextField({
                        label: "Link target",
                        required: true
                    }),
                    title: new TextField({ label: "Title" })
                },
                callback: function callback(attrs) {
                    prosemirrorCommands.toggleMark(markType, attrs)(view.state, view.dispatch);
                    view.focus();
                }
            });
        }
    })
}

function wrapListItem(nodeType, options) {
    return cmdItem(prosemirrorSchemaList.wrapInList(nodeType, options.attrs), options)
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
    if (type = schema.marks.link) {
        r.toggleLink = linkItem(type);
        r.insertLink = insertLink(type);
    }

    if (type = schema.nodes.image) { r.insertImage = insertImageItem(type); }
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

    r.viewSource = viewSource();

    const insertDropdown = [
        r.insertLink,
        r.insertImage,
        r.insertHorizontalRule
    ]

    var cut = function (arr) { return arr.filter(function (x) { return x; }); };
    r.insertMenu = new prosemirrorMenu.Dropdown(cut(insertDropdown), { label: "Insert" });
    r.typeMenu = new prosemirrorMenu.Dropdown(cut([r.makeParagraph, r.makeCodeBlock, r.makeHead1 && new prosemirrorMenu.DropdownSubmenu(cut([
        r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6
    ]), { label: "Heading" })]), { label: "Type..." });

    r.inlineMenu = [cut([r.toggleStrong, r.toggleEm, r.toggleLink])];
    r.blockMenu = [cut([r.wrapBulletList, r.wrapOrderedList, r.wrapBlockQuote, prosemirrorMenu.joinUpItem,
    prosemirrorMenu.liftItem, prosemirrorMenu.selectParentNodeItem, r.viewSource])];
    r.fullMenu = r.inlineMenu.concat([[r.insertMenu, r.typeMenu]], [[prosemirrorMenu.undoItem, prosemirrorMenu.redoItem]], r.blockMenu);

    return r
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
    var rules = prosemirrorInputrules.smartQuotes.concat(prosemirrorInputrules.ellipsis, prosemirrorInputrules.emDash), type;
    if (type = schema.nodes.blockquote) { rules.push(blockQuoteRule(type)); }
    if (type = schema.nodes.ordered_list) { rules.push(orderedListRule(type)); }
    if (type = schema.nodes.bullet_list) { rules.push(bulletListRule(type)); }
    if (type = schema.nodes.code_block) { rules.push(codeBlockRule(type)); }
    if (type = schema.nodes.heading) { rules.push(headingRule(type, 6)); }
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
export function setup(options) {
    var plugins = [
        buildInputRules(options.schema),
        prosemirrorKeymap.keymap(buildKeymap(options.schema, options.mapKeys)),
        prosemirrorKeymap.keymap(prosemirrorCommands.baseKeymap),
        prosemirrorDropcursor.dropCursor(),
        prosemirrorGapcursor.gapCursor()
    ];
    if (options.menuBar !== false) {
        plugins.push(prosemirrorMenu.menuBar({
            floating: options.floatingMenu !== false,
            content: options.menuContent || buildMenuItems(options.schema).fullMenu
        }));
    }
    if (options.history !== false) { plugins.push(prosemirrorHistory.history()); }

    return plugins.concat(new prosemirrorState.Plugin({
        props: {
            attributes: { class: "ProseMirror-example-setup-style" }
        }
    }))
}

//# sourceMappingURL=index.js.map
