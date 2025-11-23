import { expect, test } from 'vitest';

import * as d20 from '../src';

test('test d20', () => {
  const distribution = d20.distribution('1d20');

    console.log(distribution.keys())

  expect(distribution.min()).toEqual(1);
  expect(distribution.max()).toEqual(20);
  expect(distribution.keys().length).toEqual(20);

  for (let i = distribution.min(); i < distribution.max(); i++) {
    expect(distribution.get(i)).toEqual(0.05);
  }

  expect(distribution.get(100)).toEqual(0.0);
});
