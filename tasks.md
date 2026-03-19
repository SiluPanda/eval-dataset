# eval-dataset — Task Breakdown

This file tracks all implementation tasks derived from SPEC.md. Each task is granular, actionable, and grouped by logical phase.

---

## Phase 1: Project Scaffolding and Dependencies

- [ ] **Install runtime dependencies** — Add `semver@^7.6.0`, `yaml@^2.4.0`, `csv-parse@^5.5.0`, `csv-stringify@^6.5.0`, and `uuid@^9.0.0` to `package.json` dependencies. | Status: not_done
- [ ] **Install dev dependencies** — Add `typescript@^5.4.0`, `vitest@^1.6.0`, `eslint@^9.0.0`, and `@types/uuid`, `@types/semver` to `package.json` devDependencies. | Status: not_done
- [ ] **Configure CLI bin entry** — Add `"bin": { "eval-dataset": "dist/cli/index.js" }` to `package.json` so the CLI is available as `eval-dataset` after install. | Status: not_done
- [ ] **Create directory structure** — Create the directories: `src/formats/`, `src/cli/`, `src/cli/commands/`, `src/__tests__/`, `src/__tests__/formats/`, `src/__tests__/cli/`, `src/__tests__/fixtures/`. | Status: not_done
- [ ] **Create test fixture files** — Create sample fixture files: `promptfoo-sample.yaml`, `autoevals-sample.json`, `ragas-sample.json`, `test-cases.csv`, `test-cases.jsonl`, `test-cases.json` in `src/__tests__/fixtures/`. | Status: not_done

---

## Phase 2: Core Types and Interfaces

- [ ] **Define TestCase interface** — Implement the `TestCase` interface in `src/types.ts` with fields: `id` (string), `input` (string), `expected` (string | undefined), `context` (string[] | undefined), `metadata` (Record<string, unknown> | undefined), `tags` (string[] | undefined), `difficulty` (number | undefined), `category` (string | undefined). | Status: not_done
- [ ] **Define Dataset interface** — Implement the `Dataset` interface in `src/types.ts` with properties: `name`, `version`, `description`, `cases`, `metadata`, `changelog`, `schema`, and all method signatures (`split`, `sample`, `dedup`, `filter`, `map`, `add`, `addMany`, `remove`, `update`, `export`, `stats`, `validate`, `bump`, `size`, `get`, `has`, `ids`, `categories`, `tagSet`, `slice`, `concat`, `shuffle`, `toJSON`). | Status: not_done
- [ ] **Define ChangelogEntry interface** — Implement the `ChangelogEntry` interface with fields: `version`, `date` (ISO 8601), `author`, `description`, `added`, `removed`, `modified`. | Status: not_done
- [ ] **Define DatasetSchema interface** — Implement the `DatasetSchema` interface with fields: `requiredFields`, `categories`, `tags`, `difficultyRange` ({ min, max }), `customValidators` (array of { field, rule, message }). | Status: not_done
- [ ] **Define SplitConfig and SplitResult interfaces** — Implement `SplitConfig` with `ratios`, `mode`, `seed`, `stratifyBy`, `k`, `holdout`. Implement `SplitResult` as `Record<string, Dataset>` with optional `holdout`. Implement `KFoldResult` with `folds` and `getFold(i)`. | Status: not_done
- [ ] **Define SampleOptions interface** — Implement `SampleOptions` with `mode` ('random' | 'stratified' | 'difficulty-weighted' | 'category-balanced'), `seed`, `stratifyBy`, `replace`. | Status: not_done
- [ ] **Define DedupOptions and DedupReport interfaces** — Implement `DedupOptions` with `mode`, `field`, `threshold`, `keep`, `caseSensitive`. Implement `DedupReport` with `originalCount`, `deduplicatedCount`, `removedCount`, `duplicateGroups`. | Status: not_done
- [ ] **Define LoadOptions and DatasetSource types** — Implement `LoadOptions` with `format`, `name`, `version`, `schema`, `columnMap`, `fieldMap`, `inputVar`, `encoding`, `skipRows`, `delimiter`. Implement `DatasetSource` union type (string | TestCase[] | { url } | { stream } | { loader }). | Status: not_done
- [ ] **Define ExportFormat and ExportOptions types** — Implement `ExportFormat` type ('promptfoo' | 'autoevals' | 'ragas' | 'csv' | 'tsv' | 'jsonl' | 'json'). Implement `ExportOptions` with `pretty`, `includeMetadata`, `columnOrder`, `inputVar`, `assertType`, `fieldMap`, `onLossyField`. | Status: not_done
- [ ] **Define CreateOptions interface** — Implement `CreateOptions` with `name`, `version` (default '1.0.0'), `description`, `cases`, `metadata`, `schema`. | Status: not_done
- [ ] **Define BumpOptions interface** — Implement `BumpOptions` with `description`, `author`, `date`, `metadata`. | Status: not_done
- [ ] **Define ValidationResult, ValidationError, ValidationWarning interfaces** — Implement all validation result types with their `type` union fields and other properties as specified. | Status: not_done
- [ ] **Define DatasetStats interface** — Implement `DatasetStats` with `totalCases`, `withExpected`, `withContext`, `expectedCoverage`, `contextCoverage`, `categories`, `tags`, `difficulty` (with min/max/mean/median/distribution), `inputLength` (with min/max/mean/median/stddev/p90/p99), `expectedLength`, `duplicates` (exact/normalized counts). | Status: not_done
- [ ] **Export all types from index.ts** — Re-export all public types and interfaces from `src/index.ts`. | Status: not_done

