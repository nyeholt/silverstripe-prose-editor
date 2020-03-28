import { Field } from "./Field";

import tag from 'html5-tag';
import escapeHTML from 'escape-html';
import wretch from 'wretch';

import './ItemFilterField.scss'

export class ItemFilterField extends Field {

    items = [];

    loading = false;

    lookupItems = () => {};

    shortcodes = {
        'image': 'image',
        'file': 'file_link',
        'page': 'sitetree_link',
    }

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
            let shortcode = this.shortcodes[this.options.type] || 'file_link';
            return {
                type: this.options.type,
                shortcode: shortcode,
                id: this.hiddenField.value
            }
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

        this.lookupItems = debounce((value, extraOpts) => {
            const reqUrl = `${apiUrl}`;
            const queryOpts = {
                term: value,
                SecurityID: secId
            };
            if (extraOpts) {
                queryOpts = {
                    ...queryOpts,
                    ...extraOpts
                };
            }
            if (isStage) {
                queryOpts.stage = 'Stage';
            }

            this.loading = true;

            this.renderItems(displayDiv);

            w.url(reqUrl).query(queryOpts).get().json((data) => {
                if (data && data.results) {
                    this.items = data.results;
                }
                this.loading = false;
                this.renderItems(displayDiv);
            }).catch((e) => {
                console.log(e);
                this.loading = false;
                this.renderItems(displayDiv);
            });
        }, 500);


        if (this.value) {
            this.lookupItems('', { initial: this.value });
        } else if (this.options.folderId) {
            this.lookupItems('', { folderId: this.options.folderId });
        }

        input.addEventListener('keyup', (e) => {
            this.lookupItems(e.target.value);
        });

        document.addEventListener('click', (e) => {
            if (e.target && e.target.className === 'ItemFilterField__Item__Image') {
                document.querySelectorAll('.ItemFilterField__Item__Image').forEach((elem) => {
                    elem.classList.remove('ItemFilterField__Item__Image--Selected');
                })

                e.target.classList.add('ItemFilterField__Item__Image--Selected');
                let imageId = e.target.getAttribute('data-id');
                let imageLink = e.target.getAttribute('data-url');
                let imageTitle = e.target.getAttribute('data-title');

                if (imageId && imageLink) {
                    this.hiddenField.value = imageId;

                    if (this.options.linkField) {
                        document.getElementsByName(this.options.linkField).forEach((elem) => {
                            elem.value = imageLink;
                        });
                    }
                    if (this.options.titleField) {
                        document.getElementsByName(this.options.titleField).forEach((elem) => {
                            elem.value = imageTitle;
                        });
                    }
                }
            }
        })

        return div;
    }

    /**
     *
     * @param {HTMLDivElement} displayDiv
     */
    renderItems(displayDiv) {
        while (displayDiv.firstChild) displayDiv.removeChild(displayDiv.firstChild)

        if (this.loading) {
            displayDiv.innerHTML = "<div class='ItemFilterField__Loading'>Loading ... </div>";
            return;
        }

        const newItems = this.items.map(function (item) {
            let title = item.text;
            if (title.length > 20) {
                title = title.substring(0, 18) + '...';
            }
            let img = tag('img', {
                'class': 'ItemFilterField__Item__Image',
                'src': item.icon,
                'data-id': "" + item.id,
                'data-title': item.text,
                'data-url': item.data && item.data.link ? item.data.link : '',
                'title': escapeHTML(item.location + ' / ' + item.text)
            });
            let cap = tag('span', {
                'class': 'ItemFilterField__Item__Caption'
            }, escapeHTML(title));

            let itemDiv = tag('div', {
                'class': 'ItemFilterField__Item',
            }, img + cap)

            return itemDiv;
        })

        if (newItems.length > 0) {
            displayDiv.innerHTML = newItems.join('');
        } else {
            displayDiv.innerHTML = "<div class='ItemFilterField__Loading'>No results</div>";
        }
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
