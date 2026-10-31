import {
  addDays, differenceInCalendarDays, differenceInCalendarMonths, endOfDay, endOfMonth, endOfQuarter,
  format, min as minDate, max as maxDate, startOfDay, startOfMonth, startOfQuarter, startOfWeek,
  addMonths, addQuarters, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type PeriodId = 'month' | '3m' | '6m' | '12m' | 'all' | 'custom';

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'month', label: 'Este mes' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
  { id: 'all', label: 'Todo' },
  { id: 'custom', label: 'Fechas' },
];

export const DEFAULT_PERIOD: PeriodId = '6m';

export interface FinanceFilter {
  period: PeriodId;
  projectId: string; // Vacío: todos
  from: string; // 'yyyy-MM-dd', solo para 'custom'
  to: string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

// new Date('yyyy-MM-dd') se interpreta en UTC: en Colombia caería en el día anterior
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function periodRange(filter: FinanceFilter, now: Date = new Date()): DateRange {
  switch (filter.period) {
    case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case '3m': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case '6m': return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case '12m': return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
    case 'custom': {
      const from = parseLocalDate(filter.from);
      const to = parseLocalDate(filter.to);
      return { start: from && startOfDay(from), end: to && endOfDay(to) };
    }
    default: return { start: null, end: null };
  }
}

export const isInRange = (date: Date, range: DateRange): boolean =>
  (!range.start || date >= range.start) && (!range.end || date <= range.end);

export interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

// Agrupa según lo largo del periodo para que las columnas sigan siendo tocables en el celular
export function buildBuckets(range: DateRange, dates: Date[], now: Date = new Date()): Bucket[] {
  const start = range.start ?? (dates.length ? startOfMonth(minDate(dates)) : startOfMonth(now));
  const end = range.end ?? (dates.length ? endOfDay(maxDate([...dates, now])) : endOfDay(now));
  if (start > end) return [];

  const buckets: Bucket[] = [];
  if (differenceInCalendarDays(end, start) <= 62) {
    let cursor = startOfWeek(start, { weekStartsOn: 1 });
    while (cursor <= end) {
      const weekEnd = endOfDay(addDays(cursor, 6));
      const from = cursor < start ? start : cursor;
      buckets.push({ label: format(from, 'd MMM', { locale: es }), start: from, end: weekEnd > end ? end : weekEnd });
      cursor = addDays(cursor, 7);
    }
    return buckets;
  }

  const months = differenceInCalendarMonths(end, start);
  if (months < 18) {
    const withYear = start.getFullYear() !== end.getFullYear() && months >= 12;
    let cursor = startOfMonth(start);
    while (cursor <= end) {
      const monthEnd = endOfMonth(cursor);
      buckets.push({
        label: format(cursor, withYear ? 'MMM yy' : 'MMM', { locale: es }),
        start: cursor < start ? start : cursor,
        end: monthEnd > end ? end : monthEnd,
      });
      cursor = addMonths(cursor, 1);
    }
    return buckets;
  }

  let cursor = startOfQuarter(start);
  while (cursor <= end) {
    const quarterEnd = endOfQuarter(cursor);
    buckets.push({
      label: `T${Math.floor(cursor.getMonth() / 3) + 1} ${format(cursor, 'yy')}`,
      start: cursor < start ? start : cursor,
      end: quarterEnd > end ? end : quarterEnd,
    });
    cursor = addQuarters(cursor, 1);
  }
  return buckets;
}

export function periodLabel(filter: FinanceFilter): string {
  if (filter.period !== 'custom') return PERIODS.find((p) => p.id === filter.period)?.label ?? '';
  const from = parseLocalDate(filter.from);
  const to = parseLocalDate(filter.to);
  const show = (d: Date) => format(d, 'd MMM yyyy', { locale: es });
  if (from && to) return `${show(from)} a ${show(to)}`;
  if (from) return `Desde ${show(from)}`;
  if (to) return `Hasta ${show(to)}`;
  return 'Todas las fechas';
}
