import { Field } from "./Field";

import * as FilePond from 'filepond';

import './FileUploadField.scss';

export class FileUploadField extends Field {
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

            return {
                type: this.options.type,
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
        div.className = 'FileUploadField';

        let inputDiv = document.createElement('div');
        inputDiv.className = 'FileUploadField__Input';

        let input = document.createElement('input');
        input.name = this.options.name ? this.options.name : this.options.label;
        input.type = "file";


        inputDiv.appendChild(input);

        div.appendChild(inputDiv);
        div.appendChild(this.hiddenField);

        let pond = FilePond.create(input, {
            multiple: true,
            name: this.options.name
        });

        // pond.onaddfile = function (e, file) {
        //     if (file) {
        //         file.setMetadata("path", location.pathname);
        //     }
        // };
        pond.onprocessfile = (err, file) => {
            if (file && this.options.onupload) {
                this.options.onupload(file);
            }
        };

        FilePond.setOptions({
            server: this.options.uploadurl
        })

        return div;
    }
}
