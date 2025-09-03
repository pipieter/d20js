import { ParserError, TooManyRollsError } from "./errors";
import { Modifier } from "./modifiers";
import {
  ASTBinOp,
  ASTDice,
  ASTLiteral,
  ASTNode,
  ASTParenthetical,
  ASTUnOp,
} from "./parser";

class RollContext {
  public rolls: number;
  public readonly max: number;

  constructor(max: number) {
    this.max = max;
    this.reset();
  }

  public reset() {
    this.rolls = 0;
  }

  public roll(min: number, max: number): number {
    if (this.rolls > this.max) {
      throw new TooManyRollsError("Rolled too many times!");
    }

    this.rolls += 1;
    return Math.floor(Math.random() * (max + 1 - min) + min);
  }
}

export abstract class RollNode {
  public abstract total(): number;
  public abstract toString(): string;
}

export class RollLiteral extends RollNode {
  private readonly value: number;

  constructor(ast: ASTLiteral) {
    super();
    this.value = ast.value;
  }

  public total(): number {
    return this.value;
  }

  public toString(): string {
    return this.value.toString();
  }
}

export class RollDice extends RollNode {
  public readonly count: number;
  public readonly sides: number;
  public readonly modifiers: Modifier[];
  public readonly values: number[];

  constructor(context: RollContext, ast: ASTDice) {
    super();
    this.count = ast.count;
    this.sides = ast.sides;
    this.modifiers = ast.modifiers;
    this.values = [];

    for (let d = 0; d < ast.count; d++) {
      this.values.push(context.roll(1, this.sides));
    }

    console.warn("Warning: modifiers are not implemented yet in RollDice.");
  }

  public total(): number {
    return this.values.reduce((a, b) => a + b, 0);
  }

  public toString(): string {
    const values = this.values.map((v) => v.toString());
    return `[${values.join(",")}]`;
  }
}

export class RollBinOp extends RollNode {
  public readonly op: string;
  public readonly left: RollNode;
  public readonly right: RollNode;

  constructor(op: string, left: RollNode, right: RollNode) {
    super();
    this.op = op;
    this.left = left;
    this.right = right;
  }

  public total(): number {
    switch (this.op) {
      case "+":
        return this.left.total() + this.right.total();
      case "-":
        return this.left.total() - this.right.total();
      case "*":
        return this.left.total() * this.right.total();
      case "/":
        return Math.floor(this.left.total() / this.right.total());
      case "%":
        return this.left.total() % this.right.total();
    }
    throw new ParserError(`Unsupported roll binary operator '${this.op}'.`);
  }

  public toString(): string {
    return `${this.left.toString()} ${this.op} ${this.right.toString()}`;
  }
}

export class RollUnOp extends RollNode {
  public readonly op: string;
  public readonly node: RollNode;

  constructor(op: string, node: RollNode) {
    super();
    this.op = op;
    this.node = node;
  }

  public total(): number {
    switch (this.op) {
      case "+":
        return this.node.total();
      case "-":
        return -this.node.total();
    }
    throw new ParserError(`Unsupported roll unary operator '${this.op}'.`);
  }

  public toString(): string {
    return `${this.op}${this.node.toString()}`;
  }
}

export class RollParenthetical extends RollNode {
  public readonly node: RollNode;

  constructor(node: RollNode) {
    super();
    this.node = node;
  }

  public total(): number {
    return this.node.total();
  }

  public toString(): string {
    return `(${this.node.toString()})`;
  }
}

export class Roller {
  private readonly context: RollContext;

  constructor() {
    this.context = new RollContext(1000);
  }

  public roll(ast: ASTNode): RollNode {
    if (ast instanceof ASTLiteral) return this.rollLiteral(ast);
    if (ast instanceof ASTDice) return this.rollDice(ast);
    if (ast instanceof ASTUnOp) return this.rollUnOp(ast);
    if (ast instanceof ASTBinOp) return this.rollBinOp(ast);
    if (ast instanceof ASTParenthetical) return this.rollParenthetical(ast);

    throw new ParserError(`Unsupported AST node '${ast.constructor.name}'`);
  }

  private rollLiteral(ast: ASTLiteral): RollLiteral {
    return new RollLiteral(ast);
  }

  private rollDice(ast: ASTDice): RollDice {
    return new RollDice(this.context, ast);
  }

  private rollUnOp(ast: ASTUnOp): RollUnOp {
    const node = this.roll(ast.value);
    return new RollUnOp(ast.op, node);
  }

  private rollBinOp(ast: ASTBinOp): RollBinOp {
    const left = this.roll(ast.left);
    const right = this.roll(ast.right);
    return new RollBinOp(ast.op, left, right);
  }

  private rollParenthetical(ast: ASTParenthetical) {
    const node = this.roll(ast.value);
    return new RollParenthetical(node);
  }
}
