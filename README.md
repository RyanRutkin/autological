# autological
Autological is a lightweight JSON condition system, designed to be super lightweight and super fast at query very large datasets.
Currently, Autological only returns a boolean value stating that the data ingested does or does not pass the query defined.
In future versions, we will return the result, either being all matches or even the result of cascading arithmetic operations.
For now, it's just bools.

## IMPORTANT NOTE
For easy reading, our examples use `Array.prototype.filter`.
If your goal is to perform fast filtering on a large dataset, don't use this.
A nostalgic `for(let i = 0; i < data.length; i++)` is still your fastest option by a longshot.

## Basic Example
Now, how do we explain this?..
Maybe it would be best to lead by example.

Here, we have a set of data:
```
const data = [
    {
        location: "ABC Motors",
        address: {
            city: "Springfield",
            state: "IL",
            zipcode: "55555"
        },
        agents: [ "Bob", "Amy", "Joe" ]
    },
    {
        location: "Mr. Conar Tist",
        address: {
            city: "Winter River",
            state: "CT",
            zipcode: "33333"
        },
        agents: [ "Mike", "Michael", "Michelle" ]
    },
    {
        location: "ABC Motors",
        address: {
            city: "Hartford",
            state: "CT",
            zipcode: "22222"
        }
        agents: [ "Mike", "Jonny", "Ashley" ]
    }
];
```

Let's say we wanted to filter this data to show dealerships named "ABC Motors."
We could build an Autological filter as such:
```
const filter = {
    "operator": "and",
    "checks": [
        {
            "path": "location",
            "operator": "=",
            "value": "ABC Motors"
        }
    ]
};
```

..and loop over our data calling `checkCondition` per entry

```
const matches = data.filter(entry => checkCondition(filter, entry));

// matches = [
//    {
//        location: "ABC Motors",
//        address: {
//            city: "Springfield",
//            state: "IL",
//            zipcode: "55555"
//        },
//        agents: [ "Bob", "Amy", "Joe" ]
//    },
//    {
//        location: "ABC Motors",
//        address: {
//            city: "Winter River",
//            state: "CT",
//            zipcode: "33333"
//        }
//        agents: [ "Mike", "Jonny", "Ashley" ]
//    }
// ]
```
> That filter looked a little weird. Couldn't we specify this as:
```
["location","=","ABC Motors"]
```
That's the goal, and we'll get there.

The initial goal was a working POC, and it worked! And it's fast!

The syntax currently supported is our "verbose" syntax, and will always be the syntax accepted by our `checkCondition` method.

The idea is that you can always call `checkCondition` in a streamlined fashion, passing each entry item individually.

When the "sexy syntax" is supported, you will be passing the entire payload (the full `data` object we defined) and receiving the result (filtered set, aggregate, etc.).

This is because we will first need to interpret the "sexy syntax" and transform it into the "verbose syntax" for faster operations.

You wouldn't want us to type check every condition for every data entry now would you?

## What makes Autological so fast?
Autological takes advantage of caching each path resolution, so it doesn't need to be resolved again per data object.

Currently, this is done on a per-data-entry basis (per each index of our `data` object we defined in the "Basic Example").

This comes in handy when dealing with much more complex queries, which could reference the same data point multiple times.

Yes, we've seen these kinds of queries in production. It helps A LOT.

## A more complex example
Let's set up our `data` object for a more complex example:
```
const data = [
    {
        location: "ABC Motors",
        points: 10,
        address: {
            city: "Springfield",
            state: "IL",
            zipcode: "55555"
        },
        agents: [
            {
                name: "Bob"
            }
        ]
    },
    {
        location: "Mr. Conar Tist",
        points: 2,
        address: {
            city: "Winter River",
            state: "CT",
            zipcode: "33333"
        },
        agents: [
            {
                name: "Mike"
            },
            {
                name: "Michael"
            },
            {
                name: "Michelle"
            }
        ]
    },
    {
        location: "ABC Motors",
        points: 9,
        address: {
            city: "Hartford",
            state: "CT",
            zipcode: "55555"
        }
        agents: [
            {
                name: "Mike"
            },
            {
                name: "Jonny"
            },
            {
                name: "Ashley"
            }
        ]
    }
];
```
Note how we have a nested `address.state` and an array of `agents`.

Let's try finding all of the locations that are in Connecticut AND do not have an agent named Jonny OR have a point total over 5.
```
const matches = data.filter(entry => checkCondition({
    "operator": "or",
    "checks": [
        {
            "operator": "and",
            "checks": [
                {
                    "path": "address.state",
                    "operator": "=",
                    "value": "CT"
                },
                {
                    "operator": "not",
                    "target": {
                        "path": "agents",
                        "operator": "contains",
                        "condition": {
                            "operator": "and",
                            "checks": [
                                {
                                    "path": "name",
                                    "operator": "=",
                                    "value": "Jonny"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        {
            "path": "points",
            "operator": ">",
            "value": 5
        }
    ]
}, data));

// matches = [
//     {
//         location: "ABC Motors",
//         points: 10,
//         address: {
//             city: "Springfield",
//             state: "IL",
//             zipcode: "55555"
//         },
//         agents: [
//             {
//                 name: "Bob"
//             }
//         ]
//     },
//     {
//        location: "Mr. Conar Tist",
//        points: 2,
//        address: {
//            city: "Winter River",
//            state: "CT",
//            zipcode: "33333"
//        },
//        agents: [
//            {
//                name: "Mike"
//            },
//            {
//                name: "Michael"
//            },
//            {
//                name: "Michelle"
//            }
//        ]
//    }
// ]
```
When we release version two, our target "sexy syntax" for this style of filter will be:
```
[
    "or",
    [
        ["and", [
            ["address.state", "=", "CT"],
            ["agents", "!contains", [
                ["name", "=", "Jonny"]
            ]]
        ]],
        ["points", ">", 5]
    ]
]
```
Again, this has the same result as the verbose syntax, but this is easier to read.

## What config options are available?
### autoCast is being threatened with deprecation!
Currently only one special config option exists, and that is the `autoCast` option.

This can be passed to `checkCondition` to allow sloppy type coersion to take affect.

For example, if you had:
```
const data = [
    {
        name: "Dave",
        age: 64
    },
    {
        name: "Ryan",
        age: 33
    },
    {
        name: "Addie",
        age: 29
    }
];
```
and wanted to find someone age `"33"` (note that this is a string):
```
const matches = data.filter(entry => checkCondition({
    "operator": "and",
    "checks": [
        {
            "path": "age",
            "operator": "=",
            "value": "33"
        }
    ]
}, entry));

// matches = []
```
The result is that there are no matches.

This is because the provided value is a string, and the field is an integer.

By providing `autoCast` in config, we can automatically convert these values and get the expected result.
```
const matches = data.filter(entry => checkCondition({
    "operator": "and",
    "checks": [
        {
            "path": "age",
            "operator": "=",
            "value": "33"
        }
    ]
}, entry, { autoCast: true }));

// matches = [
//     {
//         name: "Ryan",
//         age: 33
//     }
// ]
```

#### Why is autoCast facing deprecation?
The fact that `autoCast` exists as an option today requires an additional logical check for every operation within a `Check`.

I played around with the idea of making each logical check a function, and swapping the mapping when in `autoCast` mode, but making each logical check a function would add another layer of operation to each check as well, being even less efficient.

If Autological is to retain it's original purpose of filtering very large datasets very quickly, this needs to be removed.