---

## Phase 3: Seeded PRNG

- [ ] **Implement Mulberry32 PRNG** — Create `src/prng.ts` with a seeded Mulberry32 pseudo-random number generator. Expose a function that takes a seed and returns a generator producing deterministic floats in [0, 1). This PRNG must NOT use `Math.random()` to guarantee cross-platform determinism. | Status: not_done
- [ ] **Implement seeded shuffle utility** — Add a `shuffle(array, seed)` utility that uses the Mulberry32 PRNG to produce a deterministic Fisher-Yates shuffle. | Status: not_done
- [ ] **Write PRNG tests** — Create `src/__tests__/prng.test.ts`. Test determinism (same seed produces same sequence), distribution uniformity, and that different seeds produce different sequences. | Status: not_done

---

## Phase 4: Dataset Class

- [ ] **Implement Dataset class** — Create `src/dataset.ts` with an immutable `Dataset` class. The constructor accepts `name`, `version`, `cases`, `description`, `metadata`, `changelog`, `schema`. All properties are readonly. | Status: not_done
- [ ] **Implement Dataset.filter()** — Return a new Dataset containing only test cases matching the predicate. Preserve name, version, metadata, schema. | Status: not_done
- [ ] **Implement Dataset.map()** — Return a new Dataset with test cases transformed by the mapping function. Preserve name, version, metadata, schema. | Status: not_done
- [ ] **Implement Dataset.add()** — Return a new Dataset with the test case appended. Auto-generate UUID v4 for `id` if not provided. | Status: not_done
- [ ] **Implement Dataset.addMany()** — Return a new Dataset with multiple test cases appended. Auto-generate IDs for any without one. | Status: not_done
- [ ] **Implement Dataset.remove()** — Return a new Dataset with the test case matching the given `id` removed. | Status: not_done
- [ ] **Implement Dataset.update()** — Return a new Dataset with the test case matching the given `id` updated with the provided partial changes. | Status: not_done
- [ ] **Implement Dataset.get()** — Find and return a test case by ID, or undefined if not found. | Status: not_done
- [ ] **Implement Dataset.has()** — Return boolean indicating whether a test case with the given ID exists. | Status: not_done
- [ ] **Implement Dataset.ids()** — Return an array of all test case IDs. | Status: not_done
- [ ] **Implement Dataset.categories()** — Return an array of unique category values across all test cases. | Status: not_done
- [ ] **Implement Dataset.tagSet()** — Return an array of unique tags across all test cases. | Status: not_done
- [ ] **Implement Dataset.size** — Return `cases.length` as a getter property. | Status: not_done
- [ ] **Implement Dataset.slice()** — Return a new Dataset with a positional slice of the cases array. | Status: not_done
- [ ] **Implement Dataset.concat()** — Return a new Dataset merging cases from another Dataset. | Status: not_done
- [ ] **Implement Dataset.shuffle()** — Return a new Dataset with cases shuffled using the seeded PRNG. Default seed: 42. | Status: not_done
- [ ] **Implement Dataset.toJSON()** — Serialize the Dataset to a plain JSON-serializable object. | Status: not_done
- [ ] **Implement createDataset() factory** — Create `createDataset(options: CreateOptions)` in `src/dataset.ts` (or `src/index.ts`). Returns a new Dataset with default version '1.0.0' if not specified. | Status: not_done
- [ ] **Verify immutability** — Ensure that all transformation/mutation methods return new Dataset instances and never modify the original. Use `ReadonlyArray<TestCase>` for `cases`. | Status: not_done
- [ ] **Write Dataset class tests** — Create `src/__tests__/dataset.test.ts`. Test all methods: filter, map, add, addMany, remove, update, get, has, ids, categories, tagSet, size, slice, concat, shuffle, toJSON, immutability. | Status: not_done

---

## Phase 5: Format Loaders (Loading)

### 5a: JSON Loading

