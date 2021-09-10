"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function evalAst(ast) {
    return ast.filter(item => item.__typename !== "TypeDeclaration").map((e) => normalizeItem(evalExpression(e, ast, {})));
}
function normalizeItem(i) {
    if (Array.isArray(i)) {
        if (i.reduce((acc, cur) => acc && (!Array.isArray(cur) && cur.__typename === "Item"), true)) {
            return {
                __typename: "Number",
                length: i.length
            };
        }
        else {
            return i.map(normalizeItem);
        }
    }
    else {
        return i;
    }
}
function evalExpression(e, ast, values) {
    switch (e.__typename) {
        case "CallExpression": {
            // TODO: make sure that optional parameters are at the end
            const def = ast.find(item => item.__typename === "TypeDeclaration" && item.name === e.callee);
            if (!def) {
                throw new Error(`Type definition with name ${e.callee} not found`);
            }
            return evalExpression(def.definition, ast, Object.fromEntries(def.parameters.map((parameter, index) => {
                if (e.parameters[index]) {
                    return [parameter.name, evalExpression(e.parameters[index], ast, values)];
                }
                else if (parameter.defaultValue) {
                    return [parameter.name, evalExpression(parameter.defaultValue, ast, {})];
                }
                else {
                    throw new Error(`No value passed for parameter ${parameter.name} when calling type ${def.name}`);
                }
            })));
        }
        case "NumberLiteralExpression": {
            return {
                __typename: "Number",
                length: e.value
            };
        }
        case "ItemLiteralExpression": {
            return {
                __typename: "Item"
            };
        }
        case "ArrayLiteralExpression": {
            const val = [];
            for (const item of e.items) {
                if (item.__typename === "SpreadExpression") {
                    const res = evalExpression(item.value, ast, values);
                    if (Array.isArray(res)) {
                        res.forEach(i => val.push(i));
                    }
                    else if (res.__typename === "Item") {
                        throw new Error("Cannot spread an item into an array");
                    }
                    else if (res.__typename === "Number") {
                        // TODO: make more efficient
                        for (let i = 0; i < res.length; i++) {
                            val.push({
                                __typename: "Item"
                            });
                        }
                    }
                }
                else {
                    val.push(evalExpression(item, ast, values));
                }
            }
            return val;
        }
        case "ConditionExpression": {
            // Evaluate the extends thing
            if (e.condition.__typename === "ExtendsExpression") {
                // It's inferring things
                // Helpful function
                const fail = () => evalExpression(e.false, ast, values);
                // Start off by evaluating the evaluatee and making sure it's the right type
                // It has to be an array, it can't be just a number or item
                let normalizedEvaluatee = normalizeItem(evalExpression(e.evaluatee, ast, values));
                if (!Array.isArray(normalizedEvaluatee)) {
                    if (normalizedEvaluatee.__typename === "Item") {
                        return fail();
                    }
                    else {
                        normalizedEvaluatee = Array(normalizedEvaluatee.length).fill({
                            __typename: "Item"
                        });
                    }
                }
                // Evaluate all the expressions in the array except for the infers
                // It's easiest to do this by splitting it up into separate arrays of non-infer items, evaluating each, then merging them
                const items = [];
                let activeArray = [];
                e.condition.items.forEach(item => {
                    if (item.__typename === "InferExpression") {
                        items.push(activeArray);
                        activeArray = [];
                        items.push(item);
                    }
                    else {
                        activeArray.push(item);
                    }
                });
                if (activeArray.length > 0) {
                    items.push(activeArray);
                }
                const evaledItems = items.map(item => {
                    if (Array.isArray(item)) {
                        return normalizeItem(evalExpression({
                            __typename: "ArrayLiteralExpression",
                            items: item
                        }, ast, values));
                    }
                    else {
                        return item;
                    }
                });
                // Flatten it
                const flattened = [];
                evaledItems.forEach(item => {
                    if (Array.isArray(item)) {
                        item.forEach(i => flattened.push(i));
                    }
                    else {
                        if (item.__typename === "Number") {
                            for (let i = 0; i < item.length; i++)
                                flattened.push({
                                    __typename: "Item"
                                });
                        }
                        else {
                            flattened.push(item);
                        }
                    }
                });
                // Now, we're in one of two scenarios:
                // 1. There's no spread infer. This means that the array is of fixed length, so we can just compare all the items
                // 2. There is a spread infer. Make sure that the array is at least the length of flattened minus the spread infer, then start evaluating from the front until we reach the spread infer, then go from the back
                // These use a lot of the same code so I'll combine the two
                const inferredValues = {};
                const containsSpreadInfer = flattened.reduce((acc, cur) => acc || (!Array.isArray(cur) && cur.__typename === "InferExpression" && cur.spread), false);
                if (containsSpreadInfer ? (normalizedEvaluatee.length < flattened.length - 1) : (flattened.length !== normalizedEvaluatee.length)) {
                    return fail();
                }
                let spreadInferRangeStart = undefined;
                for (let i = 0; i < flattened.length; i++) {
                    const flattenedItem = flattened[i];
                    if (!Array.isArray(flattenedItem) && flattenedItem.__typename === "InferExpression") {
                        if (flattenedItem.spread) {
                            spreadInferRangeStart = i;
                            break;
                        }
                        else {
                            values[flattenedItem.name] = normalizedEvaluatee[i];
                        }
                    }
                    else if (!(0, utils_1.objectEquals)(flattenedItem, normalizedEvaluatee[i])) {
                        return fail();
                    }
                }
                if (containsSpreadInfer) {
                    for (let i = normalizedEvaluatee.length - 1, j = flattened.length - 1;; i--, j--) {
                        const flattenedItem = flattened[j];
                        if (!Array.isArray(flattenedItem) && flattenedItem.__typename === "InferExpression") {
                            if (flattenedItem.spread) {
                                inferredValues[flattenedItem.name] = normalizedEvaluatee.slice(spreadInferRangeStart, i + 1);
                                break;
                            }
                            else {
                                values[flattenedItem.name] = normalizedEvaluatee[i];
                            }
                        }
                        else if (!(0, utils_1.objectEquals)(flattenedItem, normalizedEvaluatee[i])) {
                            return fail();
                        }
                    }
                }
                return evalExpression(e.true, ast, {
                    ...values,
                    ...inferredValues
                });
            }
            else {
                // It's a bit easier
                const res = normalizeItem(evalExpression(e.condition, ast, values));
                const normalizedEvaluatee = normalizeItem(evalExpression(e.evaluatee, ast, values));
                console.log(e[(0, utils_1.objectEquals)(res, normalizedEvaluatee) ? "true" : "false"]);
                return evalExpression(e[(0, utils_1.objectEquals)(res, normalizedEvaluatee) ? "true" : "false"], ast, values);
            }
        }
        case "ParameterReferenceExpression": {
            return values[e.name];
        }
        case "AbortLiteralExpression": {
            throw new Error("Exiting due to abort keyword");
        }
    }
}
const testDoc = [
    {
        __typename: "TypeDeclaration",
        name: "Add",
        parameters: [
            {
                name: "N1"
            },
            {
                name: "N2"
            }
        ],
        definition: {
            __typename: "ArrayLiteralExpression",
            items: [
                {
                    __typename: "SpreadExpression",
                    value: {
                        __typename: "ParameterReferenceExpression",
                        name: "N1"
                    }
                },
                {
                    __typename: "SpreadExpression",
                    value: {
                        __typename: "ParameterReferenceExpression",
                        name: "N2"
                    }
                }
            ]
        }
    },
    {
        __typename: "TypeDeclaration",
        name: "Subtract",
        parameters: [
            {
                name: "N1"
            },
            {
                name: "N2"
            }
        ],
        definition: {
            __typename: "ConditionExpression",
            evaluatee: {
                __typename: "ParameterReferenceExpression",
                name: "N1"
            },
            condition: {
                __typename: "ExtendsExpression",
                items: [
                    {
                        __typename: "InferExpression",
                        spread: true,
                        name: "Result"
                    },
                    {
                        __typename: "ParameterReferenceExpression",
                        name: "N2"
                    }
                ]
            },
            true: {
                __typename: "ParameterReferenceExpression",
                name: "Result"
            },
            false: {
                __typename: "AbortLiteralExpression"
            }
        }
    },
    {
        __typename: "TypeDeclaration",
        name: "Multiply",
        parameters: [
            {
                name: "N1"
            },
            {
                name: "N2"
            },
            {
                name: "T",
                defaultValue: {
                    __typename: "ArrayLiteralExpression",
                    items: []
                }
            }
        ],
        definition: {
            __typename: "ConditionExpression",
            evaluatee: {
                __typename: "ParameterReferenceExpression",
                name: "N2"
            },
            condition: {
                __typename: "NumberLiteralExpression",
                value: 0
            },
            true: {
                __typename: "CallExpression",
                callee: "Flatten",
                parameters: [
                    {
                        __typename: "ParameterReferenceExpression",
                        name: "T"
                    }
                ]
            },
            false: {
                __typename: "CallExpression",
                callee: "Multiply",
                parameters: [
                    {
                        __typename: "ParameterReferenceExpression",
                        name: "N1"
                    },
                    {
                        __typename: "CallExpression",
                        callee: "Subtract",
                        parameters: [
                            {
                                __typename: "ParameterReferenceExpression",
                                name: "N2"
                            },
                            {
                                __typename: "NumberLiteralExpression",
                                value: 1
                            }
                        ]
                    },
                    {
                        __typename: "ArrayLiteralExpression",
                        items: [
                            {
                                __typename: "ParameterReferenceExpression",
                                name: "N1"
                            },
                            {
                                __typename: "SpreadExpression",
                                value: {
                                    __typename: "ParameterReferenceExpression",
                                    name: "T"
                                }
                            }
                        ]
                    }
                ]
            }
        }
    },
    {
        __typename: "TypeDeclaration",
        name: "Flatten",
        parameters: [
            {
                name: "Input"
            }
        ],
        definition: {
            __typename: "ConditionExpression",
            evaluatee: {
                __typename: "ParameterReferenceExpression",
                name: "Input"
            },
            condition: {
                __typename: "ExtendsExpression",
                items: [
                    {
                        __typename: "InferExpression",
                        spread: false,
                        name: "A"
                    },
                    {
                        __typename: "InferExpression",
                        spread: false,
                        name: "B"
                    },
                    {
                        __typename: "InferExpression",
                        spread: true,
                        name: "rest"
                    }
                ]
            },
            true: {
                __typename: "ArrayLiteralExpression",
                items: [
                    {
                        __typename: "CallExpression",
                        callee: "Add",
                        parameters: [
                            {
                                __typename: "ParameterReferenceExpression",
                                name: "A"
                            },
                            {
                                __typename: "ParameterReferenceExpression",
                                name: "B"
                            }
                        ]
                    },
                    {
                        __typename: "SpreadExpression",
                        value: {
                            __typename: "ParameterReferenceExpression",
                            name: "rest"
                        }
                    }
                ]
            },
            false: {
                __typename: "ParameterReferenceExpression",
                name: "Input"
            }
        }
    },
    /*{
        __typename: "CallExpression",
        callee: "Multiply",
        parameters: [
            {
                __typename: "NumberLiteralExpression",
                value: 5
            },
            {
                __typename: "NumberLiteralExpression",
                value: 4
            }
        ]
    },*/
    {
        __typename: "CallExpression",
        callee: "Add",
        parameters: [
            {
                __typename: "NumberLiteralExpression",
                value: 5
            },
            {
                __typename: "NumberLiteralExpression",
                value: 8
            }
        ]
    },
    {
        __typename: "CallExpression",
        callee: "Subtract",
        parameters: [
            {
                __typename: "NumberLiteralExpression",
                value: 5
            },
            {
                __typename: "NumberLiteralExpression",
                value: 2
            }
        ]
    }
];
console.log(evalAst(testDoc));
//# sourceMappingURL=index.js.map