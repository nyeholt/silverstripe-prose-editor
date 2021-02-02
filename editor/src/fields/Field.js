
export class Field {

    cleanupElems = [];

    constructor(options) {
        this.options = options;
    }

    read(dom) {
        return dom.value;
    }

    validateType(_value) { }

    validate(value) {
        if (!value && this.options.required) { return "Required field" }
        return this.validateType(value) || (this.options.validate && this.options.validate(value))
    }

    clean(value) {
        return this.options.clean ? this.options.clean(value) : value
    }

    cleanup() {
        if (this.cleanupElems && this.cleanupElems.length > 0) {
            this.cleanupElems.forEach((elem) => {
                if (elem) {
                    elem.remove();
                }
            })
        }
    }
}
