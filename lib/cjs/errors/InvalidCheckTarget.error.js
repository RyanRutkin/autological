"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidCheckTarget = void 0;
class InvalidCheckTarget extends Error {
    constructor(msg) {
        super(`Invalid target for check${msg ? `: ${msg}` : ''}`);
    }
}
exports.InvalidCheckTarget = InvalidCheckTarget;
