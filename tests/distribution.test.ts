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

test('test exceptions', () => {
  expect(() => d20.distribution('1d6 / 0')).toThrowError(d20.DistributionError); // Divide by zero error
  expect(() => d20.distribution('1d6 +')).toThrowError(d20.ParserError); // Invalid expression
});

test('test limits', () => {
  // The expressions below should within the acceptable limits

  d20.distribution('50d50'); // No operators, less than 101*101
  d20.distribution('4d6kh3'); // Operators, less than 8192 possibilities

  expect(() => d20.distribution('400d400')).toThrowError(d20.DistributionError); // No operators, too many dice
  expect(() => d20.distribution('6d6kh3')).toThrowError(d20.DistributionError); // Operators, too many possibilities
});
