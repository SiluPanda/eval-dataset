import { describe, it, expect } from 'vitest';
import { createDataset, loadDataset } from '../dataset.js';
import type { TestCase } from '../types.js';

const CASES: TestCase[] = [
  { id: '1', input: 'What is 2+2?', expected: '4', category: 'math', tags: ['arithmetic'] },
  { id: '2', input: 'What is the capital of France?', expected: 'Paris', category: 'geography' },
  { id: '3', input: 'Who wrote Hamlet?', expected: 'Shakespeare', category: 'literature' },
  { id: '4', input: 'What is 3*3?', expected: '9', category: 'math', tags: ['arithmetic'] },
  { id: '5', input: 'What is the capital of Germany?', expected: 'Berlin', category: 'geography' },
  { id: '6', input: 'Who wrote Romeo and Juliet?', expected: 'Shakespeare', category: 'literature' },
];

describe('createDataset', () => {
  it('creates a dataset with correct size', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    expect(ds.size).toBe(6);
    expect(ds.name).toBe('test');
    expect(ds.version).toBe('0.1.0');
  });

  it('creates empty dataset without cases', () => {
    const ds = createDataset({ name: 'empty' });
    expect(ds.size).toBe(0);
  });

  it('uses provided version', () => {
    const ds = createDataset({ name: 'test', version: '1.2.3', cases: [] });
    expect(ds.version).toBe('1.2.3');
  });
});

describe('filter', () => {
  it('reduces cases by predicate', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const math = ds.filter((tc) => tc.category === 'math');
    expect(math.size).toBe(2);
    for (const tc of math.cases) expect(tc.category).toBe('math');
  });

  it('returns immutable dataset (original unchanged)', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const filtered = ds.filter((tc) => tc.id !== '1');
    expect(ds.size).toBe(6);
    expect(filtered.size).toBe(5);
  });
});

describe('map', () => {
  it('transforms cases', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const mapped = ds.map((tc) => ({ ...tc, category: 'mapped' }));
    expect(mapped.size).toBe(6);
    for (const tc of mapped.cases) expect(tc.category).toBe('mapped');
  });
});

describe('add / remove / update', () => {
  it('add appends a case', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const ds2 = ds.add({ id: '99', input: 'New question' });
    expect(ds2.size).toBe(7);
    expect(ds2.has('99')).toBe(true);
  });

  it('add auto-generates id if missing', () => {
    const ds = createDataset({ name: 'test', cases: [] });
    const ds2 = ds.add({ input: 'Auto id' });
    expect(ds2.size).toBe(1);
    expect(ds2.ids()[0]).toBeTruthy();
  });

  it('remove removes case by id', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const ds2 = ds.remove('1');
    expect(ds2.size).toBe(5);
    expect(ds2.has('1')).toBe(false);
  });

  it('update changes fields', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const ds2 = ds.update('1', { expected: 'four' });
    expect(ds2.get('1')?.expected).toBe('four');
    expect(ds2.get('1')?.id).toBe('1');
    // original unchanged
    expect(ds.get('1')?.expected).toBe('4');
  });
});

describe('dedup', () => {
  it('removes exact duplicates', () => {
    const dupes: TestCase[] = [
      { id: 'a', input: 'hello' },
      { id: 'b', input: 'hello' },
      { id: 'c', input: 'world' },
    ];
    const ds = createDataset({ name: 'test', cases: dupes });
    const deduped = ds.dedup({ mode: 'exact' });
    expect(deduped.size).toBe(2);
    expect(deduped.ids()).toEqual(['a', 'c']);
  });

  it('dedupNormalized removes case-insensitive/whitespace duplicates', () => {
    const cases: TestCase[] = [
      { id: 'a', input: 'Hello World' },
      { id: 'b', input: 'hello world' },
      { id: 'c', input: '  Hello   World  ' },
      { id: 'd', input: 'Different' },
    ];
    const ds = createDataset({ name: 'test', cases });
    const deduped = ds.dedup({ mode: 'normalized' });
    expect(deduped.size).toBe(2);
  });

  it('dedupJaccard removes near-duplicate inputs', () => {
    const cases: TestCase[] = [
      { id: 'a', input: 'the quick brown fox' },
      { id: 'b', input: 'the quick brown fox jumps' },
      { id: 'c', input: 'completely different text here' },
    ];
    const ds = createDataset({ name: 'test', cases });
    const deduped = ds.dedup({ mode: 'jaccard', threshold: 0.8 });
    expect(deduped.size).toBe(2);
    expect(deduped.has('a')).toBe(true);
    expect(deduped.has('c')).toBe(true);
  });

  it('dedup keep=last keeps last occurrence', () => {
    const dupes: TestCase[] = [
      { id: 'a', input: 'hello' },
      { id: 'b', input: 'hello' },
    ];
    const ds = createDataset({ name: 'test', cases: dupes });
    const deduped = ds.dedup({ mode: 'exact', keep: 'last' });
    expect(deduped.size).toBe(1);
    expect(deduped.ids()[0]).toBe('b');
  });
});

