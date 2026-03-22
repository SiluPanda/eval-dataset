# eval-dataset

Version-controlled eval dataset manager for LLM testing.

[![npm version](https://img.shields.io/npm/v/eval-dataset.svg)](https://www.npmjs.com/package/eval-dataset)
[![npm downloads](https://img.shields.io/npm/dt/eval-dataset.svg)](https://www.npmjs.com/package/eval-dataset)
[![license](https://img.shields.io/npm/l/eval-dataset.svg)](https://github.com/SiluPanda/eval-dataset/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/eval-dataset.svg)](https://nodejs.org)

`eval-dataset` manages the lifecycle of evaluation datasets for LLM testing. It loads, validates, splits, samples, deduplicates, and exports collections of test cases across formats (JSON, JSONL, CSV). All transformation methods return new immutable `Dataset` instances, all randomization is seeded for reproducibility, and the entire API is fully typed in TypeScript.

Every LLM evaluation framework expects test data -- inputs, expected outputs, context documents, and metadata -- but none of them manage the dataset itself. `eval-dataset` fills this gap by providing a single package that handles loading from multiple formats, splitting with reproducible seeded randomness, sampling with stratification, deduplicating with configurable similarity, validating schema completeness, and computing statistics. Zero external runtime dependencies.

---

## Installation

```bash
npm install eval-dataset
```

Requires Node.js 18 or later.

---

## Quick Start

```typescript
import { createDataset, loadDataset } from 'eval-dataset';

// Create a dataset from test cases
const ds = createDataset({
  name: 'qa-eval',
  version: '1.0.0',
  cases: [
    { id: '1', input: 'What is 2+2?', expected: '4', category: 'math', tags: ['arithmetic'] },
    { id: '2', input: 'Capital of France?', expected: 'Paris', category: 'geography' },
    { id: '3', input: 'Who wrote Hamlet?', expected: 'Shakespeare', category: 'literature' },
  ],
});

console.log(ds.size);        // 3
console.log(ds.categories()); // ['math', 'geography', 'literature']

// Split into train/test sets
const splits = ds.split({ ratios: { train: 0.7, test: 0.3 }, seed: 42 });
console.log(splits.train.size); // 2
console.log(splits.test.size);  // 1

// Export to JSON Lines
const jsonl = ds.export('jsonl');

// Load from a JSON string
const ds2 = await loadDataset('[{"id":"1","input":"hello","expected":"world"}]', {
  name: 'loaded',
  format: 'json',
});
```

---

## Features

- **Immutable Dataset objects** -- Every transformation method (`filter`, `map`, `add`, `remove`, `split`, `sample`, `dedup`) returns a new `Dataset`. The original is never modified.
- **Seeded randomization** -- Splitting, sampling, and shuffling use a Mulberry32 PRNG with configurable seeds. The same seed always produces the same result.
- **Multi-format loading** -- Load test cases from JSON arrays, JSON Lines, CSV strings, or in-memory `TestCase[]` arrays. Format auto-detection inspects content structure when not explicitly specified.
- **Multi-format export** -- Export datasets to JSON (pretty or compact), JSON Lines, or CSV with configurable column order.
- **Splitting** -- Random and stratified splitting into named partitions with configurable ratios. Stratified splits maintain proportional category representation in each partition.
- **Sampling** -- Random and stratified sampling with configurable sample size. Supports sampling with replacement.
- **Deduplication** -- Exact match, normalized match (case-insensitive, whitespace-collapsed), and near-duplicate detection via Jaccard token similarity.
- **Validation** -- Detects empty inputs, duplicate IDs, and empty datasets.
- **Statistics** -- Computes case counts, expected output coverage, context coverage, category and tag distributions, and input length statistics (min, max, mean).
- **Zero runtime dependencies** -- Built entirely on Node.js built-ins. Only development dependencies are used for building and testing.
- **Full TypeScript support** -- All public types, interfaces, and function signatures are exported with declaration files.

---

## API Reference

### `createDataset(options)`

Creates a new `Dataset` from the provided options.

```typescript
function createDataset(options: CreateOptions): Dataset;
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.name` | `string` | Yes | -- | Name of the dataset |
| `options.version` | `string` | No | `'0.1.0'` | Semver version string |
| `options.cases` | `TestCase[]` | No | `[]` | Initial test cases |

**Returns:** A `Dataset` instance.

```typescript
const ds = createDataset({
  name: 'my-eval',
  version: '1.0.0',
  cases: [
    { id: '1', input: 'What is 2+2?', expected: '4', category: 'math' },
  ],
});
```

---

### `loadDataset(source, options?)`

Loads a dataset from a string (JSON, JSONL, or CSV content) or an in-memory `TestCase[]` array. Returns a `Promise<Dataset>`.

```typescript
function loadDataset(source: string | TestCase[], options?: LoadOptions): Promise<Dataset>;
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source` | `string \| TestCase[]` | Yes | -- | Content string or array of test cases |
| `options.format` | `'json' \| 'jsonl' \| 'csv' \| 'auto'` | No | `'auto'` | Format of the source string. Ignored when source is an array. |
| `options.name` | `string` | No | `'dataset'` | Dataset name |
| `options.version` | `string` | No | `'0.1.0'` | Dataset version |

When `format` is `'auto'`, the loader inspects the content to determine the format:
- Strings starting with `[` or `{` are parsed as JSON.
- Strings where every non-empty line is a JSON object are parsed as JSONL.
- All other strings are parsed as CSV.

```typescript
// Load from JSON string
const ds = await loadDataset('[{"id":"1","input":"hello"}]', { name: 'test' });

// Load from JSONL string
const ds2 = await loadDataset(
  '{"id":"1","input":"hello"}\n{"id":"2","input":"world"}',
  { name: 'test', format: 'jsonl' },
);

// Load from CSV string
const ds3 = await loadDataset(
  'id,input,expected,category\n1,Hello,World,test\n2,Foo,Bar,test',
  { name: 'test', format: 'csv' },
);

// Load from in-memory array
const ds4 = await loadDataset(
  [{ id: '1', input: 'hello', expected: 'world' }],
  { name: 'test' },
);
```

**Field mapping during loading:**

When loading from JSON, JSONL, or CSV, the loader maps common field names to the internal `TestCase` schema:
- `input` or `question` maps to `input`
- `expected` maps to `expected`
- `category` maps to `category`
- `difficulty` is parsed as a number
- `context` is parsed as a string array
- `tags` is parsed as a string array (pipe-delimited `|` in CSV)
- `metadata` is parsed as a JSON object

Test cases without an `id` are assigned an auto-generated 8-character UUID.

---

### Dataset Interface

The `Dataset` interface represents a named, versioned, immutable collection of test cases. All transformation methods return new `Dataset` instances.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` (readonly) | Dataset name |
| `version` | `string` (readonly) | Semver version string |
| `cases` | `readonly TestCase[]` (readonly) | Frozen array of test cases |
| `size` | `number` (readonly) | Number of test cases |

---

#### `dataset.filter(fn)`

Returns a new `Dataset` containing only test cases for which the predicate returns `true`.

```typescript
filter(fn: (tc: TestCase) => boolean): Dataset;
```

```typescript
const mathOnly = ds.filter((tc) => tc.category === 'math');
const withExpected = ds.filter((tc) => tc.expected !== undefined);
```

---

#### `dataset.map(fn)`

Returns a new `Dataset` with each test case transformed by the provided function.

```typescript
map(fn: (tc: TestCase) => TestCase): Dataset;
```

```typescript
const uppercased = ds.map((tc) => ({ ...tc, input: tc.input.toUpperCase() }));
```

---

#### `dataset.add(tc)`

Returns a new `Dataset` with the test case appended. If `id` is not provided, one is auto-generated. If `input` is not provided, it defaults to an empty string.

```typescript
add(tc: Partial<TestCase>): Dataset;
```

```typescript
const ds2 = ds.add({ input: 'New question?', expected: 'New answer', category: 'general' });
// ds2.size === ds.size + 1
```

---

#### `dataset.remove(id)`

Returns a new `Dataset` with the test case matching the given `id` removed.

```typescript
remove(id: string): Dataset;
```

```typescript
const ds2 = ds.remove('1');
// ds2.has('1') === false
```

---

#### `dataset.update(id, changes)`

Returns a new `Dataset` with the test case matching `id` updated by merging the provided changes. The `id` field itself cannot be changed.

```typescript
update(id: string, changes: Partial<TestCase>): Dataset;
```

```typescript
const ds2 = ds.update('1', { expected: 'four', category: 'arithmetic' });
// ds2.get('1')?.expected === 'four'
// ds2.get('1')?.id === '1' (unchanged)
```

---

#### `dataset.get(id)`

Returns the test case with the given `id`, or `undefined` if not found.

```typescript
get(id: string): TestCase | undefined;
```

---

#### `dataset.has(id)`

Returns `true` if a test case with the given `id` exists in the dataset.

```typescript
has(id: string): boolean;
```

---

#### `dataset.ids()`

Returns an array of all test case IDs, in order.

```typescript
ids(): string[];
```

---

#### `dataset.categories()`

Returns an array of unique `category` values across all test cases. Test cases without a category are excluded.

```typescript
categories(): string[];
```

---

#### `dataset.tagSet()`

Returns an array of unique tags across all test cases.

```typescript
tagSet(): string[];
```

---

#### `dataset.slice(start, end?)`

Returns a new `Dataset` with a positional slice of the cases array, using the same semantics as `Array.prototype.slice`.

```typescript
slice(start: number, end?: number): Dataset;
```

```typescript
const first10 = ds.slice(0, 10);
const lastHalf = ds.slice(Math.floor(ds.size / 2));
```

---

#### `dataset.concat(other)`

Returns a new `Dataset` merging cases from another dataset. Test cases from `other` whose IDs already exist in the current dataset are skipped (deduplication by ID).

```typescript
concat(other: Dataset): Dataset;
```

```typescript
const merged = ds1.concat(ds2);
```

---

#### `dataset.shuffle(seed?)`

Returns a new `Dataset` with cases shuffled using the Mulberry32 seeded PRNG. Default seed is `42`.

```typescript
shuffle(seed?: number): Dataset;
```

```typescript
const shuffled = ds.shuffle(123);
// Same seed always produces the same order
const shuffled2 = ds.shuffle(123);
// shuffled.ids() deep-equals shuffled2.ids()
```

---

#### `dataset.split(config)`

Splits the dataset into named, non-overlapping partitions. Returns a `SplitResult` (a `Record<string, Dataset>` keyed by partition name).

```typescript
split(config: SplitConfig): SplitResult;
```

**SplitConfig:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ratios` | `Record<string, number>` | Yes | -- | Partition names mapped to their ratios. Ratios are normalized to sum to 1.0. |
| `mode` | `'random' \| 'stratified'` | No | `'random'` | Split mode |
| `seed` | `number` | No | `42` | PRNG seed for deterministic splits |
| `stratifyBy` | `keyof TestCase` | No | `'category'` | Field to stratify by (only used when `mode` is `'stratified'`) |

Ratios do not need to sum to exactly 1.0 -- they are normalized automatically. For example, `{ train: 3, test: 1 }` produces a 75/25 split.

```typescript
// Random 80/20 split
const { train, test } = ds.split({
  ratios: { train: 0.8, test: 0.2 },
  seed: 42,
});

// Three-way stratified split preserving category proportions
const splits = ds.split({
  ratios: { train: 0.7, val: 0.15, test: 0.15 },
  mode: 'stratified',
  stratifyBy: 'category',
  seed: 42,
});
```

---

#### `dataset.sample(n, options?)`

Returns a new `Dataset` containing `n` randomly selected test cases. When `n` exceeds the dataset size and `replace` is `false`, all cases are returned.

```typescript
sample(n: number, options?: SampleOptions): Dataset;
```

**SampleOptions:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | `'random' \| 'stratified'` | No | `'random'` | Sampling mode |
| `seed` | `number` | No | `42` | PRNG seed for deterministic sampling |
| `stratifyBy` | `string` | No | `'category'` | Field to stratify by (only used when `mode` is `'stratified'`) |
| `replace` | `boolean` | No | `false` | Whether to sample with replacement |

```typescript
// Random sample of 20 cases
const sampled = ds.sample(20, { seed: 42 });

// Stratified sample preserving category proportions
const sampled2 = ds.sample(20, { mode: 'stratified', stratifyBy: 'category', seed: 42 });

// Sample with replacement (can return more than ds.size cases)
const sampled3 = ds.sample(100, { seed: 42, replace: true });
```

---

#### `dataset.dedup(options?)`

Returns a new `Dataset` with duplicate test cases removed.

```typescript
dedup(options?: DedupOptions): Dataset;
```

**DedupOptions:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | `'exact' \| 'normalized' \| 'jaccard'` | No | `'exact'` | Deduplication strategy |
| `field` | `string` | No | `'input'` | Field to compare for duplicates |
| `threshold` | `number` | No | `0.9` | Jaccard similarity threshold (only used when `mode` is `'jaccard'`) |
| `keep` | `'first' \| 'last'` | No | `'first'` | Which occurrence to keep (only used for `'exact'` and `'normalized'` modes) |

**Deduplication modes:**

- **`exact`** -- Removes test cases with identical field values. Case-sensitive, whitespace-sensitive.
- **`normalized`** -- Lowercases the value, trims whitespace, and collapses multiple spaces to a single space before comparing. `"Hello World"` and `"  hello   world  "` are considered duplicates.
- **`jaccard`** -- Tokenizes values by whitespace, computes Jaccard similarity (`|A intersect B| / |A union B|`), and treats pairs exceeding the `threshold` as duplicates. The first occurrence is kept.

```typescript
// Exact dedup on the input field
const deduped = ds.dedup();

// Normalized dedup (case-insensitive, whitespace-collapsed)
const deduped2 = ds.dedup({ mode: 'normalized' });

// Near-duplicate detection with Jaccard similarity
const deduped3 = ds.dedup({ mode: 'jaccard', threshold: 0.85 });

// Dedup on a different field, keep last occurrence
const deduped4 = ds.dedup({ field: 'expected', keep: 'last' });
```

---

#### `dataset.export(format, options?)`

Serializes the dataset to a string in the specified format.

```typescript
export(format: ExportFormat, options?: ExportOptions): string;
```

**ExportFormat:** `'json' | 'jsonl' | 'csv'`

**ExportOptions:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pretty` | `boolean` | No | `true` | Pretty-print JSON output with 2-space indentation |
| `includeMetadata` | `boolean` | No | `true` (JSON) / `false` (CSV) | Include the `metadata` field in output |
| `columnOrder` | `string[]` | No | -- | Custom column order for CSV export |

```typescript
// Pretty-printed JSON
const json = ds.export('json');

// Compact JSON
const compact = ds.export('json', { pretty: false });

// JSON without metadata
const noMeta = ds.export('json', { includeMetadata: false });

// JSON Lines (one JSON object per line)
const jsonl = ds.export('jsonl');

// CSV with default column order
const csv = ds.export('csv');

// CSV with custom column order
const csv2 = ds.export('csv', { columnOrder: ['id', 'input', 'expected', 'category'] });
```

**CSV export details:**
- Array fields (`tags`, `context`) are serialized as pipe-delimited values.
- Fields containing commas, quotes, or newlines are enclosed in double quotes with proper escaping.
- Column order defaults to: `id`, `input`, `expected`, `category`, `difficulty`, `tags`, `context`, followed by any additional fields in alphabetical order.

---

#### `dataset.stats()`

Computes and returns statistics about the dataset.

```typescript
stats(): DatasetStats;
```

**DatasetStats:**

| Field | Type | Description |
|-------|------|-------------|
| `totalCases` | `number` | Total number of test cases |
| `withExpected` | `number` | Number of cases with an `expected` value |
| `withContext` | `number` | Number of cases with a non-empty `context` array |
| `categories` | `Record<string, number>` | Category value to count mapping |
| `tags` | `Record<string, number>` | Tag to count mapping (across all cases) |
| `inputLength` | `{ min, max, mean }` | Input string length statistics |

```typescript
const s = ds.stats();
// {
//   totalCases: 100,
//   withExpected: 85,
//   withContext: 30,
//   categories: { math: 40, reading: 60 },
//   tags: { hard: 20, easy: 50 },
//   inputLength: { min: 5, max: 200, mean: 42.3 }
// }
```

For an empty dataset, `inputLength` returns `{ min: 0, max: 0, mean: 0 }`.

---

#### `dataset.validate()`

Validates the dataset and returns a result with errors and warnings.

```typescript
validate(): ValidationResult;
```

**ValidationResult:**

| Field | Type | Description |
|-------|------|-------------|
| `valid` | `boolean` | `true` if no errors were found |
| `errors` | `Array<{ type, caseId?, message }>` | Validation errors |
| `warnings` | `Array<{ type, message }>` | Validation warnings |

**Detected errors:**
- `missing_input` -- A test case has an empty or whitespace-only `input` field.
- `duplicate_id` -- Two or more test cases share the same `id`.

**Detected warnings:**
- `empty_dataset` -- The dataset contains no test cases.

```typescript
const result = ds.validate();
if (!result.valid) {
  for (const err of result.errors) {
    console.error(`[${err.type}] ${err.message}`);
  }
}
```

---

#### `dataset.toJSON()`

Returns a plain JSON-serializable object representation of the dataset.

```typescript
toJSON(): Record<string, unknown>;
```

The returned object contains `name`, `version`, `cases` (as a mutable array copy), and `size`.

```typescript
const obj = ds.toJSON();
// { name: 'qa-eval', version: '1.0.0', cases: [...], size: 100 }

// Serialize to JSON string
const str = JSON.stringify(ds.toJSON(), null, 2);
```

---

### TestCase Interface

The universal test case schema used throughout the package.

```typescript
interface TestCase {
  id: string;
  input: string;
  expected?: string;
  context?: string[];
  metadata?: Record<string, unknown>;
  tags?: string[];
  difficulty?: number;
  category?: string;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier. Auto-generated (8-character UUID prefix) if not provided when adding cases. |
| `input` | `string` | Yes | The prompt, question, or query to send to the LLM |
| `expected` | `string` | No | Expected output / ground truth answer |
| `context` | `string[]` | No | Context documents for RAG evaluation |
| `metadata` | `Record<string, unknown>` | No | Arbitrary key-value metadata |
| `tags` | `string[]` | No | Labels for filtering and stratification |
| `difficulty` | `number` | No | Numeric difficulty rating |
| `category` | `string` | No | Primary classification label for stratification |

---

### Supporting Types

```typescript
interface SplitConfig {
  ratios: Record<string, number>;
  mode?: 'random' | 'stratified';
  seed?: number;
  stratifyBy?: keyof TestCase;
}

type SplitResult = Record<string, Dataset>;

interface SampleOptions {
  mode?: 'random' | 'stratified';
  seed?: number;
  stratifyBy?: string;
  replace?: boolean;
}

interface DedupOptions {
  mode?: 'exact' | 'normalized' | 'jaccard';
  field?: string;
  threshold?: number;
  keep?: 'first' | 'last';
}

type ExportFormat = 'json' | 'jsonl' | 'csv';

interface ExportOptions {
  pretty?: boolean;
  includeMetadata?: boolean;
  columnOrder?: string[];
}

interface DatasetStats {
  totalCases: number;
  withExpected: number;
  withContext: number;
  categories: Record<string, number>;
  tags: Record<string, number>;
  inputLength: { min: number; max: number; mean: number };
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ type: string; caseId?: string; message: string }>;
  warnings: Array<{ type: string; message: string }>;
}

interface CreateOptions {
  name: string;
  version?: string;
  cases?: TestCase[];
}

interface LoadOptions {
  format?: 'json' | 'jsonl' | 'csv' | 'auto';
  name?: string;
  version?: string;
}
```

---

## Configuration

### Split Ratios

Split ratios are normalized automatically. The following are equivalent:

```typescript
ds.split({ ratios: { train: 0.8, test: 0.2 } });
ds.split({ ratios: { train: 4, test: 1 } });
ds.split({ ratios: { train: 80, test: 20 } });
```

The last partition absorbs any rounding remainder to ensure all cases are assigned.

### Seeded Randomization

All random operations default to seed `42`. Pass an explicit `seed` to control the random sequence:

```typescript
const a = ds.shuffle(1).ids();
const b = ds.shuffle(1).ids();
// a deep-equals b

const c = ds.shuffle(2).ids();
// a does not deep-equal c
```

The Mulberry32 PRNG is used for all randomization. It produces deterministic results across platforms without relying on `Math.random()`.

---

## Error Handling

`loadDataset` throws standard JavaScript errors for invalid input:
- **`SyntaxError`** -- When JSON or JSONL content is malformed.
- **Invalid CSV** -- When the CSV string has fewer than 2 lines (no header + data), an empty array is returned rather than throwing.

`dataset.validate()` does not throw. It returns a `ValidationResult` object with structured errors and warnings that can be inspected programmatically:

```typescript
const result = ds.validate();
if (!result.valid) {
  result.errors.forEach((e) => console.error(`${e.type}: ${e.message}`));
}
result.warnings.forEach((w) => console.warn(`${w.type}: ${w.message}`));
```

---

## Advanced Usage

### Chaining Transformations

Because every method returns a new `Dataset`, transformations can be chained:

```typescript
const result = ds
  .filter((tc) => tc.category === 'math')
  .dedup({ mode: 'normalized' })
  .shuffle(42)
  .sample(50, { seed: 7 })
  .export('jsonl');
```

### Building Datasets Incrementally

```typescript
let ds = createDataset({ name: 'growing-eval', version: '1.0.0' });

ds = ds.add({ input: 'What is 2+2?', expected: '4', category: 'math' });
ds = ds.add({ input: 'Capital of France?', expected: 'Paris', category: 'geography' });
ds = ds.add({ input: 'Who wrote Hamlet?', expected: 'Shakespeare', category: 'literature' });

console.log(ds.size); // 3
```

### Reproducible Evaluation Pipelines

```typescript
const ds = await loadDataset(jsonString, { name: 'qa-eval', version: '2.0.0' });

// Always produces the same train/test split for this dataset
const { train, test } = ds.split({
  ratios: { train: 0.8, test: 0.2 },
  seed: 42,
});

// Always selects the same 20 cases from the training set
const devSample = train.sample(20, { seed: 7 });
```

### Cross-Format Round-Tripping

```typescript
// Load from CSV
const ds = await loadDataset(csvString, { name: 'test', format: 'csv' });

// Export to JSON Lines
const jsonl = ds.export('jsonl');

// Reload from JSON Lines
const ds2 = await loadDataset(jsonl, { name: 'test', format: 'jsonl' });

// ds2 contains the same cases as ds
```

### Merging Datasets

```typescript
const ds1 = createDataset({ name: 'batch-1', cases: firstBatch });
const ds2 = createDataset({ name: 'batch-2', cases: secondBatch });

// Merge, deduplicating by ID
const merged = ds1.concat(ds2);

// Dedup by input content
const clean = merged.dedup({ mode: 'normalized' });
```

### Stratified Splitting for Balanced Evaluation

```typescript
const ds = createDataset({
  name: 'eval',
  cases: [
    { id: '1', input: 'q1', category: 'math' },
    { id: '2', input: 'q2', category: 'math' },
    { id: '3', input: 'q3', category: 'reading' },
    { id: '4', input: 'q4', category: 'reading' },
    { id: '5', input: 'q5', category: 'coding' },
    { id: '6', input: 'q6', category: 'coding' },
  ],
});

// Each split preserves the category distribution
const splits = ds.split({
  ratios: { train: 0.67, test: 0.33 },
  mode: 'stratified',
  stratifyBy: 'category',
  seed: 42,
});
```

---

## TypeScript

`eval-dataset` is written in TypeScript and ships with complete declaration files. All public types are exported from the package root:

```typescript
import type {
  TestCase,
  Dataset,
  SplitConfig,
  SplitResult,
  SampleOptions,
  DedupOptions,
  ExportFormat,
  ExportOptions,
  DatasetStats,
  ValidationResult,
  CreateOptions,
  LoadOptions,
} from 'eval-dataset';
```

The package targets ES2022 and uses CommonJS modules. TypeScript declaration maps are included for IDE navigation into source files.

---

## License

MIT
