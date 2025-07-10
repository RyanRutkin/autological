# autological
Autological is a lightweight JSON condition system, designed to be super fast at querying very large datasets.

## Rule
Any one of the rules listed below

## End Rule
Signifies the "end" of a chain of logic, though more logic may always follow.

### Syntax
```
{
    path?: JsonPointer;
    operator: UndefinedOperator | 
        UndefinedInversionOperator |
        NullOperator |
        NullInversionOperator |
        InversionArithmeticOperator;
}
```

### Operators
- [UndefinedOperator](#undefinedoperator)
- [UndefinedInversionOperator](#undefinedinversionoperator)
- [NullOperator](#nulloperator)
- [NullInversionOperator](#nullinversionoperator)
- [InversionArithmeticOperator](#inversionarithmeticoperator)

## CastRule
A specific casting to a certain type.

### Syntax
```
{
    path?: JsonPointer;
    operator: 'cast';
    castTo: 'string' | 'boolean' | 'number' | 'JSON';
}
```

### Output
Value is returned as casted result.

### Example
#### Input
```
{
    amount: 1234
}
```

#### Rule
```
{
    path: '/amount',
    operator: 'cast',
    castTo: 'string'
}
```

#### Result
"1234"

## InversionArithmeticOperator
Invert the value of a numeric.

### Syntax
```
{
    path?: JsonPointer;
    operator: 'cast';
    castTo: 'string' | 'boolean' | 'number' | 'JSON';
}
```

### Output
Value is returned as casted result.

### Example
#### Input
```
{
    amount: 1234
}
```

#### Rule
```
{
    path: '/amount',
    operator: 'cast',
    castTo: 'string'
}
```

#### Result
"1234"

## Operators
### UndefinedOperator
### UndefinedInversionOperator
### NullOperator
### NullInversionOperator