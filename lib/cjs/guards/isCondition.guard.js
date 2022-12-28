"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCondition = void 0;
const Operator_type_1 = require("../types/Operator.type");
function isCondition(check) {
    return Object.hasOwn(check, 'checks') && !!Operator_type_1.LOGICAL_OPERATORS.find(operator => operator === check.operator);
}
exports.isCondition = isCondition;