- [ ] **Implement JSON loader** — In `src/load.ts`, implement loading from JSON files. Support both JSON arrays of test cases and single JSON objects with a `cases` or `tests` array at the top level. | Status: not_done
- [ ] **Implement JSON format auto-detection** — For `.json` files, inspect the structure: detect promptfoo (has `tests` array with `vars`), RAGAS (array with `question`/`ground_truth`), autoevals (array with `input`/`expected`), or internal format. | Status: not_done

### 5b: JSONL Loading

- [ ] **Implement JSONL loader** — Create `src/formats/jsonl.ts`. Parse one JSON object per line. Handle blank lines and trailing newlines gracefully. Support optional `fieldMap` for custom field names. | Status: not_done
- [ ] **Handle JSONL edge cases** — Handle malformed lines (log warning, skip or error based on config), blank lines (skip), trailing newline (ignore). | Status: not_done

### 5c: CSV/TSV Loading

- [ ] **Implement CSV loader** — Create `src/formats/csv.ts`. Use `csv-parse` to parse CSV files with header row. Map column names to TestCase fields using default column name mapping (input/question/query, expected/answer/ground_truth, etc.). | Status: not_done
- [ ] **Implement TSV loader** — Support TSV by using tab delimiter. Reuse CSV loader with `delimiter: '\t'`. | Status: not_done
- [ ] **Implement CSV columnMap option** — Support custom `columnMap` option to override default column-to-field mapping. | Status: not_done
- [ ] **Implement CSV skipRows option** — Support `skipRows` to skip rows before the header row. | Status: not_done
- [ ] **Handle CSV context parsing** — Parse `context` column as JSON array if value contains `[...]`, otherwise treat as single-element array. | Status: not_done
- [ ] **Handle CSV tags parsing** — Parse `tags` column as comma-separated values. | Status: not_done
- [ ] **Handle CSV difficulty parsing** — Parse `difficulty` column as a number. | Status: not_done
- [ ] **Handle CSV extra columns** — Map columns not matching known fields to `metadata` entries. | Status: not_done

### 5d: YAML / promptfoo Loading

- [ ] **Implement promptfoo loader** — Create `src/formats/promptfoo.ts`. Use `yaml` package to parse YAML. Extract test cases from the `tests` array. Map `vars.query`/`vars.input`/`vars.question` to `input`, `assert[0].value` (where type is `equals`/`similar`) to `expected`, `vars.context`/`vars.documents` to `context`, `metadata` fields to tags/category/difficulty. | Status: not_done
- [ ] **Implement promptfoo inputVar auto-detection** — Auto-detect which `vars` key contains the input by checking common names: `query`, `input`, `question`, `prompt`. Allow explicit override via `inputVar` option. | Status: not_done
- [ ] **Handle promptfoo description as ID** — Map `description` field to `id`, or auto-generate if not present. | Status: not_done

### 5e: autoevals Loading

- [ ] **Implement autoevals loader** — Create `src/formats/autoevals.ts`. Parse flat JSON array with `input`, `expected`, `metadata` fields. Extract `context`, `tags`, `category`, `difficulty`, `id` from `metadata` if present. | Status: not_done

### 5f: RAGAS Loading

- [ ] **Implement RAGAS loader** — Create `src/formats/ragas.ts`. Parse JSON array with `question`, `ground_truth`, `contexts`, `metadata` fields. Map `question` to `input`, `ground_truth` to `expected`, `contexts` to `context`. Ignore `answer` field (LLM output, not test data). | Status: not_done

### 5g: loadDataset Function

- [ ] **Implement loadDataset() function** — Create the main `loadDataset(source, options?)` function in `src/load.ts`. Orchestrate the loading pipeline: Read -> Parse -> Detect Format -> Map Fields -> Validate -> Assign IDs -> return Dataset. | Status: not_done
- [ ] **Implement file path source handling** — When source is a string file path, read file, detect format from extension and content. | Status: not_done
- [ ] **Implement in-memory array source handling** — When source is `TestCase[]`, create Dataset directly from the array. | Status: not_done
- [ ] **Implement URL source handling** — When source is `{ url: string }`, fetch the URL content and parse it. | Status: not_done
- [ ] **Implement custom loader source handling** — When source is `{ loader: CustomLoaderFn }`, invoke the custom loader and use its output. | Status: not_done
- [ ] **Implement format auto-detection by extension** — Map `.json`, `.jsonl`, `.ndjson`, `.yaml`, `.yml`, `.csv`, `.tsv` to their respective formats. | Status: not_done
- [ ] **Implement ID auto-assignment** — For test cases without an `id`, generate UUID v4 using the `uuid` package. | Status: not_done
- [ ] **Implement dataset name inference** — Default `name` to filename without extension when loading from a file path. | Status: not_done
- [ ] **Implement encoding option** — Support configurable file encoding (default: 'utf-8'). | Status: not_done

### 5h: Loading Tests

