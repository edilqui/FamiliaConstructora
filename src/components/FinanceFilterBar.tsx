import { cn } from '../lib/utils';
import { FinanceFilter, PERIODS, PeriodId } from '../lib/financeFilters';

interface FinanceFilterBarProps {
  filter: FinanceFilter;
  projects: { id: string; name: string }[];
  onChange: (next: Partial<FinanceFilter>) => void;
}

// Un solo filtro para todas las cifras y gráficas de la pestaña
export default function FinanceFilterBar({ filter, projects, onChange }: FinanceFilterBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {PERIODS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange({ period: id as PeriodId })}
            aria-pressed={filter.period === id}
            className={cn(
              'flex-shrink-0 min-h-11 px-3.5 rounded-xl text-sm font-semibold transition-colors',
              filter.period === id ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filter.period === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-gray-500">
            Desde
            <input
              type="date"
              value={filter.from}
              max={filter.to || undefined}
              onChange={(e) => onChange({ from: e.target.value })}
              className="mt-1 w-full min-h-11 bg-white border border-gray-200 rounded-xl px-2 text-gray-900 font-normal"
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Hasta
            <input
              type="date"
              value={filter.to}
              min={filter.from || undefined}
              onChange={(e) => onChange({ to: e.target.value })}
              className="mt-1 w-full min-h-11 bg-white border border-gray-200 rounded-xl px-2 text-gray-900 font-normal"
            />
          </label>
        </div>
      )}

      {projects.length > 1 && (
        <select
          value={filter.projectId}
          onChange={(e) => onChange({ projectId: e.target.value })}
          aria-label="Filtrar por proyecto"
          className="w-full min-h-11 bg-white border border-gray-200 rounded-xl px-3 text-gray-800"
        >
          <option value="">Todos los proyectos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  );
}
