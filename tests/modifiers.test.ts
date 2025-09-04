import { expect, test } from '@jest/globals';

import * as d20 from '../dist';
import { TooManyRollsError } from '../dist/errors';
import { RolledDice } from '../dist/roll';

test('test explode infinite', () => {
  // This behavior should be consistent with Avrae
  const expression = '4d1e1';
  expect(() => d20.roll(expression)).toThrow(TooManyRollsError);
});

test('test explode highest', () => {
  // This behavior should be consistent with Avrae
  const expression = '1d1eh5';
  const roll = d20.roll(expression);
  expect((roll as RolledDice).keptDice().length).toBe(6);
});
