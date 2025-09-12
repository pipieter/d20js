export class LexerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LexerError';
  }
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}

export class DistributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}

export class ModifierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModifierError';
  }
}

export class TooManyRollsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TooManyRollsError';
  }
}

export class DivideByZeroError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DivideByZeroError';
  }
}
