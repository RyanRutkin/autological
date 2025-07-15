import { RefPoint, getReferenceByPointer, setByPointerWithRef, tokenizeJsonPointer } from 'json-pointer-relational';
import { isLogicalGroupingRule } from './guards/isLogicalGroupingRule.js';
import {
    ARRAY_INSPECTION_OPERATORS,
    ARRAY_ARITHMETIC_OPERATORS,
    NON_TARGET_VALUE_ARITHMETIC_OPERATORS,
    ARRAY_OPERATORS
} from "./defs/Operator.js";
import { type Rule } from './defs/Rule.js';
import { isIn } from './utils.js';

type RuleMatch = {
    match: boolean;
    value: any;
}

type JsonDocument = Record<string, any>;

type MapSortEntry = {
    index: number;
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
    const pathMap: Record<string, boolean> = {};
    while (curPoint.parent) {
        if (pathMap[curPoint.parent.normalizedPath]) {
            throw new Error('Unable to process document structure. Infinite loop detected.');
        }
        pathMap[curPoint.parent.normalizedPath] = true;
        tree.unshift(curPoint.parent);
        curPoint = curPoint.parent
    }
    return tree;
}

function getErrorMessage(e: unknown) {
    try {
        return (e as Record<string, any>)['message'] as string;
    } catch(error) {
        return undefined;
    }
}

class RuleEvaluator {
    constructor(kwargs: {
        rules: Rule[];
        documents: JsonDocument[];
        primaryDocument?: string;
    }) {
        if (!kwargs.rules.length) {
            throw new Error('No rule provided to be evaluated.');
        }
        if (!kwargs.documents.length) {
            throw new Error('No documents provided to be evaluated.');
        }
        this.rules = kwargs.rules;
        this.documentMap = {
            '$vars': {},
            ...kwargs.documents.reduce((acc, cur) => {
                const docId = cur['$id'];
                if (!docId) {
                    throw new Error('All documents are required to have an "$id" property.')
                }
                // We need a deep copy of each JSON document so we don't modify anything by ref
                // This is an expensive operation, but the only way to guarantee a deep copy.
                acc[docId] = JSON.parse(JSON.stringify(cur));
                return acc;
            }, {} as Record<string, JsonDocument>)
        };
        this.primaryDocumentId = kwargs.primaryDocument || kwargs.documents[0]['$id'];
        this.currentDocument = this.documentMap[this.primaryDocumentId];
    }

    rules: Rule[];
    documentMap: Record<string, JsonDocument>;
    primaryDocumentId: string;
    currentDocument: JsonDocument;

    private errorHandler(msg: string) {
        throw new Error(msg);
    }

