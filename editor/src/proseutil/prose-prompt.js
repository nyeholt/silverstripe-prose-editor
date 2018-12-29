
var prefix = "ProseMirror-prompt";

export function openPrompt(options) {
    var wrapper = document.body.appendChild(document.createElement("div"));
    wrapper.style.width = '65%';
    wrapper.className = prefix;

    var mouseOutside = function (e) { if (!wrapper.contains(e.target)) { close(); } };
    setTimeout(function () { return window.addEventListener("mousedown", mouseOutside); }, 50);
    var close = function () {
        window.removeEventListener("mousedown", mouseOutside);
        if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper); }
    };

    var domFields = [];
    let addAutoComplete = false;
    let autoCompleteField = '';
    for (var name in options.fields) {
        const field = options.fields[name];
        if (field.options.autocomplete) {
            addAutoComplete = true;
            autoCompleteField = field.options.name;
        }
        domFields.push(field.render());
    }

    var submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = prefix + "-submit";
    submitButton.textContent = "OK";
    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = prefix + "-cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", close);

    var form = wrapper.appendChild(document.createElement("form"));
    if (options.title) { form.appendChild(document.createElement("h5")).textContent = options.title; }
    domFields.forEach(function (field) {
        form.appendChild(document.createElement("div")).appendChild(field);
    });
    var buttons = form.appendChild(document.createElement("div"));
    buttons.className = prefix + "-buttons";
    buttons.appendChild(submitButton);
    buttons.appendChild(document.createTextNode(" "));
    buttons.appendChild(cancelButton);

    var box = wrapper.getBoundingClientRect();
    wrapper.style.top = ((window.innerHeight - box.height) / 2) + "px";
    wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px";

    if (addAutoComplete && autoCompleteField) {
        injectAutoComplete(autoCompleteField);
    }

    var submit = function () {
        var params = getValues(options.fields, domFields);
        if (params) {
            close();
            options.callback(params);
        }
    };

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
    });

    form.addEventListener("keydown", function (e) {
        // ESC
        if (e.keyCode == 27) {
            e.preventDefault();
            close();
            // Enter
        } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
            // e.preventDefault();
            // submit();
            // Tab
        } else if (e.keyCode == 9) {
            window.setTimeout(function () {
                if (!wrapper.contains(document.activeElement)) { close(); }
            }, 500);
        }
    });

    var input = form.elements[0];
    if (input) { input.focus(); }
}


function getValues(fields, domFields) {
    var result = Object.create(null), i = 0;
    for (var name in fields) {
        var field = fields[name], dom = domFields[i++];
        var value = field.read(dom), bad = field.validate(value);
        if (bad) {
            reportInvalid(dom, bad);
            return null
        }
        result[name] = field.clean(value);
    }
    return result
}


function reportInvalid(dom, message) {
    // FIXME this is awful and needs a lot more work
    var parent = dom.parentNode;
    var msg = parent.appendChild(document.createElement("div"));
    msg.style.left = (dom.offsetLeft + dom.offsetWidth + 2) + "px";
    msg.style.top = (dom.offsetTop - 5) + "px";
    msg.className = "ProseMirror-invalid";
    msg.textContent = message;
    setTimeout(function () { return parent.removeChild(msg); }, 1500);
}


// ::- The type of field that `FieldPrompt` expects to be passed to it.
var Field = function Field(options) { this.options = options; };

// render:: (state: EditorState, props: Object) → dom.Node
// Render the field to the DOM. Should be implemented by all subclasses.

// :: (dom.Node) → any
// Read the field's value from its DOM node.
Field.prototype.read = function read(dom) { return dom.value };

// :: (any) → ?string
// A field-type-specific validation function.
Field.prototype.validateType = function validateType(_value) { };

Field.prototype.validate = function validate(value) {
    if (!value && this.options.required) { return "Required field" }
    return this.validateType(value) || (this.options.validate && this.options.validate(value))
};

Field.prototype.clean = function clean(value) {
    return this.options.clean ? this.options.clean(value) : value
};

// ::- A field class for single-line text fields.
export var TextField = (function (Field) {
    function TextField() {
        Field.apply(this, arguments);
    }

    if (Field) TextField.__proto__ = Field;
    TextField.prototype = Object.create(Field && Field.prototype);
    TextField.prototype.constructor = TextField;

    TextField.prototype.render = function render() {
        var input = document.createElement("input");
        input.type = "text";
        input.name = this.options.name;
        input.placeholder = this.options.label;
        input.value = this.options.value || "";
        input.autocomplete = this.options.autocomplete ? this.options.autocomplete : "off";
        return input
    };

    return TextField;
}(Field));


export class TextareaField extends Field
{
    constructor(options) {
        super(options);
    }

    render() {
        var input = document.createElement("textarea");
        input.name = this.options.name;
        input.rows = 10;
        input.placeholder = this.options.label;
        input.value = this.options.value || "";
        return input
    }
}

// ::- A field class for dropdown fields based on a plain `<select>`
// tag. Expects an option `options`, which should be an array of
// `{value: string, label: string}` objects, or a function taking a
// `ProseMirror` instance and returning such an array.
export var SelectField = (function (Field) {
    function SelectField() {
        Field.apply(this, arguments);
    }

    if (Field) SelectField.__proto__ = Field;
    SelectField.prototype = Object.create(Field && Field.prototype);
    SelectField.prototype.constructor = SelectField;

    SelectField.prototype.render = function render() {
        var this$1 = this;

        var select = document.createElement("select");
        this.options.options.forEach(function (o) {
            var opt = select.appendChild(document.createElement("option"));
            opt.value = o.value;
            opt.selected = o.value == this$1.options.value;
            opt.label = o.label;
        });
        return select
    };

    return SelectField;
}(Field));
