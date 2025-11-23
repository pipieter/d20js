import { expect, test } from 'vitest';

import * as d20 from '../src';

test('test d20', () => {
  const distribution = d20.distribution('1d20');

  expect(distribution.min()).toEqual(1);
  expect(distribution.max()).toEqual(20);
  expect(distribution.keys().length).toEqual(20);

  for (let i = distribution.min(); i < distribution.max(); i++) {
    expect(distribution.get(i)).toEqual(0.05);
  }

  expect(distribution.get(100)).toEqual(0.0);
});

test('test complex expression', () => {
  // Results were verified using anydice
  const expression = '3d6 + 2 * 1d4 - 4';
  const probabilities: [number, number][] = [
    [1, 0.0012],
    [2, 0.0035],
    [3, 0.0081],
    [4, 0.015],
    [5, 0.0255],
    [6, 0.0394],
    [7, 0.0544],
    [8, 0.0706],
    [9, 0.0845],
    [10, 0.0961],
    [11, 0.1019],
    [12, 0.1019],
    [13, 0.0961],
    [14, 0.0845],
    [15, 0.0706],
    [16, 0.0544],
    [17, 0.0394],
    [18, 0.0255],
    [19, 0.015],
    [20, 0.0081],
    [21, 0.0035],
    [22, 0.0012],
  ];
  const mean = 11.5;
  const stddev = 3.71;

  const distribution = d20.distribution(expression);

  expect(distribution.min()).toEqual(1);
  expect(distribution.max()).toEqual(22);

  for (const [key, value] of probabilities) {
    expect(distribution.get(key)).toBeCloseTo(value, 4);
  }

  expect(distribution.mean()).toBeCloseTo(mean, 2);
  expect(distribution.stddev()).toBeCloseTo(stddev, 2);
});

test('test exceptions', () => {
  expect(() => d20.distribution('1d6 / 0')).toThrowError(d20.DistributionError); // Divide by zero error
  expect(() => d20.distribution('1d6 +')).toThrowError(d20.ParserError); // Invalid expression
});

test('test limits', () => {
  // The expressions below should within the acceptable limits

  d20.distribution('50d50'); // No operators, less than 101*101
  d20.distribution('4d6mi3'); // Operators, less than 8192 possibilities

  expect(() => d20.distribution('400d400')).toThrowError(d20.DistributionError); // No operators, too many dice
  expect(() => d20.distribution('6d6mi3')).toThrowError(d20.DistributionError); // Operators, too many possibilities
});
