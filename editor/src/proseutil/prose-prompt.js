import { FieldGroup } from "../fields/FieldGroup";

var prefix = "ProseMirror-prompt";

/**
 * Options is
 *
 * {
 *  update: function() called when a field is updated
 *  forceRemainOpen: stays open even if clicked outside
 *  cancel: function() called on cancel
 *  title: title of the dialog
 *  fields: object of key :=> field object
 *  hideButtons: boolean whether to show action buttons
 *  callback: called when the 'ok' button is clicked
 * }
 *
 * @param {object} options
 * @param {string} createIn
 */
export function openPrompt(options, createIn) {
    let prompt = {};

    let form;

    var wrapper = document.body.appendChild(document.createElement("div"));
    wrapper.style.width = '65%';
    wrapper.style.maxHeight = '90%';
    wrapper.style.overflow = 'auto';
    wrapper.style.paddingBottom  = '20px';

    wrapper.className = prefix;


    var mouseOutside = function (e) { if (!wrapper.contains(e.target)) { close(); } };

    // handle clicks outside the dialog
    if (!options.forceRemainOpen) {
        setTimeout(function () { return window.addEventListener("mousedown", mouseOutside); }, 50);
    }

    prompt.close = function () {
        window.removeEventListener("mousedown", mouseOutside);
        if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper); }

        // cleanup form fields
        this.fieldGroup.cleanup();
    };

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
        }
        prompt.close();
    });

    form = wrapper.appendChild(document.createElement("form"));
    if (options.title) { form.appendChild(document.createElement("h5")).textContent = options.title; }

    let rootGroup = new FieldGroup({
        name: "root",
        fields: options.fields
    });

    if (options.update) {
        rootGroup.updateCallback = options.update;
    }
    rootGroup.renderFields(form);

    var buttons = form.appendChild(document.createElement("div"));
    buttons.className = prefix + "-buttons";

    if (!options.hideButtons) {
        buttons.appendChild(submitButton);
        buttons.appendChild(document.createTextNode(" "));
        buttons.appendChild(cancelButton);
    }

    if (createIn) {
        wrapper.style.position = 'static';
        wrapper.style.width = '100%';
        wrapper.style.border = 'none';
        createIn.prepend(wrapper);
    } else {
        var box = wrapper.getBoundingClientRect();
        var top = (((window.innerHeight - box.height) / 2) - 100);
        top = top < 0 ? 0 : top;
        wrapper.style.top = top + "px";
        wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px";
    }

    var submit = function () {
        var params = rootGroup.getValues();
        if (params) {
            prompt.close();
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

    prompt.wrapper = wrapper;
    prompt.form = form;
    prompt.fieldGroup = rootGroup;

    var input = form.elements[0];
    if (input) { input.focus(); }

    return prompt;
}

