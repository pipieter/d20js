export function sorted<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
  const copy = [...array];
  copy.sort(compareFn);
  return copy;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
