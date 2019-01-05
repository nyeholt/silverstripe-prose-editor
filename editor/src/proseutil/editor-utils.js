import { MenuItem } from "prosemirror-menu";
import { toggleMark } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { InputRule } from "prosemirror-inputrules";
import { Selection, TextSelection } from "prosemirror-state";

export function markActive(state, type) {
    var ref = state.selection;
    var from = ref.from;
    var $from = ref.$from;
    var to = ref.to;
    var empty = ref.empty;
    if (empty) { return type.isInSet(state.storedMarks || $from.marks()) }
    else { return state.doc.rangeHasMark(from, to, type) }
}


export function canInsert(state, nodeType) {
    var $from = state.selection.$from;
    for (var d = $from.depth; d >= 0; d--) {
        var index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) { return true }
    }
    return false
}

export function cmdItem(cmd, options) {
    var passedOptions = {
        label: options.title,
        run: cmd
    };
    for (var prop in options) {
        passedOptions[prop] = options[prop];
    }
    if ((!options.enable || options.enable === true) && !options.select) {
        passedOptions[options.enable ? "enable" : "select"] = function (state) {
            return cmd(state);
        };
    }

    return new MenuItem(passedOptions)
}

export function markItem(markType, options) {
    var passedOptions = {
        active: function active(state) { return markActive(state, markType) },
        enable: true
    };
    for (var prop in options) { passedOptions[prop] = options[prop]; }
    return cmdItem(toggleMark(markType), passedOptions)
}


export function wrapListItem(nodeType, options) {
    return cmdItem(wrapInList(nodeType, options.attrs), options)
}

export function markWrappingInputRule(regexp, markType, getAttrs) {
    return new InputRule(regexp, function (state, match, start, end) {
        var attrs = getAttrs instanceof Function ? getAttrs(match) : null;
        var tr = state.tr;

        tr = tr.setSelection(TextSelection.create(tr.doc, start, end));
        var replacementText = match.length > 1 ? match[1] : match[0];
        tr = tr.insertText(replacementText + ' ');

        tr = tr.addMark(start, start + replacementText.length, markType.create(attrs));

        const $pos = tr.doc.resolve(start + replacementText.length + 1);
        if ($pos) {
            tr = tr.setSelection(Selection.near($pos));
        }
        // tr = tr.replaceSel
        return tr;
    })
}

/**
 * Adapted from https://discuss.prosemirror.net/t/expanding-the-selection-to-the-active-mark/478/6
 *
 * @param {*} doc
 * @param {*} pos
 */
export function positionAroundMark(doc, pos, markType) {
    let $pos = doc.resolve(pos);

    let start = $pos.parent.childAfter($pos.parentOffset);
    if (!start.node) {
        return;
    }

    let link = start.node.marks.find((mark) => mark.type === markType);
    if (!link) {
        return;
    }

    let startIndex = $pos.index();
    let startPos = $pos.start() + start.offset;
    while (startIndex > 0 && link.isInSet($pos.parent.child(startIndex - 1).marks)) {
        startIndex -= 1;
        startPos -= $pos.parent.child(startIndex).nodeSize;
    }

    // let endIndex = $pos.indexAfter();
    let endPos = startPos + start.node.nodeSize;

    return { from: startPos, to: endPos };
}

/**
 * Finds the editor DOM field wrapping around the given HTML Element
 * @param {HTMLElement} node
 */
export function findEditorFieldNode(node) {
    if (!node) {
        return;
    }
    if (node.getAttribute('data-prose-url')) {
        return node;
    }
    return findEditorFieldNode(node.parentElement);
}

