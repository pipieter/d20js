import { ASTNode } from './parser';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Roller, RolledNode } from './roll';
import { Distribution } from './distribution';

export * from './roll';
export * from './parser';
export * from './errors';

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

export function distribution(expression: string): Distribution {
  // First do a small test to see if the expression is valid
  roll(expression);

  const ast = parse(expression);
  return Distribution.from(ast);
}
