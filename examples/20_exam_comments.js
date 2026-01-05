import { runQplan } from "../dist/index.js";

/**
 * Example: Comment support (//, #, /* */)
 * Demonstrates how comments are ignored by the tokenizer inside a QPlan script.
 */
const script = `
// File header comment
step id="setup" desc="Initialize" {
  # inline comment using hash
  var 1 -> first
  var 2 -> second
  /* multi-line
     comment block */
  math add a=first b=second -> total
  return total=total
}

step id="report" desc="Use results" {
  // Comments can also be inside other steps
  echo msg="Sum is ${setup.total}" -> message
}
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
