import type { Transaction } from '../types';

function byOldestFirst(a: Transaction, b: Transaction): number {
  return (
    a.date.getTime() - b.date.getTime() ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

export function sortOldestFirst(contributions: Transaction[]): Transaction[] {
  return [...contributions].sort(byOldestFirst);
}

// Acumulado histórico tras cada aporte. Se calcula sobre TODOS los aportes de
// la persona, para que no cambie al filtrar por año o mes.
export function getRunningTotals(contributions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  let total = 0;
  for (const c of sortOldestFirst(contributions)) {
    total += c.amount;
    totals.set(c.id, total);
  }
  return totals;
}
