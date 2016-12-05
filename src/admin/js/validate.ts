/*
 * validate.js 2.0.1
 * Copyright (c) 2011 - 2015 Rick Harrison, http://rickharrison.me
 * validate.js is open sourced under the MIT license.
 * Portions of validate.js are inspired by CodeIgniter.
 * http://rickharrison.github.com/validate.js
 */

// (function (window, document, undefined) {
/*
 * If you would like an application-wide config, change these defaults.
 * Otherwise, use the setMessage() function to configure form specific messages.
 */

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

interface ValidatorError {
    id: string,
    display: string,
    element: HTMLInputElement,
    name: string,
    message: string,
    messages: string[],
    rule: string,
    //errorMessageElements: HTMLElement[]
}

interface ValidateField {
    id?: string,
    name?: string,
    names?: string,
    depends?: () => boolean | string,
    display?: string,
    element?: HTMLElement,
    type?: string,
    rules?: string,
    value?: string,
    checked?: boolean
}

var defaults = {
    messages: {
        required: 'The %s field is required.',
        matches: 'The %s field does not match the %s field.',
        "default": 'The %s field is still set to default, please change.',
        valid_email: 'The %s field must contain a valid email address.',
        valid_emails: 'The %s field must contain all valid email addresses.',
        min_length: 'The %s field must be at least %s characters in length.',
        max_length: 'The %s field must not exceed %s characters in length.',
        exact_length: 'The %s field must be exactly %s characters in length.',
        greater_than: 'The %s field must contain a number greater than %s.',
        less_than: 'The %s field must contain a number less than %s.',
        alpha: 'The %s field must only contain alphabetical characters.',
        alpha_numeric: 'The %s field must only contain alpha-numeric characters.',
        alpha_dash: 'The %s field must only contain alpha-numeric characters, underscores, and dashes.',
        numeric: 'The %s field must contain only numbers.',
        integer: 'The %s field must contain an integer.',
        decimal: 'The %s field must contain a decimal number.',
        is_natural: 'The %s field must contain only positive numbers.',
        is_natural_no_zero: 'The %s field must contain a number greater than zero.',
        valid_ip: 'The %s field must contain a valid IP.',
        valid_base64: 'The %s field must contain a base64 string.',
        valid_credit_card: 'The %s field must contain a valid credit card number.',
        is_file_type: 'The %s field must contain only %s files.',
        valid_url: 'The %s field must contain a valid URL.',
        greater_than_date: 'The %s field must contain a more recent date than %s.',
        less_than_date: 'The %s field must contain an older date than %s.',
        greater_than_or_equal_date: 'The %s field must contain a date that\'s at least as recent as %s.',
        less_than_or_equal_date: 'The %s field must contain a date that\'s %s or older.'
    },
    errorClassName: 'validationMessage',
    callback: function (errors: ValidatorError[], evt: Environment) {
        console.assert(evt != null && evt.validator instanceof FormValidator);

        for (let i = 0; i < errors.length; i++) {
            console.assert(errors[i].id != null && errors[i].id != '');
            let errorTextElementId = `${errors[i].id}-error`;
            let errorTextElement: HTMLElement = document.getElementById(errorTextElementId) as HTMLElement;
            if (errorTextElement == null) {
                errorTextElement = evt.formElement.querySelector(`.${errors[i].name}.${defaults.errorClassName}`) as HTMLElement;
                if (errorTextElement == null) {
                    errorTextElement = document.createElement('span');
                    errorTextElement.className = defaults.errorClassName;
                    let parent = errors[i].element.parentElement as HTMLElement;
                    if (errors[i].element.nextElementSibling) {
                        parent.insertBefore(errorTextElement, errors[i].element.nextElementSibling);
                    }
                    else {
                        parent.appendChild(errorTextElement);
                    }
                }
                errorTextElement.id = errorTextElementId;
            }

            errorTextElement.style.display = 'block';
            errorTextElement.innerHTML = errors[i].message;
        }
    }
};



/*
 * Define the regular expressions that will be used
 */

