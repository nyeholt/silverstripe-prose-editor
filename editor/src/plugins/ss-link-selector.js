import { openPrompt } from "../proseutil/prose-prompt";

import { MenuItem, icons } from 'prosemirror-menu';
import { markActive, positionAroundMark } from "../proseutil/editor-utils";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { TextField } from "../fields/TextField";
import { SelectField } from "../fields/SelectField";
import { TreeField } from "../fields/TreeField";

export function linkSelector(markType) {
    return new MenuItem({
        title: "Add link",
        icon: icons.link,
        active: function active(state) { return markActive(state, markType) },
        enable: function enable(state) { return markActive(state, markType) || !state.selection.empty },
        run: function run(state, dispatch, view) {
            let attrs = null;
            let node = null;

            // if we've got a link already active, we need to select it
            if (markActive(state, markType)) {
                // position of the cursor or selection start; we don't use
                // selection.$cursor, because a range selection will have $cursor
                // as null
                let pos = state.selection.$anchor.pos;

                let markPos = positionAroundMark(state.doc, pos, markType);

                // and the node at that point
                node = state.doc.nodeAt(pos);

                // figure out the position of the wrapping text element as applicable
                let textPos = state.doc.resolve(pos);

                let selection = null;
                if (node.isText) {
                    selection = TextSelection.create(state.doc, markPos.from, markPos.to);
                } else {
                    selection = NodeSelection.create(state.doc, textPos.start());
                }
                dispatch(state.tr.setSelection(selection));

                if (node && node.marks && node.marks.length > 0) {
                    node.marks.forEach((mark) => {
                        if (mark.type == markType) {
                            attrs = mark.attrs;
                        }
                    });
                }
            }


            let externalLink = '';
            let itemId = '';
            let itemText = node ? node.text : '';
            let itemType = 'page';

            if (attrs && attrs.href) {
                let parts = null;
                if (parts = attrs.href.match(/sitetree_link,id=(\d+)/)) {
                    itemId = parts[1];
                    itemType = 'page';
                } else if (parts = attrs.href.match(/file_link,id=(\d+)/)) {
                    itemId = parts[1];
                    itemType = 'file';
                } else {
                    externalLink = attrs.href;
                }
                if (itemId) {
                    itemText = itemText + ' - ' + itemType + ' #' + itemId + '';
                }
            }


            openPrompt({
                title: "Select link",
                fields: {
                    pageLink: new TreeField({
                        name: "search-page",
                        label: "Select a page",
                        required: false,
                        text: itemText,
                        type: itemType,
                        value: itemId
                    }),
                    externalLink: new TextField({
                        label: "or External URL",
                        required: false,
                        value: externalLink
                    }),
                    title: new TextField({
                        label: "Description",
                        required: false,
                        value: attrs && attrs.title
                    }),
                    target: new SelectField({
                        label: "Open target",
                        required: false,
                        value: attrs && attrs.target,
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
                    attrs.href = attrs.externalLink;
                    if (attrs.href.length === 0) {
                        const pageData = attrs.pageLink;
                        if (pageData && pageData.id) {
                            attrs.href = '[' + pageData.shortcode +',id=' + pageData.id + ']';
                        }
                    }

                    const from = view.state.selection.$anchor.pos;
                    const to = view.state.selection.$head.pos;

                    view.dispatch(view.state.tr.addMark(from, to, markType.create(attrs)));

                    // toggleMark(markType, attrs)(view.state, view.dispatch);
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
