# eval-dataset -- Specification

## 1. Overview

`eval-dataset` is a version-controlled eval dataset manager for LLM testing. It loads, validates, splits, samples, deduplicates, and converts collections of test cases between evaluation framework formats (promptfoo, autoevals, RAGAS, CSV, JSONL). It models eval datasets as first-class versioned artifacts with a universal internal schema, providing both a TypeScript/JavaScript API for programmatic use and a CLI for terminal-based dataset management.

The gap this package fills is specific and well-defined. Every LLM evaluation framework expects test data -- collections of inputs, expected outputs, context documents, and metadata -- but none of them manage the dataset itself. promptfoo reads test cases from YAML or JSON files but provides no tooling for splitting datasets into train/test/validation sets, sampling representative subsets, removing duplicate test cases, converting between formats, or tracking dataset versions over time. autoevals expects data in its own JSON format but offers no dataset lifecycle management. RAGAS expects yet another format (question/answer/contexts/ground_truth) and again provides no dataset operations. DeepEval, LangSmith, and Braintrust each consume their own data formats. The result is that eval engineers cobble together ad-hoc scripts for every dataset operation: a Python script to split the CSV, a one-off Node script to convert promptfoo YAML to autoevals JSON, manual deduplication by eyeballing a spreadsheet, and version tracking via filenames (`dataset-v1.json`, `dataset-v2-fixed.json`, `dataset-v2-final-FINAL.json`).

In the Python ecosystem, HuggingFace `datasets` provides sophisticated dataset management (loading, splitting, filtering, mapping, caching), but it is a Python library with no JavaScript equivalent. There is no npm package that provides dataset lifecycle management for LLM evaluation. Teams working in JavaScript/TypeScript must build these capabilities from scratch for every project.

`eval-dataset` fills this gap by providing a single package that handles the entire dataset lifecycle: loading from any common format, converting to any target format, splitting with reproducible seeded randomness, sampling with stratification, deduplicating with configurable similarity, validating schema completeness, computing statistics, and versioning with semver tags and changelogs. The internal representation is a universal schema that maps cleanly to every major eval framework's format, so a dataset loaded from promptfoo YAML can be exported to RAGAS JSON with one function call, and the field mapping is explicit and documented.

The design philosophy mirrors `prompt-version` from this monorepo, which applies version control semantics to prompt templates. `eval-dataset` applies the same discipline to evaluation data. Just as `prompt-version` provides `getPrompt("greeting", "^1.0.0")` for reproducible prompt resolution, `eval-dataset` provides `loadDataset("qa-eval", { version: "^2.0.0" })` for reproducible dataset resolution. Datasets are stored in a git-friendly format, version bumps are explicit, changelogs document what test cases were added or removed and why, and splits are seeded so that the same dataset version always produces the same train/test/validation partition.

`eval-dataset` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal and shell-script use. The API returns typed `Dataset` objects with chainable methods for transformation. The CLI prints human-readable or JSON output and exits with conventional codes (0 for success, 1 for errors, 2 for configuration/usage errors).

---

## 2. Goals and Non-Goals

### Goals

- Provide a `loadDataset(source, options?)` function that loads eval test cases from JSON files, JSON arrays, JSONL files, CSV/TSV files, promptfoo format (YAML/JSON with vars/assert), autoevals format, RAGAS format, and custom formats via a user-provided loader function. Auto-detect the source format when not explicitly specified.
- Define a universal internal schema (`TestCase`) with fields that map cleanly to every major eval framework: `id`, `input`, `expected`, `context`, `metadata`, `tags`, `difficulty`, `category`. The schema is the lingua franca between formats.
- Provide format conversion (`dataset.export(format, options?)`) that converts the internal schema to promptfoo, autoevals, RAGAS, CSV, JSONL, and custom formats. Document which fields are preserved (lossless) and which are dropped (lossy) for each conversion path.
- Provide dataset splitting (`dataset.split(config)`) with random, stratified, and k-fold modes. All splits use configurable seeds for reproducibility. Stratified splits maintain proportional category/tag representation in each partition.
- Provide dataset sampling (`dataset.sample(n, options?)`) with random, stratified, difficulty-weighted, and category-balanced modes. All sampling uses configurable seeds for reproducibility.
- Provide deduplication (`dataset.dedup(options?)`) with exact match, normalized match (case/whitespace-insensitive), near-duplicate detection (Jaccard similarity above threshold), and cross-split deduplication (ensure no test case appears in multiple splits).
- Provide dataset validation (`dataset.validate()`) that checks schema completeness (required fields present), detects duplicate test cases, verifies ID uniqueness, and reports coverage statistics (percentage of test cases with expected outputs, context, etc.).
- Provide dataset statistics (`dataset.stats()`) that reports size, category distribution, tag distribution, input length statistics (min, max, mean, median), expected output coverage, and duplicate counts.
- Provide semver versioning for datasets: `dataset.bump(type, changelog?)` creates a new version with an immutable snapshot, changelog entry, and version metadata (author, date, description). Version history is stored in a git-friendly format.
- Provide a `createDataset(options)` factory for building new datasets programmatically with `add(testCase)`, `remove(id)`, and `update(id, changes)` operations.
- Provide filtering (`dataset.filter(predicate)`) and transformation (`dataset.map(fn)`) for selecting and modifying test cases programmatically.
- Provide a CLI (`eval-dataset`) with commands for loading, converting, splitting, sampling, deduplicating, validating, and computing statistics on datasets.
- Ship complete TypeScript type definitions. All public types are exported. All configuration objects are fully typed.
- Keep runtime dependencies minimal: `yaml` for promptfoo YAML parsing, `semver` for version management, `csv-parse` and `csv-stringify` for CSV handling. All other functionality uses Node.js built-ins.

### Non-Goals

- **Not an evaluation framework.** This package manages datasets -- the test data that evaluation frameworks consume. It does not execute evaluations, score outputs, or generate reports. For evaluation, use promptfoo, `rag-eval-node-ts`, `output-grade`, or `llm-regression` from this monorepo.
- **Not an LLM runner.** This package does not call any LLM API. It manages static test case data (inputs, expected outputs, context). The LLM is invoked by the evaluation framework that consumes the dataset.
- **Not a database.** Datasets are stored as files on disk. There is no query engine, no indexing beyond the manifest, and no support for datasets that do not fit in memory. For very large datasets (millions of test cases), use a database or HuggingFace `datasets` in Python.
- **Not a data labeling tool.** This package does not provide a UI for creating or annotating test cases. Test cases are authored in text editors, spreadsheets, or labeling tools and imported into `eval-dataset` via `loadDataset`.
- **Not a semantic deduplication engine.** Near-duplicate detection uses Jaccard similarity on token sets. It does not use embeddings or semantic similarity. For embedding-based deduplication, pre-process with an embedding pipeline and feed the results to `eval-dataset` as metadata.
- **Not a HuggingFace datasets replacement.** HuggingFace `datasets` is a comprehensive Python library for dataset management with streaming, memory mapping, Apache Arrow columnar storage, and ecosystem integration. `eval-dataset` is a focused JavaScript/TypeScript library for LLM eval datasets specifically. It handles hundreds to tens of thousands of test cases, not millions.
- **Not a prompt management tool.** This package does not store, version, or manage prompt templates. For prompt versioning, use `prompt-version` from this monorepo. The two packages are complementary: `prompt-version` manages the prompts, `eval-dataset` manages the test data used to evaluate those prompts.

---

## 3. Target Users and Use Cases

### Eval Engineers Building Test Suites

Engineers who maintain collections of test cases for evaluating LLM-powered features. They curate inputs, write expected outputs, tag test cases by category and difficulty, and need to manage this data systematically as it grows from 20 test cases to 2,000. They use `eval-dataset` to load test cases from CSV exports (from spreadsheets where annotators work), validate completeness, deduplicate, split into train/test sets, and export to promptfoo format for running evaluations. When the dataset changes -- new test cases added, incorrect ground truth fixed, categories reorganized -- they bump the dataset version and record what changed.

### Prompt Engineers Running Quick Evaluations

Engineers who iterate on prompts and need fast feedback. They maintain a dataset of 200 test cases but want to run a quick 20-case evaluation during development and a full 200-case evaluation in CI. They use `dataset.sample(20, { stratified: true, seed: 42 })` to get a representative subset that covers all categories proportionally. The seed ensures the same 20 cases are selected every time, making results comparable across prompt iterations.

### CI/CD Pipeline Operators

Teams that run eval suites in CI on every pull request. They need reproducible datasets: the same version of the dataset must produce the same splits and samples on every CI run, regardless of when it runs. They use `eval-dataset` with pinned versions and seeded splits. The dataset version is committed to the repository, the split seed is configured in the eval pipeline, and CI produces deterministic results. When the dataset is updated (new version published), the CI pipeline picks up the new version explicitly -- not silently.

### Teams Converting Between Eval Frameworks

