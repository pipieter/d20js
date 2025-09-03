import { ASTNode } from './parser';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Roller, RolledNode } from './roll';

export function parse(expression: string): ASTNode {
  const tokens = new Lexer(expression).parse();
  const ast = new Parser(tokens).parse();
  return ast;
}

export function roll(expression: string): RolledNode {
  const ast = parse(expression);
  const roller = new Roller();
  return roller.roll(ast);
}
