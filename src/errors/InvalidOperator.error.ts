export class InvalidOperator extends Error {
    constructor(msg?: string) {
        super(`Invalid operator for check${ msg ? `: ${ msg }` : '' }`);
    }    
}
