import { ast, Expression, _ExtendsExpression } from "./index";
import fs from "fs";

export default function parse(input: string): ast {
    const items = input.split(";");
    // Each item should be an item in the ast array
    return items.map(item => item.trim()).map(item => {
        // Determine if it's a TypeDeclaration or an Expression
        if(item.startsWith("type ")) {
            return {
                __typename: "TypeDeclaration",
                name: item.split(" ")[1],
                parameters: item.split("<")[1].split(">")[0].split(",").map(param => param.trim()).map(param => ({
                    name: param.split("=")[0].trim(),
                    defaultValue: parseExpression(param.split("=")[1]?.trim())
                })),
                definition: parseExpression(item.split("=")[1].trim())
            }
        }
        else {
            return parseExpression(item.trim());
        }
    });
}

function parseExpression(input: string): Expression {
    // Types of expressions:
    // CallExpression, NumberLiteralExpression, ItemLiteralExpression, ArrayLiteralExpression, ConditionExpression, AbortLiteralExpression, ParameterReferenceExpression

    // Check for CallExpression
    if(input.split("<").length > 1 && !input.split("<")[0].trim().includes(" ")) {
        return {
            __typename: "CallExpression",
            callee: input.split("<")[0].trim(),
            parameters: input.split("<")[1].split(">")[0].split(",").map(param => param.trim()).map(param => parseExpression(param))
        }
    }

    // Check for NumberLiteralExpression
    if(!isNaN(Number(input))) {
        return {
            __typename: "NumberLiteralExpression",
            value: Number(input)
        }
    }

    // Check for ItemLiteralExpression
    if(input === "_") {
        return {
            __typename: "ItemLiteralExpression"
        }
    }

    // Check for ArrayLiteralExpression
    if(input.startsWith("[") && input.endsWith("]")) {
        return {
            __typename: "ArrayLiteralExpression",
            items: input.substring(1, input.length - 1).split(",").map(element => element.trim()).map(element => {
                // parseExpression can't normally handle SpreadExpressions, so we need to check for them here
                if(element.startsWith("...")) {
                    return {
                        __typename: "SpreadExpression",
                        value: parseExpression(element.substring(3))
                    }
                }
                
                return parseExpression(element);
            })
        }
    }

    // Check for ConditionExpression (__ extends __ ? __ : __)
    if(input.split(" extends ").length > 1) {
        return {
            __typename: "ConditionExpression",
            evaluatee: parseExpression(input.split(" extends ")[0].trim()),
            condition: parseConditionExpressionCondition(input.split(" extends ")[1].split(" ? ")[0].trim()),
            true: parseExpression(input.split(" extends ")[1].split(" ? ")[1].split(" : ")[0].trim()),
            false: parseExpression(input.split(" extends ")[1].split(" ? ")[1].split(" : ")[1].trim())
        }
    }

    // Check for AbortLiteralExpression
    if(input === "abort") {
        return {
            __typename: "AbortLiteralExpression"
        }
    }

    // Check for ParameterReferenceExpression
    if(!input.includes(" ")) {
        return {
            __typename: "ParameterReferenceExpression",
            name: input
        }
    }

    throw new Error("Encountered unknown token");
}

function parseConditionExpressionCondition(input: string): Expression | _ExtendsExpression {
    // We can tell an ArrayLiteralExpression from an ExtendsExpression by if the source contains "infer"
    // Technically it would work if we just used ExtendsExpressions but that would decrease performance

    // Check if it looks like an array
    if(input.startsWith("[") && input.endsWith("]")) {
        // Split by commas and check if anything starts with "infer" or "...infer"
        const arrayElements = input.substring(1, input.length - 1).split(",").map(element => element.trim());
        if(arrayElements.some(element => element.startsWith("infer") || element.startsWith("...infer"))) {
            return {
                __typename: "ExtendsExpression",
                items: arrayElements.map(element => {
                    if(element.startsWith("infer")) {
                        return {
                            __typename: "InferExpression",
                            name: element.substring(5).trim(),
                            spread: false
                        };
                    }
                    else if(element.startsWith("...infer")) {
                        return {
                            __typename: "InferExpression",
                            name: element.substring(8).trim(),
                            spread: true
                        };
                    }

                    return parseExpression(element);
                })
            }
        }
        else {
            return parseExpression(input);
        }
    }

    // Otherwise, it's just a normal expression
    return parseExpression(input);
}

// Read the exampleProgram.type file and parse it
function parseExampleProgram(): ast {
    return parse(fs.readFileSync("./exampleProgram.type", "utf8"));
}

console.log(parseExampleProgram());