import type { AuditChange } from '../types';

const TRACKED_FIELDS = [
  'amount', 'description', 'date', 'notes', 'project', 'categoryName', 'userId',
  'quantity', 'unitPrice', 'stageName', 'activityName',
] as const;

type TrackedValues = { [K in typeof TRACKED_FIELDS[number]]?: unknown };

function normalize(value: unknown): string | number | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number') return value;
  return null;
}

export function diffTransaction(before: TrackedValues, after: TrackedValues): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const field of TRACKED_FIELDS) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (from !== to) changes.push({ field, from, to });
  }
  return changes;
}
