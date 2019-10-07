
var prefix = "ProseMirror-prompt";

export function openPrompt(options, createIn) {
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

        field.options.name = name;
        let formField = field.render();
        formField.setAttribute('data-label', field.options.label);
        domFields.push(formField);
    }

    var submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = prefix + "-submit";
    submitButton.textContent = "OK";
    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = prefix + "-cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", function () {
        if (options.cancel) {
            options.cancel();
            close();
        }
    });

    var form = wrapper.appendChild(document.createElement("form"));
    if (options.title) { form.appendChild(document.createElement("h5")).textContent = options.title; }

    let fieldNumber = 1;
    domFields.forEach(function (field) {
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

        form.appendChild(fieldWrapper);

        if (options.update) {
            field.addEventListener('change', function (e) {
                options.update(field.name, options.fields[field.name].read(field));
            });
            field.addEventListener('keyup', function (e) {
                options.update(field.name, options.fields[field.name].read(field));
            })
        }


        fieldNumber++;
    });
    var buttons = form.appendChild(document.createElement("div"));
    buttons.className = prefix + "-buttons";
    buttons.appendChild(submitButton);
    buttons.appendChild(document.createTextNode(" "));
    buttons.appendChild(cancelButton);

    if (createIn) {
        wrapper.style.position = 'static';
        wrapper.style.width = '100%';
        wrapper.style.border = 'none';
        createIn.prepend(wrapper);
    } else {
        var box = wrapper.getBoundingClientRect();
        wrapper.style.top = (((window.innerHeight - box.height) / 2) - 100) + "px";
        wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px";
    }

    if (addAutoComplete && autoCompleteField) {
        // injectAutoComplete(autoCompleteField);
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

