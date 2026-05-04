import { printModule } from "./basic/print.js";
import { echoModule } from "./basic/echo.js";
import { sleepModule } from "./basic/sleep.js";
import { fileModule } from "./basic/file.js";
import { mathModule } from "./basic/math.js";
import { futureModule } from "./basic/future.js";
import { joinModule } from "./basic/join.js";
import { jsonModule } from "./basic/json.js";
import { varModule } from "./basic/var.js";
import { timeModule } from "./basic/time.js";
import { dateModule } from "./basic/date.js";

Object.assign(varModule, {
  title: "Variable",
  category: "state",
  tags: ["state", "variable", "literal", "context"],
  aliases: ["set value", "literal"]
});

Object.assign(printModule, {
  title: "Print",
  category: "debug",
  tags: ["debug", "console", "log", "output"],
  aliases: ["console.log", "log"]
});

Object.assign(echoModule, {
  title: "Echo",
  category: "debug",
  tags: ["debug", "test", "identity", "output"],
  aliases: ["return input", "passthrough"]
});

Object.assign(sleepModule, {
  title: "Sleep",
  category: "time",
  tags: ["time", "delay", "wait", "timer"],
  aliases: ["wait", "delay"]
});

Object.assign(fileModule, {
  title: "File",
  category: "io",
  tags: ["file", "io", "read", "write", "filesystem"],
  aliases: ["read file", "write file", "fs"]
});

Object.assign(mathModule, {
  title: "Math",
  category: "math",
  tags: ["math", "number", "sum", "average", "calculate"],
  aliases: ["calculation", "arithmetic", "avg"]
});

Object.assign(futureModule, {
  title: "Future",
  category: "async",
  tags: ["async", "future", "promise", "parallel", "delay"],
  aliases: ["promise", "background task"]
});

Object.assign(joinModule, {
  title: "Join",
  category: "async",
  tags: ["async", "future", "promise", "join", "parallel"],
  aliases: ["promise all", "wait futures"]
});

Object.assign(jsonModule, {
  title: "JSON",
  category: "data",
  tags: ["json", "data", "parse", "stringify", "path"],
  aliases: ["json parse", "json stringify", "object path"]
});

Object.assign(timeModule, {
  title: "Time",
  category: "time",
  tags: ["time", "clock", "iso", "epoch"],
  aliases: ["current time", "now"]
});

Object.assign(dateModule, {
  title: "Date",
  category: "time",
  tags: ["date", "time", "datetime", "iso", "epoch"],
  aliases: ["current date", "today", "now"]
});

export const basicModules = [
  varModule,
  printModule,
  echoModule,
  sleepModule,
  fileModule,
  mathModule,
  futureModule,
  joinModule,
  jsonModule,
  timeModule,
  dateModule
];
