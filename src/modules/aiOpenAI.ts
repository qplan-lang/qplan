import OpenAI from "openai";
import { ActionModule } from "../core/moduleRegistry.js";

// const client = new OpenAI({ apiKey: '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' });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AiOpenAIModule implements ActionModule {
  async execute(inputs: Record<string, any>) {
    const { prompt, using } = inputs;

    const userPrompt = `${prompt}\n\nDATA:\n${JSON.stringify(using)}`;

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: userPrompt }
      ]
    });

    return res.choices[0].message.content;
  }
}
