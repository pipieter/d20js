import { ASTNode } from "./ast";
import { Lexer } from "./lexer";
import { Parser } from "./parser";

export function parse(expression: string): ASTNode {
  const tokens = new Lexer(expression).parse();
  const ast = new Parser(tokens).parse();
  return ast;
}
