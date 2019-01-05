
import { setupEditor } from "./setup"

const editors = [];

const editorNodes = document.querySelectorAll('div.ProseEditorField');

for (let i = 0; i < editorNodes.length; i++) {
    let node = editorNodes[i];

    let editor = function (node) {
        const editorNode = node.getElementsByClassName('ProseEditorFieldEditor')[0];
        const editorValue = node.getElementsByClassName('ProseEditorFieldValue')[0];
        let editorStore = node.getElementsByClassName('ProseEditorFieldStorage')[0];

        return setupEditor(editorNode, editorValue, editorStore);
    }(node);

    editors.push(editor);
}


