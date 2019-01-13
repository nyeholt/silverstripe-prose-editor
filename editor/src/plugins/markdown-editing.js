import { openPrompt } from '../proseutil/prose-prompt';
import { docToHtml, htmlToDoc } from '../proseutil/doc-utils';

import {defaultMarkdownParser,
    defaultMarkdownSerializer} from "prosemirror-markdown"

import { AllSelection } from 'prosemirror-state';
import { TextareaField } from '../fields/TextareaField';
import { MenuItem } from 'prosemirror-menu';

const icon = {
    width: 208, height: 128,
    path: "M30 98v-68h20l20 25 20-25h20v68h-20v-39l-20 25-20-25v39zM155 98l-30-33h20v-35h20v35h20z"
};

function editMarkdown() {
    return new MenuItem({
        title: "Edit markdown",
        label: "Markdown",
        icon: icon,
        enable: function enable(state) { return state.selection.empty },
        run: function run(state, _, view) {
            // var ref = state.selection;

            const markdown = defaultMarkdownSerializer.serialize(view.state.doc);

            openPrompt({
                title: "Markdown",
                fields: {
                    content: new TextareaField({ label: "Content", value: markdown })
                },
                callback: function callback(attrs) {

                    let newDoc = defaultMarkdownParser.parse(attrs.content);

                    // we convert the doc to a known-good HTML format before reparsing
                    // otherwise the current editor can't read the markdown text
                    newDoc = htmlToDoc(docToHtml(newDoc));

                    view.dispatch(state.tr.setSelection(new AllSelection(state.doc)));
                    view.dispatch(view.state.tr.replaceSelectionWith(newDoc));
                    view.focus();
                }
            });
        }
    })
}


export default editMarkdown;
