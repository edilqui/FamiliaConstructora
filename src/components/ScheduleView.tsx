import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { buildSchedule, todayKey, type ScheduleState } from '../lib/schedule';
import { cn } from '../lib/utils';
import type { Activity } from '../types';

const STATE_CONFIG: Record<ScheduleState, { label: string; bar: string; text: string }> = {
  completed: { label: 'Completada', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  late: { label: 'Atrasada', bar: 'bg-red-500', text: 'text-red-600' },
  late_start: { label: 'Debió empezar', bar: 'bg-amber-500', text: 'text-amber-700' },
  on_track: { label: 'A tiempo', bar: 'bg-blue-500', text: 'text-blue-700' },
};

const shortDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'd MMM', { locale: es });
};

export default function ScheduleView({ activities }: { activities: Activity[] }) {
  const navigate = useNavigate();
  const schedule = useMemo(() => buildSchedule(activities, todayKey()), [activities]);

  if (schedule.rows.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <CalendarDays className="w-12 h-12 mx-auto text-gray-300" />
        <p className="text-gray-500 font-medium">Aún no hay fechas planeadas</p>
        <p className="text-sm text-gray-400">Edita una actividad en Gestión y ponle inicio y fin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
        <div className="px-4 py-2.5 flex justify-between text-xs font-medium text-gray-500">
          <span>{shortDate(schedule.start!)}</span>
          <span>{shortDate(schedule.end!)}</span>
        </div>
        {schedule.rows.map(({ activity, state, offsetPercent, widthPercent }) => (
          <button
            key={activity.id}
            onClick={() => navigate(`/activity/${activity.id}`)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">{activity.name}</span>
              <span className={cn('text-xs font-semibold flex-shrink-0', STATE_CONFIG[state].text)}>{STATE_CONFIG[state].label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {shortDate(activity.plannedStart!)} – {shortDate(activity.plannedEnd!)} · {activity.progressPercent}% de avance
            </p>
            <div className="relative h-2 mt-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('absolute top-0 h-2 rounded-full', STATE_CONFIG[state].bar)}
                style={{ left: `${offsetPercent}%`, width: `${widthPercent}%` }}
              />
              {schedule.todayPercent !== null && (
                <div className="absolute top-0 h-2 w-0.5 bg-gray-900" style={{ left: `${schedule.todayPercent}%` }} />
              )}
            </div>
          </button>
        ))}
      </div>
      {schedule.todayPercent !== null && (
        <p className="text-xs text-gray-400 ml-1">La línea oscura marca el día de hoy.</p>
      )}
      {schedule.undated.length > 0 && (
        <p className="text-xs text-gray-500 ml-1">
          {schedule.undated.length === 1 ? '1 actividad sin fechas' : `${schedule.undated.length} actividades sin fechas`}: {schedule.undated.map((a) => a.name).join(', ')}
        </p>
      )}
    </div>
  );
}
