import { DistributionError, DivideByZeroError } from './errors';
import { ASTBinOp, ASTDice, ASTLiteral, ASTNode, ASTParenthetical, ASTUnOp, Modifier, Selector } from './parser';
import { cartesianProduct, range, sorted, sum } from './util';

export class Distribution {
  private readonly dist: Map<number, number>;

  constructor(dist: Map<number, number>) {
    // Check if total distribution odds are (nearly) equal to 1.0
    const total = sum(Array.from(dist.values()));
    if (Math.abs(1.0 - total) >= 1e-6) {
      throw new DistributionError(`Distribution odds total ${total} instead of 1.0`);
    }

    this.dist = new Map(dist);
  }

  public copy(): Distribution {
    return new Distribution(this.dist);
  }

  public keys(): number[] {
    const keys = Array.from(this.dist.keys());
    keys.sort();
    return keys;
  }

  public get(key: number): number {
    return this.dist.get(key) || 0;
  }

  public has(key: number): boolean {
    return this.dist.has(key);
  }

  public mean(transform?: (value: number) => number): number {
    if (!transform) transform = (x) => x; // id transform
    return sum(this.keys().map((key) => transform(this.get(key))));
  }

  public stdev(): number {
    // variance = E[X^2] - E[X]^2
    // stdev = sqrt(variance)
    const e_x2 = this.mean((x) => x * x);
    const ex_2 = this.mean() * this.mean();
    return Math.sqrt(e_x2 - ex_2);
  }

  private combine(other: Distribution, keyTransform: (a: number, b: number) => number): Distribution {
    const newDist = new Map<number, number>();

    for (const thisKey of this.keys()) {
      for (const otherKey of other.keys()) {
        const key = keyTransform(thisKey, otherKey);
        const value = (newDist.get(key) || 0) + this.get(thisKey) * other.get(otherKey);
        newDist.set(key, value);
      }
    }

    return new Distribution(newDist);
  }

  public add(other: Distribution) {
    return this.combine(other, (a, b) => a + b);
  }

  public sub(other: Distribution) {
    return this.combine(other, (a, b) => a + b);
  }

  public mul(other: Distribution) {
    return this.combine(other, (a, b) => a * b);
  }

  public div(other: Distribution) {
    if (other.has(0)) {
      throw new DivideByZeroError('Distribution contains a division by zero.');
    }

    return this.combine(other, (a, b) => Math.floor(a / b));
  }

  public mod(other: Distribution) {
    if (other.has(0)) {
      throw new DivideByZeroError('Distribution contains a modulo by zero.');
    }

    return this.combine(other, (a, b) => a % b);
  }

  public neg(): Distribution {
    const dist = Array.from(this.dist).map((key, value) => [-key, value] as [number, number]);
    return new Distribution(new Map<number, number>(dist));
  }

  public advantage(): Distribution {
    return this.combine(this, Math.max);
  }

  public disadvantage(): Distribution {
    return this.combine(this, Math.min);
  }

  // ===================================
  // Parse AST
  // ===================================

  public static from(ast: ASTNode): Distribution {
    if (ast instanceof ASTLiteral) return new Distribution(new Map([[ast.value, 1.0]]));
    if (ast instanceof ASTDice) return Distribution.fromDice(ast);
    if (ast instanceof ASTParenthetical) return Distribution.from(ast.value);

    if (ast instanceof ASTUnOp) {
      if (ast.op === '+') return Distribution.from(ast.value);
      if (ast.op === '-') return Distribution.from(ast.value).neg();
      throw new DistributionError(`Unsupported Distribution UnOp operator '${ast.op}'.`);
    }

    if (ast instanceof ASTBinOp) {
      const left = Distribution.from(ast.left);
      const right = Distribution.from(ast.right);

      if (ast.op === '*') return left.mul(right);
      if (ast.op === '/') return left.div(right);
      if (ast.op === '+') return left.add(right);
      if (ast.op === '-') return left.sub(right);
      if (ast.op === '%') return left.mod(right);
      throw new DistributionError(`Unsupported Distribution BinOp operator '${ast.op}'.`);
    }

    throw new DistributionError(`Unsupported Distribution AST node ${ast.constructor.name}.`);
  }

  private static uniform(sides: number): Distribution {
    const dist = new Map<number, number>();
    for (let i = 1; i <= sides; i++) {
      dist.set(i, 1 / sides);
    }
    return new Distribution(dist);
  }

  private static zero(): Distribution {
    return new Distribution(new Map([[0, 1.0]]));
  }

  private static fromDice(ast: ASTDice): Distribution {
    // Modified dice are handled separately, as they require more precise handling.
    if (ast.isModified()) {
      return new ModifiedDistribution(ast.count, ast.sides, ast.modifiers).distribution();
    }

    const count = ast.count;
    const sides = ast.sides;

    let distribution = Distribution.zero();
    for (let i = 0; i < count; i++) {
      distribution = distribution.add(Distribution.uniform(sides));
    }

    return distribution;
  }
}

class ModifiedDistribution {
  private readonly count: number;
  private readonly sides: number;
  private dist: Map<string, number>;

  constructor(count: number, sides: number, modifiers: Modifier[]) {
    this.count = count;
    this.sides = sides;
    this.dist = new Map();

    const keys = cartesianProduct(range(1, sides), count);
    for (const key of keys) {
      const newKey = ModifiedDistribution.keyToString(key);
      const newValue = (this.dist.get(newKey) || 0) + 1.0 / keys.length;
      this.dist.set(newKey, newValue);
    }

    for (const modifier of modifiers) {
      if (modifier.cat === 'mi') this.applyMin(modifier.sel);
      else throw new DistributionError(`Dice modifier ${modifier.cat} is not supported yet for distributions.`);
    }
  }

  private static keyToString(key: number[]): string {
    return sorted(key).join(',');
  }

  private static stringToKey(str: string): number[] {
    return sorted(str.split(',').map(Number));
  }

  private transformKeys(transform: (key: number[]) => number[]) {
    const newDist = new Map<string, number>();

    for (const [key, value] of this.dist.entries()) {
      const newKey = ModifiedDistribution.keyToString(transform(ModifiedDistribution.stringToKey(key)));
      const newValue = (newDist.get(newKey) || 0) + value;
      newDist.set(newKey, newValue);
    }

    this.dist = newDist;
  }

  private applyMin(selector: Selector): void {
    this.transformKeys((key) => key.map((k) => Math.max(k, selector.num)));
  }

  public distribution(): Distribution {
    const dist = new Map<number, number>();
    for (const [key, value] of this.dist.entries()) {
      const distKey = sum(ModifiedDistribution.stringToKey(key));
      const distValue = (dist.get(distKey) || 0) + value;
      dist.set(distKey, distValue);
    }

    return new Distribution(dist);
  }
}
