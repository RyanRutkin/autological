"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInversionCheck = void 0;
const Operator_type_1 = require("../types/Operator.type");
function isInversionCheck(check) {
    return Object.hasOwn(check, 'target') && !!Operator_type_1.INVERSION_OPERATORS.find(operator => operator === check.operator);
}
exports.isInversionCheck = isInversionCheck;
