import { INVERSION_OPERATORS } from "../types/Operator.type";
export function isInversionCheck(check) {
    return Object.hasOwn(check, 'target') && !!INVERSION_OPERATORS.find(operator => operator === check.operator);
}
