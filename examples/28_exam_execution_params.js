import { QPlan } from "../dist/index.js";

/**
 * Example: seed runtime variables with params
 */
const script = `
plan {
  @params "keyword,item,arr"
  
  step id="ddd" {
    print keyword
    print item.bar
    print "item.obj1.foo:" + item.obj1.foo
    print arr[0].txt
  }
}
`;

const qplan = new QPlan(script);
const ctx = await qplan.run({
  params: {
    keyword: "foo",
    item: { obj1: { foo: "1111" }, bar: 2 },
    arr: [
      { idx: 0, txt: "arr_obj0" },
      { idx: 1, txt: "arr_obj1" },
      { idx: 2, txt: "arr_obj2" },
    ],
  },
});

console.log(ctx.toJSON());