- [ ] **Write JSON loading tests** — Create `src/__tests__/load.test.ts`. Test loading from JSON files in internal format, auto-detection of promptfoo/autoevals/RAGAS structures. | Status: not_done
- [ ] **Write JSONL loading tests** — Create `src/__tests__/formats/jsonl.test.ts`. Test standard loading, blank lines, trailing newlines, malformed lines. | Status: not_done
- [ ] **Write CSV loading tests** — Create `src/__tests__/formats/csv.test.ts`. Test header detection, columnMap, skipRows, context parsing, tags parsing, difficulty parsing, extra columns as metadata, quoted fields, embedded newlines. | Status: not_done
- [ ] **Write promptfoo loading tests** — Create `src/__tests__/formats/promptfoo.test.ts`. Test YAML parsing, vars mapping, assert mapping, inputVar auto-detection, metadata extraction. | Status: not_done
- [ ] **Write autoevals loading tests** — Create `src/__tests__/formats/autoevals.test.ts`. Test field mapping, metadata extraction. | Status: not_done
- [ ] **Write RAGAS loading tests** — Create `src/__tests__/formats/ragas.test.ts`. Test field mapping, `answer` field ignored, warning on lossy fields. | Status: not_done
- [ ] **Write format auto-detection tests** — Test that extension-based and content-based format detection works correctly for all supported formats. | Status: not_done

---

## Phase 6: Splitting

- [ ] **Implement random split** — In `src/split.ts`, implement random splitting. Use seeded PRNG (Mulberry32) to shuffle, then assign to partitions based on cumulative ratios. Validate that ratios sum to 1.0. | Status: not_done
- [ ] **Implement stratified split** — Group test cases by `stratifyBy` field (default: `category`). Apply random split independently within each group using the same seed. Handle uncategorized cases as a separate bucket. | Status: not_done
- [ ] **Implement k-fold split** — Shuffle with seeded PRNG, divide into `k` consecutive groups of approximately equal size. Return `KFoldResult` with `folds` array and `getFold(i)` method. | Status: not_done
- [ ] **Implement holdout support** — Before splitting, remove test cases matching holdout criteria (by IDs, tags, or predicate). Return held-out cases separately in the `SplitResult`. | Status: not_done
- [ ] **Implement SplitResult construction** — Each partition is a full Dataset with name suffixed (e.g., `qa-eval/train`), same version, and the partition's subset of cases. Inherit parent metadata and schema. | Status: not_done
- [ ] **Validate split ratios** — Throw an error if ratios do not sum to 1.0 (within floating-point tolerance). Throw if any ratio is negative or zero. | Status: not_done
- [ ] **Wire Dataset.split() method** — Connect the Dataset class `split()` method to the `split.ts` implementation. | Status: not_done
- [ ] **Write split tests** — Create `src/__tests__/split.test.ts`. Test: partition sizes match ratios, no overlap between partitions, all cases accounted for, determinism with same seed, different results with different seed, stratified proportionality, k-fold fold sizes and rotation, holdout exclusion. | Status: not_done
- [ ] **Write split edge case tests** — Test: empty dataset, single test case, single partition (ratio: { all: 1.0 }), dataset with no categories for stratified split (fallback to random), very small dataset with many partitions. | Status: not_done

---

## Phase 7: Sampling

- [ ] **Implement random sampling** — In `src/sample.ts`, implement random sampling using seeded PRNG. Select `n` cases uniformly at random. Error if `n > dataset.size` and `replace` is false. | Status: not_done
- [ ] **Implement sampling with replacement** — When `replace: true`, allow selecting the same case multiple times. Suffix IDs of duplicates with `_dup1`, `_dup2`, etc. | Status: not_done
- [ ] **Implement stratified sampling** — Compute category distribution, allocate sample slots proportionally (round then adjust to sum to `n`), randomly select within each category. | Status: not_done
- [ ] **Implement difficulty-weighted sampling** — Weight selection probability by `difficulty` value. Cases without `difficulty` receive weight 1.0. Normalize weights, select `n` using weighted random sampling. | Status: not_done
- [ ] **Implement category-balanced sampling** — Allocate `floor(n / numCategories)` per category, distribute remainder round-robin. If a category has fewer cases than its allocation, select all and redistribute. | Status: not_done
- [ ] **Wire Dataset.sample() method** — Connect the Dataset class `sample()` method to the `sample.ts` implementation. | Status: not_done
- [ ] **Write sample tests** — Create `src/__tests__/sample.test.ts`. Test: correct sample size, determinism with seed, stratified proportionality, difficulty weighting (high-difficulty overrepresented), category balance, replacement with ID suffixing. | Status: not_done
- [ ] **Write sample edge case tests** — Test: n equals dataset size, n > dataset size without replacement (error), n > dataset size with replacement, single category, no categories for stratified, no difficulty values for difficulty-weighted. | Status: not_done

