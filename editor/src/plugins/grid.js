import { canInsert } from "../proseutil/editor-utils";
// import { openPrompt } from "../proseutil/prose-prompt";

const PROSE_ROW_CLASS = 'row';

const SETTINGS_ICON = {
    width: 20, height: 20,
    path: "M17.279,8.257h-0.785c-0.107-0.322-0.237-0.635-0.391-0.938l0.555-0.556c0.208-0.208,0.208-0.544,0-0.751l-2.254-2.257c-0.199-0.2-0.552-0.2-0.752,0l-0.556,0.557c-0.304-0.153-0.617-0.284-0.939-0.392V3.135c0-0.294-0.236-0.532-0.531-0.532H8.435c-0.293,0-0.531,0.237-0.531,0.532v0.784C7.582,4.027,7.269,4.158,6.966,4.311L6.409,3.754c-0.1-0.1-0.234-0.155-0.376-0.155c-0.141,0-0.275,0.055-0.375,0.155L3.403,6.011c-0.208,0.207-0.208,0.543,0,0.751l0.556,0.556C3.804,7.622,3.673,7.935,3.567,8.257H2.782c-0.294,0-0.531,0.238-0.531,0.531v3.19c0,0.295,0.237,0.531,0.531,0.531h0.787c0.105,0.318,0.236,0.631,0.391,0.938l-0.556,0.559c-0.208,0.207-0.208,0.545,0,0.752l2.254,2.254c0.208,0.207,0.544,0.207,0.751,0l0.558-0.559c0.303,0.154,0.616,0.285,0.938,0.391v0.787c0,0.293,0.238,0.531,0.531,0.531h3.191c0.295,0,0.531-0.238,0.531-0.531v-0.787c0.322-0.105,0.636-0.236,0.938-0.391l0.56,0.559c0.208,0.205,0.546,0.207,0.752,0l2.252-2.254c0.208-0.207,0.208-0.545,0.002-0.752l-0.559-0.559c0.153-0.303,0.285-0.615,0.389-0.938h0.789c0.295,0,0.532-0.236,0.532-0.531v-3.19C17.812,8.495,17.574,8.257,17.279,8.257z M16.747,11.447h-0.653c-0.241,0-0.453,0.164-0.514,0.398c-0.129,0.496-0.329,0.977-0.594,1.426c-0.121,0.209-0.089,0.473,0.083,0.645l0.463,0.465l-1.502,1.504l-0.465-0.463c-0.174-0.174-0.438-0.207-0.646-0.082c-0.447,0.262-0.927,0.463-1.427,0.594c-0.234,0.061-0.397,0.271-0.397,0.514V17.1H8.967v-0.652c0-0.242-0.164-0.453-0.397-0.514c-0.5-0.131-0.98-0.332-1.428-0.594c-0.207-0.123-0.472-0.09-0.646,0.082l-0.463,0.463L4.53,14.381l0.461-0.463c0.169-0.172,0.204-0.434,0.083-0.643c-0.266-0.461-0.467-0.939-0.596-1.43c-0.06-0.234-0.272-0.398-0.514-0.398H3.313V9.319h0.652c0.241,0,0.454-0.162,0.514-0.397c0.131-0.498,0.33-0.979,0.595-1.43c0.122-0.208,0.088-0.473-0.083-0.645L4.53,6.386l1.503-1.504l0.46,0.462c0.173,0.172,0.437,0.204,0.646,0.083c0.45-0.265,0.931-0.464,1.433-0.597c0.233-0.062,0.396-0.274,0.396-0.514V3.667h2.128v0.649c0,0.24,0.161,0.452,0.396,0.514c0.502,0.133,0.982,0.333,1.433,0.597c0.211,0.12,0.475,0.089,0.646-0.083l0.459-0.462l1.504,1.504l-0.463,0.463c-0.17,0.171-0.202,0.438-0.081,0.646c0.263,0.448,0.463,0.928,0.594,1.427c0.061,0.235,0.272,0.397,0.514,0.397h0.651V11.447z"
};


export const RowNodeSpec = {
    attrs: {
        row: {
            default: {}
        }
    },
    content: "block*",
    // inline: false,
    group: "block",
    // draggable: true,
    defining: true,

    // // so people can't select the inner content separately
    // atom: false,

    // nodeContainer: 'div',

    toDOM: node => {
        return [
            'div',
            {
                class: PROSE_ROW_CLASS
            },
            [
                "div",
                {
                    class: "col",
                },
            ]
        ]
    },
    // When parsing, such an image, if its type matches one of the known
    // types, is converted to a dino node.
    parseDOM: [{
        tag: "div[class=" + PROSE_ROW_CLASS + "]",
        getAttrs: dom => {
            let config = dom.getAttribute("data-config");
            if (config) {
                let data = JSON.parse(config);
                return { row: data };
            }
            return RowNodeSpec.attrs.row.default;
        }
    }]
}


export const ColNodeSpec = {
    attrs: {
        column: {
            default: {}
        }
    },
    content: "block+",
    // inline: false,
    group: "block",
    // draggable: true,
    defining: true,

    atom: false,

    // nodeContainer: 'div',

    toDOM: node => {
        return [
            'div',
            {
                class: "col"
            },
            0
        ]
    },
    // When parsing, such an image, if its type matches one of the known
    // types, is converted to a dino node.
    parseDOM: [{
        tag: "div[class=col]",
        getAttrs: dom => {
            let config = dom.getAttribute("data-config");
            if (config) {
                let data = JSON.parse(config);
                return { row: data };
            }
            return RowNodeSpec.attrs.column.default;
        }
    }]
}
// export class RowNodeView {
//     constructor(node, view, getPos) {
//         // We'll need these later
//         this.node = node
//         this.outerView = view
//         this.getPos = getPos;

//         // The node's representation in the editor
//         this.dom = document.createElement(node.type.spec.nodeContainer);
//         this.dom.className = PROSE_ROW_CLASS;

//     }

//     selectNode() {
//         this.dom.classList.add("ProseMirror-selectednode");
//     }

//     deselectNode() {
//         this.dom.classList.remove("ProseMirror-selectednode")
//     }

//     destroy() {
//     }
// }

export function insertCol(nodeType) {
    return function (state, dispatch) {
        if (canInsert(state, nodeType)) {
            if (dispatch) {
                const newNode = nodeType.create();
                dispatch(state.tr.replaceSelectionWith(newNode));
            }
            return true;
        }
        return false;
    }
}


/**
 * Command for inserting
 */
export function insertRow(nodeType) {
    return function (state, dispatch) {
        if (canInsert(state, nodeType)) {
            if (dispatch) {
                const newNode = nodeType.create();
                dispatch(state.tr.replaceSelectionWith(newNode));
            }
            return true;
        }

        return false;
    }
}
