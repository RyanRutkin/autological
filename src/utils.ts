export function isIn<T>(values: readonly T[], x: any): x is T {
    return values.includes(x);
}
