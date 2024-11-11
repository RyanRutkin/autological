import { LogicalGroupingRule } from '../types/Rule.type';
import { LOGICAL_OPERATORS } from '../types/Operator.type';

export function isLogicalGroupingRule(obj: any): obj is LogicalGroupingRule {
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && LOGICAL_OPERATORS.includes(obj['operator']) && Array.isArray(obj['rules'])) {
        return true;
    }
    return false;
}
