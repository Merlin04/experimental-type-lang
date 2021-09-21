export type ast = (TypeDeclaration | ImportDeclaration | Expression)[];

type TypeParameterDeclaration = {
    name: string;
    defaultValue?: Expression;
};

export type TypeDeclaration = {
    __typename: "TypeDeclaration";
    name: string;
    parameters: TypeParameterDeclaration[];
    definition: Expression;
    export: boolean;
};

type ImportDeclaration = {
    __typename: "ImportDeclaration";
    path: string;
    moduleName?: string;
    items: string[];
}

type CallExpression = {
    __typename: "CallExpression";
    module: string | undefined;
    callee: string;
    parameters: Expression[];
};

type NumberLiteralExpression = {
    __typename: "NumberLiteralExpression";
    value: number;
};

type ItemLiteralExpression = {
    __typename: "ItemLiteralExpression";
};

type AbortExpression = {
    __typename: "AbortExpression";
    message: string | undefined;
}

type StringExpression = {
    __typename: "StringExpression";
    text: string;
}

type ArrayLiteralExpression = {
    __typename: "ArrayLiteralExpression";
    items: (Expression | _SpreadExpression)[]
};

export type _SpreadExpression = {
    __typename: "SpreadExpression";
    value: Expression;
};

type ConditionExpression = {
    __typename: "ConditionExpression";
    evaluatee: Expression;
    condition: Expression | _ExtendsExpression;
    true: Expression;
    false: Expression;
}

export type _InferExpression = {
    __typename: "InferExpression";
    spread: boolean;
    name: string | undefined;
};

export type _SkipExpression = {
    __typename: "SkipExpression";
    param: Expression;
};

type _ExtendsExpression = {
    __typename: "ExtendsExpression"
    items: (Expression | _InferExpression | _SkipExpression | _SpreadExpression)[];
};

type ParameterReferenceExpression = {
    __typename: "ParameterReferenceExpression",
    name: string;
}

export type Expression = CallExpression | NumberLiteralExpression | ItemLiteralExpression | ArrayLiteralExpression | ConditionExpression | ParameterReferenceExpression | AbortExpression | StringExpression;

export type InternalItem = {
    __typename: "Item"
} | {
    // Numbers could be represented by an array of items (that's how they are user-facing) but it's more efficient to do it this way
    __typename: "Number",
    length: number
} | InternalItem[];