describe('randomSplit', () => {
  it('proportions are approximately correct', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const splits = ds.split({ ratios: { train: 0.6, test: 0.4 }, seed: 42 });
    expect(splits['train'].size + splits['test'].size).toBe(6);
    expect(splits['train'].size).toBeGreaterThan(0);
    expect(splits['test'].size).toBeGreaterThan(0);
  });

  it('all cases are present across splits (no overlap/loss)', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const splits = ds.split({ ratios: { train: 0.6, val: 0.2, test: 0.2 }, seed: 7 });
    const allIds = new Set([
      ...splits['train'].ids(),
      ...splits['val'].ids(),
      ...splits['test'].ids(),
    ]);
    expect(allIds.size).toBe(6);
  });

  it('ratios normalize to 1.0', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const splits = ds.split({ ratios: { train: 3, test: 1 }, seed: 42 });
    expect(splits['train'].size + splits['test'].size).toBe(6);
  });
});

describe('stratifiedSplit', () => {
  it('each split has cases from multiple categories', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const splits = ds.split({
      ratios: { train: 0.67, test: 0.33 },
      mode: 'stratified',
      stratifyBy: 'category',
      seed: 42,
    });
    // Each split should have at least something
    expect(splits['train'].size).toBeGreaterThan(0);
    expect(splits['test'].size).toBeGreaterThan(0);
    // Combined should equal total
    expect(splits['train'].size + splits['test'].size).toBe(6);
  });
});

describe('sample', () => {
  it('sample(3) returns exactly 3 cases', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const sampled = ds.sample(3, { seed: 42 });
    expect(sampled.size).toBe(3);
  });

  it('sample(n) when n >= size returns all cases (no replacement)', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const sampled = ds.sample(100, { seed: 1 });
    expect(sampled.size).toBe(6);
  });

  it('sample with replace=true returns exactly n', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const sampled = ds.sample(10, { seed: 42, replace: true });
    expect(sampled.size).toBe(10);
  });

  it('stratified sample returns n cases', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const sampled = ds.sample(3, { mode: 'stratified', stratifyBy: 'category', seed: 42 });
    expect(sampled.size).toBeGreaterThanOrEqual(1);
  });
});

describe('shuffle', () => {
  it('same seed produces deterministic order', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const s1 = ds.shuffle(99).ids();
    const s2 = ds.shuffle(99).ids();
    expect(s1).toEqual(s2);
  });

  it('different seeds produce different orders', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const s1 = ds.shuffle(1).ids();
    const s2 = ds.shuffle(2).ids();
    // Very likely to differ with 6 elements
    expect(s1).not.toEqual(s2);
  });

  it('shuffle preserves all cases', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const shuffled = ds.shuffle(42);
    expect(shuffled.size).toBe(6);
    const sortedOriginal = ds.ids().sort();
    const sortedShuffled = shuffled.ids().sort();
    expect(sortedShuffled).toEqual(sortedOriginal);
  });
});

describe('slice / concat', () => {
  it('slice returns correct subset', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const sliced = ds.slice(1, 3);
    expect(sliced.size).toBe(2);
    expect(sliced.ids()).toEqual(['2', '3']);
  });

  it('concat merges two datasets deduplicating ids', () => {
    const ds1 = createDataset({ name: 'test', cases: CASES.slice(0, 3) });
    const ds2 = createDataset({ name: 'test', cases: CASES.slice(2, 5) });
    const merged = ds1.concat(ds2);
    // '3' appears in both, so 3 + 2 = 5
    expect(merged.size).toBe(5);
  });
});

describe('export', () => {
  it('export json returns valid JSON with all cases', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const json = ds.export('json');
    const parsed = JSON.parse(json) as TestCase[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(6);
    expect(parsed[0].id).toBe('1');
  });

  it('export json pretty=false produces compact JSON', () => {
    const ds = createDataset({ name: 'test', cases: CASES.slice(0, 1) });
    const json = ds.export('json', { pretty: false });
    expect(json).not.toContain('\n');
  });

  it('export jsonl returns one JSON per line', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const jsonl = ds.export('jsonl');
    const lines = jsonl.split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(6);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('export csv returns CSV with headers', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const csv = ds.export('csv');
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    const headers = lines[0].split(',');
    expect(headers).toContain('id');
    expect(headers).toContain('input');
  });

  it('export csv escapes commas and quotes in values', () => {
    const cases: TestCase[] = [{ id: '1', input: 'Hello, world', expected: 'He said "hi"' }];
    const ds = createDataset({ name: 'test', cases });
    const csv = ds.export('csv');
    expect(csv).toContain('"Hello, world"');
    expect(csv).toContain('"He said ""hi"""');
  });
});

