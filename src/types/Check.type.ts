import { ValueOperator, ArrayOperator, InversionOperator } from "./Operator.type";
import { Condition } from './Condition.type';

export type ValueCheck = {
    path: string;
    operator: ValueOperator;
    value: any;
}

export type ArrayCheck = {
    path: string;
    operator: ArrayOperator;
    condition: Condition;
}

export type InversionCheck = {
    operator: InversionOperator;
    target: Condition | Check;
}

export type Check = ValueCheck | ArrayCheck | InversionCheck;