---

## Phase 8: Deduplication

- [ ] **Implement exact deduplication** — In `src/dedup.ts`, implement exact match dedup. Compare `field` (default: `input`). Track seen keys in a Map. Respect `caseSensitive` option (default: false). Support `keep` strategy: 'first', 'last', 'most-complete'. | Status: not_done
- [ ] **Implement 'most-complete' keep strategy** — Count non-undefined optional fields (`expected`, `context`, `tags`, `category`, `difficulty`) for each duplicate. Keep the one with the most. Tie-break: keep first. | Status: not_done
- [ ] **Implement normalized deduplication** — Normalize comparison values: lowercase, collapse whitespace to single space, remove punctuation, trim. Then apply exact dedup logic on normalized values. | Status: not_done
- [ ] **Implement near-duplicate detection** — Tokenize comparison values (split on whitespace, lowercase). Compute pairwise Jaccard similarity (`|A intersect B| / |A union B|`). Group near-duplicates using union-find for transitive closure. Keep one representative per group. | Status: not_done
- [ ] **Implement token caching for near-dedup** — Tokenize each test case once and cache the token set. Reuse across pairwise comparisons. | Status: not_done
- [ ] **Implement MinHash optimization** — For datasets > 5,000 cases, use MinHash (locality-sensitive hashing) to identify candidate near-duplicate pairs before computing exact Jaccard. Reduce from O(n^2) to approximately O(n*k). | Status: not_done
- [ ] **Implement Jaccard early termination** — When computing Jaccard similarity, track maximum possible score and terminate early if it cannot exceed the threshold. | Status: not_done
- [ ] **Implement union-find data structure** — Implement a union-find (disjoint-set) for grouping transitive near-duplicates. | Status: not_done
- [ ] **Implement DedupReport generation** — Return `DedupReport` with `originalCount`, `deduplicatedCount`, `removedCount`, and `duplicateGroups` (each with `kept`, `removed`, optional `similarity`). | Status: not_done
- [ ] **Implement crossSplitDedup()** — Create `crossSplitDedup(splits, options)` function. Accept multiple Dataset objects. Identify test cases appearing in multiple splits using the configured dedup mode. Remove duplicates from all splits except the `keepIn` split (or first occurrence). Return cleaned splits and report. | Status: not_done
- [ ] **Wire Dataset.dedup() method** — Connect the Dataset class `dedup()` method to the `dedup.ts` implementation. Return `{ dataset, report }`. | Status: not_done
- [ ] **Write dedup tests** — Create `src/__tests__/dedup.test.ts`. Test: exact dedup removes identical inputs, normalized dedup handles case/whitespace/punctuation, near-dedup with various thresholds, keep strategies (first/last/most-complete), report accuracy, cross-split dedup. | Status: not_done
- [ ] **Write dedup edge case tests** — Test: all cases identical (reduce to 1), no duplicates (no change), threshold 0.0 (everything is duplicate), threshold 1.0 (nothing is duplicate), empty dataset, single case. | Status: not_done

---

## Phase 9: Export / Format Conversion

- [ ] **Implement export to JSON** — In `src/export.ts`, serialize Dataset to internal JSON format. Support `pretty` option (default: true, indent 2 spaces). | Status: not_done
- [ ] **Implement export to JSONL** — Serialize each test case as one JSON line. Support optional `fieldMap` for custom field names. | Status: not_done
- [ ] **Implement export to CSV** — Use `csv-stringify` to generate CSV. Support `columnOrder` option. Map TestCase fields to columns. Serialize `context` as JSON array string. Serialize `tags` as comma-separated. Serialize `metadata` as individual columns or JSON. | Status: not_done
- [ ] **Implement export to TSV** — Reuse CSV export with tab delimiter. | Status: not_done
- [ ] **Implement export to promptfoo** — Map `input` to `vars.query` (or configured `inputVar`), `expected` to `assert` array with configured `assertType` (default: 'equals'), `id` to `description`, `tags`/`category`/`difficulty` into `metadata`. Wrap in `{ tests: [...] }` structure. Serialize as YAML. | Status: not_done
- [ ] **Implement export to autoevals** — Map `input` to `input`, `expected` to `expected`, fold `context`/`tags`/`category`/`difficulty`/`id` into `metadata`. Serialize as JSON array. | Status: not_done
- [ ] **Implement export to RAGAS** — Map `input` to `question`, `expected` to `ground_truth`, `context` to `contexts`. Drop `id`, `tags`, `category`, `difficulty`. Emit lossy conversion warning. | Status: not_done
- [ ] **Implement lossy field handling** — When exporting drops fields, behave according to `onLossyField` option: 'warn' (emit warning to stderr with field counts), 'error' (throw ExportError), 'silent' (drop silently). | Status: not_done
- [ ] **Implement lossy warning message format** — Warning should list each dropped field and how many test cases have that field (e.g., "id (present in 200/200 test cases)"). | Status: not_done
- [ ] **Wire Dataset.export() method** — Connect the Dataset class `export()` method to the `export.ts` implementation. | Status: not_done
- [ ] **Write export tests** — Create `src/__tests__/export.test.ts`. Test each format output: JSON structure, JSONL line format, CSV columns, promptfoo YAML structure, autoevals JSON structure, RAGAS JSON structure. | Status: not_done
- [ ] **Write round-trip tests** — For each format pair (A, B), test: load from A, export to B, load from B. Verify lossless fields are preserved and lossy fields are absent. | Status: not_done
- [ ] **Write lossy conversion tests** — Test all three onLossyField modes: warn emits to stderr, error throws, silent drops quietly. | Status: not_done

