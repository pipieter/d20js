import { ASTBinOp } from "../dist/ast";

import { expect, test } from "@jest/globals";

import * as d20 from "../dist";

function isType(value: any, type: any): boolean {
  return value instanceof type;
}

test("verify parser order of operations", () => {
  const ast = d20.parse("1d20 + 3 * 5");

  expect(isType(ast, ASTBinOp)).toBe(true);
  expect((ast as ASTBinOp).op).toBe("+");
  expect((ast as ASTBinOp).left.toString()).toBe("1d20");

  // Verify right side
  const right = (ast as ASTBinOp).right;
  expect(isType(right, ASTBinOp)).toBe(true);
  expect((right as ASTBinOp).op).toBe("*");
  expect((right as ASTBinOp).left.toString()).toBe("3");
  expect((right as ASTBinOp).right.toString()).toBe("5");
});
