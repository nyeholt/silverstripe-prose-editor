import { openPrompt } from "../proseutil/prose-prompt";

import { MenuItem, icons } from 'prosemirror-menu';
import { markActive } from "../proseutil/editor-utils";
import { NodeSelection } from "prosemirror-state";
import { toggleMark } from "prosemirror-commands";
import { TextField } from "../fields/TextField";
import { SelectField } from "../fields/SelectField";
import { TreeField } from "../fields/TreeField";


export function linkSelector(markType) {
    return new MenuItem({
        title: "Add or remove link",
        icon: icons.link,
        active: function active(state) { return markActive(state, markType) },
        enable: function enable(state) { return markActive(state, markType) || !state.selection.empty },
        run: function run(state, dispatch, view) {
            let attrs = null;
            console.log(state.selection);
            if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType) {
                attrs = state.selection.node.attrs;
            }

            openPrompt({
                title: "Select link",
                fields: {
                    pageLink: new TreeField({
                        name: "search-page",
                        label: "Select a page",
                        required: false,
                        autocomplete: true,
                        value: attrs && attrs.href
                    }),
                    externalLink: new TextField({
                        label: "or External URL",
                        required: false,
                        value: attrs && attrs.href
                    }),
                    text: new TextField({
                        label: "Text",
                        required: false,
                        value: attrs && attrs.text
                    }),
                    title: new TextField({
                        label: "Description",
                        required: false,
                        value: attrs && attrs.title
                    }),
                    target: new SelectField({
                        label: "Open target",
                        required: false,
                        options: [
                            { value: '', label: 'default' },
                            { value: '_blank', label: '_blank' },
                            { value: '_self', label: '_self' },
                            { value: '_parent', label: '_parent' },
                            { value: '_top', label: '_top' },
                        ]
                    }),
                },
                callback: function callback(attrs) {
                    attrs.href = attrs.externalLink ? attrs.externalLink : attrs.pageLink;

                    toggleMark(markType, attrs)(view.state, view.dispatch);
                    // const schema = view.state.schema;
                    // const node = schema.text(attrs.text, [schema.marks.link.create(attrs)])
                    // view.dispatch(view.state.tr.replaceSelectionWith(node, false));
                    view.focus();
                }
            });

            // openPrompt({
            //     title: "Create a link",
            //     fields: {
            //         href: new TextField({
            //             label: "Link target",
            //             required: true
            //         }),
            //         title: new TextField({ label: "Title" })
            //     },
            //     callback: function callback(attrs) {
            //         prosemirrorCommands.toggleMark(markType, attrs)(view.state, view.dispatch);
            //         view.focus();
            //     }
            // });
        }
    })
}
