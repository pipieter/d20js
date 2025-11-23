import { DistributionError } from './errors';
import { ASTBinOp, ASTDice, ASTLiteral, ASTNode, ASTParenthetical, ASTUnOp } from './parser';
import { sum } from './util';

const DiceLimits = 101 * 101; //Allow 100d100, but nothing more
const OperationLimits = 8192;

function id<T>(v: T): T {
  return v;
}

export class Distribution {
  private readonly values: Map<number, number>;

  constructor(values: Map<number, number>) {
    this.values = values;
  }

  public static uniform(sides: number): Distribution {
    const map = new Map<number, number>();
    for (let i = 1; i <= sides; i++) {
      map.set(i, 1 / sides);
    }
    return new Distribution(map);
  }

  public static fromAST(node: ASTNode): Distribution {
    if (node instanceof ASTLiteral) {
      return new Distribution(new Map([[node.value, 1.0]]));
    }

    if (node instanceof ASTDice) {
      return calculateDiceDistribution(node);
    }

    if (node instanceof ASTParenthetical) {
      return Distribution.fromAST(node.value);
    }

    if (node instanceof ASTUnOp) {
      if (node.op === '+') return Distribution.fromAST(node.value);
      if (node.op === '-') return Distribution.neg(Distribution.fromAST(node.value));
      throw new DistributionError(`Distribution: unsupported UnOp operator '${node.op}'`);
    }

    if (node instanceof ASTBinOp) {
      const left = Distribution.fromAST(node.left);
      const right = Distribution.fromAST(node.right);

      if (node.op === '+') return Distribution.add(left, right);
      if (node.op === '-') return Distribution.sub(left, right);
      if (node.op === '*') return Distribution.mul(left, right);
      if (node.op === '/') return Distribution.div(left, right);
      if (node.op === '%') return Distribution.mod(left, right);
      if (node.op === '//') return Distribution.div(left, right);

      throw new DistributionError(`Distribution: unsupported BinOp operator '${node.op}'`);
    }

    throw new DistributionError(`Distribution: unsupported node type '${node.constructor.name}'`);
  }

  public keys(): readonly number[] {
    return Array.from(this.values.keys());
  }

  public get(key: number): number {
    return this.values.get(key) ?? 0;
  }

  public min(): number {
    return Math.min(...this.keys());
  }

  public max(): number {
    return Math.max(...this.keys());
  }

  public entries(): [number, number][] {
    return Array.from(this.values.entries());
  }

  public mean(mapping: (v: number) => number = id): number {
    return sum(this.entries().map(([key, value]) => mapping(key) * value));
  }

  public stddev(): number {
    // variance = E(X^2) - E(X)^2
    // stddev = sqrt(variance)
    const e_x2 = this.mean((v) => v * v);
    const ex_2 = Math.pow(this.mean(), 2);
    return Math.sqrt(e_x2 - ex_2);
  }

  public copy() {
    return new Distribution(new Map(this.values.entries()));
  }

  public static combine(a: Distribution, b: Distribution, func: (a: number, b: number) => number): Distribution {
    const values = new Map<number, number>();
    for (const [ka, va] of a.values.entries()) {
      for (const [kb, vb] of b.values.entries()) {
        const key = func(ka, kb);
        const value = (values.get(key) ?? 0) + va * vb;
        values.set(key, value);
      }
    }

    return new Distribution(values);
  }

  public static add(a: Distribution, b: Distribution) {
    return Distribution.combine(a, b, (a, b) => a + b);
  }

  public static sub(a: Distribution, b: Distribution) {
    return Distribution.combine(a, b, (a, b) => a - b);
  }

  public static mul(a: Distribution, b: Distribution) {
    return Distribution.combine(a, b, (a, b) => a * b);
  }

  public static div(a: Distribution, b: Distribution) {
    for (const key of b.keys()) {
      if (key === 0) {
        throw new DistributionError('Distribution contains potential divide by zero!');
      }
    }
    return Distribution.combine(a, b, (a, b) => Math.floor(a / b));
  }

  public static mod(a: Distribution, b: Distribution) {
    return Distribution.combine(a, b, (a, b) => a % b);
  }

  public static neg(a: Distribution) {
    const values: [number, number][] = Array.from(a.values.entries()).map((value) => [-value[0], value[1]]);
    return new Distribution(new Map(values));
  }

  public static advantage(a: Distribution) {
    return Distribution.combine(a, a, Math.max);
  }

  public static disadvantage(a: Distribution) {
    return Distribution.combine(a, a, Math.min);
  }
}

function calculateDiceDistribution(dice: ASTDice): Distribution {
  if (dice.operations.length > 0) {
    return calculateDiscreteDiceDistribution(dice);
  }

  if (dice.sides === 0) {
    throw new DistributionError(`Cannot create a distribution of a dice with zero sides in '${dice.toString()}'!`);
  }

  if (dice.sides * dice.count > DiceLimits) {
    throw new DistributionError(`There are too many dice to calculate in '${dice.toString()}'!`);
  }

  let distribution = new Distribution(new Map([[0.0, 1.0]]));
  for (let i = 0; i < dice.count; i++) {
    const uniform = Distribution.uniform(dice.sides);
    distribution = Distribution.add(distribution, uniform);
  }

  return distribution;
}

function calculateDiscreteDiceDistribution(dice: ASTDice): Distribution {
  console.log(Math.pow(dice.sides, dice.count));
  if (Math.pow(dice.sides, dice.count) > OperationLimits) {
    throw new DistributionError(`Dice expression with modifiers '${dice.toString()}' is too large to calculate!`);
  }

  // TODO throw new Error(`calculateDiscreteDiceDistribution not implemented yet!`);
  return Distribution.uniform(1);
}
