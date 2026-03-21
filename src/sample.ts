import type { TestCase } from './types.js';
import { seededShuffle, mulberry32 } from './prng.js';

export function randomSample(
  cases: TestCase[],
  n: number,
  seed: number = 42,
  replace: boolean = false,
): TestCase[] {
  if (!replace) {
    const shuffled = seededShuffle(cases, seed);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }
  // Sampling with replacement
  const rng = mulberry32(seed);
  const result: TestCase[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * cases.length);
    result.push(cases[idx]);
  }
  return result;
}

export function stratifiedSample(
  cases: TestCase[],
  n: number,
  stratifyBy: string = 'category',
  seed: number = 42,
): TestCase[] {
  // Group by field
  const groups: Record<string, TestCase[]> = {};
  for (const tc of cases) {
    const key = String((tc as unknown as Record<string, unknown>)[stratifyBy] ?? '__unknown__');
    if (!groups[key]) groups[key] = [];
    groups[key].push(tc);
  }

  const groupKeys = Object.keys(groups);
  const total = cases.length;
  const result: TestCase[] = [];
  let allocated = 0;

  for (let i = 0; i < groupKeys.length; i++) {
    const key = groupKeys[i];
    const group = groups[key];
    const proportion = group.length / total;
    const count =
      i === groupKeys.length - 1
        ? n - allocated
        : Math.round(proportion * n);
    const sampled = randomSample(group, count, seed + i);
    result.push(...sampled);
    allocated += sampled.length;
  }

  return result;
}