Teams migrating from one eval framework to another, or teams that use multiple frameworks for different aspects of evaluation (promptfoo for prompt testing, RAGAS for RAG evaluation, custom scripts for domain-specific checks). They have test cases in one format and need them in another. They use `eval-dataset` as the conversion hub: load from any format, export to any format, with explicit field mapping documentation so they know exactly what is preserved and what is lost.

### Dataset Curators Managing Quality

Engineers responsible for dataset quality: removing duplicates that waste eval time and skew metrics, ensuring balanced category representation, identifying test cases with missing ground truth, and tracking dataset growth over time. They use `dataset.stats()` to get a quality dashboard, `dataset.dedup()` to clean duplicates, `dataset.validate()` to catch schema issues, and version history to track how the dataset evolves.

### Teams Integrating with the npm-master Ecosystem

Developers using `llm-regression` for regression testing, `rag-eval-node-ts` for RAG evaluation, `fewshot-gen` for few-shot example selection, and `output-grade` for output scoring. `eval-dataset` provides the dataset layer for all of these: load a curated dataset, split it, sample from it, and feed the test cases into the evaluation pipeline. The universal schema ensures test cases flow cleanly between packages.

---

## 4. Core Concepts

### Test Case

A test case is the atomic unit of an eval dataset. It represents a single evaluation scenario: an input that will be sent to an LLM (or LLM-powered system), optionally an expected output to compare against, optionally context documents (for RAG evaluation), and metadata for categorization and filtering.

Every test case has the following fields:

- **`id`** (string): A unique identifier within the dataset. Used for tracking, deduplication, and cross-referencing. Auto-generated (UUID v4) if not provided.
- **`input`** (string): The prompt, question, or query that will be sent to the LLM. This is the only required field for a minimal test case.
- **`expected`** (string | undefined): The expected output -- the ground truth answer. Used by eval frameworks to compare against the actual LLM output. Optional because some evaluations (e.g., toxicity checks, format validation) do not require a reference answer.
- **`context`** (string[] | undefined): An array of context documents, typically used in RAG evaluation. Each string is one retrieved document. The eval framework can assess whether the LLM correctly used these contexts to generate its answer.
- **`metadata`** (Record<string, unknown> | undefined): Arbitrary key-value pairs. Used for storing source information, annotation notes, creation dates, annotator IDs, or any domain-specific data that should travel with the test case.
- **`tags`** (string[] | undefined): Labels for categorization and filtering. Tags enable operations like "sample only test cases tagged `edge-case`" or "split with stratification on the `domain` tag."
- **`difficulty`** (number | undefined): A numeric difficulty rating, typically 1-5 or 0-1. Used for difficulty-weighted sampling (oversample hard cases) and stratified splitting.
- **`category`** (string | undefined): A primary classification label. Used for stratified splitting (ensure each split has proportional category representation) and category-balanced sampling.

### Dataset

A dataset is a named, versioned collection of test cases with metadata. It is the primary object in `eval-dataset`. A dataset contains:

- **`name`** (string): A unique identifier for the dataset (e.g., `qa-eval`, `rag-benchmark`, `customer-support-tests`). Names follow the same kebab-case convention as prompt names in `prompt-version`.
- **`version`** (string): A semver version string (e.g., `1.0.0`, `2.3.1`). Every dataset has a version. Version bumps create immutable snapshots.
- **`description`** (string | undefined): A human-readable description of the dataset's purpose, coverage, and intended use.
- **`cases`** (TestCase[]): The array of test cases. Order is preserved but semantically insignificant -- operations like `dedup` and `filter` may change the order.
- **`metadata`** (Record<string, unknown> | undefined): Dataset-level metadata. Source information, creation context, license, domain, etc.
- **`changelog`** (ChangelogEntry[] | undefined): An ordered list of changelog entries, one per version bump. Each entry records the version, date, author, and description of what changed.
- **`schema`** (DatasetSchema | undefined): An optional schema definition that specifies which fields are required and what validation rules apply. If provided, `dataset.validate()` uses it.

### Split

A split is a partition of a dataset into non-overlapping subsets. The most common partition is train/test/validation, used to prevent overfitting when using dataset examples to tune prompts (train split for few-shot selection, test split for evaluation, validation split for threshold tuning). Splits are defined by:

- **Ratios**: Percentage of the dataset allocated to each partition (e.g., `{ train: 0.8, test: 0.1, validation: 0.1 }`).
- **Seed**: A numeric seed for the random number generator, ensuring the same dataset version always produces the same partition.
- **Mode**: `random` (uniform random assignment), `stratified` (proportional category representation), or `kfold` (k non-overlapping folds for cross-validation).

### Sample

A sample is a subset of a dataset selected according to configurable criteria. Unlike a split (which partitions the entire dataset), a sample selects a fixed number of test cases and returns them as a new dataset. Samples are used for quick evaluations during development, cost-controlled CI runs, and representative subset analysis.

### Version

A dataset version is an immutable snapshot identified by a semver string. Versioning serves the same purpose for datasets as it does for software packages: it enables reproducibility ("this evaluation was run against dataset v2.3.0"), rollback ("revert to v2.2.0 after discovering annotation errors"), and explicit change tracking ("v2.3.0 added 50 new edge cases for multi-turn conversations").

### Format

A format describes how test cases are serialized -- the file structure, field names, and encoding. `eval-dataset` supports loading from and exporting to multiple formats. Internally, all data is represented using the universal `TestCase` schema. Format conversion is the mapping between framework-specific field names and the internal schema.

### Schema

A dataset schema defines structural requirements for the test cases in a dataset: which fields are required, what types they must be, and what validation rules apply. Schemas are optional but useful for enforcing consistency in team-curated datasets. A schema can require that all test cases have an `expected` output, that `category` must be one of a fixed set of values, or that `difficulty` must be a number between 1 and 5.

---

## 5. Dataset Schema

### Universal Internal Format

All data passes through the universal internal format. When a dataset is loaded from any source, it is converted to this format. When a dataset is exported to any target, it is converted from this format. The internal format is the canonical representation.

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

interface Dataset {
  name: string;
  version: string;
  description?: string;
  cases: TestCase[];
  metadata?: Record<string, unknown>;
  changelog?: ChangelogEntry[];
  schema?: DatasetSchema;
}

interface ChangelogEntry {
  version: string;
  date: string;           // ISO 8601
  author?: string;
  description: string;
  added?: number;         // count of test cases added
  removed?: number;       // count of test cases removed
  modified?: number;      // count of test cases modified
}

interface DatasetSchema {
  requiredFields?: (keyof TestCase)[];
  categories?: string[];     // allowed category values
  tags?: string[];           // allowed tag values
  difficultyRange?: { min: number; max: number };
  customValidators?: Array<{
    field: string;
    rule: (value: unknown) => boolean;
    message: string;
  }>;
}
```

### Framework Format Mappings

Each eval framework uses different field names for conceptually equivalent data. The following tables document the exact mapping between the internal schema and each framework format.

#### promptfoo Format

promptfoo stores test cases in YAML or JSON files with a `tests` array. Each test has `vars` (input variables) and `assert` (assertion conditions).

| Internal Field | promptfoo Field | Notes |
|---|---|---|
| `input` | `vars.query` or `vars.input` or `vars.question` | promptfoo uses variable names; the variable containing the input is configurable. Default mapping: `vars.query`. |
| `expected` | `assert[0].value` where `assert[0].type` is `equals` or `similar` | promptfoo uses an assertion array. The expected value is extracted from the first equality-type assertion. |
| `context` | `vars.context` or `vars.documents` | Stored as a variable. May be a string or array depending on the prompt template. |
| `metadata` | `metadata` | promptfoo supports a `metadata` field on test cases. |
| `tags` | `metadata.tags` | Stored within metadata. |
| `category` | `metadata.category` | Stored within metadata. |
| `difficulty` | `metadata.difficulty` | Stored within metadata. |
| `id` | `description` or auto-generated | promptfoo uses `description` as a human-readable label, not a unique ID. |

**Lossy conversions**: When exporting to promptfoo, `tags`, `category`, and `difficulty` are nested inside `metadata`. When importing from promptfoo, the specific `vars` key used for `input` must be specified (or auto-detected from common names). promptfoo assertions beyond simple equality are not captured in the internal format.

#### autoevals Format

autoevals uses a flat JSON structure with `input`, `expected`, and `metadata` fields.

| Internal Field | autoevals Field | Notes |
|---|---|---|
| `input` | `input` | Direct mapping. |
| `expected` | `expected` | Direct mapping. |
| `context` | `metadata.context` | autoevals does not have a top-level context field. |
| `metadata` | `metadata` | Direct mapping, minus fields extracted to top-level. |
| `tags` | `metadata.tags` | Nested in metadata. |
| `category` | `metadata.category` | Nested in metadata. |
| `difficulty` | `metadata.difficulty` | Nested in metadata. |
| `id` | `metadata.id` | autoevals does not have a top-level ID field. |

**Lossy conversions**: `context`, `tags`, `category`, and `difficulty` are folded into `metadata`. The conversion is lossless in practice because all data is preserved, just restructured.

#### RAGAS Format

RAGAS uses a specific structure designed for RAG evaluation with `question`, `answer`, `contexts`, and `ground_truth` fields.

| Internal Field | RAGAS Field | Notes |
|---|---|---|
| `input` | `question` | Rename only. |
| `expected` | `ground_truth` | Rename only. |
| `context` | `contexts` | Direct mapping (both are string arrays). |
| `metadata` | `metadata` | RAGAS supports metadata in some versions. |
| `tags` | Not mapped | Lost in conversion. |
| `category` | Not mapped | Lost in conversion. |
| `difficulty` | Not mapped | Lost in conversion. |
| `id` | Not mapped | Lost in conversion. |

**Lossy conversions**: RAGAS format does not support `tags`, `category`, `difficulty`, or `id`. These fields are dropped when exporting to RAGAS and unavailable when importing from RAGAS. The `answer` field in RAGAS (the actual LLM output, not the ground truth) is ignored during import because it represents a generated answer, not a test case field. A warning is emitted when lossy conversion drops fields.

#### CSV/TSV Format

CSV files use column headers to identify fields. The mapping is configured via a `columnMap` option.

| Internal Field | Default CSV Column | Notes |
|---|---|---|
| `input` | `input` or `question` or `query` | Auto-detected from common header names. |
| `expected` | `expected` or `answer` or `ground_truth` | Auto-detected from common header names. |
| `context` | `context` | Parsed as JSON array if the cell contains `[...]`, otherwise treated as a single-element array. |
| `metadata` | Individual columns | Each column not mapped to a known field becomes a metadata entry. |
| `tags` | `tags` | Parsed as comma-separated values. |
| `category` | `category` | Direct mapping. |
| `difficulty` | `difficulty` | Parsed as a number. |
| `id` | `id` | Direct mapping. |

#### JSONL Format

One test case per line, each line is a JSON object. Field names follow the internal schema by default, with optional `fieldMap` configuration for custom field names.

---

## 6. Loading and Parsing

### Source Types

`loadDataset` accepts multiple source types:

```typescript
type DatasetSource =
  | string                    // file path (auto-detect format from extension)
  | TestCase[]                // in-memory array
  | { url: string }           // HTTP URL (fetch and parse)
  | { stream: ReadableStream } // streaming source
  | { loader: CustomLoaderFn } // custom loader function
