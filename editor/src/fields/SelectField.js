import { Field } from "./Field";

export class SelectField extends Field {
    render() {
        var this$1 = this;

        var select = document.createElement("select");
        this.options.options.forEach(function (o) {
            var opt = select.appendChild(document.createElement("option"));
            opt.value = o.value;
            opt.selected = o.value == this$1.options.value;
            opt.innerHTML = o.label;
            opt.label = o.label;
        });
        return select
    }
}

