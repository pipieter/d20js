import { ParserError } from './errors';
import { Token, TokenType } from './lexer';
import { joinAnd, splitMultiple } from './util';

// ===================================
// Modifiers
// ===================================

export interface Selector {
  cat: string;
  num: number;
}

export interface Modifier {
  cat: string;
  sel: Selector;
}

function parseModifiers(expression: string): Modifier[] {
  // Allowed modifier categories: mi, ma, k, p, ro, rr, ra, e
  // Allowed modifier selectors: <, >, h, l, [empty]
  // All modifiers end in numbers
  const regex = /(:?mi|ma|k|p|ro|rr|ra|e)([<>hl]?)([0-9]+)/g;
  const matches = expression.matchAll(regex);

  const modifiers: Modifier[] = [];
  const modifierStrings: string[] = [];

  for (const match of matches) {
    const cat = match[1];
    const selCat = match[2];
    const selNum = parseInt(match[3]);
    const sel = { cat: selCat, num: selNum };
    modifiers.push({ cat, sel });
    modifierStrings.push(match[0]);
  }

  // It's possible for the expression to have modifiers that don't match
  // These are extracted and thrown as an error
  const remaining = splitMultiple(expression, modifierStrings);
  if (remaining.length === 1) {
    throw new ParserError(`Found unknown modifier '${remaining[0]}'.`);
  } else if (remaining.length > 1) {
    const joined = joinAnd(remaining.map((r) => `'${r}'`));
    throw new ParserError(`Found unknown modifiers ${joined}.`);
  }

  return modifiers;
}

export function selectorMatches(selector: Selector, value: number): boolean {
  if (selector.cat === '') return value === selector.num;
  if (selector.cat === '<') return value < selector.num;
  if (selector.cat === '>') return value > selector.num;

  throw new ParserError(`Unsupported selector '${selector.cat}' for selectorMatches.`);
}

export function modifierToString(modifier: Modifier): string {
  return `${modifier.cat}${modifier.sel.cat}${modifier.sel.num}`;
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
  public readonly modifiers: Modifier[];

  constructor(count: number, sides: number, modifiers: Modifier[]) {
    super();
    this.count = count;
    this.sides = sides;
    this.modifiers = modifiers;
  }

  public toString(): string {
    const modifiers = this.modifiers.map(modifierToString).join('');
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

// ===================================
// Parser
// ===================================

export class Parser {
  private readonly tokens: Token[];
  private start: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.start = 0;
  }

  public parse(): ASTNode {
    this.start = 0;
    const node = this.parseExpression();

    if (this.start < this.tokens.length) {
      throw new ParserError(
        'After parsing the expressions, there were still some tokens left. Did you forget an operator?'
      );
    }

    return node;
  }

  private eat(expected: TokenType | null): Token {
    if (this.peek() === null) {
      throw new ParserError(`Expected a value, but received nothing. Is the expression incomplete?`);
    }

    // Special case: warn the user about an expected ')'
    if (
      expected !== null &&
      TokenType.ParenthesisRight === expected &&
      TokenType.ParenthesisRight !== this.peek().type
    ) {
      throw new ParserError(
        `Expected a ')', but received '${this.peek().value}. Are all parentheses correctly closed?`
      );
    }

    if (expected !== null && expected != this.peek().type && Token.isOperator(expected)) {
      throw new ParserError('Expected an operator, but received something else.');
    }

    if (expected !== null && this.peek().type !== expected) {
      throw new ParserError(`Expected a '${expected}', but received '${this.peek().value}'.`);
    }

    const token = this.peek();
    this.start++;
    return token;
  }

  private peek(): Token {
    if (this.start >= this.tokens.length) {
      throw new ParserError('Expected a follow-up to an operator, but received nothing. Did you forget something?');
    }
    return this.tokens[this.start];
  }

  private isAtEnd() {
    return this.start >= this.tokens.length;
  }

  private parseExpression(): ASTNode {
    /* The order of operations in precedence is:
     * - Pure dice expressions or literals
     * - Unary operators
     * - Multiplicative operators (*, /)
     * - Additive operators (+, -)
     *
     * The program is designed such that the lower precedence will always check
     * for the higher precedence first. As such, it is enough to call the lowest
     * parsePrecedence, or in this case parseAdditive.
     */

    return this.parseAdditive();
  }

  private parseUnary(): ASTNode {
    const token = this.peek();
    if ([TokenType.Minus, TokenType.Plus].includes(token.type)) {
      const operator = this.eat(null);
      const atom = this.parseUnary();
      return new ASTUnOp(operator.value, atom);
    }

    return this.parseAtom();
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();

    while (!this.isAtEnd() && Token.isMultiplicativeOp(this.peek().type)) {
      const token = this.eat(null);
      const right = this.parseUnary();
      left = new ASTBinOp(token.value, left, right);
    }

    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (!this.isAtEnd() && Token.isAdditiveOp(this.peek().type)) {
      const token = this.eat(null);
      const right = this.parseMultiplicative();
      left = new ASTBinOp(token.value, left, right);
    }

    return left;
  }

  // LITERAL | DICE | '(' EXPRESSION ')' | UnOp EXPRESSION
  private parseAtom(): ASTNode {
    const token = this.peek();

    // Parse parenthetical
    if (token.type == TokenType.ParenthesisLeft) {
      this.eat(TokenType.ParenthesisLeft);
      const node = this.parseExpression();
      this.eat(TokenType.ParenthesisRight);

      return new ASTParenthetical(node);
    }

    // Parse literal
    const integerRegex = /^[0-9]+$/;
    const decimalRegex = /^[0-9]*\.[0-9]+$/;
    if (integerRegex.test(token.value) || decimalRegex.test(token.value)) {
      const token = this.eat(TokenType.Value);
      const value = parseFloat(token.value);
      return new ASTLiteral(value);
    }

    // Parse dice
    const diceRegex = /^([0-9]*)d([0-9]+)([A-Za-z<>0-9]*)$/;
    if (diceRegex.test(token.value)) {
      const token = this.eat(TokenType.Value);
      const matches = token.value.match(diceRegex);
      const count = parseInt(matches[1] || '1');
      const sides = parseInt(matches[2]);
      const modifiers = parseModifiers(matches[3]);
      return new ASTDice(count, sides, modifiers);
    }

    // Unknown parser
    throw new ParserError(`Could not parse the dice expression '${token.value}'`);
  }
}