---

## Phase 10: Validation

- [ ] **Implement ID uniqueness check** — In `src/validate.ts`, detect duplicate IDs. Produce `ValidationError` with type `'duplicate-id'`. | Status: not_done
- [ ] **Implement required fields check** — If schema specifies `requiredFields`, verify every test case has non-undefined values for those fields. Produce errors for missing required fields. | Status: not_done
- [ ] **Implement input non-empty check** — Every test case must have a non-empty `input` string. Produce error for empty inputs. | Status: not_done
- [ ] **Implement type validation** — Verify field types: `input` is string, `context` is string array, `difficulty` is number, `tags` is string array, `category` is string, `metadata` is object. Produce errors for wrong types. | Status: not_done
- [ ] **Implement category validation** — If schema specifies `categories` (allowed values), produce error for test cases with unlisted category values. | Status: not_done
- [ ] **Implement difficulty range validation** — If schema specifies `difficultyRange`, produce error for test cases with out-of-range difficulty values. | Status: not_done
- [ ] **Implement custom validators** — If schema specifies `customValidators`, run each validator against each test case. Produce errors for failures using the validator's message. | Status: not_done
- [ ] **Implement expected output coverage warning** — Produce warning for test cases without `expected` (type `'missing-expected'`). | Status: not_done
- [ ] **Implement duplicate input detection warning** — Produce warning for test cases with identical (exact or normalized) `input` values (type `'duplicate-input'`). | Status: not_done
- [ ] **Implement empty context warning** — Produce warning for test cases with empty `context` array `[]` (type `'empty-context'`). | Status: not_done
- [ ] **Implement missing category warning** — Produce warning for test cases without a `category` value (type `'missing-category'`). | Status: not_done
- [ ] **Wire Dataset.validate() method** — Connect the Dataset class `validate()` method to the `validate.ts` implementation. Return `ValidationResult`. | Status: not_done
- [ ] **Write validation tests** — Create `src/__tests__/validate.test.ts`. One test per validation rule. Test both error and warning cases. Test valid dataset returns `valid: true`. | Status: not_done

---

## Phase 11: Statistics

- [ ] **Implement totalCases count** — In `src/stats.ts`, count total number of test cases. | Status: not_done
- [ ] **Implement expected/context coverage** — Count cases with `expected` and `context`. Compute coverage ratios (count / total). | Status: not_done
- [ ] **Implement category distribution** — Compute a map of category values to their counts. | Status: not_done
- [ ] **Implement tag distribution** — Compute a map of tags to their counts across all cases. | Status: not_done
- [ ] **Implement difficulty statistics** — Compute min, max, mean, median difficulty. Compute distribution (difficulty value to count). Return null if no cases have difficulty. | Status: not_done
- [ ] **Implement input length statistics** — Compute min, max, mean, median, stddev, p90, p99 of input string lengths. | Status: not_done
- [ ] **Implement expected length statistics** — Compute min, max, mean, median, stddev of expected output string lengths. Return null if no cases have expected. | Status: not_done
- [ ] **Implement duplicate counts** — Compute exact and normalized duplicate counts. | Status: not_done
- [ ] **Wire Dataset.stats() method** — Connect the Dataset class `stats()` method to the `stats.ts` implementation. Return `DatasetStats`. | Status: not_done
- [ ] **Write stats tests** — Create `src/__tests__/stats.test.ts`. Verify counts, distributions, length statistics, percentiles, and duplicate counts. | Status: not_done

---

## Phase 12: Versioning and Storage

