"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArrayCheck = void 0;
const Operator_type_1 = require("../types/Operator.type");
function isArrayCheck(check) {
    return Object.hasOwn(check, 'path') && !!Operator_type_1.ARRAY_OPERATORS.find(operator => operator === check.operator);
}
exports.isArrayCheck = isArrayCheck;
