import { ActionModule, ModuleMeta } from "./actionModule.js";
import { basicModules } from "../modules/index.js";

const MODULE_ID_PATTERN = /^[\p{L}_][\p{L}\p{N}_]*$/u;

export interface ModuleRegistryOptions {
  seedBasicModules?: boolean;
  seedModules?: ActionModule[];
}

export interface ModuleListOptions {
  includeExcluded?: boolean;
  ids?: string[];
  category?: string;
  categories?: string[];
  tags?: string[];
  requireAllTags?: boolean;
  query?: string;
  limit?: number;
}

export interface ModuleCategoryInfo {
  category: string;
  count: number;
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
      return;
    }

    if (!MODULE_ID_PATTERN.test(id)) {
      throw new Error(
        `Invalid module id '${id}'. Use Unicode letters/digits/underscores and start with a letter or underscore.`
      );
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

  list(options: ModuleListOptions = {}): ModuleMeta[] {
    const includeExcluded = options.includeExcluded ?? true;
    const queryTerms = splitTerms(options.query);
    const categories = normalizeSet([
      ...(options.category ? [options.category] : []),
      ...(options.categories ?? [])
    ]);
    const ids = normalizeSet(options.ids ?? []);
    const tags = normalizeSet(options.tags ?? []);
    const requireAllTags = options.requireAllTags ?? false;
    const shouldScore = queryTerms.length > 0;

    const results = [...this.modules.values()]
      .filter(m => includeExcluded || !m.excludeInPrompt)
      .filter(m => ids.size === 0 || (!!m.id && ids.has(normalize(m.id))))
      .filter(m => categories.size === 0 || (!!m.category && categories.has(normalize(m.category))))
      .filter(m => {
        if (tags.size === 0) return true;
        const moduleTags = normalizeSet(m.tags ?? []);
        const matches = [...tags].filter(tag => moduleTags.has(tag)).length;
        return requireAllTags ? matches === tags.size : matches > 0;
      })
      .map(m => ({
        id: m.id,
        title: m.title,
        category: m.category,
        tags: m.tags,
        aliases: m.aliases,
        description: m.description,
        usage: m.usage,
        inputs: m.inputs,
        inputType: m.inputType,
        outputType: m.outputType,
        excludeInPrompt: m.excludeInPrompt
      }))
      .map(meta => ({
        meta,
        score: shouldScore ? scoreModule(meta, queryTerms) : 0
      }))
      .filter(item => !shouldScore || item.score > 0)
      .sort((a, b) => {
        if (!shouldScore) return 0;
        return b.score - a.score || String(a.meta.id).localeCompare(String(b.meta.id));
      });

    const limited = options.limit && options.limit > 0
      ? results.slice(0, options.limit)
      : results;

    return limited.map(item => item.meta);
  }

  search(options: ModuleListOptions = {}): ModuleMeta[] {
    return this.list({ includeExcluded: false, ...options });
  }

  listCategories(options: Pick<ModuleListOptions, "includeExcluded"> = {}): ModuleCategoryInfo[] {
    const counts = new Map<string, number>();
    for (const module of this.modules.values()) {
      if (!(options.includeExcluded ?? false) && module.excludeInPrompt) {
        continue;
      }
      const category = module.category ?? "uncategorized";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }
}

function splitTerms(query?: string): string[] {
  return (query ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function normalizeSet(values: string[]): Set<string> {
  return new Set(values.map(normalize).filter(Boolean));
}

function scoreModule(meta: ModuleMeta, queryTerms: string[]): number {
  const fields = [
    { value: meta.id, weight: 12 },
    { value: meta.title, weight: 10 },
    { value: meta.aliases?.join(" "), weight: 8 },
    { value: meta.category, weight: 6 },
    { value: meta.tags?.join(" "), weight: 6 },
    { value: meta.description, weight: 4 },
    { value: meta.inputs?.join(" "), weight: 3 },
    { value: meta.usage, weight: 2 },
    { value: meta.inputType ? safeJson(meta.inputType) : undefined, weight: 1 },
    { value: meta.outputType ? safeJson(meta.outputType) : undefined, weight: 1 }
  ];

  return queryTerms.reduce((score, term) => {
    let termScore = 0;
    for (const field of fields) {
      const text = field.value?.toLowerCase();
      if (!text) continue;
      if (text === term) {
        termScore += field.weight * 2;
      } else if (text.includes(term)) {
        termScore += field.weight;
      }
    }
    return score + termScore;
  }, 0);
}

function safeJson(value: Record<string, any>): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
