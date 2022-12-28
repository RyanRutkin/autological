import { LogicalOperator } from './Operator.type';
import { Check } from './Check.type';
export type Condition = {
    operator: LogicalOperator;
    checks: (Check | Condition)[];
};
//# sourceMappingURL=Condition.type.d.ts.map