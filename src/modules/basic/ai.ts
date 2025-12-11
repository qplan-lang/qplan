import { ActionModule } from "../../core/actionModule.js";
import { ExecutionContext } from "../../core/executionContext.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiModule: ActionModule = {
  id: "ai",
  description: "OpenAI 기반 AI 호출 모듈.",
  usage: `ai prompt="요약" context=txt model="gpt-4o-mini" -> out`,
  inputs: ["prompt", "context", "model", "temperature", "system"],

  async execute(inputs: Record<string, any>, ctx: ExecutionContext) {
    const prompt = String(inputs.prompt ?? "");
    const model = String(inputs.model ?? "gpt-4o-mini");
    const temperature = Number(inputs.temperature ?? 0.3);

    let contextVal = inputs.context;
    if (typeof contextVal === "string" && ctx.has(contextVal))
      contextVal = ctx.get(contextVal);

    if (typeof contextVal === "object")
      contextVal = JSON.stringify(contextVal, null, 2);

    const fullPrompt = `[context]\n${contextVal ?? ""}\n[prompt]\n${prompt}`;

    const r = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: "system", content: String(inputs.system ?? "You are an assistant") },
        { role: "user", content: fullPrompt }
      ]
    });

    return r.choices[0]?.message?.content ?? "";
  }
};
