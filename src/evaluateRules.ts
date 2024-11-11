import { RefPoint, getReferenceByPointer } from 'json-pointer-relational';
import { isLogicalGroupingRule } from './guards/isLogicalGroupingRule.guard';
import {
    ARRAY_INSPECTION_OPERATORS,
    ARRAY_ARITHMETIC_OPERATORS,
    NON_TARGET_VALUE_ARITHMETIC_OPERATORS,
    ARRAY_OPERATORS
} from "./types/Operator.type";
import { EndRule, LogicalGroupingRule, Rule } from './types/Rule.type';

type RuleMatch = {
    match: boolean;
    value: any;
}

// Needs to essentially be rewritten for new Rule structure
function isNumeric(n: any): boolean {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// TODO - Need to not use this. Modify getReferenceByPointer to return tree
function buildTreeFromRefPoint(point: RefPoint): RefPoint[] {
    const tree: RefPoint[] = [point];
    let curPoint = point;
    // TODO - prevent infinite loop
    while (curPoint.parent) {
        tree.unshift(curPoint.parent);
        curPoint = curPoint.parent
    }
    return tree;
}

class RuleEvaluator {
    constructor(kwargs: {
        rules: Rule[];
        jsonDoc: Record<string, any>;
    }) {
        this.rules = kwargs.rules;
        this.jsonDoc = kwargs.jsonDoc;
    }

    // Must be normalized paths oonly
    rules: Rule[] = [];
    pathCache: Record<string, RefPoint> = {};
    jsonDoc: Record<string, any> = {};

    getPathValue(path: string, tree: RefPoint[]) {
        if (this.pathCache[path]) {
            return this.pathCache[path];
        }
        const ref = getReferenceByPointer(path, this.jsonDoc, tree.length ? tree : undefined);
        this.pathCache[ref.normalizedPath] = ref;
        return ref;
    }

    private handleLogicalGroupingRule(genericRule: Record<string, any>, prevRefPoint: RefPoint | null, cascadeVal: any): RuleMatch {
        if (!isLogicalGroupingRule(genericRule)) {
            return {
                match: false,
                value: null
            }
        }
        for (let ruleIdx = 0; ruleIdx < genericRule.rules.length; ruleIdx++) {
            const evalResult = this.process(genericRule.rules[ruleIdx], prevRefPoint, cascadeVal);
            if ((genericRule.operator === 'or' && !!evalResult.result) || (genericRule.operator === 'and' && !evalResult.result)) {
                return {
                    match: true,
                    value: {
                        result: genericRule.operator === 'or' ? true : false,
                        refPoint: prevRefPoint
                    }
                }
            }
        }
        return {
            match: true,
            value: {
                result: true,
                refPoint: prevRefPoint
            }
        };
    }

    private handlePathResolutionRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        if (Object.keys(genericRule).length === 1 && genericRule['path']) {
            // Is a PathResolutionRule. Return val
            return {
                match: true,
                value: {
                    result: pathVal,
                    refPoint: curRefPoint
                }
            }
        }
        return {
            match: false,
            value: null
        }
    }

    private handleEndRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        // Handle EndRule
        const curOperator: string | undefined = genericRule['operator'];
        switch(curOperator) {
            case 'is undefined':
                return {
                    match: true,
                    value: {
                        result: pathVal === undefined,
                        refPoint: curRefPoint
                    }
                }
            case 'is not undefined':
                return {
                    match: true,
                    value: {
                        result: pathVal !== undefined,
                        refPoint: curRefPoint
                    }
                }
            case 'is null':
                return {
                    match: true,
                    value: {
                        result: pathVal === null,
                        refPoint: curRefPoint
                    }
                }
            case 'is not null':
                return {
                    match: true,
                    value: {
                        result: pathVal !== null,
                        refPoint: curRefPoint
                    }
                }
            case 'abs':
                if (!isNumeric(pathVal)) {
                    throw new Error('Cannot perform operation "abs" on non-number');
                }
                return {
                    match: true,
                    value: {
                        result: Math.abs(parseFloat(pathVal)),
                        refPoint: curRefPoint
                    }
                }
        }
        return {
            match: false,
            value: null
        };
    }

    private handleCastRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string | undefined = genericRule['operator'];
        if (curOperator !== 'cast') {
            return {
                match: false,
                value: null
            }
        }
        switch(genericRule['castTo']) {
            case 'string':
                let strCastResult: string = String(pathVal);
                if (pathVal && typeof pathVal === 'object' && !Array.isArray(pathVal)) {
                    try {
                        strCastResult = JSON.stringify(pathVal);
                    } catch(e) {}
                }
                return {
                    match: true,
                    value: {
                        result: strCastResult,
                        refPoint: curRefPoint
                    }
                }
            case 'boolean':
                return {
                    match: true,
                    value: {
                        result: !!pathVal,
                        refPoint: curRefPoint
                    }
                }
            case 'number':
                if (!isNumeric(pathVal)) {
                    throw new Error(`Cannot cast non-numeric to number. Value: ${pathVal}`);
                }
                return {
                    match: true,
                    value: {
                        result: parseFloat(pathVal),
                        refPoint: curRefPoint
                    }
                }
            case 'JSON':
                let result: Record<string, any> | undefined = undefined;
                try {
                    result = JSON.parse(pathVal);
                } catch(e) {
                    throw new Error(`Unable to cast value to JSON. Value: ${pathVal}`);
                }
                return {
                    match: true,
                    value: {
                        result,
                        refPoint: curRefPoint
                    }
                }
            default:
                throw new Error(`Casting to "${genericRule['castTo']}" not currently supported`);
        }
    }

    private handleArrayInspectionRules(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        // Guaranteed by previous check
        const curOperator: string = genericRule['operator'];
        if (!(ARRAY_INSPECTION_OPERATORS as unknown as string[]).includes(curOperator)) {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            throw new Error(`Cannot perform ${curOperator} on non-array`);
        }
        const arrRules: Rule[] = genericRule['rules'];
        if (!Array.isArray(arrRules)) {
            throw new Error(`No rules array provided for array ${curOperator}`);
        }
        const arrResult: any[] = [];
        for (let arrIdx = 0; arrIdx < pathVal.length; arrIdx++) {
            let arrVal = pathVal[arrIdx];
            const arrRefPoint: RefPoint = {
                obj: arrVal,
                key: String(arrIdx),
                normalizedPath: `${curRefPoint.normalizedPath}/${String(arrIdx)}`,
                parent: curRefPoint
            }
            for (let ruleIdx = 0; ruleIdx < arrRules.length; ruleIdx++) {
                const { result } = this.process(arrRules[ruleIdx], arrRefPoint, arrVal);
                arrVal = result;
            }
            if (curOperator === 'filter' && !!arrVal) {
                arrResult.push(pathVal[arrIdx]);
            } else if (curOperator === 'map') {
                arrResult.push(arrVal);
            }
        }
        return {
            match: true,
            value: {
                result: arrResult,
                refPoint: {
                    ...curRefPoint,
                    obj: arrResult
                }
            }
        }
    }

    process(rule: Rule, prevRefPoint: RefPoint | null, cascadeVal: any): {
        result: any;
        refPoint: RefPoint | null;
    } {
        const genericRule = rule as unknown as Record<string, any>;

        let ruleMatch = this.handleLogicalGroupingRule(genericRule, prevRefPoint, cascadeVal);
        if (ruleMatch) {
            return ruleMatch.value;
        }

        let tree: RefPoint[] = prevRefPoint ? buildTreeFromRefPoint(prevRefPoint) : [];
        let pathVal: any = cascadeVal;
        if (genericRule["path"]) {
            const ref = this.getPathValue(genericRule["path"], tree);
            pathVal = ref.obj;
            tree = buildTreeFromRefPoint(ref);
        }

        // Either we have a prevRefPoint or we have a path
        // Therefore, tree should have length
        if (!tree.length) {
            throw new Error('Unexpected error when processing rules. Unable to traverse JSON document.');
        }
        const curRefPoint = tree[tree.length - 1];

        ruleMatch = this.handlePathResolutionRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch) {
            return ruleMatch.value;
        }

        // All Rule types past this point require an operator
        const curOperator: string | undefined = genericRule['operator'];
        if (!curOperator) {
            throw new Error('Unable to process rule. No action defined');
        }

        ruleMatch = this.handleEndRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch) {
            return ruleMatch.value;
        }

        ruleMatch = this.handleCastRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch) {
            return ruleMatch.value;
        }
        
        ruleMatch = this.handleArrayInspectionRules(genericRule, curRefPoint, pathVal);
        if (ruleMatch) {
            return ruleMatch.value;
        }

        // Array arithmetic operators
        if ((ARRAY_ARITHMETIC_OPERATORS as unknown as string[]).includes(curOperator)) {
            if (!Array.isArray(pathVal)) {
                throw new Error(`Cannot perform ${curOperator} on non-array`);
            }
            if (!pathVal.length) {
                throw new Error(`Cannot perform ${curOperator} on empty array`);
            }
            // Its up for debate what the fastest option is for these methods,
            // and I want to support comparison on non-numeric types.
            // Therefore, I'll be avoiding Math.min, Math.max, etc.
            switch (curOperator) {
                case 'min':
                    let minVal = pathVal[0];
                    for (let minIdx = 1; minIdx < pathVal.length; minIdx++) {
                        if (pathVal[minIdx] < minVal) {
                            minVal = pathVal[minIdx];
                        }
                    }
                    return {
                        result: minVal,
                        refPoint: curRefPoint
                    }
                case 'max':
                    let maxVal = pathVal[0];
                    for (let maxIdx = 1; maxIdx < pathVal.length; maxIdx++) {
                        if (pathVal[maxIdx] > maxVal) {
                            maxVal = pathVal[maxIdx];
                        }
                    }
                    return {
                        result: maxVal,
                        refPoint: curRefPoint
                    }
                case 'sum':
                    let sumVal = pathVal[0];
                    for (let sumIdx = 1; sumIdx < pathVal.length; sumIdx++) {
                        sumVal = sumVal+pathVal[sumIdx];
                    }
                    return {
                        result: sumVal,
                        refPoint: curRefPoint
                    }
                case 'mean':
                    // Requiring numeric
                    let meanVal = pathVal[0];
                    for (let meanIdx = 1; meanIdx < pathVal.length; meanIdx++) {
                        if (!isNumeric(pathVal[meanIdx])) {
                            throw new Error('Cannot perform "mean" operation. Non-numeric index encountered');
                        }
                        meanVal += pathVal[meanIdx];
                    }
                    return {
                        result: meanVal/pathVal.length,
                        refPoint: curRefPoint
                    }
                case 'median':
                    // Requiring numeric
                    const sortedArray = pathVal.sort((a,b) => {
                        if (!isNumeric(a) || !isNumeric(b)) {
                            throw new Error('Cannot perform "median" operation. Non-numeric index encountered');
                        }
                        return a - b;
                    });
                    const middleIdx = sortedArray.length/2;
                    if (!(middleIdx%1)) {
                        return sortedArray[middleIdx];
                    }
                    if (sortedArray.length === 1) {
                        return sortedArray[0];
                    }
                    return {
                        result: (sortedArray[Math.floor(middleIdx)] + sortedArray[Math.floor(middleIdx)+1]) / 2,
                        refPoint: curRefPoint
                    }
                case 'mode':
                    const modeMap: Record<string, number> = {
                        [String(pathVal[0])]: 1
                    };
                    let maxKey: string = String(pathVal[0]);
                    for (let modeIdx = 1; modeIdx < pathVal.length; modeIdx++) {
                        const key = String(pathVal[modeIdx]);
                        if (!modeMap[key]) {
                            modeMap[key] = 0;
                        }
                        modeMap[key]++;
                        if (modeMap[key] > modeMap[maxKey]) {
                            maxKey = key;
                        }
                    }
                    return {
                        result: maxKey,
                        refPoint: curRefPoint
                    }
            }
        }
        // ContainsRule
        if ((ARRAY_OPERATORS as unknown as string[]).includes(curOperator)) {
            if (!Array.isArray(pathVal)) {
                throw new Error(`Cannot perform ${curOperator} on non-array`);
            }
            let targetVal: any = genericRule['value'];
            const parentRef = tree[tree.length - 1];
            for (let arrIdx = 0; arrIdx < pathVal.length; arrIdx++) {
                let arrVal = pathVal[arrIdx];
                if (genericRule['getValue']) {
                    const arrRefPoint: RefPoint = {
                        obj: arrVal,
                        key: String(arrIdx),
                        normalizedPath: `${parentRef.normalizedPath}/${String(arrIdx)}`,
                        parent: parentRef
                    }
                    const getValueRules: Rule[] = genericRule['getValue'];
                    targetVal = pathVal[arrIdx];
                    for (let ruleIdx = 0; ruleIdx < getValueRules.length; ruleIdx++) {
                        const { result } = this.process(getValueRules[ruleIdx], arrRefPoint, targetVal);
                        targetVal = result;
                    }
                }
                if (pathVal[arrIdx] === targetVal) {
                    return {
                        result: true,
                        refPoint: curRefPoint
                    }
                }
            }
        }
        // Handle non-value arithmetic
        if ((NON_TARGET_VALUE_ARITHMETIC_OPERATORS as unknown as string[]).includes(curOperator)) {
            if (!isNumeric(pathVal)) {
                throw new Error(`Cannot perform operation "${curOperator}" on non-numeric`);
            }
            switch(curOperator) {
                case 'sqrt':
                    return {
                        result: Math.sqrt(parseFloat(pathVal)),
                        refPoint: curRefPoint
                    }
                default:
                    throw new Error(`Operator "${curOperator}" is not currently supported.`);
            }
        }
        // Everything from this point on should have some sort of "value"
        let targetVal: any = genericRule['value'];
        if (genericRule['getValue']) {
            const getValueRules: Rule[] = genericRule['getValue'];
            targetVal = pathVal;
            for (let ruleIdx = 0; ruleIdx < getValueRules.length; ruleIdx++) {
                const { result } = this.process(getValueRules[ruleIdx], tree[tree.length - 1], targetVal);
                targetVal = result;
            }
        }
    
        // VALUE_OPERATORS: '=', '>', '<', '>=', '<=' 
        // INVERSION_OPERATORS: 'not', '!=', '!>', '!<', '!>=', '!<='
        // VALUE_ARITHMETIC_OPERATORS: '+', '-', '*', '/', '%', 'sqrt', '^'
        switch(curOperator) {
            case '=':
                return {
                    result: pathVal === targetVal,
                    refPoint: curRefPoint
                }
            case '>':
                return {
                    result: pathVal > targetVal,
                    refPoint: curRefPoint
                }
            case '<':
                return {
                    result: pathVal < targetVal,
                    refPoint: curRefPoint
                }
            case '>=':
                return {
                    result: pathVal >= targetVal,
                    refPoint: curRefPoint
                }
            case '<=':
                return {
                    result: pathVal <= targetVal,
                    refPoint: curRefPoint
                }
            case 'not':
            case '!=':
                return {
                    result: pathVal !== targetVal,
                    refPoint: curRefPoint
                }
            case '!>':
                return {
                    result: pathVal !> targetVal,
                    refPoint: curRefPoint
                }
            case '!<':
                return {
                    result: pathVal !< targetVal,
                    refPoint: curRefPoint
                }
            case '!>=':
                return {
                    result: pathVal !>= targetVal,
                    refPoint: curRefPoint
                }
            case '!<=':
                return {
                    result: pathVal !<= targetVal,
                    refPoint: curRefPoint
                }
            case '+':
                return {
                    result: pathVal + targetVal,
                    refPoint: curRefPoint
                }
        }
        // The following operators require both ends to be numeric
        if (!isNumeric(pathVal) || !isNumeric(targetVal)) {
            throw new Error(`Cannot perform operation on non-numeric. Attempted "${curOperator}" between ${pathVal} and ${targetVal}`);
        }
        switch(curOperator) {
            case '-':
                return {
                    result: pathVal - targetVal,
                    refPoint: curRefPoint
                }
            case '*':
                return {
                    result:  pathVal * targetVal,
                    refPoint: curRefPoint
                }
            case '/':
                return {
                    result: pathVal / targetVal,
                    refPoint: curRefPoint
                }
            case '%':
                return {
                    result: pathVal % targetVal,
                    refPoint: curRefPoint
                }
            case '^':
                return {
                    result: Math.pow(pathVal, targetVal),
                    refPoint: curRefPoint
                }
        }
    
        throw new Error(`Operator "${curOperator}" not implemented`);
    }

    evaluateRules(): any {
        let cascadeResult: any = null;
        let cascadeRefPoint: RefPoint | null = null;
        for (let ruleIdx = 0; ruleIdx < this.rules.length; ruleIdx++) {
            const {
                result,
                refPoint
            } = this.process(this.rules[ruleIdx], cascadeRefPoint, cascadeResult);
            cascadeResult = result;
            cascadeRefPoint = refPoint;
        }
        return cascadeResult;
    }
}


export function evaluateRules(rules: Rule[], jsonDoc: Record<string, any>): any {
    const ruleProcessor = new RuleEvaluator({
        rules,
        jsonDoc
    });
    return ruleProcessor.evaluateRules();
}