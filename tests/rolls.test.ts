import { expect, test } from '@jest/globals';

import * as d20 from '../dist';

test('verify roll bounds (Monte Carlo)', () => {
  const iterations = 1_000;
  const expression = '1d20 + 5';

  for (let _ = 0; _ < iterations; _++) {
    const roll = d20.roll(expression);
    expect(roll.total()).toBeGreaterThanOrEqual(6);
    expect(roll.total()).toBeLessThanOrEqual(25);
  }
});

test('test basic math', () => {
  const expression = '3 * 5 + 6 * (-3) / 4';
  const roll = d20.roll(expression);

  expect(roll.total()).toBe(10);
});

test('test modulo operator', () => {
  const expression = '14 % 3';
  const roll = d20.roll(expression);

  expect(roll.total()).toBe(2);
});

test('test floating point', () => {
  const expression = '14.3 * 2';
  const roll = d20.roll(expression);

  expect(roll.total()).toBe(28.6);
});
