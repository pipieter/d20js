import { ModifierError, ParserError, TooManyRollsError } from './errors';
import {
  ASTBinOp,
  ASTDice,
  ASTLiteral,
  ASTNode,
  ASTParenthetical,
  ASTUnOp,
  Modifier,
  Selector,
  selectorMatches,
} from './parser';
import { sorted } from './util';

// ===================================
// Rolled classes
// ===================================

export abstract class RolledNode {
  public abstract total(): number;
  public abstract toString(): string;
}

export class RolledLiteral extends RolledNode {
  public readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  public total(): number {
    return this.value;
  }

  public toString(): string {
    return this.value.toString();
  }
}

class RolledDie extends RolledNode {
  public value: number;
  public kept: boolean;
  public readonly sides: number;
  private readonly context: RollContext;

  constructor(context: RollContext, sides: number, kept: boolean = true) {
    super();
    this.kept = kept;
    this.sides = sides;
    this.context = context;
    this.value = this.context.roll(this.sides);
  }

  public keep() {
    this.kept = true;
  }

  public drop() {
    this.kept = false;
  }

  public reroll() {
    this.value = this.context.roll(this.sides);
  }

  public setMin(value: number) {
    this.value = Math.max(this.value, value);
  }

  public setMax(value: number) {
    this.value = Math.min(this.value, value);
  }

  public total(): number {
    return this.kept ? this.value : 0;
  }

  public toString(): string {
    return this.value.toString();
  }
}

export class RolledDice extends RolledNode {
  public readonly count: number;
  public readonly sides: number;
  public readonly modifiers: Modifier[];
  public readonly dice: RolledDie[];
  private readonly context: RollContext;

  constructor(context: RollContext, count: number, sides: number, modifiers: Modifier[]) {
    super();
    this.context = context;
    this.count = count;
    this.sides = sides;
    this.modifiers = modifiers;
    this.dice = [];

    for (let i = 0; i < this.count; i++) {
      this.dice.push(new RolledDie(this.context, this.sides));
    }

    for (const operator of this.modifiers) {
      this.apply(operator);
    }
  }

  private keptDice(): RolledDie[] {
    return this.dice.filter((die) => die.kept);
  }

  public total(): number {
    return this.keptDice().reduce((a, b) => a + b.total(), 0);
  }

  public toString(): string {
    const kept = this.keptDice().map((die) => die.toString());
    return `[${kept.join(',')}]`;
  }

  private getHighestDice(n: number): RolledDie[] {
    return sorted(this.keptDice(), (a, b) => b.value - a.value).slice(0, n);
  }

  private getLowestDice(n: number): RolledDie[] {
    return sorted(this.keptDice(), (a, b) => a.value - b.value).slice(0, n);
  }

  private getMatchedDice(selector: Selector): RolledDie[] {
    if (selector.cat === 'h') return this.getHighestDice(selector.num);
    if (selector.cat === 'l') return this.getLowestDice(selector.num);

    return this.dice.filter((die) => selectorMatches(selector, die.value));
  }

  private apply(modifier: Modifier): void {
    const functions = new Map([
      ['mi', this.applyMin],
      ['ma', this.applyMax],
      ['rr', this.applyReroll],
      ['ro', this.applyRerollOnce],
    ]);

    if (!functions.has(modifier.cat)) {
      throw new ModifierError(`The operator '${modifier.cat}' is not supported.`);
    }

    functions.get(modifier.cat)(modifier.sel);
  }

  private applyMin(selector: Selector): void {
    if (selector.cat !== '') {
      throw new ModifierError(`The operator mi expects no category, but '${selector.cat}' was given.`);
    }

    for (const die of this.dice) {
      die.setMin(selector.num);
    }
  }

  private applyMax(selector: Selector): void {
    if (selector.cat !== '') {
      throw new ModifierError(`The operator ma expects no category, but '${selector.cat}' was given.`);
    }

    for (const die of this.dice) {
      die.setMax(selector.num);
    }
  }

  private applyReroll(selector: Selector): void {
    if (selector.cat === 'h') {
      throw new ModifierError(`The operator rr expects does not support the h selector.`);
    }

    if (selector.cat === 'l') {
      throw new ModifierError(`The operator rr expects does not support the l selector.`);
    }

    for (const die of this.dice) {
      while (selectorMatches(selector, die.value)) {
        die.reroll();
      }
    }
  }

  private applyRerollOnce(selector: Selector): void {
    const dice = this.getMatchedDice(selector);
    for (const die of dice) {
      die.reroll();
    }
  }
}

export class RolledUnOp extends RolledNode {
  public readonly op: string;
  public readonly node: RolledNode;

  constructor(op: string, node: RolledNode) {
    super();
    this.op = op;
    this.node = node;
  }

  public total(): number {
    switch (this.op) {
      case '+':
        return this.node.total();
      case '-':
        return -this.node.total();
    }
    throw new ParserError(`Invalid unary operator '${this.op}'.`);
  }

  public toString(): string {
    return `${this.op}${this.node.toString()}`;
  }
}

export class RolledBinOp extends RolledNode {
  public readonly op: string;
  public readonly left: RolledNode;
  public readonly right: RolledNode;

  constructor(op: string, left: RolledNode, right: RolledNode) {
    super();
    this.op = op;
    this.left = left;
    this.right = right;
  }

  public total(): number {
    switch (this.op) {
      case '+':
        return this.left.total() + this.right.total();
      case '-':
        return this.left.total() - this.right.total();
      case '*':
        return this.left.total() * this.right.total();
      case '/':
        return Math.floor(this.left.total() / this.right.total());
      case '%':
        return this.left.total() % this.right.total();
    }
    throw new ParserError(`Invalid binary operator '${this.op}'.`);
  }

  public toString(): string {
    return `${this.left.toString()} ${this.op} ${this.right.toString()}`;
  }
}

export class RolledParenthetical extends RolledNode {
  public readonly node: RolledNode;

  constructor(node: RolledNode) {
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

// ===================================
// Rolls
// ===================================

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

  public roll(sides: number): number {
    if (this.rolls > this.max) {
      throw new TooManyRollsError('Rolled too many times!');
    }

    this.rolls += 1;
    return Math.floor(Math.random() * sides) + 1;
  }
}

export class Roller {
  private readonly context: RollContext;

  constructor() {
    this.context = new RollContext(1000);
  }

  public roll(ast: ASTNode): RolledNode {
    if (ast instanceof ASTLiteral) return this.rollLiteral(ast);
    if (ast instanceof ASTDice) return this.rollDice(ast);
    if (ast instanceof ASTUnOp) return this.rollUnOp(ast);
    if (ast instanceof ASTBinOp) return this.rollBinOp(ast);
    if (ast instanceof ASTParenthetical) return this.rollParenthetical(ast);

    throw new ParserError(`Unsupported AST node '${ast.constructor.name}'`);
  }

  private rollLiteral(ast: ASTLiteral): RolledLiteral {
    return new RolledLiteral(ast.value);
  }

  private rollDice(ast: ASTDice): RolledDice {
    return new RolledDice(this.context, ast.count, ast.sides, ast.modifiers);
  }

  private rollUnOp(ast: ASTUnOp): RolledUnOp {
    const node = this.roll(ast.value);
    return new RolledUnOp(ast.op, node);
  }

  private rollBinOp(ast: ASTBinOp): RolledBinOp {
    const left = this.roll(ast.left);
    const right = this.roll(ast.right);
    return new RolledBinOp(ast.op, left, right);
  }

  private rollParenthetical(ast: ASTParenthetical) {
    const node = this.roll(ast.value);
    return new RolledParenthetical(node);
  }
}
