export const VALUE_OPERATORS = ['=', '>', '<', '>=', '<='] as const;
export type ValueOperator = typeof VALUE_OPERATORS[number];
export const ARRAY_OPERATORS = ['contains'] as const;
export type ArrayOperator = typeof ARRAY_OPERATORS[number];
export type Operator = ArrayOperator | ValueOperator;
export const INVERSION_OPERATORS = ['not'] as const;
export type InversionOperator = typeof INVERSION_OPERATORS[number];
export const LOGICAL_OPERATORS = ['and', 'or'] as const;
export type LogicalOperator = typeof LOGICAL_OPERATORS[number];
