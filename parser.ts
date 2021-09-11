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
        TypeDeclaration(_, name, _2, parameters, _3, _4, definition) {
            return {
                __typename: "TypeDeclaration",
                name: name.toAST(),
                parameters: parameters.toAST(),
                definition: definition.toAST()
            };
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
        CallExpression(callee, _, parameters, _2) {
            return {
                __typename: "CallExpression",
                callee: callee.toAST(),
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
        InferExpression(prefix, expression) {
            return {
                __typename: "InferExpression",
                spread: prefix.source.contents === "...infer ",
                name: expression.toAST()
            };
        },
        AbortLiteralExpression(_) {
            return {
                __typename: "AbortLiteralExpression"
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