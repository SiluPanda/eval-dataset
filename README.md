# eval-dataset

Version-controlled eval dataset manager for LLM testing. Zero external runtime dependencies.

## Install

```bash
npm install eval-dataset
```

## Quick Start

```typescript
import { createDataset, loadDataset } from 'eval-dataset';

// Create from cases
const ds = createDataset({
  name: 'my-eval',
  version: '1.0.0',
  cases: [
    { id: '1', input: 'What is 2+2?', expected: '4', category: 'math' },
    { id: '2', input: 'Capital of France?', expected: 'Paris', category: 'geography' },
  ],
});

console.log(ds.size); // 2

// Load from JSON/JSONL/CSV string
const ds2 = await loadDataset('[{"id":"1","input":"hello"}]', { name: 'test' });

// Load from an array
const ds3 = await loadDataset(cases, { name: 'test', version: '0.1.0' });
```

## Split

```typescript
// Random split
const { train, test } = ds.split({ ratios: { train: 0.8, test: 0.2 }, seed: 42 });

// Stratified split (preserves category proportions)
const { train, val, test } = ds.split({
  ratios: { train: 0.7, val: 0.15, test: 0.15 },
  mode: 'stratified',
  stratifyBy: 'category',
  seed: 42,
});
```

## Sample

```typescript
// Random sample of 50 cases
const sampled = ds.sample(50, { seed: 42 });

// Stratified sample (proportional per category)
const sampled2 = ds.sample(50, { mode: 'stratified', stratifyBy: 'category', seed: 42 });

// Sample with replacement
const sampled3 = ds.sample(100, { seed: 42, replace: true });
```

## Dedup

```typescript
// Exact match on input field
const deduped = ds.dedup();

// Case-insensitive / whitespace-normalized
const deduped2 = ds.dedup({ mode: 'normalized' });

// Jaccard similarity (token overlap)
const deduped3 = ds.dedup({ mode: 'jaccard', threshold: 0.85 });

// Dedup on a different field, keep last occurrence
const deduped4 = ds.dedup({ field: 'expected', keep: 'last' });
```

## Export

```typescript
// JSON (pretty-printed by default)
const json = ds.export('json');
const compact = ds.export('json', { pretty: false });

// JSON Lines
const jsonl = ds.export('jsonl');

// CSV
const csv = ds.export('csv');
const csvCustom = ds.export('csv', { columnOrder: ['id', 'input', 'expected'] });
```

## Dataset API

All methods return new `Dataset` instances (immutable).

| Method | Description |
|---|---|
| `filter(fn)` | Filter cases by predicate |
| `map(fn)` | Transform each case |
| `add(partial)` | Append a case (auto-generates id if missing) |
| `remove(id)` | Remove case by id |
| `update(id, changes)` | Merge changes into a case |
| `shuffle(seed?)` | Deterministic shuffle using Mulberry32 PRNG |
| `slice(start, end?)` | Slice cases like Array.slice |
| `concat(other)` | Merge two datasets, deduplicating by id |
| `split(config)` | Split into named subsets |
| `sample(n, opts?)` | Sample n cases |
| `dedup(opts?)` | Remove duplicates |
| `stats()` | Compute dataset statistics |
| `validate()` | Check for missing inputs, duplicate ids |
| `export(format, opts?)` | Export to JSON, JSONL, or CSV |
| `get(id)` | Get case by id |
| `has(id)` | Check if id exists |
| `ids()` | Get all ids |
| `categories()` | Get unique categories |
| `tagSet()` | Get unique tags |
| `toJSON()` | Serialize to plain object |

## Stats

```typescript
const s = ds.stats();
// {
//   totalCases: 100,
//   withExpected: 80,
//   withContext: 30,
//   categories: { math: 40, reading: 60 },
//   tags: { hard: 20, easy: 50 },
//   inputLength: { min: 5, max: 200, mean: 42.3 }
// }
```

## Validate

```typescript
const { valid, errors, warnings } = ds.validate();
// errors: missing input, duplicate ids
// warnings: empty dataset
```

## License

MIT
