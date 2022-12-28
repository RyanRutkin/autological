export class InvalidOperator extends Error {
    constructor(msg) {
        super(`Invalid operator for check${msg ? `: ${msg}` : ''}`);
    }
}
