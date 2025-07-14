import { LogicalGroupingRule } from '../types/Rule.type';
import { LOGICAL_OPERATORS } from '../types/Operator.type';
import { isIn } from '../utils';

export function isLogicalGroupingRule(obj: any): obj is LogicalGroupingRule {
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && isIn<string>(LOGICAL_OPERATORS, obj['operator']) && Array.isArray(obj['rules'])) {
        return true;
    }
    return false;
}
