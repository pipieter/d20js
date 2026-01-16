import { expect, test } from 'vitest';

import * as d20 from '../src';

// ==========================================
// Test the correct inner behavior
// ==========================================

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

test('test invalid selectors', () => {
  // These tests should throw errors, because the used selectors are not supported for the operations

  expect(() => d20.distribution('4d20mi<3')).toThrow(d20.DistributionError);
  expect(() => d20.distribution('4d20mal3')).toThrow(d20.DistributionError);
});

test('test distribution transform', () => {
  const expression = '1d20';
  const distribution = d20.distribution(expression);
  const transformed = distribution.transformKeys((key) => (key % 4) + 1);

  expect(transformed.get(1)).toEqual(0.25);
  expect(transformed.get(2)).toEqual(0.25);
  expect(transformed.get(3)).toEqual(0.25);
  expect(transformed.get(4)).toEqual(0.25);
});

// ==========================================
// Test the results of individual expressions
// ==========================================

// Utility function to very distributions based on anydice results
function verifyDistribution(expression: string, probabilities: [number, number][], mean: number, stddev: number) {
  const distribution = d20.distribution(expression);

  const min = Math.min(...probabilities.map((prob) => prob[0]));
  const max = Math.max(...probabilities.map((prob) => prob[0]));

  expect(distribution.min()).toEqual(min);
  expect(distribution.max()).toEqual(max);

  for (const [key, value] of probabilities) {
    expect(distribution.get(key)).toBeCloseTo(value, 4);
  }

  expect(distribution.mean()).toBeCloseTo(mean, 2);
  expect(distribution.stddev()).toBeCloseTo(stddev, 2);
}

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

  verifyDistribution(expression, probabilities, mean, stddev);
});

test('test mi operator', () => {
  // Results were verified using anydice using input `output 3d{3,3,3,4,5,6}`
  const expression = '3d6mi3';
  const probabilities: [number, number][] = [
    [9, 0.125],
    [10, 0.125],
    [11, 0.1667],
    [12, 0.213],
    [13, 0.1389],
    [14, 0.1111],
    [15, 0.0741],
    [16, 0.0278],
    [17, 0.0139],
    [18, 0.0046],
  ];
  const mean = 12.0;
  const stddev = 2.0;

  verifyDistribution(expression, probabilities, mean, stddev);
});

test('test ma operator', () => {
  // Results were verified using anydice using input `output 4d{1,2,2,2}`
  const expression = '4d4ma2';
  const probabilities: [number, number][] = [
    [4, 0.00390625],
    [5, 0.046875],
    [6, 0.2109375],
    [7, 0.421875],
    [8, 0.31640625],
  ];
  const mean = 7.0;
  const stddev = 0.8660254037844386;

  verifyDistribution(expression, probabilities, mean, stddev);
});
