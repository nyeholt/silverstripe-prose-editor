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
