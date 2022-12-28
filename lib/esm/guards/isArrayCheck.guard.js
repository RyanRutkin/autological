import { ARRAY_OPERATORS } from "../types/Operator.type";
export function isArrayCheck(check) {
    return Object.hasOwn(check, 'path') && !!ARRAY_OPERATORS.find(operator => operator === check.operator);
}
