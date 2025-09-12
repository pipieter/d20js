import { expect, test } from '@jest/globals';

import * as d20 from '../src';

test('distribution single unmodified dice', () => {
  const distribution = d20.distribution('1d6');

  expect(distribution.get(1)).toEqual(1.0 / 6.0);
  expect(distribution.get(2)).toEqual(1.0 / 6.0);
  expect(distribution.get(3)).toEqual(1.0 / 6.0);
  expect(distribution.get(4)).toEqual(1.0 / 6.0);
  expect(distribution.get(5)).toEqual(1.0 / 6.0);
  expect(distribution.get(6)).toEqual(1.0 / 6.0);

  expect(distribution.get(0)).toEqual(0.0);
  expect(distribution.get(7)).toEqual(0.0);
});

test('distribution multiple unmodified dice', () => {
  const distribution = d20.distribution('4d4');

  // Odds based on anydice.com
  expect(distribution.get(4)).toBeCloseTo(0.0039, 3);
  expect(distribution.get(5)).toBeCloseTo(0.0156, 3);
  expect(distribution.get(6)).toBeCloseTo(0.0391, 3);
  expect(distribution.get(7)).toBeCloseTo(0.0781, 3);
  expect(distribution.get(8)).toBeCloseTo(0.1211, 3);
  expect(distribution.get(9)).toBeCloseTo(0.1563, 3);
  expect(distribution.get(10)).toBeCloseTo(0.1719, 3);
  expect(distribution.get(11)).toBeCloseTo(0.1563, 3);
  expect(distribution.get(12)).toBeCloseTo(0.1211, 3);
  expect(distribution.get(13)).toBeCloseTo(0.0781, 3);
  expect(distribution.get(14)).toBeCloseTo(0.0391, 3);
  expect(distribution.get(15)).toBeCloseTo(0.0156, 3);
  expect(distribution.get(16)).toBeCloseTo(0.0039, 3);
});

test('distribution dice plus literal', () => {
  const distribution = d20.distribution('1d6+4');

  expect(distribution.get(1 + 4)).toEqual(1.0 / 6.0);
  expect(distribution.get(2 + 4)).toEqual(1.0 / 6.0);
  expect(distribution.get(3 + 4)).toEqual(1.0 / 6.0);
  expect(distribution.get(4 + 4)).toEqual(1.0 / 6.0);
  expect(distribution.get(5 + 4)).toEqual(1.0 / 6.0);
  expect(distribution.get(6 + 4)).toEqual(1.0 / 6.0);
});
