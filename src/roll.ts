import { ModifierError, ParserError, TooManyRollsError } from './errors';
import {
  ASTBinOp,
  ASTDice,
  ASTLiteral,
  ASTNode,
  ASTParenthetical,
  ASTUnOp,
  DiceOperation,
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
  public abstract expression(): string;
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

  public expression(): string {
    return this.toString();
  }
}

class RolledDie extends RolledNode {
  public value: number;
  public kept: boolean;
  public readonly sides: number;
  private readonly context: RollContext;

  constructor(context: RollContext, sides: number, kept: boolean = true) {
    super();
    if (sides === 0) {
      throw new ParserError('Cannot roll a zero-sided die.');
    }

    this.kept = kept;
    this.sides = sides;
    this.context = context;
    this.value = this.context.roll(this.sides);
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

  public expression(): string {
    return `1d${this.sides}`;
  }
}

export class RolledDice extends RolledNode {
  public readonly count: number;
  public readonly sides: number;
  public readonly operations: DiceOperation[];
  public readonly dice: RolledDie[];
  private readonly context: RollContext;

  constructor(context: RollContext, count: number, sides: number, operations: DiceOperation[]) {
    super();
    this.context = context;
    this.count = count;
    this.sides = sides;
    this.operations = operations;
    this.dice = [];

    for (let i = 0; i < this.count; i++) {
      this.addNewDie();
    }

    for (const modifier of this.operations) {
      this.apply(modifier);
    }
  }

  public keptDice(): RolledDie[] {
    return this.dice.filter((die) => die.kept);
  }

  public total(): number {
    return this.keptDice().reduce((a, b) => a + b.total(), 0);
  }

  public toString(): string {
    const kept = this.keptDice().map((die) => die.toString());
    return `[${kept.join(',')}]`;
  }

  public expression(): string {
    const modifiers = this.operations.map((op) => op.toString());
    return `${this.count}d${this.sides}${modifiers.join('')}`;
  }

  private addNewDie(): RolledDie {
    const die = new RolledDie(this.context, this.sides);
    this.dice.push(die);
    return die;
  }

  private getHighestDice(n: number): RolledDie[] {
    return sorted(this.keptDice(), (a, b) => b.value - a.value).slice(0, n);
  }

  private getLowestDice(n: number): RolledDie[] {
    return sorted(this.keptDice(), (a, b) => a.value - b.value).slice(0, n);
  }

  private getMatchedDice(selector: Selector, maxDice?: number): RolledDie[] {
    let dice: RolledDie[] = [];
    if (selector.type === 'h') {
      dice = this.getHighestDice(selector.value);
    } else if (selector.type === 'l') {
      dice = this.getLowestDice(selector.value);
    } else {
      dice = this.dice.filter((die) => selectorMatches(selector, die.value));
    }

    if (maxDice !== undefined) {
      dice = dice.slice(0, maxDice);
    }

    return dice;
  }

  private apply(operation: DiceOperation): void {
    // prettier-ignore
    switch (operation.op) {
      case 'mi': return this.applyMin(operation.selector);
      case 'ma': return this.applyMax(operation.selector);
      case 'rr': return this.applyReroll(operation.selector);
      case 'ro': return this.applyRerollOnce(operation.selector);
      case 'ra': return this.applyExplodeOnce(operation.selector);
      case 'e':  return this.applyExplode(operation.selector);
      case 'k':  return this.applyKeep(operation.selector);
      case 'p':  return this.applyDrop(operation.selector);
    }

    throw new ModifierError(`The operator '${operation.op}' is not supported.`);
  }

  private applyMin(selector: Selector): void {
    if (selector.type !== null) {
      throw new ModifierError(`The operator mi expects no category, but '${selector.type}' was given.`);
    }

    for (const die of this.dice) {
      die.setMin(selector.value);
    }
  }

  private applyMax(selector: Selector): void {
    if (selector.type !== '') {
      throw new ModifierError(`The operator ma expects no category, but '${selector.type}' was given.`);
    }

    for (const die of this.dice) {
      die.setMax(selector.value);
    }
  }

  private applyReroll(selector: Selector): void {
    if (selector.type === 'h') {
      throw new ModifierError(`The operator rr expects does not support the h selector.`);
    }

    if (selector.type === 'l') {
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

  private applyExplodeOnce(selector: Selector): void {
    const dice = this.getMatchedDice(selector, 1);
    if (dice.length > 0) {
      this.addNewDie();
    }
  }

  private applyExplode(selector: Selector): void {
    let toExplode = new Set(this.getMatchedDice(selector));
    const alreadyExploded = new Set<RolledDie>();

    while (toExplode.size > 0) {
      for (const die of toExplode) {
        this.addNewDie();
        alreadyExploded.add(die);
      }

      toExplode = new Set(this.getMatchedDice(selector));
      for (const exploded of alreadyExploded) {
        toExplode.delete(exploded);
      }
    }
  }

  private applyKeep(selector: Selector): void {
    const keep = new Set(this.getMatchedDice(selector));
    const drop = new Set(this.keptDice());
    for (const die of keep) {
      drop.delete(die);
    }

    for (const die of drop) {
      die.drop();
    }
  }

  private applyDrop(selector: Selector): void {
    const drop = this.getMatchedDice(selector);
    for (const die of drop) {
      die.drop();
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

  public expression(): string {
    return `${this.op}${this.node.expression()}`;
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
        return this.left.total() / this.right.total();
      case '%':
        return this.left.total() % this.right.total();
    }
    throw new ParserError(`Invalid binary operator '${this.op}'.`);
  }

  public toString(): string {
    return `${this.left.toString()} ${this.op} ${this.right.toString()}`;
  }

  public expression(): string {
    return `${this.left.expression()} ${this.op} ${this.right.expression()}`;
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

  public expression(): string {
    return `(${this.node.expression()})`;
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
    return new RolledDice(this.context, ast.count, ast.sides, ast.operations);
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
