import { Check } from "../types/Check.type";
import { Condition } from "../types/Condition.type";
import { LOGICAL_OPERATORS } from "../types/Operator.type";

export function isCondition(check: Check | Condition): check is Condition {
    return (check as any)['checks'] && !!LOGICAL_OPERATORS.find(operator => operator === check.operator);
}
