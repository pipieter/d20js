import { ParserError } from './errors';

import { parse } from './grammar';

export class Parser {
  public parse(expression: string): ASTNode {
    try {
      const parsed = parse(expression);
      return this.parseNode(parsed);
    } catch {
      throw new ParserError(`Could not parse expression '${expression}'!`);
    }
  }

  private parseNode(node: any): ASTNode {
    if (node.type === 'Literal') {
      return new ASTLiteral(node.value);
    }
    if (node.type === 'Dice') {
      const operations = node.op.map((op: any) => new DiceOperation(op.op, new Selector(op.selector.type, op.selector.value)));
      return new ASTDice(node.expression.count, node.expression.sides, operations);
    }
    if (node.type === 'Parenthetical') {
      return new ASTParenthetical(this.parseNode(node.expression));
    }
    if (node.type === 'UnOp') {
      return new ASTUnOp(node.op, this.parseNode(node.expression));
    }
    if (node.type === 'BinOp') {
      const left = this.parseNode(node.left);
      const right = this.parseNode(node.right);
      return new ASTBinOp(node.op, left, right);
    }

    if (node.type) {
      throw new ParserError(`"Unsupported node type: '${node.type}'`);
    } else {
      throw new ParserError(`"Unsupported node '${JSON.stringify(node)}'`);
    }
  }
}

// ===================================
// AST classes
// ===================================

export abstract class ASTNode {
  public abstract toString(): string;
}

export class ASTLiteral extends ASTNode {
  public readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  public toString(): string {
    return this.value.toString();
  }
}

export class ASTDice extends ASTNode {
  public readonly count: number;
  public readonly sides: number;
  public readonly operations: DiceOperation[];

  constructor(count: number, sides: number, operations: DiceOperation[]) {
    super();
    this.count = count;
    this.sides = sides;
    this.operations = operations;
  }

  public toString(): string {
    const modifiers = this.operations.map((op) => op.toString()).join('');
    return `${this.count}d${this.sides}${modifiers}`;
  }

  public isOperated(): boolean {
    return this.operations.length > 0;
  }
}

export class ASTUnOp extends ASTNode {
  public readonly op: string;
  public readonly value: ASTNode;

  constructor(op: string, value: ASTNode) {
    super();
    this.op = op;
    this.value = value;
  }

  public toString(): string {
    return `${this.op}${this.value.toString()}`;
  }
}

export class ASTBinOp extends ASTNode {
  public readonly op: string;
  public readonly left: ASTNode;
  public readonly right: ASTNode;

  constructor(op: string, left: ASTNode, right: ASTNode) {
    super();
    this.op = op;
    this.left = left;
    this.right = right;
  }

  public toString(): string {
    return `${this.left.toString()} ${this.op} ${this.right.toString()}`;
  }
}

export class ASTParenthetical extends ASTNode {
  public readonly value: ASTNode;

  constructor(value: ASTNode) {
    super();
    this.value = value;
  }

  public toString(): string {
    return `(${this.value.toString()})`;
  }
}

// ===================================
// Operators
// ===================================

export class Selector {
  public readonly type: string | null;
  public readonly value: number;

  constructor(type: string | null, value: number) {
    this.type = type;
    this.value = value;
  }
}

export class DiceOperation {
  public readonly op: string;
  public readonly selector: Selector;

  constructor(op: string, selector: Selector) {
    this.op = op;
    this.selector = selector;
  }

  public toString(): string {
    const components = [this.op, this.selector.type ?? '', this.selector.value.toString()];
    return components.join('');
  }
}

export function selectorMatches(selector: Selector, value: number): boolean {
  if (selector.type === null) return value === selector.value;
  if (selector.type === '<') return value < selector.value;
  if (selector.type === '>') return value > selector.value;

  throw new ParserError(`Unsupported selector '${selector.value}' for selectorMatches.`);
}
