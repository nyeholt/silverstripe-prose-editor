import { Field } from "./Field";
import InfiniteTree from 'infinite-tree';
import classNames from 'classnames';
import escapeHTML from 'escape-html';
import tag from 'html5-tag';

import wretch from 'wretch';

import 'infinite-tree/dist/infinite-tree.css';

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
        const isStage = location.href.indexOf('stage=Stage') > 0;

        const appendage = isStage ? '&stage=Stage' : '';
        const apiUrl = treeUrlBase + '/childnodes/' + treeType; // + '?id=' + node.id + appendage;
        const secId = document.querySelector('input[name=SecurityID]').value;

        const tree = new InfiniteTree({
            el: treeDiv,
            data: [{
                id: '#',
                name: this.options.treeLabel ? this.options.treeLabel : 'Select item',
                loadOnDemand: true,
                children: []
            }],
            // autoOpen: true,

            loadNodes: function (parentNode, next) {
                const reqUrl = `${apiUrl}?id=${parentNode.id}${appendage}`;
                const w = wretch();
                const queryOpts = {
                    id: parentNode.id,
                    SecurityID: secId
                };
                if (isStage) {
                    queryOpts.stage = 'Stage';
                }
                w.url(reqUrl).query(queryOpts).get().json(function (data) {
                    const nodes = data.map(function (item) {
                        return {
                            id: "" + item.id,
                            name: item.text,
                            loadOnDemand: item.children,
                            children: item.children ? [] : null,
                            icon: item.icon || null,
                            data: item.data
                        };
                    });
                    next(null, nodes, function () {
                    });
                })
            },
            rowRenderer: customRowRenderer,
        });


        const firstNode = treeDiv.querySelector('div.infinite-tree-item[data-id="#"] a.infinite-tree-toggler');
        if (firstNode) {
            firstNode.click();
        }

        tree.on('selectNode', function (node) {
            if (!node) {
                return;
            }
            if (!node.data || !node.data.link) {
                return;
            }
            input.value = node.name;
            if (this.options.titleField) {
                document.getElementsByName(this.options.titleField).forEach((elem) => {
                    elem.value = node.name;
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

        // $(treeDiv).on('select_node.jstree', function (e, tree) {
        //     let node = tree.node;
        //     if (!node) {
        //         return;
        //     }
        //     input.value = node.text;
        //     if (this.options.titleField) {
        //         document.getElementsByName(this.options.titleField).forEach((elem) => {
        //             elem.value = node.text;
        //         });
        //     }

        //     this.hiddenField.value = node.id;

        //     if (node.data) {
        //         // if there's a linked field, use it
        //         if (this.options.linkField && node.data.link) {
        //             document.getElementsByName(this.options.linkField).forEach((elem) => {
        //                 elem.value = node.data.link;
        //             });
        //         }
        //     }

        // }.bind(this));

        return div;
    }
}


const customRowRenderer = (node, treeOptions) => {
    const { id, name, loadOnDemand = false, children, state, icon } = node;
    const droppable = treeOptions.droppable;
    const { depth, open, path, total, selected = false, filtered } = state;
    const childrenLength = Object.keys(children).length;
    const more = node.hasChildren();

    if (filtered === false) {
        return '';
    }

    let togglerContent = '';
    if (!more && loadOnDemand) {
        togglerContent = '►';
    }
    if (more && open) {
        togglerContent = '▼';
    }
    if (more && !open) {
        togglerContent = '►';
    }
    const toggler = tag('a', {
        'style': 'min-width: 16px; display: inline-block',
        'class': (() => {
            if (!more && loadOnDemand) {
                return classNames(treeOptions.togglerClass, 'infinite-tree-closed');
            }
            if (more && open) {
                return classNames(treeOptions.togglerClass);
            }
            if (more && !open) {
                return classNames(treeOptions.togglerClass, 'infinite-tree-closed');
            }
        })()
    }, togglerContent);


    const iconTag = icon ? tag('img', {
        'src': icon,
        height: '16',
        style: 'margin-right: 0.5rem; max-width: 32px;'
    }) : '';


    const iconHolder = icon ? tag('span', {
        'style' : 'width: 32px; display: inline-block;',
    }, iconTag) : '';

    const title = tag('span', {
        'class': classNames('infinite-tree-title')
    }, escapeHTML(name));
    const treeNode = tag('div', {
        'class': 'infinite-tree-node',
        'style': `margin-left: ${depth * 18}px`
    }, toggler + iconHolder + title);

    return tag('div', {
        'data-id': "" + id,
        'data-expanded': more && open,
        'data-depth': "" + depth,
        'data-path': path,
        'data-selected': selected,
        'data-children': childrenLength,
        'data-total': total,
        'class': classNames(
            'infinite-tree-item',
            { 'infinite-tree-selected': selected }
        ),
        'droppable': droppable
    }, treeNode);
};
