import { runQplan } from "../dist/index.js";

/**
 * Example: store literal values in ctx via the var module
 */
const script = `
var 0 -> count
var "hello" -> msg
var [1,2,3] -> items
var {"name":"qplan","enabled":true} -> config

print count
print msg
print items
print config
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
