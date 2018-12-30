import { Field } from "./Field";

import $ from 'jquery';
import jstree from 'jstree';


export class TreeField extends Field {

    constructor(options) {
        super(options);
        if (!this.options.type) {
            this.options.type = 'page';
        }
    }

    read(dom) {
        if (this.hiddenField) {
            return this.options.type == 'file' ?
                '[file_link id="' + this.hiddenField.value + '"]' :
                '[sitetree_link id="' + this.hiddenField.value + '"]';
        }
        return 0;
    }
    render() {

        console.log(this.options);

        let input = document.createElement('input');
        input.name = this.options.name ? this.options.name : this.options.label;
        input.type = "text";
        input.value = this.options.value || "";

        this.hiddenField = document.createElement('input');
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

        $(treeDiv).jstree({
            core: {
                data: {
                    url: function (node) {
                        return 'frontend-authoring/tree/childnodes?id=' + node.id;
                    }
                }
            }
        });

        $(treeDiv).on('select_node.jstree', function (e, tree) {
            input.value = tree.node.text;
            this.hiddenField.value = tree.node.id;
        }.bind(this));

        return div;
    }
}
