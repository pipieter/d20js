import { ParserError } from "./errors";
import { joinAnd, splitMultiple } from "./util";

export enum ModifierType {
  Min = "mi",
  Max = "ma",
  Keep = "k",
  Drop = "p",
  RerollOnce = "ro",
  RerollRepeat = "rr",
  RerollAdd = "ra",
  Explode = "e",
}

export enum SelectorType {
  Literal = "",
  Highest = "h",
  Lowest = "l",
  GreaterThan = "<",
  LessThan = ">",
}

export class Selector {
  public readonly type: SelectorType;
  public readonly value: number;

  constructor(type: SelectorType, value: number) {
    this.type = type;
    this.value = value;
  }

  public toString(): string {
    return `${this.type}${this.value}`;
  }
}

export class Modifier {
  public readonly type: ModifierType;
  public readonly selector: Selector;

  constructor(type: ModifierType, selector: Selector) {
    this.type = type;
    this.selector = selector;
  }

  public toString(): string {
    return `${this.type}${this.selector.toString()}`;
  }

  public static parse(str: string): Modifier[] {
    const modifiers: Modifier[] = [];

    const regex = /(:?mi|ma|k|p|ro|rr|rr|ra|e)([<>hl]?)([0-9]+)/g;
    const matches = str.matchAll(regex);

    const fullMatches = [];
    for (const match of matches) {
      fullMatches.push(match[0]);
      const type = match[1] as ModifierType;
      const selType = match[2] as SelectorType;
      const selVal = parseInt(match[3]);
      modifiers.push(new Modifier(type, new Selector(selType, selVal)));
    }

    const remaining = splitMultiple(str, fullMatches);
    if (remaining.length === 1) {
      throw new ParserError(`Found unknown modifier '${remaining[0]}'.`);
    } else if (remaining.length > 1) {
      const joined = joinAnd(remaining.map((r) => `'${r}'`));
      throw new ParserError(`Found unknown modifiers ${joined}.`);
    }

    return modifiers;
  }
}
