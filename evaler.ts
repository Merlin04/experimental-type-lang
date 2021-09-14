import { objectEquals } from "./utils";
import { ast, Expression, InternalItem, TypeDeclaration, _InferExpression, _SkipExpression, _SpreadExpression } from "./types";
import "ts-replace-all";

const STRING_MAGIC_NUMBER = 51224;

export default function evalAst(ast: ast) {
    return ast.filter(item => item.__typename !== "TypeDeclaration").reduce((acc, e, index) => {
        const prefix = `${acc}\n${index}> `;
        try {
            return prefix + makeHumanReadable(normalizeItem(evalExpression(e as Expression, ast, {})));
        }
        catch(e) {
            return prefix + `${(e as Error).name}: ${(e as Error).message}`;
        }
    }, "").trim();
}

function makeHumanReadable(item: InternalItem): string {
    if(Array.isArray(item)) {
        if(!Array.isArray(item[0]) && item[0].__typename === "Number" && item[0].length === STRING_MAGIC_NUMBER && Array.isArray(item[1]) && item[1].reduce((acc, cur) => acc && !Array.isArray(cur) && cur.__typename === "Number", true)) {
            return `"${item[1].map(item => String.fromCharCode((item as { __typename: "Number", length: number }).length)).join("").replaceAll("\"", "\\\"")}"`;
        }
        return `[${item.map(makeHumanReadable).join(", ")}]`;
    }
    else if(item.__typename === "Number") {
        return `${item.length}`;
    }
    else {
        return "_";
    }
}

