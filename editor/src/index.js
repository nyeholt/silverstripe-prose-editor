
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"


// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks
});

const editors = [];

const editorNodes = document.querySelectorAll('div.ProseEditorField');

for (let i = 0; i < editorNodes.length; i++) {
    let node = editorNodes[i];

    let editor = new EditorView(node.getElementsByClassName('ProseEditorFieldEditor')[0], {
        state: EditorState.create({
            doc: DOMParser.fromSchema(mySchema).parse(node.getElementsByClassName('ProseEditorFieldValue')[0]),
            plugins: exampleSetup({
                schema: mySchema,
                menuBar: true,
                history: true
            })
        })
    });

    editors.push(editor);
}


