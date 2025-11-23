import { ASTNode } from './parser';
import { Parser } from './parser';
import { Roller, RolledNode } from './roll';

export * from './roll';
export * from './parser';
export * from './errors';

export function parse(expression: string): ASTNode {
  const parser = new Parser();
  return parser.parse(expression);
}

export function roll(expression: string): RolledNode {
  const ast = parse(expression);
  const roller = new Roller();
  return roller.roll(ast);
}
