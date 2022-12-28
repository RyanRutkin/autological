import { Check, ArrayCheck } from "../types/Check.type";
import { Condition } from "../types/Condition.type";
import { ARRAY_OPERATORS } from "../types/Operator.type";

export function isArrayCheck(check: Check | Condition): check is ArrayCheck {
    return Object.hasOwn(check, 'path') && !!ARRAY_OPERATORS.find(operator => operator === check.operator);
}