```

### Format Auto-Detection

When the source is a file path and no explicit format is specified, `eval-dataset` auto-detects the format:

1. **Extension-based detection**:
   - `.json` -- inspect structure: if top-level has `tests` array, treat as promptfoo. If array of objects with `question`/`ground_truth`, treat as RAGAS. If array of objects with `input`/`expected`, treat as autoevals. Otherwise, treat as JSON array of internal-format test cases.
   - `.jsonl` / `.ndjson` -- JSONL (one JSON object per line).
   - `.yaml` / `.yml` -- promptfoo format (YAML with `tests` array).
   - `.csv` -- CSV with header row.
   - `.tsv` -- TSV with header row.

2. **Content-based detection** (for `.json` files): Parse the JSON, then examine the structure:
   - Has a top-level `tests` array where entries have `vars` -- promptfoo.
   - Is an array where entries have `question` and `ground_truth` -- RAGAS.
   - Is an array where entries have `input` and `expected` -- autoevals or internal format.
   - Is an array of objects with no recognized field pattern -- attempt best-effort mapping, warn on unrecognized fields.

3. **Explicit format override**: `loadDataset('data.json', { format: 'promptfoo' })` bypasses auto-detection.

### Loading Pipeline

```
Source → Read → Parse → Detect Format → Map Fields → Validate → Assign IDs → Dataset
```

1. **Read**: Read the file contents (or receive the in-memory array).
2. **Parse**: Parse the raw text as JSON, YAML, CSV, or JSONL depending on format.
3. **Detect Format**: Determine which eval framework format the data is in.
4. **Map Fields**: Convert framework-specific field names to the universal internal schema using the mapping tables from Section 5.
5. **Validate**: Run schema validation if a schema is provided. Report warnings for missing optional fields, errors for missing required fields.
6. **Assign IDs**: For test cases without an `id`, generate a UUID v4 and assign it.
7. **Return**: Return a `Dataset` object with the loaded test cases.

### Load Options

```typescript
interface LoadOptions {
  format?: 'promptfoo' | 'autoevals' | 'ragas' | 'csv' | 'tsv' | 'jsonl' | 'json' | 'auto';
  name?: string;              // dataset name (default: filename without extension)
  version?: string;           // dataset version (default: '1.0.0')
  schema?: DatasetSchema;     // validation schema
  columnMap?: Record<string, keyof TestCase>;  // CSV column name → field mapping
  fieldMap?: Record<string, keyof TestCase>;   // JSON field name → field mapping
  inputVar?: string;          // promptfoo: which var contains the input (default: auto-detect)
  encoding?: BufferEncoding;  // file encoding (default: 'utf-8')
  skipRows?: number;          // CSV: rows to skip before header (default: 0)
  delimiter?: string;         // CSV: field delimiter (default: ',' for CSV, '\t' for TSV)
}
```

### Custom Loader

For non-standard formats, users provide a custom loader function:

```typescript
type CustomLoaderFn = (source: string) => TestCase[] | Promise<TestCase[]>;

const dataset = await loadDataset({
  loader: async (path) => {
    const raw = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.evaluations.map((e: any) => ({
      id: e.eval_id,
      input: e.prompt_text,
      expected: e.reference_answer,
      category: e.type,
    }));
  },
});
```

---

## 7. Format Conversion

### Export API

```typescript
dataset.export(format: ExportFormat, options?: ExportOptions): string
```

The `export` method converts the internal dataset to the target format and returns the serialized string. It does not write to disk -- the caller decides what to do with the string (write to file, send over network, pipe to stdout).

```typescript
type ExportFormat = 'promptfoo' | 'autoevals' | 'ragas' | 'csv' | 'tsv' | 'jsonl' | 'json';

interface ExportOptions {
  pretty?: boolean;             // JSON: indent with 2 spaces (default: true)
  includeMetadata?: boolean;    // include metadata fields (default: true)
  columnOrder?: string[];       // CSV/TSV: column order
  inputVar?: string;            // promptfoo: variable name for input (default: 'query')
  assertType?: string;          // promptfoo: assertion type for expected (default: 'equals')
  fieldMap?: Record<keyof TestCase, string>;  // custom field name mapping
  onLossyField?: 'warn' | 'error' | 'silent';  // behavior when fields are lost (default: 'warn')
}
```

### Conversion Paths

#### Internal to promptfoo

```typescript
// Internal:
{ id: 'q1', input: 'What is the capital of France?', expected: 'Paris', category: 'geography' }

// promptfoo:
{
  tests: [
    {
      description: 'q1',
      vars: { query: 'What is the capital of France?' },
      assert: [{ type: 'equals', value: 'Paris' }],
      metadata: { category: 'geography' }
    }
  ]
}
```

#### Internal to autoevals

```typescript
// autoevals:
[
  {
    input: 'What is the capital of France?',
    expected: 'Paris',
    metadata: { id: 'q1', category: 'geography' }
  }
]
```

#### Internal to RAGAS

```typescript
// RAGAS:
[
  {
    question: 'What is the capital of France?',
    ground_truth: 'Paris',
    contexts: [],
    metadata: {}
  }
]
// Warning: 'id', 'category' fields dropped (RAGAS format does not support them)
```

#### Internal to CSV

```
id,input,expected,category
q1,"What is the capital of France?",Paris,geography
```

#### Internal to JSONL

```
{"id":"q1","input":"What is the capital of France?","expected":"Paris","category":"geography"}
```

### Lossy Conversion Handling

When exporting to a format that does not support all internal fields, `eval-dataset` handles the loss according to the `onLossyField` option:

- **`warn`** (default): Emit a warning to stderr listing the fields that will be dropped and the number of test cases affected. Proceed with the conversion.
- **`error`**: Throw an `ExportError` listing the fields that cannot be represented in the target format. Abort the conversion.
- **`silent`**: Drop the fields silently. No warning, no error.

The warning message is specific:

```
Warning: Exporting to RAGAS format. The following fields will be dropped:
  - id (present in 200/200 test cases)
  - tags (present in 150/200 test cases)
  - category (present in 200/200 test cases)
  - difficulty (present in 80/200 test cases)
