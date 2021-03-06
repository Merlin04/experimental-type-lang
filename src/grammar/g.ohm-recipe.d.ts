// AUTOGENERATED FILE
// This file was generated from g.ohm by `ohm generateRecipes`.

import {
  ActionDict,
  Grammar,
  IterationNode,
  Node,
  NonterminalNode,
  Semantics,
  TerminalNode
} from 'ohm-js';

export interface TypeActionDict<T> extends ActionDict<T> {
  Program?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  comment_singleLineComment?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode) => T;
  comment_multiLineComment?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  comment?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  space?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  AstItem?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  TypeDeclaration?: (this: NonterminalNode, arg0: IterationNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode, arg6: TerminalNode, arg7: NonterminalNode) => T;
  ImportDeclaration?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: IterationNode) => T;
  ImportDeclarationNames_module?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ImportDeclarationNames_specificLeft?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: TerminalNode) => T;
  ImportDeclarationNames_specificRight?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: IterationNode, arg4: IterationNode) => T;
  ImportDeclarationNames?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeParameterDeclaration_defaultValue?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  TypeParameterDeclaration?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Expression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ParensExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  CallExpression?: (this: NonterminalNode, arg0: IterationNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode) => T;
  ItemLiteralExpression?: (this: NonterminalNode, arg0: TerminalNode) => T;
  ArrayLiteralExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  SpreadExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  ConditionExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode, arg6: NonterminalNode) => T;
  ExtendsExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  inferExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: IterationNode) => T;
  SkipExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  AbortExpression_withMessage?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  AbortExpression_noMessage?: (this: NonterminalNode, arg0: TerminalNode) => T;
  AbortExpression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  stringExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  ParameterReferenceExpression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  number?: (this: NonterminalNode, arg0: IterationNode) => T;
  reservedWord?: (this: NonterminalNode, arg0: TerminalNode) => T;
  identifier?: (this: NonterminalNode, arg0: IterationNode) => T;
}

export interface TypeSemantics extends Semantics {
  addOperation<T=any>(name: string, actionDict: TypeActionDict<T>): this;
  // TODO: extendOperation, addAttribute, extendAttribute
}

export interface TypeGrammar extends Grammar {
  createSemantics(): TypeSemantics;
  // TODO: extendSemantics
}

declare const grammar: TypeGrammar;
export default grammar;
