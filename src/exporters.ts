import type { TestCase, ExportOptions } from './types.js';

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function exportToJSON(cases: TestCase[], options?: ExportOptions): string {
  const pretty = options?.pretty !== false;
  if (options?.includeMetadata === false) {
    const stripped = cases.map(({ metadata: _m, ...rest }) => rest);
    return JSON.stringify(stripped, null, pretty ? 2 : undefined);
  }
  return JSON.stringify(cases, null, pretty ? 2 : undefined);
}

export function exportToJSONL(cases: TestCase[]): string {
  return cases.map((tc) => JSON.stringify(tc)).join('\n');
}

export function exportToCSV(cases: TestCase[], options?: ExportOptions): string {
  if (cases.length === 0) return '';

  const defaultColumns = ['id', 'input', 'expected', 'category', 'difficulty', 'tags', 'context'];
  const allKeys = new Set<string>(defaultColumns);
  for (const tc of cases) {
    for (const k of Object.keys(tc)) allKeys.add(k);
  }
  // Remove metadata if not requested
  if (!options?.includeMetadata) allKeys.delete('metadata');

  let columns: string[];
  if (options?.columnOrder) {
    columns = options.columnOrder.filter((c) => allKeys.has(c));
    for (const k of allKeys) {
      if (!columns.includes(k)) columns.push(k);
    }
  } else {
    columns = [...allKeys];
    // Sort to have a stable order: default columns first, then rest
    columns.sort((a, b) => {
      const ai = defaultColumns.indexOf(a);
      const bi = defaultColumns.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });
  }

  const header = columns.map(escapeCSVField).join(',');
  const rows = cases.map((tc) => {
    return columns
      .map((col) => {
        const val = (tc as unknown as Record<string, unknown>)[col];
        if (val === undefined || val === null) return '';
        if (Array.isArray(val)) return escapeCSVField(val.join('|'));
        return escapeCSVField(String(val));
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}
