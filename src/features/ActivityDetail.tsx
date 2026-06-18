import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useConstructionData } from '../hooks/useConstructionData';
import {
  ArrowLeft, HardHat, Tag, ArrowDownCircle, Receipt,
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const formatShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

export default function ActivityDetail() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { transactions, categories } = useDashboardData();
  const { stages, activities } = useConstructionData();

  const activity = activities.find(a => a.id === activityId);
  const stage = activity ? stages.find(s => s.id === activity.stageId) : null;

  const activityTransactions = useMemo(
    () => transactions
      .filter(t => t.activityId === activityId && t.type === 'expense')
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [transactions, activityId],
  );

  const totalSpent = useMemo(
    () => activityTransactions.reduce((s, t) => s + t.amount, 0),
    [activityTransactions],
  );

  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();
    activityTransactions.forEach(t => {
      if (t.categoryId) totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount);
    });
    return Array.from(totals.entries())
      .map(([id, val]) => ({ name: categories.find(c => c.id === id)?.name ?? 'Sin categoría', value: val }))
      .sort((a, b) => b.value - a.value);
  }, [activityTransactions, categories]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof activityTransactions> = {};
    activityTransactions.forEach(t => {
      const d = t.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [activityTransactions]);

  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  if (!activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <HardHat className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Actividad no encontrada</p>
        <button onClick={() => navigate('/obra')} className="mt-4 text-orange-600 font-semibold text-sm">
          Volver a Avance de Obra
        </button>
      </div>
    );
  }

  const overBudget = activity.estimatedBudget > 0 && totalSpent > activity.estimatedBudget;
  const financialPct = activity.estimatedBudget > 0
    ? Math.min((totalSpent / activity.estimatedBudget) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* HEADER */}
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/obra')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <HardHat className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <h1 className="text-base font-bold text-gray-900 truncate">{activity.name}</h1>
            </div>
            <p className="text-xs text-gray-400 truncate">{stage?.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
            <p className="text-[10px] text-gray-400">{activityTransactions.length} gasto{activityTransactions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-5 max-w-3xl mx-auto space-y-5">

        {/* CARD RESUMEN CON BARRAS DE PROGRESO */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progreso financiero</p>
              <p className={cn('text-lg font-bold mt-0.5', overBudget ? 'text-red-600' : 'text-gray-900')}>
                {formatCurrency(totalSpent)}
                {overBudget && <span className="text-xs ml-1">⚠ Excedido</span>}
              </p>
            </div>
            {activity.estimatedBudget > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Presupuesto</p>
                <p className="text-sm font-semibold text-gray-600">{formatCurrency(activity.estimatedBudget)}</p>
              </div>
            )}
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Financiero</span>
                <span>{financialPct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all', overBudget ? 'bg-red-500' : 'bg-orange-500')}
                  style={{ width: `${financialPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Físico</span>
                <span>{activity.progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${activity.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD CATEGORÍAS */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Categorías</h3>
                <p className="text-[10px] text-gray-400">{categoryData.length} con gastos en esta actividad</p>
              </div>
            </div>
            <div className="space-y-3">
              {categoryData.map((entry, index) => {
                const pct = totalSpent > 0 ? (entry.value / totalSpent) * 100 : 0;
                const color = COLORS[index % COLORS.length];
                return (
                  <div key={entry.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-gray-700 font-medium truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-gray-500">{formatShort(entry.value)}</span>
                        <span className="font-bold text-gray-800 w-7 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTA DE TRANSACCIONES */}
        {activityTransactions.length === 0 ? (
          <div className="text-center py-12 opacity-60">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">Aún no hay gastos en esta actividad</p>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
              Movimientos
            </h3>
            <div className="space-y-5">
              {Object.entries(groupedTransactions)
                .sort((a, b) => new Date(b[0] + 'T12:00:00').getTime() - new Date(a[0] + 'T12:00:00').getTime())
                .map(([dateKey, items]) => {
                  const [y, m, d] = dateKey.split('-').map(Number);
                  const headerDate = new Date(y, m - 1, d);
                  return (
                    <div key={dateKey}>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                        {format(headerDate, "EEEE, d 'de' MMMM", { locale: es })}
                      </h4>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {items.map(t => (
                          <div
                            key={t.id}
                            className="p-3.5 flex items-center gap-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                              <ArrowDownCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="truncate max-w-[100px]">{t.project}</span>
                                {t.categoryName && t.categoryName !== 'N/A' && (
                                  <>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full flex-shrink-0" />
                                    <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                      {t.categoryName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">
                                -{formatCurrency(t.amount)}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {t.quantity && t.unitPrice
                                  ? `${t.quantity} × ${formatCurrency(t.unitPrice)}`
                                  : format(t.date, 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
