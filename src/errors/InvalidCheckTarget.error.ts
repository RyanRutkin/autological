export class InvalidCheckTarget extends Error {
    constructor(msg?: string) {
        super(`Invalid target for check${ msg ? `: ${ msg }` : '' }`);
    }    
}
