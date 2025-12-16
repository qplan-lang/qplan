/**
 * ModuleRegistry
 * -----------------------------------------
 * - register(): ActionModule 하나 등록
 * - registerAll(): 여러 개 등록
 * - get(): 모듈 조회
 * - list(): 메타데이터 목록(AI용)
 *
 * id 없는 모듈 → 경고만 출력, 실행 자체는 허용.
 */

import { ActionModule, ModuleMeta } from "./actionModule.js";
import { basicModules } from "../modules/index.js";

export interface ModuleRegistryOptions {
  seedBasicModules?: boolean;
  seedModules?: ActionModule[];
}

export class ModuleRegistry {
  private modules = new Map<string, ActionModule>();

  constructor(options: ModuleRegistryOptions = {}) {
    const shouldSeedBasic = options.seedBasicModules ?? true;
    const seeds: ActionModule[] = [];
    if (shouldSeedBasic) {
      seeds.push(...basicModules);
    }
    if (options.seedModules?.length) {
      seeds.push(...options.seedModules);
    }
    if (seeds.length > 0) {
      this.registerAll(seeds);
    }
  }

  register(module: ActionModule) {
    const id = (module as any).id;

    if (!id) {
      console.warn(
        "[WARN] Module registered without id. AI cannot refer to this module."
      );
      return; // 등록하지 않고 그냥 무시하는 게 더 안전함 (원하면 set할 수도 있음)
    }

    if (this.modules.has(id)) {
      throw new Error(`Module '${id}' already registered`);
    }

    this.modules.set(id, module);
  }

  registerAll(modules: ActionModule[]) {
    modules.forEach(m => this.register(m));
  }

  get(id: string): ActionModule | undefined {
    return this.modules.get(id);
  }

  // AI가 참고하는 모듈 스펙 리스트
  list(): ModuleMeta[] {
    return [...this.modules.values()].map(m => ({
      id: m.id,
      description: m.description,
      usage: m.usage,
      inputs: m.inputs
    }));
  }
}
