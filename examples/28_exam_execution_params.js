import { QPlan } from "../dist/index.js";

/**
 * Example: seed runtime variables with params
 */
const script = `
plan {
  @params "keyword,item"
  
  step id="ddd" {
    print keyword
    print item.bar
    print "item.obj1.foo:" + item.obj1.foo
  }
}
`;

const qplan = new QPlan(script);
const ctx = await qplan.run({
  params: { keyword: "foo", item: { obj1: { foo: "1111" }, bar: 2 } },
});

console.log(ctx.toJSON());
