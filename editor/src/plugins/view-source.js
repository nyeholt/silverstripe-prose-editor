import { openPrompt } from '../proseutil/prose-prompt';
import { docToHtml, htmlToDoc } from '../proseutil/doc-utils';

import { AllSelection } from 'prosemirror-state';
import { TextareaField } from '../fields/TextareaField';

var prosemirrorMenu = require('prosemirror-menu');

// var prosemirrorState = require('prosemirror-state');

function viewSource() {
    return new prosemirrorMenu.MenuItem({
        title: "View source",
        label: "Source",
        icon: prosemirrorMenu.icons.code,
        enable: function enable(state) { return state.selection.empty },
        run: function run(state, _, view) {
            // var ref = state.selection;

            openPrompt({
                title: "View Source",
                fields: {
                    content: new TextareaField({ label: "Content", value: docToHtml(state.doc) })
                },
                callback: function callback(attrs) {
                    let newDoc = htmlToDoc(attrs.content);

                    view.dispatch(state.tr.setSelection(new AllSelection(state.doc)));
                    view.dispatch(view.state.tr.replaceSelectionWith(newDoc));
                    view.focus();
                }
            });
        }
    })
}


export default viewSource;
