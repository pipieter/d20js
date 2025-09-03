import { expect, test } from "@jest/globals";
import { ASTBinOp } from "../dist/parser";
import * as d20 from "../dist";
import { isType } from "./util";

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
