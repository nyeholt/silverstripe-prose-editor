import { openPrompt } from "../proseutil/prose-prompt";

import { MenuItem } from 'prosemirror-menu';
import { canInsert } from "../proseutil/editor-utils";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { TextField } from "../fields/TextField";
import { ItemFilterField } from "../fields/ItemFilterField";
import { FieldGroup } from "../fields/FieldGroup";

import './ImageSelector.scss';
import { FileUploadField } from "../fields/FileUploadField";

const imageIcon = {
    width: 20, height: 20,
    path: "M18.555,15.354V4.592c0-0.248-0.202-0.451-0.45-0.451H1.888c-0.248,0-0.451,0.203-0.451,0.451v10.808c0,0.559,0.751,0.451,0.451,0.451h16.217h0.005C18.793,15.851,18.478,14.814,18.555,15.354 M2.8,14.949l4.944-6.464l4.144,5.419c0.003,0.003,0.003,0.003,0.003,0.005l0.797,1.04H2.8z M13.822,14.949l-1.006-1.317l1.689-2.218l2.688,3.535H13.822z M17.654,14.064l-2.791-3.666c-0.181-0.237-0.535-0.237-0.716,0l-1.899,2.493l-4.146-5.42c-0.18-0.237-0.536-0.237-0.716,0l-5.047,6.598V5.042h15.316V14.064z M12.474,6.393c-0.869,0-1.577,0.707-1.577,1.576s0.708,1.576,1.577,1.576s1.577-0.707,1.577-1.576S13.343,6.393,12.474,6.393 M12.474,8.645c-0.371,0-0.676-0.304-0.676-0.676s0.305-0.676,0.676-0.676c0.372,0,0.676,0.304,0.676,0.676S12.846,8.645,12.474,8.645"
};

export function imageSelector(nodeType) {
    return new MenuItem({
        title: "Add image",
        icon: imageIcon,
        enable: function enable(state) { return canInsert(state, nodeType) },
        run: function run(state, dispatch, view) {
            let attrs = null;
            let node = null;

            let from = state.selection.from;
            let to = state.selection.to;

            if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType) {
                node = state.selection.node;
                attrs = node.attrs;

                attrs.alt = attrs.alt || state.doc.textBetween(from, to, " ");
            }

            imageSelectorDialog(attrs, function callback(newAttrs) {
                if (newAttrs.imageSel) {
                    newAttrs['data-id'] = newAttrs.imageSel.id;
                    // attrs['data-shortcode'] = 'image';
                }

                view.dispatch(view.state.tr.replaceSelectionWith(nodeType.createAndFill(newAttrs)));
                view.focus();
            });
        }
    })
}


export function imageSelectorDialog(attrs, callback, fieldList) {
    const availableFields = {
        imageSel: new ItemFilterField({
            name: "image_selector",
            linkField: 'image_location',
            titleField: 'image_title',
            label: "Find an image",
            required: false,
            text: '',
            type: 'image',
            value: null
        }),
        fileUpload: new FileUploadField({
            name: 'imageUpload',
            label: 'Upload image',
            required: false,
            type: 'image',
            value: null
        }),
        imageInfo: new FieldGroup({
            name: 'imageInfo',
            label: "Details",
            fields: {
                src: new TextField({ label: "Location", required: true, value: attrs && attrs.src, name: 'image_location' }),
                title: new TextField({ label: "Title", value: attrs && attrs.title, name: "image_title" }),
                alt: new TextField({
                    label: "Description",
                    value: attrs && attrs.alt
                })
            }
        }),
        imageProps: new FieldGroup({
            name: 'imageProps',
            label: "Properties",
            fields: {
                width: new TextField({
                    label: "Width",
                    value: attrs && attrs.width
                }),
                height: new TextField({
                    label: "Height",
                    value: attrs && attrs.height
                })
            }
        })
    };

    let usedFields = {};
    if (fieldList) {
        for (let i = 0; i < fieldList.length; i++) {
            usedFields[fieldList[i]] = availableFields[fieldList[i]];
        }
    } else {
        usedFields = availableFields;
    }


    openPrompt({
        title: "Select image",
        fields: usedFields,
        callback: callback
    });
}
