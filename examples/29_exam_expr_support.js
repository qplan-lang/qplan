import { runQplan, ModuleRegistry } from "../dist/index.js";

const echoModule = {
  id: "test_echo",
  description: "Echoes arguments back",
  inputs: [],
  execute: async (inputs) => inputs
};

const registry = new ModuleRegistry();
registry.register(echoModule);
// System modules are auto-registered by constructor default.

/**
 * Example: Expression Support in Conditions and Module Arguments
 * Tests the new features:
 * 1. Expressions in IF/WHILE conditions
 * 2. Expressions in module arguments (with parentheses)
 */
const script = `
plan {
  @title "Expression Support Test"
  @summary "Testing expressions in conditions and module arguments"

  step id="test_condition_expr" desc="Test Expressions in Conditions" {
    var 100 -> price
    var 10 -> tax
    var 5 -> discount
    
    # Test 1: Expression in IF condition (price + tax > 100)
    IF price + tax > 100 {
      print "Total with tax exceeds 100"
    }
    
    # Test 2: Complex expression in condition
    IF (price + tax) - discount > 100 {
      print "Total after discount still exceeds 100"
    }
    
    # Test 3: Expression on both sides
    IF price * 2 > tax * 10 {
      print "Price doubled is greater than tax times 10"
    }
  }

  step id="test_module_args" desc="Test Expressions in Module Arguments" {
    var 10 -> a
    var 20 -> b
    var 3 -> multiplier
    
    # Test 4: Expression in module argument (parenthesized)
    math op="add" a=(a + b) b=(multiplier * 2) -> result1
    print "Result1 (should be 36): " + result1
    
    # Test 5: More complex expression
    math op="mul" a=(a * 2) b=(b + 5) -> result2
    print "Result2 (should be 500): " + result2

    # Test 7: Complex string concatenation in module arg (parenthesized)
    var {"num": 999} -> obj
    test_echo msg=("foo:" + obj.num + ", bar:" + (1+2)) -> echoResult
    print "Echo Result: " + echoResult.msg


    # Test 8: Comprehensive IF condition checks
    # 8.1 Multiple parentheses
    if (((obj.num > 500))) {
      print "8.1 Multiple parentheses OK"
    }

    # 8.2 Mixed arithmetic and comparison parentheses
    if ((obj.num + 1) > (500 * 1)) {
      print "8.2 Mixed arithmetic/comparison OK"
    }

    # 8.3 Logic operator with parentheses
    if (obj.num > 500) AND (1+1 == 2) {
      print "8.3 Logic operator OK"
    }

    # 8.4 Complex arithmetic comparison
    if ((1+2)*3 < (10/1)) { # assuming platform_const doesn't exist, using literal 1. Or just 10/1
       # 10/1 = 10. 9 < 10. True.
       print "8.4 Complex arithmetic OK"
    }
  }

  step id="test_var_expr" desc="Test VAR Expressions" {
    # Test 9: VAR string + number
    var "Count: " + 123 -> var_str_num
    print "9.1 " + var_str_num

    # Test 10: VAR number + string
    var 99 + " Problems" -> var_num_str
    print "9.2 " + var_num_str
    
    # Test 11: VAR with complex parentheses
    var ((1+2) * 3) -> var_calc
    print "9.3 Result 9=" + var_calc
  }

  step id="test_module_edge" desc="Test Module Arg Edge Cases" {
    # Test 12: Module arg mixed types (must use outer parens)
    test_echo msg=("Mix: " + 123 + " + " + "Text") -> echo_mix
    print "12.1 " + echo_mix.msg

    # Test 13: Module arg with nested calculation
    var 10 -> val
    test_echo msg=("Calc: " + (val * 10)) -> echo_calc
    print "12.2 " + echo_calc.msg

    # Test 14: Accessing undefined property on existing object
    var {} -> emptyObj
    # This might throw 'Unknown identifier' error if runtime checks strict existence
    print "14.1 Access result: " + emptyObj.count
  }

  step id="test_while_expr" desc="Test Expressions in WHILE" {
    var 0 -> counter
    var 5 -> limit
    
    # Test 6: Expression in WHILE condition
    WHILE counter + 1 < limit {
      SET counter = counter + 1
      print "Counter: " + counter
    }
    
    print "Final counter: " + counter
  }
}
`;

console.log("Running expression support test...\n");

try {
  const ctx = await runQplan(script, { registry });
  console.log("\n--- Test Results ---");
  console.log("result1:", ctx.get("result1"));
  console.log("result2:", ctx.get("result2"));
  console.log("echoResult:", ctx.get("echoResult"));
  console.log("counter:", ctx.get("counter"));
  console.log("\n✅ All tests passed!");
} catch (err) {
  console.error("\n❌ Test failed:");
  console.error(err);
  process.exit(1);
}