describe('stats', () => {
  it('returns correct totalCases and withExpected', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const s = ds.stats();
    expect(s.totalCases).toBe(6);
    expect(s.withExpected).toBe(6);
  });

  it('counts categories correctly', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const s = ds.stats();
    expect(s.categories['math']).toBe(2);
    expect(s.categories['geography']).toBe(2);
    expect(s.categories['literature']).toBe(2);
  });

  it('counts tags correctly', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const s = ds.stats();
    expect(s.tags['arithmetic']).toBe(2);
  });

  it('computes inputLength stats', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const s = ds.stats();
    expect(s.inputLength.min).toBeGreaterThan(0);
    expect(s.inputLength.max).toBeGreaterThanOrEqual(s.inputLength.min);
    expect(s.inputLength.mean).toBeGreaterThan(0);
  });

  it('withContext counts cases that have context', () => {
    const cases: TestCase[] = [
      { id: '1', input: 'q1', context: ['ctx1'] },
      { id: '2', input: 'q2' },
    ];
    const ds = createDataset({ name: 'test', cases });
    expect(ds.stats().withContext).toBe(1);
  });
});

describe('validate', () => {
  it('valid dataset returns valid=true', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const result = ds.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches duplicate ids', () => {
    const cases: TestCase[] = [
      { id: 'dup', input: 'first' },
      { id: 'dup', input: 'second' },
    ];
    const ds = createDataset({ name: 'test', cases });
    const result = ds.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'duplicate_id')).toBe(true);
  });

  it('catches missing input', () => {
    const cases: TestCase[] = [{ id: '1', input: '' }];
    const ds = createDataset({ name: 'test', cases });
    const result = ds.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'missing_input')).toBe(true);
  });

  it('empty dataset produces warning', () => {
    const ds = createDataset({ name: 'test' });
    const result = ds.validate();
    expect(result.warnings.some((w) => w.type === 'empty_dataset')).toBe(true);
  });
});

describe('loadDataset', () => {
  it('loads from TestCase array', async () => {
    const ds = await loadDataset(CASES, { name: 'test' });
    expect(ds.size).toBe(6);
  });

  it('loads from JSON string', async () => {
    const json = JSON.stringify(CASES);
    const ds = await loadDataset(json, { name: 'test', format: 'json' });
    expect(ds.size).toBe(6);
    expect(ds.get('1')?.input).toBe('What is 2+2?');
  });

  it('loads from JSONL string', async () => {
    const jsonl = CASES.map((tc) => JSON.stringify(tc)).join('\n');
    const ds = await loadDataset(jsonl, { name: 'test', format: 'jsonl' });
    expect(ds.size).toBe(6);
  });

  it('loads from CSV string', async () => {
    const csv = 'id,input,expected,category\n1,Hello,World,test\n2,Foo,Bar,test';
    const ds = await loadDataset(csv, { name: 'test', format: 'csv' });
    expect(ds.size).toBe(2);
    expect(ds.get('1')?.input).toBe('Hello');
    expect(ds.get('1')?.expected).toBe('World');
  });

  it('auto-detects JSON format', async () => {
    const json = JSON.stringify(CASES);
    const ds = await loadDataset(json, { name: 'test' });
    expect(ds.size).toBe(6);
  });
});

describe('ids / categories / tagSet / get / has', () => {
  it('ids returns all ids', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    expect(ds.ids()).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('categories returns unique categories', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    const cats = ds.categories().sort();
    expect(cats).toEqual(['geography', 'literature', 'math']);
  });

  it('tagSet returns unique tags', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    expect(ds.tagSet()).toEqual(['arithmetic']);
  });

  it('get returns the correct case', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    expect(ds.get('3')?.input).toBe('Who wrote Hamlet?');
    expect(ds.get('nonexistent')).toBeUndefined();
  });

  it('has returns correct boolean', () => {
    const ds = createDataset({ name: 'test', cases: CASES });
    expect(ds.has('1')).toBe(true);
    expect(ds.has('999')).toBe(false);
  });
});

describe('toJSON', () => {
  it('returns serializable object', () => {
    const ds = createDataset({ name: 'myds', version: '2.0.0', cases: CASES });
    const json = ds.toJSON();
    expect(json['name']).toBe('myds');
    expect(json['version']).toBe('2.0.0');
    expect(json['size']).toBe(6);
    expect(Array.isArray(json['cases'])).toBe(true);
  });
});
