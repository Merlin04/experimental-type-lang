import grammar from "./g.ohm-recipe";
import { ast } from "./types";

export default function parse(input: string): ast {
    const semantics = grammar.createSemantics();
    semantics.addOperation("toAST", {
        Program(astItems) {
            return astItems.children.map(child => child.toAST())[0].filter((item: any) => item !== "");
        },
        AstItem(item) {
            return item.toAST();
        },
        TypeDeclaration(exportKeyword, _, name, _2, parameters, _3, _4, definition) {
            return {
                __typename: "TypeDeclaration",
                name: name.toAST(),
                parameters: parameters.toAST(),
                definition: definition.toAST(),
                export: exportKeyword.sourceString !== ""
            };
        },
        ImportDeclaration(_, names, _2, file) {
            const parsedNames = names.toAST();
            return {
                __typename: "ImportDeclaration",
                path: file.sourceString,
                moduleName: parsedNames[0],
                items: parsedNames[1]
            }
        },
        ImportDeclarationNames_module(name) {
            return [name.sourceString, []];
        },
        ImportDeclarationNames_specificLeft(name, _, _2, list, _3) {
            return [name.children[0].sourceString, list.toAST()];
        },
        ImportDeclarationNames_specificRight(_, list, _2, _3, name) {
            return [name.children[0]?.sourceString, list.toAST()];
        },
        TypeParameterDeclaration_defaultValue(name, _, defaultValue) {
            return {
                name: name.toAST(),
                defaultValue: defaultValue.toAST()
            };
        },
        TypeParameterDeclaration(name) {
            const evaled = name.toAST();
            return typeof evaled === "string" ? { name: evaled } : evaled;
        },
        ParensExpression(_, expression, _2) {
            return expression.toAST();
        },
        CallExpression(module, _, callee, _2, parameters, _3) {
            return {
                __typename: "CallExpression",
                callee: callee.toAST(),
                module: module.sourceString.length > 0 ? module.sourceString.slice(0, -1) : undefined,
                parameters: parameters.toAST()
            };
        },
        ItemLiteralExpression(_) {
            return {
                __typename: "ItemLiteralExpression"
            };
        },
        ArrayLiteralExpression(_, items, _2) {
            return {
                __typename: "ArrayLiteralExpression",
                items: items.toAST()
            };
        },
        SpreadExpression(_, expression) {
            return {
                __typename: "SpreadExpression",
                value: expression.toAST()
            };
        },
        ConditionExpression(evaluatee, _, condition, _2, consequent, _3, alternate) {
            return {
                __typename: "ConditionExpression",
                evaluatee: evaluatee.toAST(),
                condition: condition.toAST(),
                true: consequent.toAST(),
                false: alternate.toAST()
            };
        },
        ExtendsExpression(_, items, _2) {
            return {
                __typename: "ExtendsExpression",
                items: items.toAST()
            };
        },
        inferExpression(prefix, _, expression) {
            const name = expression.toAST()[0];
            return {
                __typename: "InferExpression",
                spread: prefix.source.contents === "...infer",
                name
            };
        },
        SkipExpression(_, expression) {
            return {
                __typename: "SkipExpression",
                param: expression.toAST()
            };
        },
        AbortExpression_noMessage(_) {
            return {
                __typename: "AbortExpression"
            };
        },
        AbortExpression_withMessage(_, message, _2) {
            return {
                __typename: "AbortExpression",
                message: message.sourceString
            };
        },
        stringExpression(_, text, _2) {
            return {
                __typename: "StringExpression",
                text: text.sourceString
            };
        },
        ParameterReferenceExpression(name) {
            return {
                __typename: "ParameterReferenceExpression",
                name: name.toAST()
            };
        },
        number(digits) {
            return {
                __typename: "NumberLiteralExpression",
                value: Number(digits.sourceString)
            };
        },
        identifier(node) {
            return node.sourceString;
        },
        // Things provided by Ohm but not defined in the grammar
        NonemptyListOf(item, _, rest) {
            return [item.toAST(), ...rest.toAST()];
        },
        EmptyListOf() {
            return [];
        },
        _iter(children) {
            return children.map(c => c.toAST());
        },
        _terminal() {
            return this.sourceString;
        }
    });
    const match = grammar.match(input);
    if (match.succeeded()) {
        return semantics(match).toAST();
    } else {
        throw new Error(match.message);
    }
}