import { Field } from "./Field";

import $ from 'jquery';
import jstree from 'jstree';


export class TreeField extends Field {

    constructor(options) {
        super(options);
        if (!this.options.type) {
            this.options.type = 'page';
        }
        if (!this.options.url) {
            this.options.url = '__prose';
        }
    }

    read(dom) {
        if (this.hiddenField) {
            return this.options.type == 'file' ? {
                type: 'file',
                shortcode: 'file_link',
                id: this.hiddenField.value
            } : {
                type: 'page',
                shortcode: 'sitetree_link',
                id: this.hiddenField.value
            }
                // '[file_link,id=' + this.hiddenField.value + ']' :
                // '[sitetree_link,id=' + this.hiddenField.value + ']';
        }
        return 0;
    }
    render() {

        let input = document.createElement('input');
        input.readOnly = true;
        input.name = this.options.name ? this.options.name : this.options.label;
        input.type = "text";
        input.value = this.options.text || "";

        this.hiddenField = document.createElement('hidden');
        this.hiddenField.type = "text";
        this.hiddenField.value = this.options.value || "";


        let div = document.createElement('div');
        div.className = 'TreeField';

        let treeDiv = document.createElement('div');
        div.className = 'TreeField__Tree';

        div.appendChild(input);
        div.appendChild(this.hiddenField);
        div.appendChild(treeDiv);

        this.tree = treeDiv;

        const treeUrlBase = this.options.url;
        const treeType = this.options.type == 'file' ? 'file' : 'page';

        $(treeDiv).jstree({
            core: {
                data: {
                    url: function (node) {
                        return treeUrlBase + '/childnodes/' + treeType + '?id=' + node.id;
                    }
                }
            }
        });

        $(treeDiv).on('select_node.jstree', function (e, tree) {
            let node = tree.node;
            if (!node) {
                return;
            }
            input.value = node.text;
            if (this.options.titleField) {
                document.getElementsByName(this.options.titleField).forEach((elem) => {
                    elem.value = node.text;
                });
            }

            this.hiddenField.value = node.id;

            if (node.data) {
                // if there's a linked field, use it
                if (this.options.linkField && node.data.link) {
                    document.getElementsByName(this.options.linkField).forEach((elem) => {
                        elem.value = node.data.link;
                    });
                }
            }

        }.bind(this));

        return div;
    }
}