- [ ] **Implement version bumping** — In `src/version.ts`, implement `bump(type, options?)`. Increment version using `semver.inc()`. Create a new ChangelogEntry with date (ISO 8601), author, description. Auto-compute `added`, `removed`, `modified` counts by diffing cases by ID. Return new Dataset with bumped version and updated changelog. | Status: not_done
- [ ] **Implement versioned directory save** — Implement `saveDataset(dataset, directory)`. Write `versions/<version>/cases.jsonl` (one test case per line) and `versions/<version>/meta.json` (version metadata). Update `dataset.json` manifest at the dataset root with name, current version, changelog, and schema. | Status: not_done
- [ ] **Implement manifest file format** — The `dataset.json` manifest stores: name, current version, description, changelog (all entries), schema, and a version index listing all available versions. | Status: not_done
- [ ] **Implement versioned dataset loading** — Extend `loadDataset` to detect versioned directory format (has `dataset.json` manifest). Load the manifest, resolve the requested version (latest, specific, or semver range using `semver.maxSatisfying()`), and load cases from the corresponding `versions/<version>/cases.jsonl`. | Status: not_done
- [ ] **Implement semver range resolution** — Support `^1.0.0`, `~1.2.0`, `1.x`, `>=1.0.0 <2.0.0`, `latest`, and exact version strings. Use the `semver` library for resolution. | Status: not_done
- [ ] **Wire Dataset.bump() method** — Connect the Dataset class `bump()` method to the `version.ts` implementation. | Status: not_done
- [ ] **Write versioning tests** — Create `src/__tests__/version.test.ts`. Test: bump increments version correctly (major/minor/patch), changelog entry is created with correct fields, added/removed/modified counts are computed, save writes correct directory structure, load from versioned directory works, semver range resolution works, round-trip (save then load produces same dataset). | Status: not_done

---

## Phase 13: CLI Implementation

### 13a: CLI Framework

- [ ] **Implement CLI entry point** — Create `src/cli/index.ts`. Parse `process.argv` for command name and options. Route to the appropriate command handler. Add `#!/usr/bin/env node` shebang. | Status: not_done
- [ ] **Implement CLI argument parsing** — Parse positional arguments and `--option value` / `--flag` style options. Support `--help` for each command. No heavy CLI framework dependency — use lightweight custom parsing or a minimal dep. | Status: not_done
- [ ] **Implement CLI exit codes** — Exit 0 for success, 1 for operation failures, 2 for usage/configuration errors. | Status: not_done
- [ ] **Implement CLI error handling** — Catch errors from all commands. Print user-friendly error messages to stderr. Print stack traces only in debug mode. | Status: not_done

### 13b: CLI Commands

- [ ] **Implement `eval-dataset load` command** — Create `src/cli/commands/load.ts`. Load a dataset from a source file. Print summary (name, version, case count, format, categories). Support `--format`, `--output`, `--input-var`, `--column-map` options. | Status: not_done
- [ ] **Implement `eval-dataset convert` command** — Create `src/cli/commands/convert.ts`. Load from source, export to target format. Support `--to` (required), `--output`, `--from`, `--lossy` options. Write to stdout if no `--output`. | Status: not_done
- [ ] **Implement `eval-dataset split` command** — Create `src/cli/commands/split.ts`. Split dataset into partitions. Support `--train`, `--test`, `--validation` (ratio values), `--seed`, `--stratify`, `--output-dir`, `--format` options. Write partition files as `<name>.<partition>.json`. | Status: not_done
- [ ] **Implement `eval-dataset sample` command** — Create `src/cli/commands/sample.ts`. Sample `n` test cases. Support `--mode`, `--seed`, `--output` options. Write to stdout if no `--output`. | Status: not_done
- [ ] **Implement `eval-dataset dedup` command** — Create `src/cli/commands/dedup.ts`. Deduplicate dataset. Support `--mode`, `--threshold`, `--field`, `--keep`, `--output`, `--report` options. Print dedup report to stderr if `--report`. | Status: not_done
- [ ] **Implement `eval-dataset stats` command** — Create `src/cli/commands/stats.ts`. Print dataset statistics. Support `--json` option for machine-readable output. | Status: not_done
- [ ] **Implement `eval-dataset validate` command** — Create `src/cli/commands/validate.ts`. Validate dataset. Support `--schema`, `--require` (repeatable), `--strict` options. Exit 0 if valid, 1 if errors. | Status: not_done
- [ ] **Implement `eval-dataset version` command** — Create `src/cli/commands/version.ts`. Manage dataset versions. Support `--bump`, `--message`, `--author`, `--log`, `--list` options. | Status: not_done

### 13c: CLI Tests

- [ ] **Write CLI smoke tests** — Create `src/__tests__/cli/cli.test.ts`. Invoke each command with sample fixture data. Verify exit codes and output format. Test `load`, `convert`, `split`, `sample`, `dedup`, `stats`, `validate`, `version` commands. | Status: not_done
- [ ] **Write CLI error handling tests** — Test invalid arguments (exit code 2), missing files (exit code 1), invalid format specifications. | Status: not_done
- [ ] **Write CLI --json output tests** — Verify that `stats --json` produces valid parseable JSON. | Status: not_done

---

## Phase 14: Edge Case and Integration Tests

