export function sorted<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
  const copy = [...array];
  copy.sort(compareFn);
  return copy;
}