```

---

## 8. Splitting

### Split Configuration

```typescript
interface SplitConfig {
  ratios: Record<string, number>;  // partition name → ratio (must sum to 1.0)
  mode?: 'random' | 'stratified' | 'kfold';
  seed?: number;                   // RNG seed for reproducibility (default: 42)
  stratifyBy?: 'category' | 'tags' | string;  // field to stratify on (mode: 'stratified')
  k?: number;                      // number of folds (mode: 'kfold')
  holdout?: {                      // test cases to exclude from splitting
    ids?: string[];                // specific IDs to hold out
    tags?: string[];               // hold out cases with these tags
    predicate?: (tc: TestCase) => boolean;
  };
}
```

### Random Split

Random split assigns each test case to a partition with probability equal to the partition ratio. The assignment is deterministic given the seed.

**Algorithm**:

1. If `holdout` is specified, remove held-out test cases from the pool.
2. Shuffle the remaining test cases using a seeded PRNG (Mulberry32 seeded with `config.seed`).
3. Walk through the shuffled array and assign each test case to a partition based on cumulative ratios.
4. Return a `SplitResult` with one `Dataset` per partition name.

**Example**:

```typescript
const { train, test, validation } = dataset.split({
  ratios: { train: 0.8, test: 0.1, validation: 0.1 },
  seed: 42,
});
// train: ~80% of test cases
// test: ~10% of test cases
// validation: ~10% of test cases
```

**Determinism guarantee**: Given the same dataset version and the same seed, the same split is produced every time, on every platform. The PRNG is implemented in JavaScript (not relying on `Math.random()`) to ensure cross-platform determinism.

### Stratified Split

Stratified split ensures that each partition has proportional representation of each category (or tag, or other grouping field). This is critical when the dataset has imbalanced categories -- a random split might put all rare-category test cases into the test set.

**Algorithm**:

1. Group test cases by the `stratifyBy` field (default: `category`).
2. For each group, apply the random split algorithm independently with the same seed.
3. Combine the per-group partitions into the final partition datasets.
4. Test cases with no value for the `stratifyBy` field are grouped into an "uncategorized" bucket and split normally.

**Example**:

```typescript
// Dataset: 100 geography, 20 history, 5 science
const { train, test } = dataset.split({
  ratios: { train: 0.8, test: 0.2 },
  mode: 'stratified',
  stratifyBy: 'category',
  seed: 42,
});
// train: ~80 geography, ~16 history, ~4 science
// test: ~20 geography, ~4 history, ~1 science
```

### K-Fold Split

K-fold split divides the dataset into `k` non-overlapping folds of approximately equal size. Used for cross-validation: in each round, one fold is the test set and the remaining `k-1` folds are the training set.

**Algorithm**:

1. Shuffle the test cases using the seeded PRNG.
2. Divide into `k` consecutive groups of approximately equal size (last group may be smaller by up to `k-1` cases).
3. Return a `KFoldResult` with an array of `k` fold datasets.

```typescript
interface KFoldResult {
  folds: Dataset[];
  getFold(i: number): { train: Dataset; test: Dataset };
}
```

**Example**:

```typescript
const kfold = dataset.split({ mode: 'kfold', k: 5, seed: 42 });
for (let i = 0; i < 5; i++) {
  const { train, test } = kfold.getFold(i);
  // train: 4/5 of the data, test: 1/5 of the data
  // test partition rotates through all 5 folds
}
```

### Holdout

Holdout reserves specific test cases before splitting. Held-out cases are not included in any partition. They are returned separately in the `SplitResult`.

**Use cases**:
- Reserve "golden" test cases that must always be in the evaluation set, regardless of the random split.
- Exclude test cases tagged `deprecated` from all partitions.
- Hold out test cases above a certain difficulty for a dedicated hard-case evaluation.

```typescript
const result = dataset.split({
  ratios: { train: 0.8, test: 0.2 },
  holdout: {
    tags: ['golden'],
    predicate: (tc) => tc.difficulty !== undefined && tc.difficulty >= 5,
  },
  seed: 42,
});
// result.train: ~80% of non-held-out cases
// result.test: ~20% of non-held-out cases
// result.holdout: all cases matching the holdout criteria
```

### Split Result

```typescript
interface SplitResult {
  [partitionName: string]: Dataset;
  holdout?: Dataset;  // only present if holdout was configured
}
```

Each partition in the `SplitResult` is a full `Dataset` object with the same `name` (suffixed with the partition name, e.g., `qa-eval/train`), the same `version`, and the partition's subset of test cases. Partition datasets inherit the parent dataset's metadata and schema.

---

## 9. Sampling

### Sample Options

```typescript
interface SampleOptions {
  mode?: 'random' | 'stratified' | 'difficulty-weighted' | 'category-balanced';
  seed?: number;                    // RNG seed (default: 42)
  stratifyBy?: 'category' | 'tags' | string;  // field for stratified mode
  replace?: boolean;                // sample with replacement (default: false)
}
```

### Random Sample

Select `n` test cases uniformly at random from the dataset.

```typescript
const subset = dataset.sample(20, { mode: 'random', seed: 42 });
// 20 randomly selected test cases
```

If `n` exceeds the dataset size and `replace` is `false`, an error is thrown. If `replace` is `true`, test cases may be selected multiple times (their IDs are suffixed with `_dup1`, `_dup2`, etc. to maintain uniqueness).

### Stratified Sample

Select `n` test cases such that each category is represented proportionally to its frequency in the full dataset. This is a random sample with proportional category representation.

**Algorithm**:

1. Compute the category distribution of the full dataset.
2. Allocate sample slots to each category proportionally: `slots[cat] = round(n * count[cat] / total)`.
3. Adjust rounding errors so the total is exactly `n`.
4. Within each category, randomly select the allocated number of test cases using the seeded PRNG.

```typescript
const subset = dataset.sample(20, { mode: 'stratified', stratifyBy: 'category', seed: 42 });
// If the dataset is 80% geography, 15% history, 5% science:
// ~16 geography, ~3 history, ~1 science
```

### Difficulty-Weighted Sample

Select `n` test cases with probability proportional to their difficulty score. Higher-difficulty test cases are more likely to be selected. This produces a sample that overrepresents hard cases, which is useful for focused evaluation of challenging scenarios.

**Algorithm**:

1. For each test case with a `difficulty` value, the selection weight is `difficulty`. Test cases without a `difficulty` value receive a weight of 1.0 (the median, to avoid bias).
2. Normalize weights so they sum to 1.0.
3. Select `n` test cases using weighted random sampling without replacement (or with replacement if `replace: true`).

```typescript
const hardSubset = dataset.sample(20, { mode: 'difficulty-weighted', seed: 42 });
// Overrepresents high-difficulty test cases
```

### Category-Balanced Sample

Select `n` test cases with equal representation per category, regardless of category frequency in the full dataset. This produces a balanced sample even when the dataset is highly imbalanced.

**Algorithm**:

1. Group test cases by category.
2. Compute per-category allocation: `perCat = floor(n / numCategories)`. Remaining slots distributed round-robin.
3. Within each category, randomly select the allocated number of test cases.
4. If a category has fewer test cases than its allocation, select all available and redistribute remaining slots to other categories.

```typescript
const balanced = dataset.sample(20, { mode: 'category-balanced', seed: 42 });
// If 4 categories: ~5 from each, regardless of original proportions
```

---

## 10. Deduplication

### Dedup Options

```typescript
interface DedupOptions {
  mode?: 'exact' | 'normalized' | 'near' | 'cross-split';
  field?: keyof TestCase;           // field to compare (default: 'input')
  threshold?: number;               // similarity threshold for 'near' mode (default: 0.85)
  keep?: 'first' | 'last' | 'most-complete';  // which duplicate to keep (default: 'first')
  caseSensitive?: boolean;          // for 'exact' mode (default: false)
}
```

### Exact Deduplication

Removes test cases with identical values in the comparison field (default: `input`).

**Algorithm**:

1. For each test case, compute the comparison key: the value of `options.field` (default: `input`).
2. If `caseSensitive` is false, lowercase the key.
3. Track seen keys in a `Map<string, TestCase>`.
4. For each test case, if the key has been seen, it is a duplicate. Keep the first (or last, or most-complete) occurrence.
5. Return a new `Dataset` with duplicates removed.

"Most-complete" means the test case with the most non-undefined optional fields (`expected`, `context`, `tags`, `category`, `difficulty`). In case of a tie, keep the first occurrence.

```typescript
const deduped = dataset.dedup({ mode: 'exact' });
// Removes test cases with identical input strings
```

### Normalized Deduplication

Like exact deduplication, but normalizes the comparison strings before comparing: lowercase, collapse whitespace (multiple spaces/tabs/newlines to a single space), trim, remove punctuation.

**Algorithm**:

1. Normalize each comparison value: `value.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim()`.
2. Apply the same seen-key tracking as exact dedup.

```typescript
const deduped = dataset.dedup({ mode: 'normalized' });
// "What is the capital of France?" and "what is the capital of france" are duplicates
```

### Near-Duplicate Detection

Detects test cases that are similar but not identical, using Jaccard similarity on word token sets. Two test cases are considered near-duplicates if their Jaccard similarity on the comparison field exceeds the threshold.

**Algorithm**:

1. Tokenize each comparison value: split on whitespace, lowercase.
2. For each pair of test cases, compute Jaccard similarity: `|A ∩ B| / |A ∪ B|`.
3. If the similarity exceeds `threshold`, the pair is a near-duplicate. Keep one according to the `keep` strategy.
4. Use a union-find data structure to group transitive near-duplicates (if A~B and B~C, then {A,B,C} is a duplicate group). Keep one representative per group.

**Performance**: Pairwise comparison is O(n^2). For datasets up to 10,000 test cases, this is fast enough (< 1 second). For larger datasets, a MinHash-based approximate approach is used (see Section 16: Performance).

```typescript
const deduped = dataset.dedup({ mode: 'near', threshold: 0.85 });
// "What is the capital of France?" and "What's the capital city of France?" may be near-duplicates
```

### Cross-Split Deduplication

Detects and removes test cases that appear in multiple splits. Data leakage between train and test splits invalidates evaluation results -- if the same question appears in both splits, the model may have "seen" the answer during prompt tuning.

**Algorithm**:

1. Accept two or more `Dataset` objects (the splits).
2. For each test case in each split, compute the comparison key (exact, normalized, or near-match, depending on `mode`).
3. Identify test cases whose keys appear in more than one split.
4. Remove the duplicates from all splits except the first one they appear in, or from all splits except the designated "keep" split.
5. Return the cleaned splits and a report of removed duplicates.

```typescript
import { crossSplitDedup } from 'eval-dataset';