- [ ] **Write empty dataset tests** — Test all operations (split, sample, dedup, validate, stats, export) on a dataset with 0 test cases. | Status: not_done
- [ ] **Write single test case tests** — Test all operations on a dataset with exactly 1 test case. | Status: not_done
- [ ] **Write all-identical test cases tests** — Test dedup on a dataset where every case is identical. Should reduce to 1. | Status: not_done
- [ ] **Write no-expected-output tests** — Test validation produces warnings (not errors) when no cases have `expected`. | Status: not_done
- [ ] **Write no-categories tests** — Test stratified split falls back to random when no cases have categories. Test stratified sample handles missing categories. | Status: not_done
- [ ] **Write CSV edge case tests** — Test missing columns, extra columns, quoted fields, embedded newlines, various delimiters. | Status: not_done
- [ ] **Write YAML edge case tests** — Test YAML with anchors, aliases, multi-line strings. | Status: not_done
- [ ] **Write JSONL edge case tests** — Test blank lines, trailing newline, malformed lines (graceful handling). | Status: not_done
- [ ] **Write long input string tests** — Test with input strings > 10,000 characters. Verify no truncation or errors. | Status: not_done
- [ ] **Write Unicode tests** — Test with CJK characters, emoji, RTL text in inputs and expected outputs. Verify correct handling in all operations and formats. | Status: not_done
- [ ] **Write sample n-equals-size test** — Test sampling where n equals dataset size. Should return all cases (in random order). | Status: not_done
- [ ] **Write determinism tests** — For split, sample, shuffle: verify same seed produces same result across multiple calls. Verify different seeds produce different results. | Status: not_done
- [ ] **Write integration test: full pipeline** — Load a real promptfoo YAML file, convert to RAGAS, validate, split, sample, export back to promptfoo. Verify the pipeline completes without errors and data integrity. | Status: not_done
- [ ] **Write integration test: create-add-bump-save-load** — Create a dataset from scratch, add test cases, bump version, save to disk, load from disk, verify contents match. | Status: not_done

---

## Phase 15: Performance

- [ ] **Verify load performance** — Benchmark `loadDataset` for JSON (1,000 cases < 50ms, 10,000 cases < 200ms) and CSV (10,000 cases < 500ms). | Status: not_done
- [ ] **Verify split performance** — Benchmark `split` for random (10,000 cases < 10ms) and stratified (10,000 cases < 20ms). | Status: not_done
- [ ] **Verify sample performance** — Benchmark `sample` for random (10,000 cases < 5ms). | Status: not_done
- [ ] **Verify dedup performance** — Benchmark exact (10,000 < 50ms), normalized (10,000 < 100ms), near (10,000 < 2s, 50,000 < 30s). | Status: not_done
- [ ] **Verify export performance** — Benchmark export for all formats (10,000 cases < 100ms). | Status: not_done
- [ ] **Verify stats performance** — Benchmark stats (10,000 cases < 50ms). | Status: not_done
- [ ] **Verify validate performance** — Benchmark validate (10,000 cases < 100ms). | Status: not_done

---

## Phase 16: Documentation

- [ ] **Write README.md** — Create a comprehensive README covering: overview, installation, quick start, API reference (loadDataset, createDataset, saveDataset, crossSplitDedup, Dataset methods), CLI usage (all commands with examples), format mapping tables, versioning workflow, integration examples. | Status: not_done
- [ ] **Add JSDoc comments to all public functions** — Document every exported function, method, interface, and type with JSDoc comments including parameter descriptions, return types, and usage examples. | Status: not_done
- [ ] **Document lossy conversion paths** — In the README, include a section documenting which fields are preserved and which are dropped for each format conversion path. | Status: not_done

---

## Phase 17: Final Polish and Publishing Prep

- [ ] **Verify package.json completeness** — Ensure `name`, `version`, `description`, `main`, `types`, `bin`, `files`, `scripts`, `keywords`, `license`, `engines`, `publishConfig` are all set correctly. Add relevant keywords (eval, dataset, llm, testing, promptfoo, ragas, etc.). | Status: not_done
- [ ] **Verify tsconfig.json correctness** — Confirm compiler options produce correct output in `dist/`. Ensure declaration files are generated. | Status: not_done
- [ ] **Run full test suite** — Execute `npm run test` and confirm all tests pass. | Status: not_done
- [ ] **Run linter** — Execute `npm run lint` and fix any issues. | Status: not_done
- [ ] **Run build** — Execute `npm run build` and confirm clean compilation with no errors. | Status: not_done
- [ ] **Verify CLI works end-to-end** — Install locally (`npm link`), run each CLI command with real data, verify correct output. | Status: not_done
- [ ] **Bump version for initial release** — Set version to `1.0.0` in `package.json` once all features are implemented and tested. | Status: not_done
