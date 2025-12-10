// src/core/moduleRegistry.ts

import { ExecutionContext } from "./executionContext.js";

export interface ActionModule {
  execute(
    inputs: Record<string, any>,
    ctx: ExecutionContext
  ): any | Promise<any>;
}

export class ModuleRegistry {
  private modules = new Map<string, ActionModule>();

  register(name: string, module: ActionModule): void {
    this.modules.set(name.toUpperCase(), module);
  }

  has(name: string): boolean {
    return this.modules.has(name.toUpperCase());
  }

  get(name: string): ActionModule {
    const key = name.toUpperCase();
    const mod = this.modules.get(key);
    if (!mod) {
      throw new Error(`Unknown module: ${key}`);
    }
    return mod;
  }
}