const cleaned = crossSplitDedup(
  { train: trainDataset, test: testDataset },
  { mode: 'normalized', keepIn: 'train' }
);
// Duplicates found in both train and test are removed from test
```

### Dedup Report

All dedup operations return both the cleaned dataset and a `DedupReport`:

```typescript
interface DedupReport {
  originalCount: number;
  deduplicatedCount: number;
  removedCount: number;
  duplicateGroups: Array<{
    kept: TestCase;
    removed: TestCase[];
    similarity?: number;  // for near-duplicate mode
  }>;
}
```

---

## 11. Versioning

### Version Model

Dataset versioning follows the same principles as `prompt-version` in this monorepo: semver tagging, immutable snapshots, changelog entries, and git-friendly storage.

Each dataset version is:

- **Immutable**: Once a version is created, its test cases, metadata, and schema cannot be modified. Modifications require a new version.
- **Semver-tagged**: Versions follow semantic versioning. PATCH for correcting ground truth annotations or fixing typos. MINOR for adding new test cases or new categories. MAJOR for restructuring the schema, removing test cases, or changing the meaning of existing fields.
- **Changelogged**: Each version bump records what changed and why.

### Version Bumping

```typescript
const v2 = dataset.bump('minor', {
  description: 'Added 50 edge cases for multi-turn conversations',
  author: 'eval-team',
});
// v2.version === '1.1.0' (if dataset.version was '1.0.0')
// v2.changelog has a new entry
```

`bump(type, options?)` creates a new `Dataset` object with:

1. The version incremented according to `type` (`major`, `minor`, or `patch`).
2. A new `ChangelogEntry` prepended to the changelog array.
3. The changelog entry automatically computes `added`, `removed`, and `modified` counts by diffing the current test cases against the previous version's test cases (matched by `id`).

### Version Metadata

```typescript
interface BumpOptions {
  description: string;
  author?: string;
  date?: string;       // ISO 8601 (default: now)
  metadata?: Record<string, unknown>;  // arbitrary version-level metadata
}
```

### Storage Format

Datasets are stored on disk in a directory structure that parallels `prompt-version`:

```
datasets/
  qa-eval/
    dataset.json          # manifest: name, current version, changelog, schema
    versions/
      1.0.0/
        cases.jsonl       # test cases, one per line
        meta.json         # version metadata
      1.1.0/
        cases.jsonl
        meta.json
      2.0.0/
        cases.jsonl
        meta.json
```

**Why JSONL for cases**: Each test case is one line. Git diffs show exactly which test cases were added, removed, or modified. Adding 50 test cases to a 200-case dataset produces a git diff with 50 added lines, not a rewrite of the entire JSON file. This is the same rationale as JSONL log files: append-friendly, diff-friendly, line-oriented.

**Why a separate manifest**: The `dataset.json` manifest at the dataset root indexes all versions, stores the changelog, and tracks the schema. It is a small file that changes on every version bump. Reading the manifest does not require reading all version directories.

### Loading Versioned Datasets

```typescript
import { loadDataset } from 'eval-dataset';

// Load the latest version
const latest = await loadDataset('datasets/qa-eval');

// Load a specific version
const v1 = await loadDataset('datasets/qa-eval', { version: '1.0.0' });

// Load by semver range
const compatible = await loadDataset('datasets/qa-eval', { version: '^1.0.0' });
```

Version resolution uses the `semver` library with the same range syntax as npm: `^1.0.0` (compatible), `~1.2.0` (approximately), `1.x` (wildcard), `>=1.0.0 <2.0.0` (explicit range), and `latest` (default).

### Saving Versioned Datasets

```typescript
import { saveDataset } from 'eval-dataset';

await saveDataset(dataset, 'datasets/qa-eval');
// Writes datasets/qa-eval/versions/<version>/cases.jsonl
// Updates datasets/qa-eval/dataset.json manifest
```

---

## 12. Statistics and Validation

### Dataset Statistics

```typescript
dataset.stats(): DatasetStats

interface DatasetStats {
  totalCases: number;
  withExpected: number;           // count of cases with expected output
  withContext: number;            // count of cases with context
  expectedCoverage: number;      // withExpected / totalCases (0-1)
  contextCoverage: number;       // withContext / totalCases (0-1)
  categories: Record<string, number>;  // category → count
  tags: Record<string, number>;        // tag → count (across all cases)
  difficulty: {
    min: number;
    max: number;
    mean: number;
    median: number;
    distribution: Record<number, number>;  // difficulty value → count
  } | null;                      // null if no cases have difficulty
  inputLength: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stddev: number;
    p90: number;                 // 90th percentile
    p99: number;                 // 99th percentile
  };
  expectedLength: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stddev: number;
  } | null;                      // null if no cases have expected output
  duplicates: {
    exact: number;               // count of exact duplicates
    normalized: number;          // count of normalized duplicates
  };
}
```

**Example output** (from CLI `eval-dataset stats qa-eval.json`):

```
Dataset: qa-eval v2.1.0
Total cases: 250
Expected output coverage: 232/250 (92.8%)
Context coverage: 180/250 (72.0%)

Categories:
  geography    120 (48.0%)
  history       60 (24.0%)
  science       45 (18.0%)
  culture       25 (10.0%)

Difficulty:
  min: 1  max: 5  mean: 2.8  median: 3

Input length:
  min: 12  max: 342  mean: 67  median: 54  p90: 145  p99: 298

Duplicates:
  exact: 3  normalized: 7
```

### Validation

```typescript
dataset.validate(): ValidationResult

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'missing-required-field' | 'invalid-type' | 'duplicate-id' | 'invalid-category' | 'invalid-difficulty' | 'custom';
  caseId: string;
  field?: string;
  message: string;
}

interface ValidationWarning {
  type: 'missing-expected' | 'missing-category' | 'empty-context' | 'duplicate-input' | 'custom';
  caseId: string;
  field?: string;
  message: string;
}
```

Validation checks, in order:

1. **ID uniqueness**: Every `id` must be unique within the dataset. Duplicate IDs produce an error.
2. **Required fields**: If the dataset schema specifies `requiredFields`, every test case must have non-undefined values for those fields. Missing required fields produce errors.
3. **Input non-empty**: Every test case must have a non-empty `input` string. Empty inputs produce errors.
4. **Type validation**: Fields must have the correct types (`input` is a string, `context` is a string array, `difficulty` is a number, etc.). Wrong types produce errors.
5. **Category validation**: If the schema specifies `categories` (allowed values), test cases with unlisted categories produce errors.
6. **Difficulty range**: If the schema specifies `difficultyRange`, test cases with out-of-range difficulty values produce errors.
7. **Custom validators**: If the schema specifies `customValidators`, each validator is run against each test case. Failures produce errors.
8. **Expected output coverage**: Test cases without `expected` produce warnings (not errors, since some evaluations do not require expected outputs).
9. **Duplicate input detection**: Test cases with identical (exact or normalized) `input` values produce warnings.
10. **Empty context**: Test cases with an empty `context` array (`[]`) produce warnings (probably an error -- either the case should have context or the field should be omitted).

---

## 13. API Surface

### Top-Level Functions

```typescript
// Load a dataset from a file, URL, or in-memory array
function loadDataset(source: DatasetSource, options?: LoadOptions): Promise<Dataset>;

// Create a new empty dataset
function createDataset(options: CreateOptions): Dataset;

// Save a dataset to disk in the versioned directory format
function saveDataset(dataset: Dataset, directory: string): Promise<void>;

