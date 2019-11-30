
export class FieldGroup {

    name = "fieldgroup"
    fields = [];

    constructor(name, fields) {
        this.name = name;
        this.fields = fields;
    }

    renderFields(container, updateCallback) {
        let domFields = [];
        let prefix = this.name;

        for (var name in this.fields) {
            const field = this.fields[name];

            if (!field.options.name) {
                field.options.name = name;
            }

            let formField = field.render();
            formField.setAttribute('data-label', field.options.label);
            domFields.push(formField);

            field.dom = formField;
        }

        let fieldNumber = 1;
        domFields.forEach((field) => {
            // wrap in a div with a form label
            let formFieldId = prefix + '-field-' + fieldNumber;
            field.id = formFieldId;

            let fieldWrapper = document.createElement("div");
            fieldWrapper.className = prefix + '-fieldwrapper';
            let fieldLabel = document.createElement("label");
            fieldLabel.innerHTML = field.getAttribute('data-label');
            fieldLabel.setAttribute('for', formFieldId);

            fieldWrapper.appendChild(fieldLabel);
            fieldWrapper.appendChild(field);

            container.appendChild(fieldWrapper);

            if (updateCallback) {
                field.addEventListener('change', function (e) {
                    updateCallback(field.name, this.fields[field.name].read(field));
                });
                field.addEventListener('keyup', function (e) {
                    updateCallback(field.name, this.fields[field.name].read(field));
                })
            }

            fieldNumber++;
        });
    }

    getValues() {
        var result = Object.create(null), i = 0;
        for (var name in this.fields) {
            var field = this.fields[name];
            var dom = field.dom;
            var value = field.read(dom), bad = field.validate(value);
            if (bad) {
                this.reportInvalid(dom, bad);
                return null
            }
            result[name] = field.clean(value);
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
