import { randomUUID } from 'crypto';
import type {
  TestCase,
  Dataset,
  CreateOptions,
  LoadOptions,
  SplitConfig,
  SplitResult,
  SampleOptions,
  DedupOptions,
  ExportFormat,
  ExportOptions,
  DatasetStats,
  ValidationResult,
} from './types.js';
import { seededShuffle } from './prng.js';
import { randomSplit, stratifiedSplit } from './split.js';
import { randomSample, stratifiedSample } from './sample.js';
import { dedupExact, dedupNormalized, dedupJaccard } from './dedup.js';
import { exportToJSON, exportToJSONL, exportToCSV } from './exporters.js';
import { loadFromJSON, loadFromJSONL, loadFromCSV } from './loaders.js';

function makeId(): string {
  return randomUUID().slice(0, 8);
}

function buildDataset(name: string, version: string, cases: TestCase[]): Dataset {
  const ds: Dataset = {
    name,
    version,
    cases: Object.freeze([...cases]),
    get size() {
      return cases.length;
    },

    filter(fn: (tc: TestCase) => boolean): Dataset {
      return buildDataset(name, version, cases.filter(fn));
    },

    map(fn: (tc: TestCase) => TestCase): Dataset {
      return buildDataset(name, version, cases.map(fn));
    },

    add(tc: Partial<TestCase>): Dataset {
      const newCase: TestCase = {
        id: tc.id ?? makeId(),
        input: tc.input ?? '',
        ...tc,
      };
      return buildDataset(name, version, [...cases, newCase]);
    },

    remove(id: string): Dataset {
      return buildDataset(name, version, cases.filter((tc) => tc.id !== id));
    },

    update(id: string, changes: Partial<TestCase>): Dataset {
      return buildDataset(
        name,
        version,
        cases.map((tc) => (tc.id === id ? { ...tc, ...changes, id: tc.id } : tc)),
      );
    },

    shuffle(seed?: number): Dataset {
      const s = seed ?? 42;
      return buildDataset(name, version, seededShuffle(cases, s));
    },

    slice(start: number, end?: number): Dataset {
      return buildDataset(name, version, cases.slice(start, end));
    },

    concat(other: Dataset): Dataset {
      const existingIds = new Set(cases.map((tc) => tc.id));
      const newCases = [...cases];
      for (const tc of other.cases) {
        if (!existingIds.has(tc.id)) {
          newCases.push(tc);
        }
      }
      return buildDataset(name, version, newCases);
    },

    split(config: SplitConfig): SplitResult {
      const mode = config.mode ?? 'random';
      const seed = config.seed ?? 42;
      let splits: Record<string, TestCase[]>;
      if (mode === 'stratified') {
        splits = stratifiedSplit(
          cases,
          config.ratios,
          (config.stratifyBy ?? 'category') as keyof TestCase,
          seed,
        );
      } else {
        splits = randomSplit(cases, config.ratios, seed);
      }
      const result: SplitResult = {};
      for (const [k, v] of Object.entries(splits)) {
        result[k] = buildDataset(name, version, v);
      }
      return result;
    },

    sample(n: number, options?: SampleOptions): Dataset {
      const seed = options?.seed ?? 42;
      const replace = options?.replace ?? false;
      let sampled: TestCase[];
      if (options?.mode === 'stratified') {
        sampled = stratifiedSample(cases, n, options.stratifyBy ?? 'category', seed);
      } else {
        sampled = randomSample(cases, n, seed, replace);
      }
      return buildDataset(name, version, sampled);
    },

    dedup(options?: DedupOptions): Dataset {
      const mode = options?.mode ?? 'exact';
      const field = options?.field ?? 'input';
      const keep = options?.keep ?? 'first';
      let deduped: TestCase[];
      if (mode === 'normalized') {
        deduped = dedupNormalized(cases, field, keep);
      } else if (mode === 'jaccard') {
        deduped = dedupJaccard(cases, field, options?.threshold ?? 0.9);
      } else {
        deduped = dedupExact(cases, field, keep);
      }
      return buildDataset(name, version, deduped);
    },

    export(format: ExportFormat, options?: ExportOptions): string {
      if (format === 'jsonl') return exportToJSONL(cases);
      if (format === 'csv') return exportToCSV(cases, options);
      return exportToJSON(cases, options);
    },

    stats(): DatasetStats {
      let withExpected = 0;
      let withContext = 0;
      const categories: Record<string, number> = {};
      const tags: Record<string, number> = {};
      let minLen = Infinity;
      let maxLen = 0;
      let totalLen = 0;

      for (const tc of cases) {
        if (tc.expected !== undefined) withExpected++;
        if (tc.context && tc.context.length > 0) withContext++;
        if (tc.category) {
          categories[tc.category] = (categories[tc.category] ?? 0) + 1;
        }
        if (tc.tags) {
          for (const tag of tc.tags) {
            tags[tag] = (tags[tag] ?? 0) + 1;
          }
        }
        const len = tc.input.length;
        if (len < minLen) minLen = len;
        if (len > maxLen) maxLen = len;
        totalLen += len;
      }

      const count = cases.length;
      return {
        totalCases: count,
        withExpected,
        withContext,
        categories,
        tags,
        inputLength: {
          min: count === 0 ? 0 : minLen,
          max: count === 0 ? 0 : maxLen,
          mean: count === 0 ? 0 : totalLen / count,
        },
      };
    },

    validate(): ValidationResult {
      const errors: Array<{ type: string; caseId?: string; message: string }> = [];
      const warnings: Array<{ type: string; message: string }> = [];
      const seenIds = new Set<string>();

      for (const tc of cases) {
        if (!tc.input || tc.input.trim() === '') {
          errors.push({ type: 'missing_input', caseId: tc.id, message: `Case ${tc.id} has empty input` });
        }
        if (seenIds.has(tc.id)) {
          errors.push({ type: 'duplicate_id', caseId: tc.id, message: `Duplicate id: ${tc.id}` });
        }
        seenIds.add(tc.id);
      }

      if (cases.length === 0) {
        warnings.push({ type: 'empty_dataset', message: 'Dataset has no cases' });
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    get(id: string): TestCase | undefined {
      return cases.find((tc) => tc.id === id);
    },

    has(id: string): boolean {
      return cases.some((tc) => tc.id === id);
    },

    ids(): string[] {
      return cases.map((tc) => tc.id);
    },

    categories(): string[] {
      const cats = new Set<string>();
      for (const tc of cases) {
        if (tc.category) cats.add(tc.category);
      }
      return [...cats];
    },

    tagSet(): string[] {
      const tags = new Set<string>();
      for (const tc of cases) {
        if (tc.tags) for (const t of tc.tags) tags.add(t);
      }
      return [...tags];
    },

    toJSON(): Record<string, unknown> {
      return { name, version, cases: [...cases], size: cases.length };
    },
  };

  return ds;
}

export function createDataset(options: CreateOptions): Dataset {
  return buildDataset(options.name, options.version ?? '0.1.0', options.cases ?? []);
}

export async function loadDataset(
  source: string | TestCase[],
  options?: LoadOptions,
): Promise<Dataset> {
  const name = options?.name ?? 'dataset';
  const version = options?.version ?? '0.1.0';

  if (Array.isArray(source)) {
    return buildDataset(name, version, source);
  }

  // Detect format
  let format = options?.format ?? 'auto';
  if (format === 'auto') {
    const trimmed = source.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      format = 'json';
    } else if (trimmed.includes('\n') && trimmed.split('\n').every((l) => {
      const t = l.trim();
      return t === '' || (t.startsWith('{') && t.endsWith('}'));
    })) {
      format = 'jsonl';
    } else {
      format = 'csv';
    }
  }

  let cases: TestCase[];
  if (format === 'jsonl') {
    cases = loadFromJSONL(source);
  } else if (format === 'csv') {
    cases = loadFromCSV(source);
  } else {
    cases = loadFromJSON(source);
  }

  return buildDataset(name, version, cases);
}
