import { LOGICAL_OPERATORS } from "../types/Operator.type";
export function isCondition(check) {
    return Object.hasOwn(check, 'checks') && !!LOGICAL_OPERATORS.find(operator => operator === check.operator);
}
