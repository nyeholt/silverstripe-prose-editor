import { Plugin } from "prosemirror-state";
import { canInsert, findEditorFieldNode } from "../proseutil/editor-utils";

const INLINE_CONTAINER_ELEM = 'span';
const BLOCK_CONTAINER_ELEM = 'div';

export const InlineShortcodeNodeSpec = {
    attrs: {
        shortcode: {
            default: {
                type: 'inline_placeholder',
                args: {}
            }
        }
    },
    inline: true,
    group: "inline",
    draggable: true,

    defining: true,

    // so people can't select the inner content separately
    atom: true,

    nodeContainer: INLINE_CONTAINER_ELEM,

    toDOM: node => [
        INLINE_CONTAINER_ELEM,
        {
            "data-shortcode": JSON.stringify(node.attrs.shortcode),
            "style": "display: inline-block",
            class: "prose-shortcode"
        },
        nodeToShortcode(node)
    ],
    // When parsing, such an image, if its type matches one of the known
    // types, is converted to a dino node.
    parseDOM: [{
        tag: INLINE_CONTAINER_ELEM + "[class=prose-shortcode]",
        getAttrs: dom => {
            let shortcode = dom.getAttribute("data-shortcode");
            if (shortcode) {
                let shortcodeData = JSON.parse(shortcode);
                return shortcodeData;
            }
            return InlineShortcodeNodeSpec.attrs.shortcode.default;
        }
    }]
}

/**
 * Block shortcodes have content that appears outside <p> tags.
 */

const blockParse = [
    Object.assign({}, InlineShortcodeNodeSpec.parseDOM[0], {
        tag: BLOCK_CONTAINER_ELEM
    })
];

export const BlockShortcodeNodeSpec = Object.assign({}, InlineShortcodeNodeSpec, {
    attrs: {
        shortcode: {
            default: {
                type: 'block_placeholder',
                args: {}
            }
        }
    },
    nodeContainer: BLOCK_CONTAINER_ELEM,
    inline: false,
    group: "block",
    parseDOM: blockParse,
    toDOM: node => [
        BLOCK_CONTAINER_ELEM,
        {
            "data-shortcode": JSON.stringify(node.attrs.shortcode),
            "style": "display: inline-block",
            class: "prose-shortcode"
        },
        nodeToShortcode(node)
    ]
})


function nodeToShortcode(node) {
    let attrStr = "";
    if (!node.attrs.shortcode) {
        return "";
    }
    if (node.attrs.shortcode.args) {
        const keys = Object.keys(node.attrs.shortcode.args);
        if (keys.length > 0) {
            const attrs = keys.map(function (item) {
                return item + "=" + node.attrs.shortcode.args[key];
            });
            attrStr = "," + attrs.join(',');
        }
    }
    return "[" + node.attrs.shortcode.type + attrStr + "]";
}

export const ShortcodeViewer = new Plugin({

});


export class ShortcodeNodeView {
    constructor(node, view, getPos) {
        // We'll need these later
        this.node = node
        this.outerView = view
        this.getPos = getPos

        // The node's representation in the editor
        this.dom = document.createElement(node.type.spec.nodeContainer);
        this.dom.className = 'prose-shortcode';

        let _dom = this.dom;

        const editorParent = findEditorFieldNode(view.dom);
        if (editorParent && this.node.attrs.shortcode) {
            const shortcodeUrl = editorParent.getAttribute('data-prose-url') + '/rendershortcode';

            const w = wretch();
            w.url(shortcodeUrl).query({
                shortcode: this.node.attrs.shortcode.type,
                args: this.node.attrs.shortcode.args
            }).get().text(function (res) {
                _dom.innerHTML = res;
            });
        }

        this.dom.innerHTML = 'Loading...';

        // These are used when the footnote is selected
        this.innerView = null
    }

    selectNode() {
        this.dom.classList.add("ProseMirror-selectednode")
    }

    deselectNode() {
        this.dom.classList.remove("ProseMirror-selectednode")
    }

    destroy() {
    }

    ignoreMutation() {
        return true
    }
}

/**
 * Command for inserting
 */
export function insertShortcode(shortcode, shortcodeNodeType) {
    if (!shortcode) {
        shortcode = 'inline_placeholder';
    }

    return function (state, dispatch) {
        if (canInsert(state, shortcodeNodeType)) {
            if (dispatch) {
                const newNode = shortcodeNodeType.create({
                    shortcode: {
                        type: shortcode
                    }
                });
                console.log(newNode);
                dispatch(state.tr.replaceSelectionWith(newNode));
            }
            return true;
        }

        return false;
    }
}
