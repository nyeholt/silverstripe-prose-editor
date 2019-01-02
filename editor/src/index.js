
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { setup } from "./setup"
import { docToHtml, domToDoc } from "./proseutil/doc-utils";

import schema from './schema';

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
                doc: domToDoc(editorValue),
                plugins: setup({
                    schema: schema,
                    menuBar: true,
                    history: true
                })
            }),
            dispatchTransaction: function (tr) {
                // console.log(this);
                // console.log(tr);
                this.updateState(this.state.apply(tr));
                const newValue = docToHtml(this.state.doc);
                if (newValue != editorStore.value) {
                    editorStore.value = newValue;
                    var event = document.createEvent('Event');
                    event.initEvent('change', true, true); //can bubble, and is cancellable
                    editorStore.dispatchEvent(event);
                }
            }
        });

        return editorView;
    }(node);

    editors.push(editor);
}


