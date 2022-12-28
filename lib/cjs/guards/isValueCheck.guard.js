"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValueCheck = void 0;
const Operator_type_1 = require("../types/Operator.type");
function isValueCheck(check) {
    return Object.hasOwn(check, 'path') && Object.hasOwn(check, 'value') && !!Operator_type_1.VALUE_OPERATORS.find(operator => operator === check.operator);
}
exports.isValueCheck = isValueCheck;
