// 매우 단순한 CNN 헤드라인 추출기 (정규식 기반)
import { ActionModule } from "../core/moduleRegistry.js";

export class CalcExtractHeadlineModule implements ActionModule {
  async execute(inputs: Record<string, any>) {
    const html = inputs.input;

    // h2 / h3 / span.ticker / strong 등 CNN에서 자주 쓰는 헤드라인 태그 추출
    const regex = /<h2[^>]*>(.*?)<\/h2>|<h3[^>]*>(.*?)<\/h3>/gi;

    const list = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
      const text = (match[1] || match[2] || "")
        .replace(/<[^>]*>/g, "")      // HTML 태그 제거
        .trim();

      if (text && text.length > 5) list.push(text);
    }

    // 너무 많으면 20개 정도만 사용
    return list.slice(0, 20);
  }
}
