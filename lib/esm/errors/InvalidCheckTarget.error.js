export class InvalidCheckTarget extends Error {
    constructor(msg) {
        super(`Invalid target for check${msg ? `: ${msg}` : ''}`);
    }
}
