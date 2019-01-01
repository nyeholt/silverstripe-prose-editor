import { addListNodes } from "prosemirror-schema-list";
import { Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic"
import { setSchema } from "./proseutil/doc-utils";
import { tableNodes } from 'prosemirror-tables';

let schemaNodes = addListNodes(schema.spec.nodes, "paragraph block*", "block");

let tNodes = tableNodes({
    tableGroup: "block",
    cellContent: "block+",
    cellAttributes: {
        background: {
            default: null,
            getFromDOM(dom) { return dom.style.backgroundColor || null },
            setDOMAttr(value, attrs) { if (value) attrs.style = (attrs.style || "") + `background-color: ${value};` }
        }
    }
});

schemaNodes = schemaNodes.append(tNodes);
schemaNodes = schemaNodes.append({
    image: {
        inline: true,
        attrs: {
            src: {},
            alt: { default: null },
            title: { default: null },
            // support for silverstripe specific attrs
            'data-id': {},
            'data-shortcode': {},
        },
        group: "inline",
        draggable: true,
        parseDOM: [{
            tag: "img[src]", getAttrs: function getAttrs(dom) {
                return {
                    src: dom.getAttribute("src"),
                    title: dom.getAttribute("title"),
                    alt: dom.getAttribute("alt"),
                    'data-id': dom.getAttribute('data-id'),
                    'data-shortcode': dom.getAttribute('data-shortcode')
                }
            }
        }],
        toDOM: function toDOM(node) { return ["img", node.attrs] }
    }
})
// custom link insert thing.
const schemaMarks = schema.spec.marks.append({
    link: {
        attrs: {
            href: {},
            title: { default: null },
            target: { default: '_self' },
        },
        inclusive: false,
        parseDOM: [{
            tag: "a[href]", getAttrs(dom) {
                return {
                    href: dom.getAttribute("href"),
                    title: dom.getAttribute("title"),
                    target: dom.getAttribute("target")
                }
            }
        }],
        toDOM(node) { return ["a", node.attrs] }
    }
});
// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
    nodes: schemaNodes,
    marks: schemaMarks
});

setSchema(mySchema);

export default mySchema;
