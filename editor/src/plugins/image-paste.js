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
                        return true;
                    }
                }
            }
        }
    }
});
