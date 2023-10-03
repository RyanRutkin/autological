# autological
Autological is a lightweight JSON condition system, design to be super lightweight and super fast.
Currently, Autological only returns a boolean value stating that the data ingested does or does not pass the query defined.
In future versions, we will return the result, either being all matches or even the result of cascading arithmetic operations.
For now, it's just bools.

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
            city: "Winter River",
            state: "CT",
            zipcode: "33333"
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
