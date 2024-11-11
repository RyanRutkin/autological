import {
    ArrayArithmeticOperator,
    ArrayInspectionOperator,
    ArrayOperator,
    CastOperator,
    InversionArithmeticOperator,
    InversionOperator,
    LogicalOperator,
    NullInversionOperator,
    NullOperator,
    UndefinedInversionOperator,
    UndefinedOperator,
    ValueArithmeticOperator,
    ValueOperator
} from './Operator.type';

export type EndRule = {
    path?: string;
    operator:
        UndefinedOperator | 
        UndefinedInversionOperator | 
        NullOperator | 
        NullInversionOperator | 
        InversionArithmeticOperator;
}

export type CastRule = {
    path?: string;
    operator: CastOperator;
    castTo: 'string' | 'boolean' | 'number' | 'JSON';
}

export type LogicalValueRule = {
    path?: string;
    operator: ValueOperator | InversionOperator;
    value: string | number | boolean | undefined | null;
}

export type LogicalValueRuleDerived = {
    path?: string;
    operator: ValueOperator | InversionOperator;
    getValue: Rule[];
}

export type ContainsRule = {
    path?: string;
    operator: ArrayOperator;
    value: string | number | boolean | undefined | null;
}

export type ContainsRuleDerived = {
    path?: string;
    operator: ArrayOperator;
    getValue: Rule[];
}

export type ArtithmeticValueRule = {
    path?: string;
    operator: ValueArithmeticOperator;
    value: string | number;
}

export type ArtithmeticValueRuleDerived = {
    path?: string;
    operator: ValueArithmeticOperator;
    getValue: Rule[];
}

export type ArrayArtithmeticInspectionRule = {
    path?: string;
    operator: ArrayArithmeticOperator;
}

export type LogicalGroupingRule = {
    operator: LogicalOperator;
    rules: Rule[];
}

export type PathResolutionRule = {
    path: string;
}

export type ArrayInspectionRule = {
    path?: string;
    operator: ArrayInspectionOperator;
    rules: Rule[];
}

export type Rule = 
    EndRule |
    CastRule |
    LogicalValueRule | 
    LogicalValueRuleDerived |
    ArtithmeticValueRule |
    ArtithmeticValueRuleDerived |
    ArrayArtithmeticInspectionRule |
    LogicalGroupingRule |
    PathResolutionRule |
    ArrayInspectionRule;
