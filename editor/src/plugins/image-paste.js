import { Plugin } from "prosemirror-state";

const IMAGE_TYPE = /image.*/
const UPLOAD_ENDPOINT = '';
const MAX_PASTE_SIZE = 500000;
let PASTING = false;


export const imagePaste = new Plugin({
    props: {
        handleDOMEvents: {
            paste: function (view, e) {

                let clipboardData = (e.clipboardData || window.clipboardData);
                if (!clipboardData) {
                    return;
                }

                for (var i = 0; i < clipboardData.types.length; i++) {
                    if (clipboardData.types[i].match(IMAGE_TYPE) || clipboardData.items[i].type.match(IMAGE_TYPE)) {
                        // by simply returning true, we let the image get pasted as base64 data: urls.
                        var file = clipboardData.items[i].getAsFile();
                        if (!file) {

                            file = clipboardData.items[i].getAsString(function (s) {
                                console.log(s);
                            });
                            alert("Could not convert clipboard data to file, please try a smaller image");
                            continue;
                        }
                        var reader = new FileReader();

                        reader.onload = function (evt) {
                            if (evt.target.result && evt.target.result.length > 0 && evt.target.result.length < MAX_PASTE_SIZE) {

                                // declared here, otherwise the paste action can change the focused element before the post responds
                                PASTING = true;

                                if (view.state) {
                                    let sel = view.state.selection;
                                    const imageNodeType = view.state.config.schema.nodes.image;
                                    if (imageNodeType && sel.$from.parent.canReplaceWith(sel.$from.index(), sel.$from.index(), imageNodeType)) {
                                        const imgProps = {
                                            src: evt.target.result
                                        }
                                        var img = imageNodeType.create(imgProps);

                                        view.dispatch(view.state.tr.replaceSelectionWith(img));
                                    }
                                }

                                // $.post(UPLOAD_ENDPOINT, {SecurityID: secId, rawData: evt.target.result}).then(function (res) {
                                //     PASTING = false;
                                //     if (res && res.success) {
                                //         updateModel.setContent(updateDirective, {url: res.url});
                                //     }
                                // }).done(function (done) {
                                //     PASTING = false;
                                // })
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        }
    }
});
