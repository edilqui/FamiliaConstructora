import { format } from 'date-fns';
import type { CommitmentPeriod } from '../types';

export const monthKey = (date: Date): string => format(date, 'yyyy-MM');

// Cambiar el valor rige desde `month`: los meses anteriores conservan lo que se había acordado
export function applyCommitmentChange(periods: CommitmentPeriod[], month: string, amount: number): CommitmentPeriod[] {
  const kept = periods.filter((p) => p.from < month);
  if (kept.length === 0 && amount === 0) return [];
  if (kept.length > 0 && kept[kept.length - 1].amount === amount) return kept;
  return [...kept, { from: month, amount }];
}

export function amountForMonth(periods: CommitmentPeriod[], month: string): number {
  let amount = 0;
  for (const p of periods) {
    if (p.from <= month) amount = p.amount;
  }
  return amount;
}

function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

export interface CommitmentSummary {
  monthlyAmount: number;
  paidThisMonth: number;
  expected: number; // Lo acordado desde el inicio hasta este mes, incluido
  paid: number; // Lo aportado en ese mismo periodo
  balance: number; // Positivo: va adelantado. Negativo: debe.
}

export function summarizeCommitment(
  periods: CommitmentPeriod[],
  contributions: { amount: number; date: Date }[],
  now: Date = new Date()
): CommitmentSummary | null {
  if (periods.length === 0) return null;
  const currentMonth = monthKey(now);
  const start = periods[0].from;

  let expected = 0;
  for (let month = start; month <= currentMonth; month = nextMonth(month)) {
    expected += amountForMonth(periods, month);
  }

  let paid = 0;
  let paidThisMonth = 0;
  for (const c of contributions) {
    const month = monthKey(c.date);
    if (month < start || month > currentMonth) continue;
    paid += c.amount;
    if (month === currentMonth) paidThisMonth += c.amount;
  }

  return { monthlyAmount: amountForMonth(periods, currentMonth), paidThisMonth, expected, paid, balance: paid - expected };
}
