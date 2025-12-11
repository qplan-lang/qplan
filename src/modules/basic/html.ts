import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";

export const htmlModule: ActionModule = {
  id: "html",
  description: "HTML 문자열에서 body/tag/tags/text 추출 (간단 regex 기반).",
  usage: `
html op="body" html=raw -> body
html op="tag" tag="h1" html=raw -> title
  `,
  inputs: ["op", "html", "tag"],

  execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    let html = inputs.html;
    if (typeof html === "string" && ctx.has(html)) html = ctx.get(html);
    html = String(html ?? "");

    const op = String(inputs.op ?? "");
    const tag = inputs.tag?.toLowerCase();

    if (op === "body") {
      const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return m ? m[1].trim() : "";
    }

    if (op === "tag") {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i");
      const m = html.match(r);
      return m ? m[1].trim() : "";
    }

    if (op === "tags") {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "gi");
      const list = [];
      let m;
      while ((m = r.exec(html))) list.push(m[1].trim());
      return list;
    }

    if (op === "text") {
      return html.replace(/<[^>]*>/g, "").trim();
    }

    throw new Error("unknown html op");
  }
};
