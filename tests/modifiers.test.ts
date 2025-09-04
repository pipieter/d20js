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

test('test keep', () => {
  // This behavior should be consistent with Avrae
  const expression = '4d6kh3';
  const roll = d20.roll(expression);
  expect((roll as RolledDice).keptDice().length).toBe(3);
});

test('test drop', () => {
  // This behavior should be consistent with Avrae
  const expression = '4d6ph3';
  const roll = d20.roll(expression);
  expect((roll as RolledDice).keptDice().length).toBe(1);
});

test('test keep and drop', () => {
  const expression = '6d6kh5pl3';
  const roll = d20.roll(expression);
  expect((roll as RolledDice).keptDice().length).toBe(2);
});
