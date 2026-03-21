export interface TestCase {
  id: string;
  input: string;
  expected?: string;
  context?: string[];
  metadata?: Record<string, unknown>;
  tags?: string[];
  difficulty?: number;
  category?: string;
}

export interface Dataset {
  readonly name: string;
  readonly version: string;
  readonly cases: readonly TestCase[];
  readonly size: number;
  split(config: SplitConfig): SplitResult;
  sample(n: number, options?: SampleOptions): Dataset;
  dedup(options?: DedupOptions): Dataset;
  filter(fn: (tc: TestCase) => boolean): Dataset;
  map(fn: (tc: TestCase) => TestCase): Dataset;
  add(tc: Partial<TestCase>): Dataset;
  remove(id: string): Dataset;
  update(id: string, changes: Partial<TestCase>): Dataset;
  export(format: ExportFormat, options?: ExportOptions): string;
  stats(): DatasetStats;
  validate(): ValidationResult;
  get(id: string): TestCase | undefined;
  has(id: string): boolean;
  ids(): string[];
  categories(): string[];
  tagSet(): string[];
  slice(start: number, end?: number): Dataset;
  concat(other: Dataset): Dataset;
  shuffle(seed?: number): Dataset;
  toJSON(): Record<string, unknown>;
}

export interface SplitConfig {
  ratios: Record<string, number>;
  mode?: 'random' | 'stratified';
  seed?: number;
  stratifyBy?: keyof TestCase;
}

export type SplitResult = Record<string, Dataset>;

export interface SampleOptions {
  mode?: 'random' | 'stratified';
  seed?: number;
  stratifyBy?: string;
  replace?: boolean;
}

export interface DedupOptions {
  mode?: 'exact' | 'normalized' | 'jaccard';
  field?: string;
  threshold?: number;
  keep?: 'first' | 'last';
}

export type ExportFormat = 'json' | 'jsonl' | 'csv';

export interface ExportOptions {
  pretty?: boolean;
  includeMetadata?: boolean;
  columnOrder?: string[];
}

export interface DatasetStats {
  totalCases: number;
  withExpected: number;
  withContext: number;
  categories: Record<string, number>;
  tags: Record<string, number>;
  inputLength: { min: number; max: number; mean: number };
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ type: string; caseId?: string; message: string }>;
  warnings: Array<{ type: string; message: string }>;
}

export interface CreateOptions {
  name: string;
  version?: string;
  cases?: TestCase[];
}

export interface LoadOptions {
  format?: 'json' | 'jsonl' | 'csv' | 'auto';
  name?: string;
  version?: string;
}
