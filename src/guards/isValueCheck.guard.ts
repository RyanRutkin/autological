import { Check, ValueCheck } from "../types/Check.type";
import { Condition } from "../types/Condition.type";
import { VALUE_OPERATORS } from "../types/Operator.type";

export function isValueCheck(check: Check | Condition): check is ValueCheck {
    return Object.hasOwn(check, 'path') && Object.hasOwn(check, 'value') && !!VALUE_OPERATORS.find(operator => operator === check.operator);
}
