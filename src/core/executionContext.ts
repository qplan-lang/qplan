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

export interface ExecutionContextOptions {
  env?: Record<string, any>;
  metadata?: Record<string, any>;
  runId?: string;
  control?: ExecutionControl;
}

export type ExecutionStateLike =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "aborted"
  | "error";

export interface ExecutionControl {
  checkControl(): Promise<void>;
  getState(): ExecutionStateLike;
}

export class ExecutionContext {
  private store = new Map<string, any>();
  private runScopes = new Map<string, Record<string, any>>();

  constructor(private readonly options: ExecutionContextOptions = {}) {
    if (options.runId) {
      this.ensureRunScope(options.runId);
    }
  }

  private ensureRunScope(runId: string): Record<string, any> {
    if (!this.runScopes.has(runId)) {
      const scope: Record<string, any> = {};
      this.runScopes.set(runId, scope);
      this.store.set(runId, scope);
    }
    return this.runScopes.get(runId)!;
  }

  private getActiveRunScope(): Record<string, any> | undefined {
    if (!this.options.runId) return undefined;
    return this.runScopes.get(this.options.runId);
  }

  setStepResult(stepId: string, value: any): void {
    if (!this.options.runId) {
      this.set(stepId, value);
      return;
    }
    const scope = this.ensureRunScope(this.options.runId);
    scope[stepId] = value;
  }

  // 값 저장
  set(name: string, value: any): void {
    this.store.set(name, value);
  }

  // 값 조회 (dot-path 지원)
  get(name: string): any {
    if (this.store.has(name)) {
      return this.store.get(name);
    }
    const fromRun = this.resolveFromRunScope(name);
    if (fromRun.found) {
      return fromRun.value;
    }
    const resolved = this.resolvePath(name, this.store);
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
    if (this.resolveFromRunScope(name).found) {
      return true;
    }
    return this.resolvePath(name, this.store).found;
  }

  private resolvePath(
    name: string,
    source: Map<string, any> | Record<string, any>
  ): { found: boolean; value: any } {
    if (!name.includes(".")) {
      return { found: false, value: undefined };
    }
    const segments = name.split(".");
    const baseKey = segments.shift();
    if (!baseKey) {
      return { found: false, value: undefined };
    }
    const hasBase =
      source instanceof Map
        ? source.has(baseKey)
        : Object.prototype.hasOwnProperty.call(source, baseKey);
    if (!hasBase) {
      return { found: false, value: undefined };
    }
    let current: any =
      source instanceof Map ? source.get(baseKey) : (source as Record<string, any>)[baseKey];
    for (const segment of segments) {
      if (current === null || current === undefined) {
        return { found: false, value: undefined };
      }
      if (typeof current !== "object") {
        return { found: false, value: undefined };
      }
      // Support .count or .length as alias on Arrays
      if (Array.isArray(current) && (segment === "count" || segment === "length")) {
        current = current.length;
        continue;
      }
      if (!(segment in current)) {
        return { found: false, value: undefined };
      }
      current = current[segment];
    }
    return { found: true, value: current };
  }

  private resolveFromRunScope(name: string): { found: boolean; value: any } {
    const scope = this.getActiveRunScope();
    if (!scope) {
      return { found: false, value: undefined };
    }
    if (!name.includes(".")) {
      if (Object.prototype.hasOwnProperty.call(scope, name)) {
        return { found: true, value: scope[name] };
      }
      return { found: false, value: undefined };
    }
    return this.resolvePath(name, scope);
  }

  // 전체 출력
  toJSON(): Record<string, any> {
    const json: Record<string, any> = {};
    for (const [key, value] of this.store.entries()) {
      json[key] = value;
    }
    return json;
  }

  getEnv<T = Record<string, any>>(): T | undefined {
    return this.options.env as T | undefined;
  }

  getMetadata<T = Record<string, any>>(): T | undefined {
    return this.options.metadata as T | undefined;
  }

  getExecutionState(): ExecutionStateLike | undefined {
    return this.options.control?.getState();
  }

  async checkControl(): Promise<void> {
    if (this.options.control) {
      await this.options.control.checkControl();
    }
  }
}
