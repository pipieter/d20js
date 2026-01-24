export function sorted<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
  const copy = [...array];
  copy.sort(compareFn);
  return copy;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function range(min: number, max: number): number[] {
  const array = [];
  for (let i = min; i <= max; i++) {
    array.push(i);
  }
  return array;
}

export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 1) {
    return arrays[0].map((array) => [array]);
  }

  const result: T[][] = [];
  const subarrays = cartesianProduct(arrays.slice(1));

  for (const value of arrays[0]) {
    for (const subarray of subarrays) {
      result.push([value, ...subarray]);
    }
  }

  return result;
}

export function convolve(a: readonly number[], b: readonly number[]): number[] {
  // Calculate the convolution of two vectors
  const length = a.length + b.length - 1;
  const convolution = Array(length).fill(0);

  for (let n = 0; n < convolution.length; n++) {
    for (let m = 0; m < b.length; m++) {
      if (0 <= n - m && n - m < a.length) {
        convolution[n] += a[n - m] * b[m];
      }
    }
  }

  return convolution;
}