// Cross-split deduplication
function crossSplitDedup(
  splits: Record<string, Dataset>,
  options?: DedupOptions & { keepIn?: string }
): { splits: Record<string, Dataset>; report: DedupReport };
```

### Dataset Object Methods

```typescript
interface Dataset {
  // Properties
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly cases: ReadonlyArray<TestCase>;
  readonly metadata?: Record<string, unknown>;
  readonly changelog?: ReadonlyArray<ChangelogEntry>;
  readonly schema?: DatasetSchema;

  // Transformation (returns new Dataset, original is immutable)
  split(config: SplitConfig): SplitResult;
  sample(n: number, options?: SampleOptions): Dataset;
  dedup(options?: DedupOptions): { dataset: Dataset; report: DedupReport };
  filter(predicate: (tc: TestCase) => boolean): Dataset;
  map(fn: (tc: TestCase) => TestCase): Dataset;

  // Mutation (returns new Dataset with modification applied)
  add(testCase: Omit<TestCase, 'id'> & { id?: string }): Dataset;
  addMany(testCases: Array<Omit<TestCase, 'id'> & { id?: string }>): Dataset;
  remove(id: string): Dataset;
  update(id: string, changes: Partial<TestCase>): Dataset;

  // Export
  export(format: ExportFormat, options?: ExportOptions): string;

  // Analysis
  stats(): DatasetStats;
  validate(): ValidationResult;

  // Versioning
  bump(type: 'major' | 'minor' | 'patch', options?: BumpOptions): Dataset;

  // Utilities
  size: number;                                  // cases.length
  get(id: string): TestCase | undefined;         // find by ID
  has(id: string): boolean;                      // check by ID
  ids(): string[];                               // all IDs
  categories(): string[];                        // unique categories
  tagSet(): string[];                            // unique tags across all cases
  slice(start: number, end?: number): Dataset;   // positional slice
  concat(other: Dataset): Dataset;               // merge two datasets
  shuffle(seed?: number): Dataset;               // seeded shuffle
  toJSON(): object;                              // serialize to plain object
}
```

### Immutability Model

`Dataset` objects are immutable. Every method that modifies the dataset returns a new `Dataset` instance. The original dataset is never mutated. This mirrors the pattern used in functional data structures and enables safe method chaining:

```typescript
const result = dataset
  .filter(tc => tc.category === 'geography')
  .dedup({ mode: 'normalized' })
  .dataset
  .sample(50, { seed: 42 })
  .export('promptfoo');
```

### CreateOptions

```typescript
interface CreateOptions {
  name: string;
  version?: string;         // default: '1.0.0'
  description?: string;
  cases?: TestCase[];       // initial test cases
  metadata?: Record<string, unknown>;
  schema?: DatasetSchema;
}
```

---

## 14. Configuration

### Default Configuration

All options have sensible defaults. The simplest usage requires no configuration:

```typescript
import { loadDataset } from 'eval-dataset';

const dataset = await loadDataset('test-cases.json');
const { train, test } = dataset.split({ ratios: { train: 0.8, test: 0.2 } });
const sample = dataset.sample(20);
const clean = dataset.dedup();
const exported = dataset.export('promptfoo');
```

### Configuration Reference

| Option | Type | Default | Context | Description |
|---|---|---|---|---|
| `format` | `ExportFormat \| 'auto'` | `'auto'` | `loadDataset` | Source format. Auto-detect from extension and content. |
| `name` | `string` | Filename | `loadDataset`, `createDataset` | Dataset name. |
| `version` | `string` | `'1.0.0'` | `loadDataset`, `createDataset` | Dataset version. |
| `seed` | `number` | `42` | `split`, `sample`, `shuffle` | RNG seed for reproducibility. |
| `mode` | `string` | `'random'` | `split`, `sample`, `dedup` | Algorithm mode. |
| `keep` | `string` | `'first'` | `dedup` | Which duplicate to keep. |
| `threshold` | `number` | `0.85` | `dedup` (near mode) | Jaccard similarity threshold for near-duplicate detection. |
| `field` | `keyof TestCase` | `'input'` | `dedup` | Field to compare for deduplication. |
| `caseSensitive` | `boolean` | `false` | `dedup` | Case sensitivity for comparison. |
| `pretty` | `boolean` | `true` | `export` | Pretty-print JSON output. |
| `onLossyField` | `string` | `'warn'` | `export` | Behavior when fields are dropped. |
| `encoding` | `BufferEncoding` | `'utf-8'` | `loadDataset` | File encoding. |
| `inputVar` | `string` | Auto-detect | `loadDataset`, `export` (promptfoo) | promptfoo variable name for the input field. |
| `assertType` | `string` | `'equals'` | `export` (promptfoo) | promptfoo assertion type for expected output. |
| `delimiter` | `string` | `','` / `'\t'` | `loadDataset`, `export` (CSV/TSV) | CSV field delimiter. |
| `replace` | `boolean` | `false` | `sample` | Sample with replacement. |
| `stratifyBy` | `string` | `'category'` | `split`, `sample` (stratified) | Field to stratify on. |

---

## 15. CLI

### Overview

The CLI provides terminal-based access to all dataset operations. It reads from files, writes to stdout or files, and exits with conventional codes.

```
eval-dataset <command> [options]
```

**Exit codes**:
- `0`: Success.
- `1`: Operation failed (validation errors, file not found, invalid format).
- `2`: Usage error (invalid arguments, missing required options).

### Commands

#### `eval-dataset load <source>`

Load a dataset and print summary information.

```bash
eval-dataset load test-cases.json
# Dataset: test-cases v1.0.0
# Cases: 250
# Format: json (auto-detected)
# Categories: geography (120), history (60), science (45), culture (25)

eval-dataset load test-cases.json --format promptfoo --output loaded.json
# Load as promptfoo format, write internal format to loaded.json
```

| Option | Description |
|---|---|
| `--format <fmt>` | Source format (auto, json, jsonl, csv, tsv, yaml, promptfoo, autoevals, ragas). |
| `--output <path>` | Write loaded dataset to file in internal JSON format. |
| `--input-var <name>` | promptfoo: variable name for input. |
| `--column-map <json>` | CSV: JSON object mapping column names to fields. |

#### `eval-dataset convert <source> --to <format>`

Convert a dataset from one format to another.

```bash
eval-dataset convert promptfoo-tests.yaml --to ragas --output ragas-data.json
eval-dataset convert test-cases.csv --to promptfoo --output promptfoo-tests.yaml
eval-dataset convert dataset.json --to jsonl --output dataset.jsonl
```

| Option | Description |
|---|---|
| `--to <fmt>` | Target format (required). |
| `--output <path>` | Output file (default: stdout). |
| `--from <fmt>` | Source format (default: auto-detect). |
| `--lossy <mode>` | Lossy field handling: warn, error, silent (default: warn). |

#### `eval-dataset split <source>`

Split a dataset into partitions.

```bash
eval-dataset split dataset.json --train 0.8 --test 0.1 --validation 0.1 --seed 42
# Writes: dataset.train.json, dataset.test.json, dataset.validation.json

