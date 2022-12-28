import { Check, ValueCheck } from "../types/Check.type";
import { Condition } from "../types/Condition.type";
import { VALUE_OPERATORS } from "../types/Operator.type";

export function isValueCheck(check: Check | Condition): check is ValueCheck {
    return (check as any)['path'] && (check as any)['value'] && !!VALUE_OPERATORS.find(operator => operator === check.operator);
}
