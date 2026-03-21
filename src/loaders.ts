import type { TestCase } from './types.js';
import { randomUUID } from 'crypto';

function makeId(): string {
  return randomUUID().slice(0, 8);
}

function mapRawToTestCase(raw: Record<string, unknown>): TestCase {
  const input = String(raw['input'] ?? raw['question'] ?? '');
  const id = raw['id'] ? String(raw['id']) : makeId();
  const tc: TestCase = { id, input };
  if (raw['expected'] !== undefined) tc.expected = String(raw['expected']);
  if (raw['category'] !== undefined) tc.category = String(raw['category']);
  if (raw['difficulty'] !== undefined) tc.difficulty = Number(raw['difficulty']);
  if (Array.isArray(raw['context'])) tc.context = raw['context'].map(String);
  if (Array.isArray(raw['tags'])) tc.tags = raw['tags'].map(String);
  if (raw['metadata'] !== null && typeof raw['metadata'] === 'object' && !Array.isArray(raw['metadata'])) {
    tc.metadata = raw['metadata'] as Record<string, unknown>;
  }
  return tc;
}

export function loadFromJSON(content: string): TestCase[] {
  const parsed = JSON.parse(content) as unknown;
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.map((item) => mapRawToTestCase(item as Record<string, unknown>));
}

export function loadFromJSONL(content: string): TestCase[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => mapRawToTestCase(JSON.parse(line) as Record<string, unknown>));
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function loadFromCSV(
  content: string,
  options?: { columnMap?: Record<string, string> },
): TestCase[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const columnMap = options?.columnMap ?? {};

  const mapHeader = (h: string): string => columnMap[h] ?? h;

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const raw: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const key = mapHeader(h);
      raw[key] = values[i] ?? '';
    });

    // Handle tags as comma-separated within the field
    if (typeof raw['tags'] === 'string' && raw['tags']) {
      raw['tags'] = (raw['tags'] as string).split('|').map((t: string) => t.trim());
    }

    return mapRawToTestCase(raw);
  });
}
