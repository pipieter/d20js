import { Distribution } from './distribution';
import { ASTNode } from './parser';
import { Parser } from './parser';
import { Roller, RolledNode } from './roll';

export * from './roll';
export * from './parser';
export * from './errors';
export * from './distribution';

export function parse(expression: string): ASTNode {
  const parser = new Parser();
  return parser.parse(expression);
}

export function roll(expression: string): RolledNode {
  const ast = parse(expression);
  const roller = new Roller();
  return roller.roll(ast);
}

export function distribution(expression: string): Distribution {
  const ast = parse(expression);
  return Distribution.fromAST(ast);
}
