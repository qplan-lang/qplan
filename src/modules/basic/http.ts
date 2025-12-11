import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

export const httpModule: ActionModule = {
  id: "http",
  description: "HTTP GET/POST 요청 모듈.",
  usage: `
http op="get" url="https://example.com" -> r
http op="post" url="https://api" body="{\"a\":1}" -> r
  `,
  inputs: ["op", "url", "body", "headers"],

  async execute(inputs: Record<string, any>) {
    const op = String(inputs.op ?? "get").toLowerCase();
    const url = String(inputs.url);
    const headers = inputs.headers ? JSON.parse(inputs.headers) : {};
    const body = inputs.body ? inputs.body : null;

    if (op === "get") {
      const r = await fetch(url, { method: "GET", headers });
      return await r.text();
    }
    if (op === "post") {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body
      });
      return await r.text();
    }
    throw new Error("unknown http op");
  }
};
