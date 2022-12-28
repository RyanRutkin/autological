"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCondition = void 0;
const InvalidCheckTarget_error_1 = require("./errors/InvalidCheckTarget.error");
const isArrayCheck_guard_1 = require("./guards/isArrayCheck.guard");
const isCondition_guard_1 = require("./guards/isCondition.guard");
const isValueCheck_guard_1 = require("./guards/isValueCheck.guard");
function checkCondition(condition, data, config = {}) {
    const path_cache = {};
    function processChecks(_condition, _data) {
        const resultingCheck = _condition.checks.find(check => {
            if ((0, isCondition_guard_1.isCondition)(check)) {
                return processChecks(check, _data);
            }
            if ((0, isValueCheck_guard_1.isValueCheck)(check)) {
                let sub_data = undefined;
                if (Object.hasOwn(path_cache, check.path)) {
                    sub_data = path_cache[check.path];
                }
                else {
                    sub_data = resolvePath(_data, check.path);
                    path_cache[check.path] = sub_data;
                }
                let result = _condition.operator === 'and' ? true : false;
                switch (check.operator) {
                    case '=':
                        result = config.autoCast ? String(sub_data) === String(check.value) : sub_data === check.value;
                        break;
                    case '>':
                        result = config.autoCast ? String(sub_data) > String(check.value) : sub_data > check.value;
                        break;
                    case '<':
                        result = config.autoCast ? String(sub_data) < String(check.value) : sub_data < check.value;
                        break;
                    case '>=':
                        result = config.autoCast ? String(sub_data) >= String(check.value) : sub_data >= check.value;
                        break;
                    case '<=':
                        result = config.autoCast ? String(sub_data) <= String(check.value) : sub_data <= check.value;
                        break;
                }
                if (_condition.operator === 'and') {
                    // Look for first failure
                    return !result;
                }
                // Look for first success
                return result;
            }
            if ((0, isArrayCheck_guard_1.isArrayCheck)(check)) {
                let sub_data = undefined;
                if (Object.hasOwn(path_cache, check.path)) {
                    sub_data = path_cache[check.path];
                }
                else {
                    sub_data = resolvePath(_data, check.path);
                    path_cache[check.path] = sub_data;
                }
                if (!Array.isArray(sub_data)) {
                    throw new InvalidCheckTarget_error_1.InvalidCheckTarget();
                }
                switch (check.operator) {
                    case 'contains':
                        return !sub_data.find(obj => processChecks(check.condition, obj));
                }
            }
            if ((0, isCondition_guard_1.isCondition)(check.target)) {
                return !processChecks(check.target, _data);
            }
            return !processChecks({
                operator: 'and',
                checks: [check.target]
            }, _data);
        });
        if (_condition.operator === 'and') {
            return !resultingCheck;
        }
        return !!resultingCheck;
    }
    return processChecks(condition, data);
}
exports.checkCondition = checkCondition;
function resolvePath(data, path) {
    const parts = path.split('.');
    if (!parts.length) {
        return data;
    }
    let result = undefined;
    if (Object.hasOwn(data, parts[0])) {
        result = data[parts[0]];
    }
    if (result !== undefined
        && result !== null
        && typeof result === 'object'
        && !Array.isArray(result)
        && parts.length > 1) {
        result = resolvePath(result, parts.slice(1).join('.'));
    }
    if (Array.isArray(result) && parts.length > 1) {
        return undefined;
    }
    return result;
}