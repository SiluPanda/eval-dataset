import type { TestCase } from './types.js';

function getField(tc: TestCase, field: string): string {
  return String((tc as unknown as Record<string, unknown>)[field] ?? '');
}

export function dedupExact(
  cases: TestCase[],
  field: string = 'input',
  keep: 'first' | 'last' = 'first',
): TestCase[] {
  const seen = new Set<string>();
  if (keep === 'first') {
    return cases.filter((tc) => {
      const val = getField(tc, field);
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  } else {
    const reversed = [...cases].reverse().filter((tc) => {
      const val = getField(tc, field);
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
    return reversed.reverse();
  }
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function dedupNormalized(
  cases: TestCase[],
  field: string = 'input',
  keep: 'first' | 'last' = 'first',
): TestCase[] {
  const seen = new Set<string>();
  if (keep === 'first') {
    return cases.filter((tc) => {
      const val = normalize(getField(tc, field));
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  } else {
    const reversed = [...cases].reverse().filter((tc) => {
      const val = normalize(getField(tc, field));
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
    return reversed.reverse();
  }
}

export function jaccardSim(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export function dedupJaccard(
  cases: TestCase[],
  field: string = 'input',
  threshold: number = 0.9,
): TestCase[] {
  const result: TestCase[] = [];
  const values: string[] = [];
  for (const tc of cases) {
    const val = getField(tc, field);
    let isDup = false;
    for (const existing of values) {
      if (jaccardSim(val, existing) >= threshold) {
        isDup = true;
        break;
      }
    }
    if (!isDup) {
      result.push(tc);
      values.push(val);
    }
  }
  return result;
}
