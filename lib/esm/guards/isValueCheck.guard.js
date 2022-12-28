import { VALUE_OPERATORS } from "../types/Operator.type";
export function isValueCheck(check) {
    return Object.hasOwn(check, 'path') && Object.hasOwn(check, 'value') && !!VALUE_OPERATORS.find(operator => operator === check.operator);
}