var ruleRegex = /^(.+?)\[(.+)\]$/,
    numericRegex = /^[0-9]+$/,
    integerRegex = /^\-?[0-9]+$/,
    decimalRegex = /^\-?[0-9]*\.?[0-9]+$/,
    emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    alphaRegex = /^[a-z]+$/i,
    alphaNumericRegex = /^[a-z0-9]+$/i,
    alphaDashRegex = /^[a-z0-9_\-]+$/i,
    naturalRegex = /^[0-9]+$/i,
    naturalNoZeroRegex = /^[1-9][0-9]*$/i,
    ipRegex = /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/i,
    base64Regex = /[^a-zA-Z0-9\/\+=]/i,
    numericDashRegex = /^[\d\-\s]+$/,
    urlRegex = /^((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/,
    dateRegex = /\d{4}-\d{1,2}-\d{1,2}/;

/*
 * The exposed public object to validate a form:
 *
 * @param formNameOrNode - String - The name attribute of the form (i.e. <form name="myForm"></form>) or node of the form element
 * @param fields - Array - [{
 *     name: The name of the element (i.e. <input name="myField" />)
 *     display: 'Field Name'
 *     rules: required|matches[password_confirm]
 * }]
 * @param callback - Function - The callback after validation has been performed.
 *     @argument errors - An array of validation errors
 *     @argument event - The javascript event
 */

type ErrorCallback = (errors: ValidatorError[], evt: Environment) => void
type Environment = { formElement: HTMLElement, validator: FormValidator };
class FormValidator {
    private callback: ErrorCallback;
    private errors: Array<ValidatorError>;
    private fields: { [propName: string]: ValidateField };
    private form: HTMLElement;
    private messages: any;
    private handlers: any;
    private conditionals: { [propName: string]: Function };

    constructor(formNameOrNode, fields: ValidateField[], callback: ErrorCallback) {
        this.callback = callback || defaults.callback;
        this.errors = [];
        this.fields = {};
        this.form = this._formByNameOrNode(formNameOrNode) || {};
        this.messages = {};
        this.handlers = {};
        this.conditionals = {};

        for (var i = 0, fieldLength = fields.length; i < fieldLength; i++) {
            var field = fields[i];

            // If passed in incorrectly, we need to skip the field.
            if ((!field.name && !field.names) || !field.rules) {
                console.warn('validate.js: The following field is being skipped due to a misconfiguration:');
                console.warn(field);
                console.warn('Check to ensure you have properly configured a name and rules for this field');
                continue;
            }

            /*
             * Build the master fields array that has all the information needed to validate
             */

            if (field.names) {
                for (var j = 0, fieldNamesLength = field.names.length; j < fieldNamesLength; j++) {
                    this._addField(field, field.names[j]);
                }
            } else {
                this._addField(field, field.name);
            }
        }
    }

    // private findErrorElements() {
    //     let errorElements = new Array<HTMLElement>();
    //     for (let i = 0; i < this.errors.length; i++) {
    //         let errorElementId = this.errors[i].element.id + '-error';
    //         let errorElement = document.getElementById(errorElementId);
    //         if (errorElement != null)
    //             errorElements.push(errorElement);
    //     }
    //     return errorElements;
    // }

    clearErrors(...fieldNames: string[]) {
        let fields = new Array<ValidateField>();
        for (let i = 0; i < fieldNames.length; i++) {
            let field = this.fields[fieldNames[i]];
            if (field == null) {
                console.warn(`'${fieldNames[i]}' field is not exists.`);
                continue;
            }

            fields.push(field);
        }

        let errorElements = new Array<HTMLElement>();
        for (let i = 0; i < fields.length; i++) {
            let field = fields[i];
            if (field.element == null)
                continue;

            console.assert((field.element.id || '') != '');

            let errorElementId = field.element.id + '-error';
            let errorElement = document.getElementById(errorElementId);
            if (errorElement)
                errorElements.push(errorElement);
        }

        for (let i = 0; i < errorElements.length; i++) {
            (errorElements[i] as HTMLElement).innerHTML = '';
            (errorElements[i] as HTMLElement).style.display = 'none';
        }
    }


    /*
     * @public
     * Sets a custom message for one of the rules
     */
    setMessage(rule, message) {
        this.messages[rule] = message;

        // return this for chaining
        return this;
    };

    /*
    * @public
    *
    * @param fields - Array - [{
    *     name: The name of the element (i.e. <input name="myField" />)
    *     display: 'Field Name'
    *     rules: required|matches[password_confirm]
    * }]
    * Sets new custom validation rules set
    */

    setRules(fields) {
        this.fields = {};

        for (var i = 0, fieldLength = fields.length; i < fieldLength; i++) {
            var field = fields[i];

            // If passed in incorrectly, we need to skip the field.
            if ((!field.name && !field.names) || !field.rules) {
                console.warn('validate.js: The following field is being skipped due to a misconfiguration:');
                console.warn(field);
                console.warn('Check to ensure you have properly configured a name and rules for this field');
                continue;
            }

            /*
             * Build the master fields array that has all the information needed to validate
             */

            if (field.names) {
                for (var j = 0, fieldNamesLength = field.names.length; j < fieldNamesLength; j++) {
                    this._addField(field, field.names[j]);
                }
            } else {
                this._addField(field, field.name);
            }
        }

        // return this for chaining
        return this;
    };

    /*
    * @public
    * Registers a callback for a custom rule (i.e. callback_username_check)
    */

    registerCallback = function (name, handler) {
        if (name && typeof name === 'string' && handler && typeof handler === 'function') {
            this.handlers[name] = handler;
        }

        // return this for chaining
        return this;
    };


    /*
     * @public
     * Registers a conditional for a custom 'depends' rule
     */

    registerConditional(name, conditional) {
        if (name && typeof name === 'string' && conditional && typeof conditional === 'function') {
            this.conditionals[name] = conditional;
        }

        // return this for chaining
        return this;
    };




    /*
     * @private
     * Determines if a form dom node was passed in or just a string representing the form name
     */

    _formByNameOrNode(formNameOrNode) {
        return (typeof formNameOrNode === 'object') ? formNameOrNode : document.forms[formNameOrNode];
    };

    /*
     * @private
     * Adds a file to the master fields array
     */

    _addField(field, nameValue) {
        this.fields[nameValue] = {
            name: nameValue,
            display: field.display || nameValue,
            rules: field.rules,
            depends: field.depends,
            id: null,
            element: null,
            type: null,
            value: null,
            checked: null
        };
    };

    /*
     * @private
     * Runs the validation when the form is submitted.
     */
    validateForm() {
        return this._validateFields(this.fields);
    };

    validateFields(...fieldNames: string[]) {
        fieldNames = fieldNames || new Array<string>();
        let fields: { [propName: string]: ValidateField } = {};
        for (let i = 0; i < fieldNames.length; i++) {
            let field = this.fields[fieldNames[i]];
            if (field == null) {
                console.warn(`Field '${fieldNames[i]}' is not exists.`)
                continue;
            }

            fields[fieldNames[i]] = field;
        }
        return this._validateFields(fields);
    }

    private _validateFields(fields: { [propName: string]: ValidateField }) {
        this.errors = [];

        for (var key in fields) {
            if (this.fields.hasOwnProperty(key)) {
                var field = this.fields[key] || <ValidateField>{},
                    element = this.form.querySelector('[name="' + field.name + '"]') as HTMLInputElement; //this.form.que [field.name];

                if (element && element !== undefined) {
                    let elementId = attributeValue(element, 'id');
                    if (!elementId) {
                        elementId = guid();
                        element.id = elementId;
                    }

                    field.id = elementId;
                    field.element = element;
                    field.type = element.type; //(element.length > 0) ? (element[0]).type : element.type;
                    field.value = attributeValue(element, 'value');
                    field.checked = attributeValue(element, 'checked');

                    /*
                     * Run through the rules for each field.
                     * If the field has a depends conditional, only validate the field
                     * if it passes the custom function
                     */

                    if (field.depends && typeof field.depends === "function") {
                        if (field.depends.call(this, field)) {
                            this._validateField(field);
                        }
                    } else if (field.depends && typeof field.depends === "string" && this.conditionals[<any>field.depends]) {
                        if (this.conditionals[field.depends as any].call(this, field)) {
                            this._validateField(field);
                        }
                    } else {
                        this._validateField(field);
                    }
                }
            }
        }


        if (typeof this.callback === 'function') {
            this.callback(this.errors, { formElement: this.form, validator: this });
        }

        if (this.errors.length > 0) {
            return false;
        }

        return true;
    }


    /*
     * @private
     * Looks at the fields value and evaluates it against the given rules
     */

    private _validateField(field) {
        var i, j,
            rules = field.rules.split('|'),
            indexOfRequired = field.rules.indexOf('required'),
            isEmpty = (!field.value || field.value === '' || field.value === undefined);

        /*
         * Run through the rules and execute the validation methods as needed
         */
        let ruleLength = rules.length;
        for (i = 0; i < ruleLength; i++) {
            var method = rules[i],
                param = null,
                failed = false,
                parts = ruleRegex.exec(method);

            /*
             * If this field is not required and the value is empty, continue on to the next rule unless it's a callback.
             * This ensures that a callback will always be called but other rules will be skipped.
             */

            if (indexOfRequired === -1 && method.indexOf('!callback_') === -1 && isEmpty) {
                continue;
            }

            /*
             * If the rule has a parameter (i.e. matches[param]) split it out
             */

            if (parts) {
                method = parts[1];
                param = parts[2];
            }

            if (method.charAt(0) === '!') {
                method = method.substring(1, method.length);
            }

            /*
             * If the hook is defined, run it to find any validation errors
             */

            if (typeof this._hooks[method] === 'function') {
                if (!this._hooks[method].apply(this, [field, param])) {
                    failed = true;
                }
            } else if (method.substring(0, 9) === 'callback_') {
                // Custom method. Execute the handler if it was registered
                method = method.substring(9, method.length);

                if (typeof this.handlers[method] === 'function') {
                    if (this.handlers[method].apply(this, [field.value, param, field]) === false) {
                        failed = true;
                    }
                }
            }

            /*
             * If the hook failed, add a message to the errors array
             */

            if (failed) {
                // Make sure we have a message for this rule
                var source = this.messages[field.name + '.' + method] || this.messages[method] || defaults.messages[method],
                    message = 'An error has occurred with the ' + field.display + ' field.';

                if (source) {
                    message = source.replace('%s', field.display);

                    if (param) {
                        message = message.replace('%s', (this.fields[param]) ? this.fields[param].display : param);
                    }
                }

                var existingError;
                for (j = 0; j < this.errors.length; j += 1) {
                    if (field.id === this.errors[j].id) {
                        existingError = this.errors[j];
                    }
                }

                var errorObject: ValidatorError = existingError || {
                    id: field.id,
                    display: field.display,
                    element: field.element,
                    name: field.name,
                    message: message,
                    messages: [],
                    rule: method
                };
                errorObject.messages.push(message);
                if (!existingError) this.errors.push(errorObject);
            }
        }
    };

    /**
     * private function _getValidDate: helper function to convert a string date to a Date object
     * @param date (String) must be in format yyyy-mm-dd or use keyword: today
     * @returns {Date} returns false if invalid
     */
    private _getValidDate(date): boolean | Date {
        if (!date.match('today') && !date.match(dateRegex)) {
            return false;
        }

        var validDate = new Date(),
            validDateArray;

        if (!date.match('today')) {
            validDateArray = date.split('-');
            validDate.setFullYear(validDateArray[0]);
            validDate.setMonth(validDateArray[1] - 1);
            validDate.setDate(validDateArray[2]);
        }
        return validDate;
    };

    /*
     * @private
     * Object containing all of the validation hooks
     */

    private _hooks = {
        required: function (field) {
            var value = field.value;

            if ((field.type === 'checkbox') || (field.type === 'radio')) {
                return (field.checked === true);
            }

            return (value !== null && value !== '');
        },

        "default": function (field, defaultName) {
            return field.value !== defaultName;
        },

        matches: function (field, matchName) {
            var el = this.form[matchName];

            if (el) {
                return field.value === el.value;
            }

            return false;
        },

        valid_email: function (field) {
            return emailRegex.test(field.value);
        },

        valid_emails: function (field) {
            var result = field.value.split(/\s*,\s*/g);

            for (var i = 0, resultLength = result.length; i < resultLength; i++) {
                if (!emailRegex.test(result[i])) {
                    return false;
                }
            }

            return true;
        },

        min_length: function (field, length) {
            if (!numericRegex.test(length)) {
                return false;
            }

            return (field.value.length >= parseInt(length, 10));
        },

        max_length: function (field, length) {
            if (!numericRegex.test(length)) {
                return false;
            }

            return (field.value.length <= parseInt(length, 10));
        },

        exact_length: function (field, length) {
            if (!numericRegex.test(length)) {
                return false;
            }

            return (field.value.length === parseInt(length, 10));
        },

        greater_than: function (field, param) {
            if (!decimalRegex.test(field.value)) {
                return false;
            }

            return (parseFloat(field.value) > parseFloat(param));
        },

        less_than: function (field, param) {
            if (!decimalRegex.test(field.value)) {
                return false;
            }

            return (parseFloat(field.value) < parseFloat(param));
        },

        alpha: function (field) {
            return (alphaRegex.test(field.value));
        },

        alpha_numeric: function (field) {
            return (alphaNumericRegex.test(field.value));
        },

        alpha_dash: function (field) {
            return (alphaDashRegex.test(field.value));
        },

        numeric: function (field) {
            return (numericRegex.test(field.value));
        },

        integer: function (field) {
            return (integerRegex.test(field.value));
        },

        decimal: function (field) {
            return (decimalRegex.test(field.value));
        },

        is_natural: function (field) {
            return (naturalRegex.test(field.value));
        },

        is_natural_no_zero: function (field) {
            return (naturalNoZeroRegex.test(field.value));
        },

        valid_ip: function (field) {
            return (ipRegex.test(field.value));
        },

        valid_base64: function (field) {
            return (base64Regex.test(field.value));
        },

        valid_url: function (field) {
            return (urlRegex.test(field.value));
        },

        valid_credit_card: function (field) {
            // Luhn Check Code from https://gist.github.com/4075533
            // accept only digits, dashes or spaces
            if (!numericDashRegex.test(field.value)) return false;

            // The Luhn Algorithm. It's so pretty.
            var nCheck = 0, nDigit = 0, bEven = false;
            var strippedField = field.value.replace(/\D/g, "");

            for (var n = strippedField.length - 1; n >= 0; n--) {
                var cDigit = strippedField.charAt(n);
                nDigit = parseInt(cDigit, 10);
                if (bEven) {
                    if ((nDigit *= 2) > 9) nDigit -= 9;
                }

                nCheck += nDigit;
                bEven = !bEven;
            }

            return (nCheck % 10) === 0;
        },

        is_file_type: function (field, type) {
            if (field.type !== 'file') {
                return true;
            }

            var ext = field.value.substr((field.value.lastIndexOf('.') + 1)),
                typeArray = type.split(','),
                inArray = false,
                i = 0,
                len = typeArray.length;

            for (i; i < len; i++) {
                if (ext.toUpperCase() == typeArray[i].toUpperCase()) inArray = true;
            }

            return inArray;
        },

        greater_than_date: function (field, date) {
            var enteredDate = this._getValidDate(field.value),
                validDate = this._getValidDate(date);

            if (!validDate || !enteredDate) {
                return false;
            }

            return enteredDate > validDate;
        },

        less_than_date: function (field, date) {
            var enteredDate = this._getValidDate(field.value),
                validDate = this._getValidDate(date);

            if (!validDate || !enteredDate) {
                return false;
            }

            return enteredDate < validDate;
        },

        greater_than_or_equal_date: function (field, date) {
            var enteredDate = this._getValidDate(field.value),
                validDate = this._getValidDate(date);

            if (!validDate || !enteredDate) {
                return false;
            }

            return enteredDate >= validDate;
        },

        less_than_or_equal_date: function (field, date) {
            var enteredDate = this._getValidDate(field.value),
                validDate = this._getValidDate(date);

            if (!validDate || !enteredDate) {
                return false;
            }

            return enteredDate <= validDate;
        }
    };

}


let attributeValue = function (element, attributeName) {
    var i;

    if ((element.length > 0) && (element[0].type === 'radio' || element[0].type === 'checkbox')) {
        let elementLength = element.length;
        for (i = 0; i < elementLength; i++) {
            if (element[i].checked) {
                return element[i][attributeName];
            }
        }

        return;
    }

    return element[attributeName];
};





//window['FormValidator'] = FormValidator;
export = FormValidator;
// })(window, document);

/*
 * Export as a CommonJS module
 */
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = FormValidator;
// }
