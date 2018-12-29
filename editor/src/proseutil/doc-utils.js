import { DOMSerializer, DOMParser } from "prosemirror-model";

let serializer = null;
let schema = null;

const container = document.createElement('div');

export function setSchema(v) {
    schema = v;
    serializer = DOMSerializer.fromSchema(schema)
}

export function domToDoc(domNode) {
    return DOMParser.fromSchema(schema).parse(domNode);
}

export function htmlToDoc(html) {
    container.innerHTML = html;
    const doc = DOMParser.fromSchema(schema).parse(container);
    container.innerHTML = '';
    return doc;
}

export function docToHtml(doc) {
    container.appendChild(serializer.serializeFragment(doc.content))

    const html = container.innerHTML
    container.innerHTML = '';
    return html;
}

