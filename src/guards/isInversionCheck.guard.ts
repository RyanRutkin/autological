import { Check, InversionCheck } from "../types/Check.type";
import { Condition } from "../types/Condition.type";
import { INVERSION_OPERATORS } from "../types/Operator.type";

export function isInversionCheck(check: Check | Condition): check is InversionCheck {
    return Object.hasOwn(check, 'target') && !!INVERSION_OPERATORS.find(operator => operator === check.operator);
}
