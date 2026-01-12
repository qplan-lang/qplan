import { runQplan } from "../dist/index.js";

/**
 * Example: Var Expressions
 * Demonstrates string concatenation and arithmetic operations using the 'var' command.
 */
const script = `
plan {
  @title "Var Expression Example"
  @summary "Example processing string concatenation and number arithmetic in a single var line"

  step id="string_concat" desc="Test String Concatenation" {
    var "Hello" -> s1
    var "World" -> s2
    
    # Unlimited concatenation with + symbol
    var s1 + " " + s2 + "!" -> greeting
    
    print greeting
    # Output: Hello World!
  }

  step id="math_ops" desc="Test Number Arithmetic" {
    var 1000 -> price
    var 5 -> quantity
    
    # Standard arithmetic support (+, -, *, /)
    var price * quantity -> total
    var total * 0.1 -> tax
    var total + tax -> finalPrice
    
    print "Price: " + price
    print "Quantity: " + quantity
    print "Total(Inc. Tax): " + finalPrice
    # Output: Total(Inc. Tax): 5500
  }

  step id="complex_expr" desc="Test Complex Expressions" {
    var 10 -> base
    var 2 -> multiplier
    
    # Parentheses supported
    var (base + 5) * multiplier -> result
    
    print "Result: " + result
    # Output: Result: 30
    
    # Mixed string and number concatenation (numbers auto-converted to string)
    var "Base " + base + " * " + multiplier + " = " + (base * multiplier) -> calcLog
    print calcLog
    # Output: Base 10 * 2 = 20
  }
}
`;

const ctx = await runQplan(script);
console.log("\n--- Execution Results ---");
console.log("greeting:", ctx.get("greeting"));
console.log("finalPrice:", ctx.get("finalPrice"));
console.log("calcLog:", ctx.get("calcLog"));
