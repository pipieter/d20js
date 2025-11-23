/*
 * This grammar is a based on the Lark grammar defined by Avrae, as used by d20.
 * The grammar can be found at:
 * https://raw.githubusercontent.com/avrae/d20/refs/heads/master/d20/grammar.lark
 *
 * The order of operations is (from lowest to highest)
 * 1. Comparison
 * 2. Addition and subtraction
 * 3. Unary operators
 * 4. Multiplication, division, and modulo
 * 
 * Unlike in d20, comments are not supported.
 */

Expression = Comparison

// Operations

ws = [ \t\f\r\n]*

AddOperator   = "+" / "-"
UnaryOperator = "+" / "-"
MultOperator  = "*" / "/" / "//" / "%"
CompOperator  = "<" / ">" / ">=" / "<=" / "==" / "!="

SetOperator  = "k" / "p"
DiceOperator = "rr" / "ro" / "ra" / "e" / "mi" / "ma"

SelectorType = "l" / "h" / "<" / ">"
Selector     = type:SelectorType? value:Integer { return { type: type, value: value }; }

Integer        = digits:[0-9]+ { return parseInt(digits.join(""), 10); }
DiceOperation  = op:(DiceOperator / SetOperator) selector:Selector { return { op: op, selector: selector }; }
DiceExpression = count:Integer? "d" sides:Integer { 
    // e.g. d100, missing count means one
    if (count == null) { count = 1 }
    return { count: count, sides: sides }
}

// Atoms

Literal = value:Integer                               { return { type: "Literal", value: value }; }
Dice    = expression:DiceExpression op:DiceOperation* { return { type: "Dice", expression: expression, op: op}}

// Expression

Comparison
  = left:Sum op:CompOperator right:Comparison { return { type: "BinOp", op: op, left: left, right: right}; }
  / Sum

Sum 
  = left:Unary op:AddOperator right:Sum { return { type: "BinOp", op: op, left: left, right: right }; }
  / Unary

Unary
  = op:UnaryOperator expression:Unary { return { type: "UnOp", op: op, expression: expression }; }
  / Product

Product
  = left:Factor op:MultOperator right:Product { return { type: "BinOp", op: op, left: left, right: right }; }
  / Factor

Factor
  = ws? "(" expression:Expression ")" ws? { return { type: "Parenthetical", expression: expression }; }
  / ws? dice:Dice ws?                     { return dice; }
  / ws? literal:Literal ws?               { return literal; }