eval-dataset split dataset.json --train 0.8 --test 0.2 --stratify category --seed 42
# Stratified split by category
```

| Option | Description |
|---|---|
| `--train <ratio>` | Training set ratio. |
| `--test <ratio>` | Test set ratio. |
| `--validation <ratio>` | Validation set ratio. |
| `--seed <n>` | RNG seed (default: 42). |
| `--stratify <field>` | Stratify by field (category, tags, etc.). |
| `--output-dir <dir>` | Output directory (default: same as source). |
| `--format <fmt>` | Output format (default: same as source). |

#### `eval-dataset sample <source> <n>`

Sample test cases from a dataset.

```bash
eval-dataset sample dataset.json 50 --mode stratified --seed 42 --output sample.json
eval-dataset sample dataset.json 20 --mode difficulty-weighted --seed 123
```

| Option | Description |
|---|---|
| `--mode <mode>` | Sampling mode: random, stratified, difficulty-weighted, category-balanced. |
| `--seed <n>` | RNG seed (default: 42). |
| `--output <path>` | Output file (default: stdout). |

#### `eval-dataset dedup <source>`

Deduplicate a dataset.

```bash
eval-dataset dedup dataset.json --mode normalized --output deduped.json
eval-dataset dedup dataset.json --mode near --threshold 0.9
```

| Option | Description |
|---|---|
| `--mode <mode>` | Dedup mode: exact, normalized, near (default: exact). |
| `--threshold <n>` | Near-duplicate threshold (default: 0.85). |
| `--field <name>` | Field to compare (default: input). |
| `--keep <strategy>` | Which duplicate to keep: first, last, most-complete (default: first). |
| `--output <path>` | Output file (default: stdout). |
| `--report` | Print dedup report to stderr. |

#### `eval-dataset stats <source>`

Print dataset statistics.

```bash
eval-dataset stats dataset.json
eval-dataset stats dataset.json --json  # machine-readable JSON output
```

| Option | Description |
|---|---|
| `--json` | Output as JSON instead of human-readable. |

#### `eval-dataset validate <source>`

Validate a dataset against its schema or a provided schema.

```bash
eval-dataset validate dataset.json
eval-dataset validate dataset.json --schema schema.json
eval-dataset validate dataset.json --require expected --require category
```

| Option | Description |
|---|---|
| `--schema <path>` | Path to a JSON schema definition. |
| `--require <field>` | Require this field on all test cases (repeatable). |
| `--strict` | Treat warnings as errors. |

Exit code 0 if valid, 1 if validation errors.

#### `eval-dataset version <dataset-dir>`

Manage dataset versions.

```bash
eval-dataset version datasets/qa-eval                      # show current version
eval-dataset version datasets/qa-eval --bump minor --message "Added 50 edge cases"
eval-dataset version datasets/qa-eval --log                # show changelog
eval-dataset version datasets/qa-eval --list               # list all versions
```

| Option | Description |
|---|---|
| `--bump <type>` | Bump version: major, minor, patch. |
| `--message <msg>` | Changelog message (required with --bump). |
| `--author <name>` | Changelog author. |
| `--log` | Print changelog. |
| `--list` | List all versions. |

---

## 16. Performance

### Design Constraints

`eval-dataset` is designed for datasets of up to 50,000 test cases. This covers the vast majority of LLM eval datasets. Typical eval datasets range from 50 to 5,000 test cases. The package must remain responsive at 50,000 cases.

### Performance Targets

| Operation | Dataset Size | Target Latency |
|---|---|---|
| `loadDataset` (JSON) | 1,000 cases | < 50ms |
| `loadDataset` (JSON) | 10,000 cases | < 200ms |
| `loadDataset` (CSV) | 10,000 cases | < 500ms |
| `split` (random) | 10,000 cases | < 10ms |
| `split` (stratified) | 10,000 cases | < 20ms |
| `sample` (random) | 10,000 cases | < 5ms |
| `dedup` (exact) | 10,000 cases | < 50ms |
| `dedup` (normalized) | 10,000 cases | < 100ms |
| `dedup` (near) | 10,000 cases | < 2s |
| `dedup` (near) | 50,000 cases | < 30s |
| `export` (any format) | 10,000 cases | < 100ms |
| `stats` | 10,000 cases | < 50ms |
| `validate` | 10,000 cases | < 100ms |

### Near-Duplicate Optimization

Pairwise Jaccard comparison is O(n^2). For n = 10,000, that is 50 million comparisons. To keep this under 2 seconds:

1. **Token caching**: Tokenize each test case once and store the token set. Reuse across comparisons.
2. **MinHash for large datasets**: For n > 5,000, use MinHash (locality-sensitive hashing) to identify candidate near-duplicate pairs, then compute exact Jaccard only for candidates. This reduces the number of pairwise comparisons from O(n^2) to approximately O(n * k) where k is the average number of candidates per case (typically << n).
3. **Early termination**: When computing Jaccard similarity, track the maximum possible score and terminate early if it cannot exceed the threshold.

### Memory

Datasets are loaded fully into memory as JavaScript objects. A 10,000-case dataset with typical field sizes (~200 chars per input, ~100 chars per expected, ~500 chars context) occupies approximately 20-40 MB of heap memory. This is well within Node.js default limits.

For the versioned storage format, only the requested version is loaded into memory. The manifest file is loaded separately and is typically < 100 KB.

---

## 17. Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `semver` | `^7.6.0` | Semver parsing, comparison, and range resolution for dataset versioning. |
| `yaml` | `^2.4.0` | Parsing promptfoo YAML dataset files. |
| `csv-parse` | `^5.5.0` | Parsing CSV/TSV dataset files. |
| `csv-stringify` | `^6.5.0` | Generating CSV/TSV output for export. |
| `uuid` | `^9.0.0` | Generating UUIDs for test case IDs. |

### Development Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5.4.0` | TypeScript compiler. |
| `vitest` | `^1.6.0` | Test runner. |
| `eslint` | `^9.0.0` | Linter. |

### Dependency Philosophy

Runtime dependencies are kept to five packages, each serving a specific purpose that would be non-trivial to implement correctly (semver range resolution, YAML parsing, CSV parsing/generation, UUID generation). All other functionality -- JSON parsing, JSONL parsing, Jaccard similarity, MinHash, the seeded PRNG, deduplication, splitting, sampling, statistics, validation -- is implemented with Node.js built-ins and custom code.

---

## 18. Testing Strategy

### Unit Tests

Every public function and method has unit tests. Tests follow the pattern established in other monorepo packages: one test file per source module, colocated in `src/__tests__/`.

| Module | Test Coverage |
|---|---|
| Loading (JSON, JSONL, CSV, YAML) | One test per format. Verify field mapping. Verify auto-detection. |
| Loading (promptfoo, autoevals, RAGAS) | One test per framework format. Verify framework-specific field mapping. |
| Export (all formats) | One test per format. Verify output structure. Verify round-trip (load → export → load produces the same data). |
| Splitting (random, stratified, k-fold) | Verify partition sizes. Verify no overlap. Verify determinism with seed. Verify stratification proportionality. |
| Sampling (all modes) | Verify sample size. Verify determinism with seed. Verify stratification. Verify difficulty weighting. |
| Dedup (all modes) | Verify duplicate removal. Verify kept test case. Verify report counts. Verify near-duplicate detection. |
| Validation | One test per validation rule. Verify errors and warnings. |
| Statistics | Verify counts, distributions, and length statistics. |
| Versioning | Verify bump behavior. Verify changelog generation. Verify save/load roundtrip. |
| Immutability | Verify that all transformation methods return new objects and do not mutate the original. |

### Round-Trip Tests

For every format pair (A, B), verify that loading from format A, exporting to format B, and loading back from format B produces a dataset with the same lossless fields. Lossy fields should be absent after the round-trip. These tests verify that the format mapping tables in Section 5 are correctly implemented.

### Determinism Tests

For every operation that uses a seed (split, sample, shuffle), verify that:
- The same seed produces the same result across multiple calls.
- Different seeds produce different results.
- The same seed produces the same result on different platforms (since the PRNG is implemented in JavaScript, not using `Math.random()`).

### Edge Case Tests

- Empty dataset (0 test cases).
- Single test case.
- Dataset where all test cases are identical (dedup reduces to 1).
- Dataset with no expected outputs (validation warnings, not errors).
- Dataset with no categories (stratified split falls back to random).
- CSV with missing columns, extra columns, quoted fields, embedded newlines.
- YAML with anchors, aliases, multi-line strings.
- JSONL with blank lines, trailing newline, malformed lines.
- Very long input strings (> 10,000 characters).
- Unicode inputs (CJK characters, emoji, RTL text).
- Split with a single partition (ratio: `{ all: 1.0 }`).
- Sample where n equals dataset size.
- Near-duplicate threshold of 0.0 (everything is a duplicate) and 1.0 (nothing is a duplicate).

### Integration Tests

- Load a real promptfoo YAML file, convert to RAGAS, validate, split, sample, and export back to promptfoo.
- Create a dataset from scratch, add test cases, bump version, save to disk, load from disk, verify contents.
- CLI smoke tests: invoke each command with sample data, verify exit codes and output format.

---

## 19. File Structure

```
eval-dataset/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  src/
    index.ts                  # public API re-exports
    types.ts                  # TestCase, Dataset, all interfaces
    dataset.ts                # Dataset class implementation
    load.ts                   # loadDataset, format detection, parsing
    export.ts                 # export to all formats
    split.ts                  # split, kfold
    sample.ts                 # sample (all modes)
    dedup.ts                  # dedup (all modes), crossSplitDedup
    validate.ts               # validate, schema checking
    stats.ts                  # stats computation
    version.ts                # versioning, bump, save, load versioned
    prng.ts                   # deterministic seeded PRNG (Mulberry32)
    formats/
      promptfoo.ts            # promptfoo load/export
      autoevals.ts            # autoevals load/export
      ragas.ts                # RAGAS load/export
      csv.ts                  # CSV/TSV load/export
      jsonl.ts                # JSONL load/export
    cli/
      index.ts                # CLI entry point, command routing
      commands/
        load.ts
        convert.ts
        split.ts
        sample.ts
        dedup.ts
        stats.ts
        validate.ts
        version.ts
    __tests__/
      load.test.ts
      export.test.ts
      split.test.ts
      sample.test.ts
      dedup.test.ts
      validate.test.ts
      stats.test.ts
      version.test.ts
      dataset.test.ts
      prng.test.ts
      formats/
        promptfoo.test.ts
        autoevals.test.ts
        ragas.test.ts
        csv.test.ts
        jsonl.test.ts
      cli/
        cli.test.ts
      fixtures/
        promptfoo-sample.yaml
        autoevals-sample.json
        ragas-sample.json
        test-cases.csv
        test-cases.jsonl
        test-cases.json
  dist/                       # compiled output (gitignored)
```

---

## 20. Integration

### With llm-regression

`llm-regression` consumes test inputs for regression testing. `eval-dataset` provides those test inputs:

