import { Field } from "./Field";

export class TextField extends Field {
    textType = "text";

    render() {
        var input = document.createElement("input");
        input.type = this.textType;
        input.name = this.options.name ? this.options.name : this.options.label;
        input.placeholder = this.options.placeholder ? this.options.placeholder : '...';
        input.value = this.options.value || "";
        input.autocomplete = this.options.autocomplete ? this.options.autocomplete : "off";
        return input
    }
}
