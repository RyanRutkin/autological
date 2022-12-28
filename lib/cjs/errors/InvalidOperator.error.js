"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidOperator = void 0;
class InvalidOperator extends Error {
    constructor(msg) {
        super(`Invalid operator for check${msg ? `: ${msg}` : ''}`);
    }
}
exports.InvalidOperator = InvalidOperator;