function normalizeItem(i: InternalItem): InternalItem {
    if(Array.isArray(i)) {
        if(i.reduce((acc, cur) => acc && (!Array.isArray(cur) && cur.__typename === "Item"), true)) {
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

function evalExpression(e: Expression, ast: ast, values: {
    [key: string]: InternalItem
}): InternalItem {
    switch(e.__typename) {
        case "CallExpression": {
            // TODO: make sure that optional parameters are at the end
            const def = ast.find(item => item.__typename === "TypeDeclaration" && item.name === e.callee) as TypeDeclaration | undefined;
            if(!def) {
                throw new Error(`Type definition with name ${e.callee} not found`);
            }
            const newValues: {
                [key: string]: InternalItem
            } = {};
            def.parameters.forEach(
                (parameter, index) => {
                    if(e.parameters[index]) {
                        newValues[parameter.name] = evalExpression(e.parameters[index], ast, values);
                    }
                    else if(parameter.defaultValue) {
                        // TODO: allow accessing other parameters in the default value
                        newValues[parameter.name] = evalExpression(parameter.defaultValue, ast, newValues);
                    }
                    else {
                        throw new Error(`No value passed for parameter ${parameter.name} when calling type ${def.name}`);
                    }
                }
            );
            return evalExpression(def.definition, ast, newValues);
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
            const val: InternalItem = [];
            for(const item of e.items) {
                if(item.__typename === "SpreadExpression") {
                    const res = evalExpression(item.value, ast, values);
                    if(Array.isArray(res)) {
                        res.forEach(i => val.push(i));
                    }
                    else if(res.__typename === "Item") {
                        throw new Error("Cannot spread an item into an array");
                    }
                    else if(res.__typename === "Number") {
                        // TODO: make more efficient
                        for(let i = 0; i < res.length; i++) {
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
            if(e.condition.__typename === "ExtendsExpression") {
                // It's inferring things
                // Helpful function
                const fail = () => evalExpression(e.false, ast, values);
                // Start off by evaluating the evaluatee and making sure it's the right type
                // It has to be an array, it can't be just a number or item
                let normalizedEvaluatee = normalizeItem(evalExpression(e.evaluatee, ast, values));
                if(!Array.isArray(normalizedEvaluatee)) {
                    if(normalizedEvaluatee.__typename === "Item") {
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
                const items: ((Expression | _SpreadExpression)[] | _InferExpression | _SkipExpression)[] = [];
                let activeArray: (Expression | _SpreadExpression)[] = [];
                e.condition.items.forEach(item => {
                    if(item.__typename === "InferExpression" || item.__typename === "SkipExpression") {
                        if(activeArray.length > 0) {
                            items.push(activeArray);
                            activeArray = [];
                        }
                        items.push(item);
                    }
                    else {
                        activeArray.push(item);
                    }
                });
                if(activeArray.length > 0) {
                    items.push(activeArray);
                }
                const evaledItems = items.map(item => {
                    if(Array.isArray(item)) {
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
                const flattened: (InternalItem | _InferExpression | _SkipExpression)[] = [];
                evaledItems.forEach(item => {
                    if(Array.isArray(item)) {
                        item.forEach(i => flattened.push(i));
                    }
                    else {
                        if(item.__typename === "Number") {
                            for(let i = 0; i < item.length; i++) flattened.push({
                                __typename: "Item"
                            });
                        }
                        else if(item.__typename === "SkipExpression") {
                            // Just add infer with name set to undefined
                            const evaledParam = evalExpression(item.param, ast, values);
                            if(!Array.isArray(evaledParam) && evaledParam.__typename === "Number") {
                                for(let i = 0; i < evaledParam.length; i++) {
                                    flattened.push({
                                        __typename: "InferExpression",
                                        name: undefined,
                                        spread: false
                                    });
                                }
                            }
                            else {
                                throw new Error("Non-number value passed to skip");
                            }
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
                const inferredValues: {
                    [key: string]: InternalItem
                } = {};
                const containsSpreadInfer = flattened.reduce((acc, cur) => acc || (!Array.isArray(cur) && cur.__typename === "InferExpression" && cur.spread), false);
                if(containsSpreadInfer ? (normalizedEvaluatee.length < flattened.length - 1) : (flattened.length !== normalizedEvaluatee.length)) {
                    return fail();
                }
                let spreadInferRangeStart: number | undefined = undefined;
                for(let i = 0; i < flattened.length; i++) {
                    const flattenedItem = flattened[i];
                    if(!Array.isArray(flattenedItem) && flattenedItem.__typename === "InferExpression") {
                        if(flattenedItem.spread) {
                            spreadInferRangeStart = i;
                            break;
                        }
                        else if(flattenedItem.name) {
                            inferredValues[flattenedItem.name] = normalizedEvaluatee[i];
                        }
                    }
                    else if(!objectEquals(flattenedItem, normalizedEvaluatee[i])) {
                        return fail();
                    }
                }
                if(containsSpreadInfer) {
                    for(let i = normalizedEvaluatee.length - 1, j = flattened.length - 1;; i--, j--) {
                        const flattenedItem = flattened[j];
                        if(!Array.isArray(flattenedItem) && flattenedItem.__typename === "InferExpression") {
                            if(flattenedItem.spread) {
                                if(flattenedItem.name) inferredValues[flattenedItem.name] = normalizedEvaluatee.slice(spreadInferRangeStart, i + 1);
                                break;
                            }
                            else {
                                if(flattenedItem.name) inferredValues[flattenedItem.name] = normalizedEvaluatee[i];
                            }
                        }
                        else if(!objectEquals(flattenedItem, normalizedEvaluatee[i])) {
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

                return evalExpression(e[objectEquals(res, normalizedEvaluatee) ? "true" : "false"], ast, values)
            }
        }
        case "ParameterReferenceExpression": {
            const v = values[e.name];
            if(v === undefined) {
                throw new Error(`Parameter ${e.name} is undefined`);
            }
            return v;
        }
        case "AbortExpression": {
            throw new Error("Exiting due to abort keyword" + (e.message !== undefined ? ": " + e.message : ""));
        }
        case "StringExpression": {
            const newStr = e.text.replaceAll("\\\"", "\"");
            const arr: InternalItem[] = [];
            for(let i = 0; i < newStr.length; i++) {
                arr.push({
                    __typename: "Number",
                    length: newStr.charCodeAt(i)
                });
            }
            return [
                {
                    __typename: "Number",
                    length: STRING_MAGIC_NUMBER
                },
                arr
            ];
        }
    }
}