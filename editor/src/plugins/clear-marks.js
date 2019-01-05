import { MenuItem } from "prosemirror-menu";
import { markActive } from "../proseutil/editor-utils";


const clearicon = {
    width: 20, height: 20,
    path: "M13.774,9.355h-7.36c-0.305,0-0.552,0.247-0.552,0.551s0.247,0.551,0.552,0.551h7.36 c0.304,0,0.551-0.247,0.551-0.551S14.078,9.355,13.774,9.355z M10.094,0.875c-4.988,0-9.031,4.043-9.031,9.031    s4.043,9.031,9.031,9.031s9.031-4.043,9.031-9.031S15.082,0.875,10.094,0.875z M10.094,17.809c-4.365,0-7.902-3.538-7.902-7.902    c0-4.365,3.538-7.902,7.902-7.902c4.364,0,7.902,3.538,7.902,7.902C17.996,14.271,14.458,17.809,10.094,17.809z"
};

export function clearMarks() {
    return new MenuItem({
        title: "Clear formatting, links",
        icon: clearicon,
        enable: function enable(state) {
            return state.selection != null;
        },
        run: function run(state, dispatch, view) {
            console.log(state);
            dispatch(state.tr.removeMark(state.selection.$from.pos, state.selection.$to.pos));
        }
    })
}
