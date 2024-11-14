import {
    ArrayArithmeticOperator,
    ArrayInspectionOperator,
    ArrayOperator,
    CastOperator,
    InversionArithmeticOperator,
    InversionOperator,
    LengthOperator,
    LogicalOperator,
    NullInversionOperator,
    NullOperator,
    SetOperator,
    SliceOperator,
    SortComparisonOperator,
    SortOperator,
    SpliceOperator,
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

export type SetRule = {
    path?: string;
    operator: SetOperator;
    setPath: string;
    value: any;
}

export type SetRuleDerived = {
    path?: string;
    operator: SetOperator;
    setPath: string;
    getValue: Rule[];
}

export type SetRuleCascade = {
    path?: string;
    operator: SetOperator;
    setPath: string;
}

export type LengthRule = {
    path?: string;
    operator: LengthOperator;
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

export type ArraySliceRule = {
    path?: string;
    operator: SliceOperator;
    startIndex?: number;
    endIndex: number;
}

export type ArraySpliceRule = {
    path?: string;
    operator: SpliceOperator;
    startIndex?: number;
    deleteCount?: number;
    itemsToAdd?: any[];
}

export type ArraySortRule = {
    path?: string;
    operator: SortOperator;
    getComparisonValue: Rule[];
    comparisonOperator?: SortComparisonOperator;
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
    ArrayInspectionRule |
    SetRule |
    SetRuleDerived |
    SetRuleCascade |
    LengthRule |
    ArraySliceRule |
    ArraySpliceRule |
    ArraySortRule;
