import { DistributionError, DivideByZeroError } from './errors';
import { ASTBinOp, ASTDice, ASTLiteral, ASTNode, ASTParenthetical, ASTUnOp, Modifier } from './parser';

export class Distribution {
  private readonly dist: Map<number, number>;

  constructor(dist: Map<number, number>) {
    // Check if total distribution odds are (nearly) equal to 1.0
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
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
    return this.keys()
      .map((key) => transform(this.get(key)))
      .reduce((a, b) => a + b, 0);
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
        newDist.set(key, this.get(thisKey) * other.get(otherKey));
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
    for (let i = 0; i <= sides; i++) {
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
      return new ModifiedDiceDistribution(ast.count, ast.sides, ast.modifiers).distribution();
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

class ModifiedDiceDistribution {
  constructor(count: number, sides: number, modifiers: Modifier[]) {
    throw new DistributionError(`Modified dice distribution is not supported yet.`);
  }

  public distribution(): Distribution {
    throw new DistributionError(`Modified dice distribution is not supported yet.`);
  }
}
