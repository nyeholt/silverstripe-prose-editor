import { MenuItem } from "prosemirror-menu";
import { toggleMark } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";

export function markActive(state, type) {
    var ref = state.selection;
    var from = ref.from;
    var $from = ref.$from;
    var to = ref.to;
    var empty = ref.empty;
    if (empty) { return type.isInSet(state.storedMarks || $from.marks()) }
    else { return state.doc.rangeHasMark(from, to, type) }
}


export function cmdItem(cmd, options) {
    var passedOptions = {
        label: options.title,
        run: cmd
    };
    for (var prop in options) { passedOptions[prop] = options[prop]; }
    if ((!options.enable || options.enable === true) && !options.select) { passedOptions[options.enable ? "enable" : "select"] = function (state) { return cmd(state); }; }

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
