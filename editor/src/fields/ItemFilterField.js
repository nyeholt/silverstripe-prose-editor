import { Field } from "./Field";

import tag from 'html5-tag';
import escapeHTML from 'escape-html';
import wretch from 'wretch';

import './ItemFilterField.scss'

export class ItemFilterField extends Field {

    items = [];

    constructor(options) {
        super(options);
        if (!this.options.type) {
            this.options.type = 'Page';
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
        this.hiddenField = document.createElement('hidden');
        this.hiddenField.type = "text";
        this.hiddenField.value = this.options.value || "";

        let div = document.createElement('div');
        div.className = 'ItemFilterField';

        let inputDiv = document.createElement('div');
        inputDiv.className = 'ItemFilterField__Input';

        let displayDiv = document.createElement('div');
        displayDiv.className = 'ItemFilterField__Display';

        let input = document.createElement('input');
        input.name = this.options.name ? this.options.name : this.options.label;
        input.type = "text";

        inputDiv.appendChild(input);

        div.appendChild(inputDiv);
        div.appendChild(displayDiv);
        div.appendChild(this.hiddenField);

        const w = wretch();
        const treeType = this.options.type || 'page';
        const apiUrl = this.options.url + '/search/' + treeType;
        const secId = document.querySelector('input[name=SecurityID]').value;
        const isStage = location.href.indexOf('stage=Stage') > 0;

        const lookupItems = debounce((value) => {
            const reqUrl = `${apiUrl}?term=${value}`;
            const queryOpts = {
                term: value,
                SecurityID: secId
            };
            if (isStage) {
                queryOpts.stage = 'Stage';
            }

            w.url(reqUrl).query(queryOpts).get().json((data) => {
                if (data && data.results) {
                    this.items = data.results;
                    this.renderItems(displayDiv);
                }
            });
        }, 500)
        input.addEventListener('keyup', function (e) {
            lookupItems(e.target.value);
        });

        return div;
    }

    /**
     *
     * @param {HTMLDivElement} displayDiv
     */
    renderItems(displayDiv) {
        while (displayDiv.firstChild) displayDiv.removeChild(displayDiv.firstChild)

        const newItems = this.items.map(function (item) {
            let title = item.text;
            if (title.length > 20) {
                title = title.substring(0, 18) + '...';
            }
            let img = tag('img', {
                'class': 'ItemFilterField__Item__Image',
                'src': item.icon,
                'title': escapeHTML(item.location + ' / ' + item.text)
            });
            let cap = tag('span', {
                'class': 'ItemFilterField__Item__Caption'
            }, escapeHTML(title));
            let itemDiv = tag('div', {
                class: 'ItemFilterField__Item',
                'data-id': item.id
            }, img + cap)

            return itemDiv;
        })

        displayDiv.innerHTML = newItems.join('');
    }
}



function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};
