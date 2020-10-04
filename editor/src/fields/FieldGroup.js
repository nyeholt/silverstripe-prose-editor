import { Field } from "./Field";

export class FieldGroup extends Field {
    updateCallback = null;
    fields = [];
    domFields = [];
    fieldHolders = [];

    /**
     *
     * @param {string} name
     * @param {object} fields
     *              The list of fields in { name: new Field() } format
     */
    constructor(options) {
        super(options)
        this.fields = options.fields;
    }

    render() {
        const container = document.createElement('fieldset');
        container.classList.add("fieldgroup");
        container.classList.add("fieldgroup-" + this.options.name);

        this.renderFields(container, this.updateCallback);

        return container;
    }

    renderFields(container) {
        let prefix = this.options.name || '';

        for (var name in this.fields) {
            const field = this.fields[name];

            if (!field.options.name) {
                field.options.name = name;
            }

            if (field instanceof FieldGroup) {
                field.updateCallback = this.updateCallback;
            }

            let formField = field.render();
            formField.setAttribute('data-label', field.options.label || field.options.name);
            formField.setAttribute('data-name', field.options.name);

            this.domFields.push(formField);

            field.dom = formField;
        }

        let fieldNumber = 1;
        this.domFields.forEach((domfield) => {
            // wrap in a div with a form label
            let formFieldId = prefix + '-field-' + fieldNumber;
            domfield.id = formFieldId;

            let fieldWrapper = document.createElement("div");
            fieldWrapper.className = prefix + '-fieldwrapper fieldgroup-fieldwrapper field-' + domfield.getAttribute('data-name');
            let fieldLabel = document.createElement("label");
            fieldLabel.innerHTML = domfield.getAttribute('data-label');
            fieldLabel.setAttribute('for', formFieldId);

            fieldWrapper.appendChild(fieldLabel);
            fieldWrapper.appendChild(domfield);

            container.appendChild(fieldWrapper);

            this.fieldHolders.push(fieldWrapper);

            if (this.updateCallback) {
                domfield.addEventListener('change', (e) => {
                    this.updateCallback(domfield.name, this.fields[domfield.name].read(domfield), container);
                });
                domfield.addEventListener('keyup', (e) => {
                    this.updateCallback(domfield.name, this.fields[domfield.name].read(domfield), container);
                })
            }

            fieldNumber++;
        });
    }

    removeFields() {
        this.fieldHolders.forEach((domfield) => {
            domfield.remove();
        })
    }

    getValues() {
        var result = Object.create(null), i = 0;
        for (var name in this.fields) {
            var field = this.fields[name];
            if (field instanceof FieldGroup) {
                const subfields = field.getValues();
                result = {
                    ...result,
                    ...subfields
                };
            } else {
                var dom = field.dom;
                var value = field.read(dom), bad = field.validate(value);
                if (bad) {
                    this.reportInvalid(dom, bad);
                    return null
                }
                result[name] = field.clean(value);
            }
        }
        return result
    }

    reportInvalid(dom, message) {
        // FIXME this is awful and needs a lot more work
        var parent = dom.parentNode;
        var msg = parent.appendChild(document.createElement("div"));
        msg.style.left = (dom.offsetLeft + dom.offsetWidth + 2) + "px";
        msg.style.top = (dom.offsetTop - 5) + "px";
        msg.className = "ProseMirror-invalid";
        msg.textContent = message;
        setTimeout(function () { return parent.removeChild(msg); }, 1500);
    }
}
