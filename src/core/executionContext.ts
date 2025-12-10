// src/core/executionContext.ts

export class ExecutionContext {
  private vars = new Map<string, any>();

  set(name: string, value: any): void {
    this.vars.set(name, value);
  }

  get<T = any>(name: string): T | undefined {
    return this.vars.get(name);
  }

  has(name: string): boolean {
    return this.vars.has(name);
  }

  toJSON(): Record<string, any> {
    return Object.fromEntries(this.vars.entries());
  }
}
