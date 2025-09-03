export class LexerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LexerError";
  }
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParserError";
  }
}

export class TooManyRollsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TooManyRollsError";
  }
}
