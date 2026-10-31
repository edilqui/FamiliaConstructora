import { format } from 'date-fns';
import type { Activity } from '../types';

export type ScheduleState = 'completed' | 'late' | 'late_start' | 'on_track';

// Fechas como 'yyyy-MM-dd': se comparan como texto y no dependen de la zona horaria
export const todayKey = (now: Date = new Date()): string => format(now, 'yyyy-MM-dd');

export function scheduleState(activity: Activity, today: string): ScheduleState {
  if (activity.status === 'completed') return 'completed';
  if (activity.plannedEnd && activity.plannedEnd < today) return 'late';
  if (activity.plannedStart && activity.plannedStart < today && activity.status === 'pending') return 'late_start';
  return 'on_track';
}

const dayNumber = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

export interface ScheduleRow {
  activity: Activity;
  state: ScheduleState;
  offsetPercent: number;
  widthPercent: number;
}

export interface Schedule {
  rows: ScheduleRow[]; // Por fecha de inicio
  undated: Activity[];
  start: string | null;
  end: string | null;
  todayPercent: number | null; // Dónde cae hoy dentro del cronograma
}

export function buildSchedule(activities: Activity[], today: string): Schedule {
  const dated = activities.filter((a) => a.plannedStart && a.plannedEnd);
  const undated = activities.filter((a) => !a.plannedStart || !a.plannedEnd);
  if (dated.length === 0) return { rows: [], undated, start: null, end: null, todayPercent: null };

  const start = dated.reduce((min, a) => (a.plannedStart! < min ? a.plannedStart! : min), dated[0].plannedStart!);
  const end = dated.reduce((max, a) => (a.plannedEnd! > max ? a.plannedEnd! : max), dated[0].plannedEnd!);
  const first = dayNumber(start);
  const totalDays = dayNumber(end) - first + 1;

  const rows = [...dated]
    .sort((a, b) => a.plannedStart!.localeCompare(b.plannedStart!) || a.plannedEnd!.localeCompare(b.plannedEnd!))
    .map((activity) => ({
      activity,
      state: scheduleState(activity, today),
      offsetPercent: ((dayNumber(activity.plannedStart!) - first) / totalDays) * 100,
      widthPercent: ((dayNumber(activity.plannedEnd!) - dayNumber(activity.plannedStart!) + 1) / totalDays) * 100,
    }));

  const todayPercent = today >= start && today <= end ? ((dayNumber(today) - first) / totalDays) * 100 : null;
  return { rows, undated, start, end, todayPercent };
}
