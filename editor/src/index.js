
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser, DOMSerializer } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"
import { docToHtml } from "./proseutil/doc-to-html";


// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks
});

const serializer = DOMSerializer.fromSchema(mySchema);

const editors = [];

const editorNodes = document.querySelectorAll('div.ProseEditorField');

for (let i = 0; i < editorNodes.length; i++) {
    let node = editorNodes[i];

    let editor = function (node) {
        const editorNode = node.getElementsByClassName('ProseEditorFieldEditor')[0];
        const editorValue = node.getElementsByClassName('ProseEditorFieldValue')[0];
        let editorStore = node.getElementsByClassName('ProseEditorFieldStorage')[0];

        let editorView = new EditorView(editorNode, {
            state: EditorState.create({
                doc: DOMParser.fromSchema(mySchema).parse(editorValue),
                plugins: exampleSetup({
                    schema: mySchema,
                    menuBar: true,
                    history: true
                })
            }),
            dispatchTransaction: function (tr) {
                // console.log(this);
                // console.log(tr);
                this.updateState(this.state.apply(tr));
                editorStore.value = docToHtml(serializer, this.state.doc);
            }
        });

        return editorView;
    }(node);

    editors.push(editor);
}


