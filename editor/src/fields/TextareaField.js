import { Field } from "./Field";

export class TextareaField extends Field {
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