    private getPathValue(path: string, tree: RefPoint[]) {
        let tokens = tokenizeJsonPointer(path);
        let getPath = path;
        let getTree = tree;
        let doc = this.currentDocument;
        if (tokens[0] && this.documentMap[tokens[0]]) {
            doc = this.documentMap[tokens[0]];
            tokens = tokens.slice(1);
            getPath = `/${tokens.join('/')}`;
            getTree = [];
        }
        let ref: RefPoint | null = null
        try {
            ref = getReferenceByPointer(getPath, doc, getTree.length ? getTree : undefined);
        } catch(e) {
            this.errorHandler(getErrorMessage(e) || 'Invalid JSON Pointer for get action');
            throw new Error('unhit error makes typescript happy');
        }
        return {
            refPoint: ref,
            doc,
            tree: getTree,
            path: getPath
        }
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
                    this.errorHandler('Cannot perform operation "abs" on non-number');
                    throw new Error('unhit error makes typescript happy');
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
                    this.errorHandler(`Cannot cast non-numeric to number. Value: ${pathVal}`);
                    throw new Error('unhit error makes typescript happy');
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
                    this.errorHandler(`Unable to cast value to JSON. Value: ${pathVal}`);
                    throw new Error('unhit error makes typescript happy');
                }
                return {
                    match: true,
                    value: {
                        result,
                        refPoint: curRefPoint
                    }
                }
            default:
                this.errorHandler(`Casting to "${genericRule['castTo']}" not currently supported`);
                throw new Error('unhit error makes typescript happy');
        }
    }

    private handleArrayInspectionRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        // Guaranteed by previous check
        const curOperator: string = genericRule['operator'];
        if (!isIn<string>(ARRAY_INSPECTION_OPERATORS, curOperator)) {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform ${curOperator} on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        const arrRules: Rule[] = genericRule['rules'];
        if (!Array.isArray(arrRules)) {
            this.errorHandler(`No rules array provided for array ${curOperator}`);
            throw new Error('unhit error makes typescript happy');
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

    private handleArrayArithmeticRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (!isIn<string>(ARRAY_ARITHMETIC_OPERATORS, curOperator)) {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform ${curOperator} on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        if (!pathVal.length) {
            this.errorHandler(`Cannot perform ${curOperator} on empty array`);
            throw new Error('unhit error makes typescript happy');
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
                    match: true,
                    value: {
                        result: minVal,
                        refPoint: curRefPoint
                    }
                }
            case 'max':
                let maxVal = pathVal[0];
                for (let maxIdx = 1; maxIdx < pathVal.length; maxIdx++) {
                    if (pathVal[maxIdx] > maxVal) {
                        maxVal = pathVal[maxIdx];
                    }
                }
                return {
                    match: true,
                    value: {
                        result: maxVal,
                        refPoint: curRefPoint
                    }
                }
            case 'sum':
                let sumVal = pathVal[0];
                for (let sumIdx = 1; sumIdx < pathVal.length; sumIdx++) {
                    sumVal = sumVal+pathVal[sumIdx];
                }
                return {
                    match: true,
                    value: {
                        result: sumVal,
                        refPoint: curRefPoint
                    }
                }
            case 'mean':
                // Requiring numeric
                let meanVal = pathVal[0];
                for (let meanIdx = 1; meanIdx < pathVal.length; meanIdx++) {
                    if (!isNumeric(pathVal[meanIdx])) {
                        this.errorHandler('Cannot perform "mean" operation. Non-numeric index encountered');
                        throw new Error('unhit error makes typescript happy');
                    }
                    meanVal += pathVal[meanIdx];
                }
                return {
                    match: true,
                    value: {
                        result: meanVal/pathVal.length,
                        refPoint: curRefPoint
                    }
                }
            case 'median':
                // Requiring numeric
                const sortedArray = pathVal.sort((a,b) => {
                    if (!isNumeric(a) || !isNumeric(b)) {
                        this.errorHandler('Cannot perform "median" operation. Non-numeric index encountered');
                        throw new Error('unhit error makes typescript happy');
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
                    match: true,
                    value: {
                        result: (sortedArray[Math.floor(middleIdx)] + sortedArray[Math.floor(middleIdx)+1]) / 2,
                        refPoint: curRefPoint
                    }
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
                    match: true,
                    value: {
                        result: maxKey,
                        refPoint: curRefPoint
                    }
                }
            default:
                this.errorHandler(`Support for array arithmetic operator ${curOperator} has not yet been implemented.`);
                throw new Error('unhit error makes typescript happy');
        }
    }

    private handleContainsRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (!isIn<string>(ARRAY_OPERATORS, curOperator)) {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform ${curOperator} on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        let targetVal: any = genericRule['value'];
        for (let arrIdx = 0; arrIdx < pathVal.length; arrIdx++) {
            let arrVal = pathVal[arrIdx];
            if (genericRule['getValue']) {
                const arrRefPoint: RefPoint = {
                    obj: arrVal,
                    key: String(arrIdx),
                    normalizedPath: `${curRefPoint.normalizedPath}/${String(arrIdx)}`,
                    parent: curRefPoint
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
                    match: true,
                    value: {
                        result: true,
                        refPoint: curRefPoint
                    }
                }
            }
        }
        return {
            match: true,
            value: {
                result: false,
                refPoint: curRefPoint
            }
        }
    }

    private handleNonValueArithmeticRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (!isIn<string>(NON_TARGET_VALUE_ARITHMETIC_OPERATORS, curOperator)) {
            return {
                match: false,
                value: null
            }
        }
        if (!isNumeric(pathVal)) {
            this.errorHandler(`Cannot perform operation "${curOperator}" on non-numeric`);
            throw new Error('unhit error makes typescript happy');
        }
        switch(curOperator) {
            case 'sqrt':
                return {
                    match: true,
                    value: {
                        result: Math.sqrt(parseFloat(pathVal)),
                        refPoint: curRefPoint
                    }
                }
            default:
                this.errorHandler(`Operator "${curOperator}" is not currently supported.`);
                throw new Error('unhit error makes typescript happy');
        }
    }

    private handleStandardArithmeticRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any, targetVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        // VALUE_OPERATORS: '=', '>', '<', '>=', '<=' 
        // INVERSION_OPERATORS: 'not', '!=', '!>', '!<', '!>=', '!<='
        // VALUE_ARITHMETIC_OPERATORS: '+', '-', '*', '/', '%', 'sqrt', '^'
        switch(curOperator) {
            case '=':
                return {
                    match: true,
                    value: {
                        result: pathVal === targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '>':
                return {
                    match: true,
                    value: {
                        result: pathVal > targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '<':
                return {
                    match: true,
                    value: {
                        result: pathVal < targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '>=':
                return {
                    match: true,
                    value: {
                        result: pathVal >= targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '<=':
                return {
                    match: true,
                    value: {
                        result: pathVal <= targetVal,
                        refPoint: curRefPoint
                    }
                }
            case 'not':
            case '!=':
                return {
                    match: true,
                    value: {
                        result: pathVal !== targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '!>':
                return {
                    match: true,
                    value: {
                        result: pathVal !> targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '!<':
                return {
                    match: true,
                    value: {
                        result: pathVal !< targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '!>=':
                return {
                    match: true,
                    value: {
                        result: pathVal !>= targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '!<=':
                return {
                    match: true,
                    value: {
                        result: pathVal !<= targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '+':
                return {
                    match: true,
                    value: {
                        result: pathVal + targetVal,
                        refPoint: curRefPoint
                    }
                }
        }
        return {
            match: false,
            value: null
        }
    }

    private handleNumericArithmeticRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: number, targetVal: number): RuleMatch {
        const curOperator: string = genericRule['operator'];
        switch(curOperator) {
            case '-':
                return {
                    match: true,
                    value: {
                        result: pathVal - targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '*':
                return {
                    match: true,
                    value: {
                        result:  pathVal * targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '/':
                return {
                    match: true,
                    value: {
                        result: pathVal / targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '%':
                return {
                    match: true,
                    value: {
                        result: pathVal % targetVal,
                        refPoint: curRefPoint
                    }
                }
            case '^':
                return {
                    match: true,
                    value: {
                        result: Math.pow(pathVal, targetVal),
                        refPoint: curRefPoint
                    }
                }
        }
        return {
            match: false,
            value: null
        }
    }

    private handleSetRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any, targetVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (curOperator !== 'set') {
            return {
                match: false,
                value: null
            }
        }
        const setPath = genericRule["setPath"];
        if (!setPath) {
            this.errorHandler('The "set" operator cannot be used without a "setPath" property.');
            throw new Error('unhit error makes typescript happy');
        }
        const tree = buildTreeFromRefPoint(curRefPoint);
        const docRef = this.getPathValue(setPath, tree);
        const valToSet = Object.hasOwn(genericRule, 'value') || Object.hasOwn(genericRule, 'getValue') ? targetVal : pathVal;
        let ref: RefPoint | null = null;
        try {
            ref = setByPointerWithRef(
                valToSet,
                docRef.path,
                docRef.doc,
                docRef.tree.length ? docRef.tree : undefined
            );
        } catch(e) {
            this.errorHandler(getErrorMessage(e) || 'Invalid JSON Pointer for set action');
            throw new Error('unhit error makes typescript happy');
        }
        const setNodeRef = ref!.parent;
        if (!setNodeRef) {
            this.errorHandler('Failed to resolve target for "set" action');
            throw new Error('unhit error makes typescript happy');
        }
        return {
            match: true,
            value: {
                result: curRefPoint.obj,
                refPoint: curRefPoint
            }
        }
    }

    private handleLengthRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (curOperator !== "len") {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform operation "${curOperator}" on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        return {
            match: true,
            value: {
                result: pathVal.length,
                refPoint: curRefPoint
            }
        }
    }

    private handleArraySliceRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (curOperator !== "slice") {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform operation "${curOperator}" on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        const { startIndex, endIndex } = genericRule;
        if (startIndex === undefined && endIndex === undefined) {
            return {
                match: true,
                value: {
                    result: pathVal,
                    refPoint: curRefPoint
                }
            }
        }
        if (startIndex === undefined || endIndex === undefined) {
            return {
                match: true,
                value: {
                    result: pathVal.slice(startIndex === undefined ? endIndex : startIndex),
                    refPoint: curRefPoint
                }
            }
        }
        return {
            match: true,
            value: {
                result: pathVal.slice(startIndex, endIndex),
                refPoint: curRefPoint
            }
        }
    }

    private handleArraySpliceRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (curOperator !== "splice") {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform operation "${curOperator}" on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        const {
            startIndex,
            deleteCount,
            itemsToAdd
        } = genericRule;

        // Handle edge case of startIndex being explicitly omitted
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice#start
        if (!Object.hasOwn(genericRule, 'startIndex')) {
            return {
                match: true,
                value: {
                    result: pathVal,
                    refPoint: curRefPoint
                }
            }
        }
        // Do not use isNumeric as Infinity and -Infinity are valid
        // undefined is valid as it gets converted to 0
        if (startIndex !== undefined && typeof startIndex !== 'number') {
            throw new Error(`Cannot perform operation "${curOperator}." Provided start index must be a number or undefined.`);
        }
        let arrToSplice = [...pathVal];
        // Handle edge cases of deleteCount being omitted
        if (!Object.hasOwn(genericRule, 'deleteCount') && !itemsToAdd) {
            arrToSplice.splice(startIndex);
            return {
                match: true,
                value: {
                    result: arrToSplice,
                    refPoint: curRefPoint
                }
            }
        }
        // Handle edge cases of deleteCount being omitted
        if (!Object.hasOwn(genericRule, 'deleteCount')) {
            arrToSplice.splice(startIndex, Infinity, ...itemsToAdd)
            return {
                match: true,
                value: {
                    result: arrToSplice,
                    refPoint: curRefPoint
                }
            }
        }
        arrToSplice.splice(startIndex, deleteCount, ...itemsToAdd)
        return {
            match: true,
            value: {
                result: arrToSplice,
                refPoint: curRefPoint
            }
        }
    }

    private handleArraySortRule(genericRule: Record<string, any>, curRefPoint: RefPoint, pathVal: any): RuleMatch {
        const curOperator: string = genericRule['operator'];
        if (curOperator !== "sort") {
            return {
                match: false,
                value: null
            }
        }
        if (!Array.isArray(pathVal)) {
            this.errorHandler(`Cannot perform operation "${curOperator}" on non-array`);
            throw new Error('unhit error makes typescript happy');
        }
        let comparisonOperator = genericRule['comparisonOperator'];
        if (!comparisonOperator) {
            comparisonOperator = '>';
        }

        const getComparisonValue = genericRule['getComparisonValue'];
        const compareValueMap: MapSortEntry[] = [];
        for (let arrIdx = 0; arrIdx < pathVal.length; arrIdx++) {
            let arrVal = pathVal[arrIdx];
            const arrRefPoint: RefPoint = {
                obj: arrVal,
                key: String(arrIdx),
                normalizedPath: `${curRefPoint.normalizedPath}/${String(arrIdx)}`,
                parent: curRefPoint
            }
            for (let ruleIdx = 0; ruleIdx < getComparisonValue.length; ruleIdx++) {
                const { result } = this.process(getComparisonValue[ruleIdx], arrRefPoint, arrVal);
                arrVal = result;
            }
            compareValueMap[arrIdx] = {
                index: arrIdx,
                value: arrVal
            };
        }

        compareValueMap.sort((a, b) => {
            switch(comparisonOperator) {
                case '>':
                    if (a.value > b.value) {
                        return 1;
                    }
                    if (b.value < a.value) {
                        return -1;
                    }
                    return 0;
                case '<':
                    if (a.value < b.value) {
                        return 1;
                    }
                    if (b.value > a.value) {
                        return -1;
                    }
                    return 0;
                case '>=':
                    if (a.value >= b.value) {
                        return 1;
                    }
                    return -1;
                case '<=':
                    if (a.value <= b.value) {
                        return 1;
                    }
                    return -1;
                case '+':
                    return a.value+b.value;
                case '-':
                    return a.value-b.value;
                case '*':
                    return a.value*b.value;
                case '/':
                    return a.value/b.value;
                case '%':
                    return a.value%b.value;
                case '^':
                    return a.value*b.value;
                default:
                    this.errorHandler(`Sort operator "${comparisonOperator}" has no current implementation`);
                    throw new Error('unhit error makes typescript happy');
            }
        });

        return {
            match: true,
            value: {
                result: compareValueMap.map(item => pathVal[item.index]),
                refPoint: curRefPoint
            }
        }
    }

    process(rule: Rule, prevRefPoint: RefPoint | null, cascadeVal: any): {
        result: any;
        refPoint: RefPoint | null;
    } {
        const genericRule = rule as unknown as Record<string, any>;

        let ruleMatch = this.handleLogicalGroupingRule(genericRule, prevRefPoint, cascadeVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        let tree: RefPoint[] = prevRefPoint ? buildTreeFromRefPoint(prevRefPoint) : [];
        let pathVal: any = cascadeVal;
        if (genericRule["path"]) {
            const docRef = this.getPathValue(genericRule["path"], tree);
            pathVal = docRef.refPoint.obj;
            this.currentDocument = docRef.doc;
            tree = buildTreeFromRefPoint(docRef.refPoint);
        }

        // Either we have a prevRefPoint or we have a path
        // Therefore, tree should have length
        if (!tree.length) {
            this.errorHandler('Unexpected error when processing rules. Unable to traverse JSON document.');
            throw new Error('unhit error makes typescript happy');
        }
        const curRefPoint = tree[tree.length - 1];

        ruleMatch = this.handlePathResolutionRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        // All Rule types past this point require an operator
        const curOperator: string | undefined = genericRule['operator'];
        if (!curOperator) {
            this.errorHandler('Unable to process rule. No action defined');
            throw new Error('unhit error makes typescript happy');
        }

        ruleMatch = this.handleEndRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        ruleMatch = this.handleCastRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        ruleMatch = this.handleLengthRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        ruleMatch = this.handleArraySliceRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }
        
        ruleMatch = this.handleArraySpliceRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        ruleMatch = this.handleArraySortRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }
        
        ruleMatch = this.handleArrayInspectionRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        // Array arithmetic operators
        ruleMatch = this.handleArrayArithmeticRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        // ContainsRule
        ruleMatch = this.handleContainsRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        // Handle non-value arithmetic
        ruleMatch = this.handleNonValueArithmeticRule(genericRule, curRefPoint, pathVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        let targetVal: any = genericRule['value'];
        if (genericRule['getValue']) {
            const getValueRules: Rule[] = genericRule['getValue'];
            targetVal = pathVal;
            for (let ruleIdx = 0; ruleIdx < getValueRules.length; ruleIdx++) {
                const { result } = this.process(getValueRules[ruleIdx], tree[tree.length - 1], targetVal);
                targetVal = result;
            }
        }

        // Handle set rule
        ruleMatch = this.handleSetRule(genericRule, curRefPoint, pathVal, targetVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }
        // Everything from this point on should have some sort of "value"
        if (!Object.hasOwn(genericRule, 'value') && !Object.hasOwn(genericRule, 'getValue')) {
            this.errorHandler(`Cannot perform operation "${genericRule["operator"]}" without a target value.`);
            throw new Error('unhit error makes typescript happy');
        }
        // Standard arithmetic rule
        ruleMatch = this.handleStandardArithmeticRule(genericRule, curRefPoint, pathVal, targetVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }

        // The following operators require both ends to be numeric
        if (!isNumeric(pathVal) || !isNumeric(targetVal)) {
            this.errorHandler(`Cannot perform operation on non-numeric. Attempted "${curOperator}" between ${pathVal} and ${targetVal}`);
            throw new Error('unhit error makes typescript happy');
        }
        // Numeric artithmetic rule
        ruleMatch = this.handleNumericArithmeticRule(genericRule, curRefPoint, pathVal, targetVal);
        if (ruleMatch.match) {
            return ruleMatch.value;
        }
    
        this.errorHandler(`Operator "${curOperator}" not implemented`);
        throw new Error('unhit error makes typescript happy');
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

export function evaluateRules(rules: Rule[], documents: JsonDocument[], primaryDocument?: string): any {
    const ruleProcessor = new RuleEvaluator({
        rules,
        documents,
        primaryDocument
    });
    return ruleProcessor.evaluateRules();
}