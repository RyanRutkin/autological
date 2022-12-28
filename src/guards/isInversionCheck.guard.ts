import { Check, InversionCheck } from "../types/Check.type";
import { Condition } from "../types/Condition.type";
import { INVERSION_OPERATORS } from "../types/Operator.type";

export function isInversionCheck(check: Check | Condition): check is InversionCheck {
    return (check as any)['target'] && !!INVERSION_OPERATORS.find(operator => operator === check.operator);
}
