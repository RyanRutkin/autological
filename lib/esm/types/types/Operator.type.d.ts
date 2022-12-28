export declare const VALUE_OPERATORS: readonly ["=", ">", "<", ">=", "<="];
export type ValueOperator = typeof VALUE_OPERATORS[number];
export declare const ARRAY_OPERATORS: readonly ["contains"];
export type ArrayOperator = typeof ARRAY_OPERATORS[number];
export type Operator = ArrayOperator | ValueOperator;
export declare const INVERSION_OPERATORS: readonly ["not"];
export type InversionOperator = typeof INVERSION_OPERATORS[number];
export declare const LOGICAL_OPERATORS: readonly ["and", "or"];
export type LogicalOperator = typeof LOGICAL_OPERATORS[number];
//# sourceMappingURL=Operator.type.d.ts.map