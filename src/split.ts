import type { TestCase } from './types.js';
import { seededShuffle } from './prng.js';

function normalizeRatios(ratios: Record<string, number>): Record<string, number> {
  const total = Object.values(ratios).reduce((s, v) => s + v, 0);
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(ratios)) {
    result[k] = v / total;
  }
  return result;
}

export function randomSplit(
  cases: TestCase[],
  ratios: Record<string, number>,
  seed: number = 42,
): Record<string, TestCase[]> {
  const shuffled = seededShuffle(cases, seed);
  const normalized = normalizeRatios(ratios);
  const result: Record<string, TestCase[]> = {};
  const keys = Object.keys(normalized);
  let offset = 0;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const count =
      i === keys.length - 1
        ? shuffled.length - offset
        : Math.round(normalized[key] * shuffled.length);
    result[key] = shuffled.slice(offset, offset + count);
    offset += count;
  }
  return result;
}

export function stratifiedSplit(
  cases: TestCase[],
  ratios: Record<string, number>,
  stratifyBy: keyof TestCase = 'category',
  seed: number = 42,
): Record<string, TestCase[]> {
  // Group by stratifyBy field
  const groups: Record<string, TestCase[]> = {};
  for (const tc of cases) {
    const key = String(tc[stratifyBy] ?? '__unknown__');
    if (!groups[key]) groups[key] = [];
    groups[key].push(tc);
  }

  // Apply randomSplit per group and merge
  const splitKeys = Object.keys(ratios);
  const merged: Record<string, TestCase[]> = {};
  for (const k of splitKeys) merged[k] = [];

  for (const group of Object.values(groups)) {
    const groupSplit = randomSplit(group, ratios, seed);
    for (const k of splitKeys) {
      if (groupSplit[k]) {
        merged[k].push(...groupSplit[k]);
      }
    }
  }

  return merged;
}
