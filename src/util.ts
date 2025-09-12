export function splitMultiple(str: string, separators: string[], removeEmpty: boolean = true): string[] {
  let strings = [str];

  for (const separator of separators) {
    strings = strings.flatMap((str) => str.split(separator));
  }

  if (removeEmpty) {
    strings = strings.filter((str) => str.length > 0);
  }

  return strings;
}

export function joinAnd(strings: string[]) {
  if (strings.length <= 2) {
    return strings.join(' and ');
  }

  const head = strings.slice(0, -1).join(', ');
  const tail = strings[strings.length - 1];

  return [head, tail].join(' and ');
}

export function sorted<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
  const copy = [...array];
  copy.sort(compareFn);
  return copy;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function range(start: number, end: number, step: number = 1): number[] {
  const array = [];
  for (let i = start; i <= end; i += step) {
    array.push(i);
  }
  return array;
}

export function cartesianProduct(array: number[], repeat: number): number[][] {
  if (repeat === 0) return [];
  if (repeat === 1) return array.map((e) => [e]);

  const products: number[][] = [];
  const combinations = cartesianProduct(array, repeat - 1);
  for (const combination of combinations) {
    for (const element of array) {
      products.push([...combination, element]);
    }
  }

  return products;
}
