import { Plugin } from "prosemirror-state";
import wretch from 'wretch';
import { DecorationSet, Decoration } from "prosemirror-view";

const IMAGE_TYPE = /image.*/
const MAX_PASTE_SIZE = 1500000;
let PASTING = false;


export const imagePaste = new Plugin({
    state: {
        init: function () {
            return DecorationSet.empty
        },
        apply: function (tr, set) {
            set = set.map(tr.mapping, tr.doc)
            // See if the transaction adds or removes any placeholders
            let action = tr.getMeta(this)
            if (action && action.add) {
                let widget = document.createElement("placeholder");
                // let imgNode = document.createElement('img');
                // imgNode.setAttribute('src', 'resources/symbiote/silverstripe-prose-editor/client/images/paste-loading.png');
                // widget.appendChild(imgNode);
                let deco = Decoration.widget(action.add.pos, widget, { id: action.add.id })
                set = set.add(tr.doc, [deco])
            } else if (action && action.remove) {
                set = set.remove(set.find(null, null, spec => spec.id == action.remove.id))
            }
            return set
        }
    },
    props: {
        decorations: function (state) {
            return this.getState(state)
        },
        handleDOMEvents: {
            paste: function (view, e) {
                let clipboardData = (e.clipboardData || window.clipboardData);
                if (!clipboardData) {
                    return;
                }

                for (var i = 0; i < clipboardData.types.length; i++) {
                    if (clipboardData.types[i].match(IMAGE_TYPE) || clipboardData.items[i].type.match(IMAGE_TYPE)) {
                        const editorParent = findFieldNode(view.dom);
                        if (!editorParent) {
                            return;
                        }

                        // by simply returning true, we let the image get pasted as base64 data: urls.
                        var file = clipboardData.items[i].getAsFile();
                        if (!file) {
                            file = clipboardData.items[i].getAsString(function (s) {
                                console.log(s);
                            });
                            alert("Could not convert clipboard data to file, please try a smaller image");
                            continue;
                        }

                        let tr = view.state.tr;
                        let id = (new Date).getTime();
                        if (!tr.selection.empty) {
                            tr.deleteSelection();
                        }
                        // add a placeholder
                        tr.setMeta(imagePaste, { add: { id: id, pos: tr.selection.from } })
                        view.dispatch(tr)

                        var reader = new FileReader();

                        reader.onload = function (evt) {
                            if (evt.target.result && evt.target.result.length > 0 && evt.target.result.length < MAX_PASTE_SIZE) {
                                // declared here, otherwise the paste action can change the focused element before the post responds
                                PASTING = true;

                                const secId = document.querySelector('input[name=SecurityID]').value;
                                const uploadPath = editorParent.getAttribute('data-upload-path');
                                const uploadEndpoint = editorParent.getAttribute('data-prose-url') + '/pastefile';

                                const w = wretch();
                                w.url(uploadEndpoint).formData({
                                    'ajax': 1,
                                    SecurityID: secId,
                                    rawData: evt.target.result,
                                    path: uploadPath
                                }).post().json(function (response) {
                                    if (response && response.url) {
                                        const imageNodeType = view.state.config.schema.nodes.image;
                                        let pos = findPlaceholder(view.state, id);
                                        if (pos == null) {
                                            return;
                                        }

                                        view.dispatch(
                                            view.state.tr
                                            .replaceWith(pos, pos, imageNodeType.create({ src: response.url }))
                                            .setMeta(imagePaste, { remove: { id } })
                                        );
                                    }
                                    PASTING = false;
                                }).catch(function (d) {
                                    view.dispatch(tr.setMeta(placeholderPlugin, { remove: { id } }))
                                    console.error(error);
                                    alert("Upload failed");
                                });
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        }
    }
});

function findPlaceholder(state, id) {
    let decos = imagePaste.getState(state)
    let found = decos.find(null, null, spec => spec.id == id)
    return found.length ? found[0].from : null
}



function findFieldNode(node) {
    if (!node) {
        return;
    }
    if (node.getAttribute('data-prose-url')) {
        return node;
    }
    return findFieldNode(node.parentElement);
}
