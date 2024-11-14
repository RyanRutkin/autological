export const VALUE_OPERATORS = ['=', '>', '<', '>=', '<='] as const;
export type ValueOperator = typeof VALUE_OPERATORS[number];
export const ARRAY_OPERATORS = ['contains' ] as const;
export type ArrayOperator = typeof ARRAY_OPERATORS[number];
export const ARRAY_INSPECTION_OPERATORS = ['filter', 'map' ] as const;
export type ArrayInspectionOperator = typeof ARRAY_INSPECTION_OPERATORS[number];
export const UNDEFINED_OPERATORS = ['is undefined'] as const;
export type UndefinedOperator = typeof UNDEFINED_OPERATORS[number];
export const NULL_OPERATORS = ['is null'] as const;
export type NullOperator = typeof NULL_OPERATORS[number];
export const INVERSION_OPERATORS = ['not', '!=', '!>', '!<', '!>=', '!<='] as const;
export type InversionOperator = typeof INVERSION_OPERATORS[number];
export const UNDEFINED_INVERSION_OPERATORS = ['is not undefined'] as const;
export type UndefinedInversionOperator = typeof UNDEFINED_INVERSION_OPERATORS[number];
export const NULL_INVERSION_OPERATORS = ['is not null'] as const;
export type NullInversionOperator = typeof NULL_INVERSION_OPERATORS[number];
export const LOGICAL_OPERATORS = ['and', 'or'] as const;
export type LogicalOperator = typeof LOGICAL_OPERATORS[number];
export type CastOperator = 'cast';
export type SetOperator = 'set';
export type LengthOperator = "len";
export type SliceOperator = "slice";
export type SpliceOperator = "splice";
export type SortOperator = "sort";


export const VALUE_ARITHMETIC_OPERATORS = ['+', '-', '*', '/', '%', '^'] as const;
export type ValueArithmeticOperator = typeof VALUE_ARITHMETIC_OPERATORS[number];
export const SORT_COMPARISON_OPERATORS = [
    ...VALUE_ARITHMETIC_OPERATORS,
    '>', '<', '>=', '<='
] as const;
export type SortComparisonOperator = typeof SORT_COMPARISON_OPERATORS[number];
export const NON_TARGET_VALUE_ARITHMETIC_OPERATORS = ['sqrt'] as const;
export type NonTargetValueArithmeticOperator = typeof NON_TARGET_VALUE_ARITHMETIC_OPERATORS[number];
export const ARRAY_ARITHMETIC_OPERATORS = ['min', 'max', 'sum', 'mean', 'median', 'mode'] as const;
export type ArrayArithmeticOperator = typeof ARRAY_ARITHMETIC_OPERATORS[number];
export type ArithmeticOperator = ArrayArithmeticOperator | ValueArithmeticOperator;
export const INVERSION_ARITHMETIC_OPERATORS = ['abs'] as const;
export type InversionArithmeticOperator = typeof INVERSION_ARITHMETIC_OPERATORS[number];
// TODO - sort
