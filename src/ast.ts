import { Modifier } from "./modifiers";

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
  public readonly modifiers: Modifier[];

  constructor(count: number, sides: number, modifiers: Modifier[]) {
    super();
    this.count = count;
    this.sides = sides;
    this.modifiers = modifiers;
  }

  public toString(): string {
    const modifiers = this.modifiers.map((e) => e.toString()).join("");
    return `${this.count}d${this.sides}${modifiers}`;
  }

  public isOperated(): boolean {
    return this.modifiers.length > 0;
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