```typescript
import { loadDataset } from 'eval-dataset';
import { runRegression } from 'llm-regression';

const dataset = await loadDataset('qa-eval.json');
const sample = dataset.sample(50, { mode: 'stratified', seed: 42 });

const testInputs = sample.cases.map(tc => ({
  id: tc.id,
  input: tc.input,
  metadata: { category: tc.category },
}));

const report = await runRegression(testInputs, baselinePrompt, candidatePrompt, llmFn);
```

### With rag-eval-node-ts

RAG evaluation requires test cases with context documents and ground truth answers. `eval-dataset` provides these in the required format:

```typescript
import { loadDataset } from 'eval-dataset';

const dataset = await loadDataset('rag-benchmark.json');
const ragData = dataset.export('ragas');
// Use ragData with RAGAS-compatible evaluation
```

### With promptfoo

`eval-dataset` converts datasets to promptfoo format for running evaluations:

```typescript
import { loadDataset } from 'eval-dataset';
import fs from 'fs';

const dataset = await loadDataset('test-cases.csv');
const promptfooYaml = dataset.export('promptfoo');
fs.writeFileSync('promptfoo-tests.yaml', promptfooYaml);
// Run: npx promptfoo eval -c promptfoo-tests.yaml
```

### With fewshot-gen

`fewshot-gen` selects few-shot examples from a pool. `eval-dataset` provides the pool with train/test splitting to prevent data leakage:

```typescript
import { loadDataset } from 'eval-dataset';

const dataset = await loadDataset('examples.json');
const { train, test } = dataset.split({ ratios: { train: 0.8, test: 0.2 }, seed: 42 });

// Use train.cases as the few-shot example pool
// Use test.cases for evaluation
// No leakage: examples used for few-shot are never in the eval set
```

### With prompt-version

Both packages follow the same versioning model. A prompt version and a dataset version can be pinned together for fully reproducible evaluations:

```typescript
import { getPrompt } from 'prompt-version';
import { loadDataset } from 'eval-dataset';

const prompt = await getPrompt('customer-support', '2.3.0');
const dataset = await loadDataset('datasets/customer-support-eval', { version: '1.5.0' });

// This evaluation is fully reproducible:
// same prompt version + same dataset version = same results
```

---

## 21. Implementation Roadmap

### Phase 1: Core Data Model and Loading (Week 1)

1. Implement `types.ts` with all interfaces (`TestCase`, `Dataset`, `DatasetSchema`, etc.).
2. Implement `dataset.ts` with the immutable `Dataset` class and basic methods (`filter`, `map`, `add`, `remove`, `update`, `get`, `has`, `ids`, `size`, `slice`, `concat`, `shuffle`, `toJSON`).
3. Implement `prng.ts` with the Mulberry32 seeded PRNG.
4. Implement `load.ts` with format auto-detection and the loading pipeline.
5. Implement format loaders: `formats/jsonl.ts`, `formats/csv.ts`, `formats/promptfoo.ts`, `formats/autoevals.ts`, `formats/ragas.ts`.
6. Write unit tests for all loading paths and format detection.

### Phase 2: Transformation Operations (Week 2)

7. Implement `split.ts` with random, stratified, and k-fold splitting.
8. Implement `sample.ts` with random, stratified, difficulty-weighted, and category-balanced sampling.
9. Implement `dedup.ts` with exact, normalized, and near-duplicate deduplication.
10. Implement `crossSplitDedup` for cross-split data leakage detection.
11. Write unit tests for all transformation operations with determinism verification.

### Phase 3: Export, Validation, and Statistics (Week 3)

12. Implement `export.ts` with format conversion for all target formats.
13. Implement `validate.ts` with all validation rules.
14. Implement `stats.ts` with all statistics computations.
15. Write round-trip tests (load format A → export format B → load format B).
16. Write validation and statistics tests.

### Phase 4: Versioning and Storage (Week 4)

17. Implement `version.ts` with semver bumping, changelog generation, save, and load.
18. Implement the versioned directory storage format.
19. Write versioning tests (bump, save, load, changelog).

### Phase 5: CLI and Polish (Week 5)

20. Implement `cli/index.ts` with command routing.
21. Implement all CLI commands.
22. Write CLI integration tests.
23. Write edge case tests and performance benchmarks.
24. Write README documentation.

---

## 22. Example Use Cases

### Building an Eval Dataset from Scratch

```typescript
import { createDataset } from 'eval-dataset';

let dataset = createDataset({
  name: 'customer-support-eval',
  description: 'Test cases for customer support chatbot evaluation',
  schema: {
    requiredFields: ['input', 'expected', 'category'],
    categories: ['billing', 'shipping', 'returns', 'general'],
    difficultyRange: { min: 1, max: 5 },
  },
});

dataset = dataset.add({
  input: 'How do I return an item?',
  expected: 'You can return items within 30 days of purchase. Visit our returns portal at returns.example.com or contact support.',
  category: 'returns',
  difficulty: 1,
  tags: ['common', 'policy'],
});

dataset = dataset.add({
  input: 'I was charged twice for order #12345',
  expected: 'I apologize for the duplicate charge. I can see order #12345 and will process a refund for the duplicate charge immediately. You should see it within 3-5 business days.',
  category: 'billing',
  difficulty: 3,
  tags: ['edge-case', 'refund'],
});

// ... add more test cases

const validation = dataset.validate();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  process.exit(1);
}

console.log(dataset.stats());
```

### CI Dataset Validation Pipeline

```bash
#!/bin/bash
# Run in CI to validate dataset quality before evaluation

eval-dataset validate datasets/qa-eval --require expected --require category --strict
if [ $? -ne 0 ]; then
  echo "Dataset validation failed"
  exit 1
fi

eval-dataset stats datasets/qa-eval --json > dataset-stats.json

eval-dataset dedup datasets/qa-eval --mode normalized --report 2> dedup-report.txt
if grep -q "removedCount.*[1-9]" dedup-report.txt; then
  echo "Warning: duplicates found in dataset"
  cat dedup-report.txt
fi
```

### Format Conversion Pipeline

```typescript
import { loadDataset } from 'eval-dataset';
import fs from 'fs';

// Team A uses promptfoo, Team B uses RAGAS, Team C needs CSV for spreadsheet review
const dataset = await loadDataset('master-dataset.json');

fs.writeFileSync('promptfoo-tests.yaml', dataset.export('promptfoo', {
  inputVar: 'question',
  assertType: 'similar',
}));

fs.writeFileSync('ragas-data.json', dataset.export('ragas', {
  onLossyField: 'warn',
}));

fs.writeFileSync('review-spreadsheet.csv', dataset.export('csv', {
  columnOrder: ['id', 'category', 'difficulty', 'input', 'expected'],
}));
```

### Dataset Versioning Workflow

```typescript
import { loadDataset, saveDataset } from 'eval-dataset';

// Load the current version
let dataset = await loadDataset('datasets/qa-eval');
console.log(`Current version: ${dataset.version}`);
// Current version: 1.2.0

// Add new test cases from the annotation team's latest batch
const newCases = await loadDataset('new-annotations.csv');
dataset = dataset.concat(newCases.dataset ?? newCases);

// Deduplicate
const { dataset: clean, report } = dataset.dedup({ mode: 'normalized' });
console.log(`Removed ${report.removedCount} duplicates`);

// Validate
const validation = clean.validate();
if (!validation.valid) {
  throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
}

// Bump version
const v2 = clean.bump('minor', {
  description: `Added ${newCases.size} new test cases from annotation batch #7. Removed ${report.removedCount} duplicates.`,
  author: 'eval-team',
});
console.log(`New version: ${v2.version}`);
// New version: 1.3.0

// Save
await saveDataset(v2, 'datasets/qa-eval');
// Writes datasets/qa-eval/versions/1.3.0/cases.jsonl
// Updates datasets/qa-eval/dataset.json manifest
```

### Reproducible Train/Test Split for Prompt Tuning

```typescript
import { loadDataset } from 'eval-dataset';

const dataset = await loadDataset('datasets/qa-eval', { version: '1.3.0' });

// Stratified split ensures proportional category representation
const { train, test, validation } = dataset.split({
  ratios: { train: 0.7, test: 0.15, validation: 0.15 },
  mode: 'stratified',
  stratifyBy: 'category',
  seed: 42,
});

// Verify no data leakage
import { crossSplitDedup } from 'eval-dataset';
const { report } = crossSplitDedup(
  { train, test, validation },
  { mode: 'normalized' },
);
console.log(`Cross-split duplicates: ${report.removedCount}`);
// Should be 0 since splits are non-overlapping by construction

// Use train for few-shot example selection
// Use test for evaluation
// Use validation for threshold tuning
console.log(`Train: ${train.size}, Test: ${test.size}, Validation: ${validation.size}`);

// Quick dev evaluation: sample 30 from test set
const quickTest = test.sample(30, { mode: 'stratified', seed: 42 });
```
