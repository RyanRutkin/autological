import { LogicalGroupingRule } from '../defs/Rule.js';
import { LOGICAL_OPERATORS } from '../defs/Operator.js';
import { isIn } from '../utils.js';

export function isLogicalGroupingRule(obj: any): obj is LogicalGroupingRule {
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && isIn<string>(LOGICAL_OPERATORS, obj['operator']) && Array.isArray(obj['rules'])) {
        return true;
    }
    return false;
}
