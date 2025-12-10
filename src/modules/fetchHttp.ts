// src/modules/fetchHttp.ts
import { ActionModule } from "../core/moduleRegistry.js";

export class FetchHttpModule implements ActionModule {
  async execute(inputs: Record<string, any>) {
    const { url, ...params } = inputs;

    const query = new URLSearchParams(params).toString();
    const fullUrl = query ? `${url}?${query}` : url;
    const res = await fetch(fullUrl, { headers: { "User-Agent": "Mozilla/5.0" }});

    return await res.text();
  }
}