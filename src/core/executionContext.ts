/**
 * QPlan ExecutionContext
 * -----------------------------------------
 * 워크플로우 실행 중 생성되는 모든 변수(중간 결과)를 저장/조회하는 공간.
 *
 * 특징:
 *  - ctx.set(name, value)  → 변수 저장
 *  - ctx.get(name)         → 변수 읽기
 *  - ctx.toJSON()          → 전체 상태 출력 (디버깅 편함)
 *
 * 이 컨텍스트가 QPlan 실행 엔진의 “메모리” 역할을 한다.
 */

export class ExecutionContext {
  private store = new Map<string, any>();

  // 값 저장
  set(name: string, value: any): void {
    this.store.set(name, value);
  }

  // 값 조회 (dot-path 지원)
  get(name: string): any {
    if (this.store.has(name)) {
      return this.store.get(name);
    }
    const resolved = this.resolvePath(name);
    if (resolved.found) {
      return resolved.value;
    }
    return undefined;
  }

  // 존재 여부 (dot-path 지원)
  has(name: string): boolean {
    if (this.store.has(name)) {
      return true;
    }
    return this.resolvePath(name).found;
  }

  private resolvePath(name: string): { found: boolean; value: any } {
    if (!name.includes(".")) {
      return { found: false, value: undefined };
    }
    const segments = name.split(".");
    const baseKey = segments.shift();
    if (!baseKey || !this.store.has(baseKey)) {
      return { found: false, value: undefined };
    }
    let current: any = this.store.get(baseKey);
    for (const segment of segments) {
      if (current === null || current === undefined) {
        return { found: false, value: undefined };
      }
      if (typeof current !== "object") {
        return { found: false, value: undefined };
      }
      if (!(segment in current)) {
        return { found: false, value: undefined };
      }
      current = current[segment];
    }
    return { found: true, value: current };
  }

  // 전체 출력
  toJSON(): Record<string, any> {
    const json: Record<string, any> = {};
    for (const [key, value] of this.store.entries()) {
      json[key] = value;
    }
    return json;
  }
}
