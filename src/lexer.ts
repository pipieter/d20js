import { LexerError } from "./errors";

enum TokenType {
  Plus = "PLUS",
  Minus = "MINUS",
  Star = "STAR",
  Slash = "SLASH",
  ParenthesisLeft = "PARENTHESIS LEFT",
  ParenthesisRight = "PARENTHESIS RIGHT",
  Value = "VALUE",
}

class Token {
  public readonly value: string;
  public readonly type: TokenType;

  constructor(value: string, type: TokenType) {
    this.value = value;
    this.type = type;
  }
}

function isDigit(c: string): boolean {
  return "0" <= c && c <= "9";
}

function isAlpha(c: string): boolean {
  const lower = "a" <= c && c <= "z";
  const upper = "A" <= c && c <= "Z";
  return lower || upper;
}

function isPeriod(c: string): boolean {
  return c == ".";
}

function isIdentifierCharacter(c: string) {
  return isDigit(c) || isAlpha(c) || isPeriod(c);
}

export class Lexer {
  private readonly expression: string;
  private start: number;

  constructor(expression: string) {
    this.expression = expression.normalize().trim().toLowerCase();
    this.start = 0;
  }

  public parse(): Token[] {
    const tokens: Token[] = [];

    this.start = 0;
    while (this.start < this.expression.length) {
      const token = this.next();
      if (token) {
        tokens.push(token);
      }
    }

    return tokens;
  }

  private peek(): string {
    if (this.start >= this.expression.length) {
      return "";
    }
    return this.expression[this.start];
  }

  private advance(): void {
    this.start++;
  }

  private next(): Token | null {
    let c = this.peek();
    this.advance();

    switch (c) {
      // Whitespace
      case "":
      case " ":
      case "\t":
      case "\n":
      case "\r":
        return null;

      // Operators
      case "+":
        return { value: c, type: TokenType.Plus };
      case "-":
        return { value: c, type: TokenType.Minus };
      case "*":
        return { value: c, type: TokenType.Star };
      case "/":
        return { value: c, type: TokenType.Slash };
      case "(":
        return { value: c, type: TokenType.ParenthesisLeft };
      case ")":
        return { value: c, type: TokenType.ParenthesisRight };

      // Value
      default: {
        if (!isIdentifierCharacter(c)) {
          throw new LexerError(`Invalid character '${c}'`);
        }

        let token = `${c}`;
        while (isIdentifierCharacter(this.peek())) {
          token += this.peek();
          this.advance();
        }
        return { value: token, type: TokenType.Value };
      }
    }
  }
}
