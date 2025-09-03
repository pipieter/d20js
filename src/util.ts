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
