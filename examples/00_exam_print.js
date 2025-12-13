import { runQplan } from "../dist/index.js";

/**
 * Example: how to use the print module
 */
const script = `
file read path="./examples/print_user.json" -> userStr
json parse data=userStr -> user
print "basic" 1 2
print label="kv example" 3 4
print "user" user user
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
