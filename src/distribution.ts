import { DistributionError } from './errors';
import { ASTBinOp, ASTDice, ASTLiteral, ASTNode, ASTParenthetical, ASTUnOp, DiceOperation, Selector, selectorMatches } from './parser';
import { cartesianProduct, range, sum } from './util';

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

  public keys(): number[] {
    const keys = Array.from(this.values.keys());
    keys.sort((a, b) => a - b);
    return keys;
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

  public static transformKeys(dist: Distribution, func: (key: number) => number): Distribution {
    const values = new Map<number, number>();
    for (const [key, value] of dist.values.entries()) {
      const newKey = func(key);
      const newValue = (values.get(newKey) ?? 0) + value;
      values.set(newKey, newValue);
    }

    return new Distribution(values);
  }

  public static transformValues(dist: Distribution, func: (value: number) => number): Distribution {
    const values = new Map<number, number>();
    for (const [key, value] of dist.values.entries()) {
      values.set(key, func(value));
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

  public static neg(dist: Distribution) {
    return Distribution.transformKeys(dist, (key) => -key);
  }

  public static floor(dist: Distribution) {
    return Distribution.transformKeys(dist, (key) => Math.floor(key));
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

class DiscreteDistribution {
  private readonly counts: Map<string, number>;

  constructor() {
    this.counts = new Map();
  }

  public static fromDice(count: number, sides: number): DiscreteDistribution {
    const distribution = new DiscreteDistribution();
    const ranges: number[][] = [];
    for (let i = 0; i < count; i++) {
      ranges.push(range(1, sides));
    }
    const products = cartesianProduct(ranges);
    for (const product of products) {
      distribution.add(product);
    }
    return distribution;
  }

  public add(key: number[]) {
    const serialized = DiscreteDistribution.serialize(key);
    const current = this.counts.get(serialized) ?? 0;
    this.counts.set(serialized, current + 1);
  }

  public total(): number {
    let total = 0;
    for (const value of this.counts.values()) {
      total += value;
    }
    return total;
  }

  public distribution(): Distribution {
    const total = this.total();
    const map = new Map<number, number>();

    for (const [key, count] of this.counts.entries()) {
      const deserialized = sum(DiscreteDistribution.deserialize(key));
      const currentValue = map.get(deserialized) ?? 0;
      map.set(deserialized, currentValue + count / total);
    }

    return new Distribution(map);
  }

  private static serialize(key: number[]): string {
    return key.map((num) => num.toString()).join(',');
  }

  private static deserialize(key: string): number[] {
    return key.split(',').map((num) => parseInt(num));
  }

  public transform(transform: (rolls: number[]) => number[]): DiscreteDistribution {
    const distribution = new DiscreteDistribution();
    for (const key of this.counts.keys()) {
      const deserialized = DiscreteDistribution.deserialize(key);
      const newKey = transform(deserialized);
      distribution.add(newKey);
    }
    return distribution;
  }

  public applyOperation(operation: DiceOperation): DiscreteDistribution {
    // Minimum or maximum
    if (['mi', 'ma'].includes(operation.op)) {
      if (operation.selector.type !== null) throw new DistributionError(`Invalid selector type '${operation.selector.type}'for '${operation.op}' operation!`);
      if (operation.op === 'mi') return this.transform((rolls) => rolls.map((roll) => Math.max(roll, operation.selector.value)));
      if (operation.op === 'ma') return this.transform((rolls) => rolls.map((roll) => Math.min(roll, operation.selector.value)));
    }

    throw new DistributionError(`Unsupported dice operation for distribution '${operation.op}'`);
  }
}

function calculateDiscreteDiceDistribution(dice: ASTDice): Distribution {
  if (Math.pow(dice.sides, dice.count) > OperationLimits) {
    throw new DistributionError(`Dice expression with modifiers '${dice.toString()}' is too large to calculate!`);
  }

  let distribution = DiscreteDistribution.fromDice(dice.count, dice.sides);
  for (const operation of dice.operations) {
    distribution = distribution.applyOperation(operation);
  }

  return distribution.distribution();
}
