import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency } from '../lib/utils';
import {
  Loader2, TrendingUp, Briefcase, BarChart3, Tag, Share2, Scale,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import Balance from './Balance';
import CategoryReport from './CategoryReport';
import AnalysisReport from './AnalysisReport';
import NotificationButton from '../components/NotificationButton';
import FinanceFilterBar from '../components/FinanceFilterBar';
import ContributionProgress from '../components/ContributionProgress';
import { CommitmentGrid } from '../components/FinanceCharts';
import TapChart, {
  CHART_BLUE, CHART_GRID, CHART_MARGIN, CHART_ORANGE, ChartReadout, useChartSelection, xAxisProps, yAxisProps,
} from '../components/TapChart';
import {
  DEFAULT_PERIOD, FinanceFilter, PERIODS, PeriodId, buildBuckets, isInRange, periodLabel, periodRange,
} from '../lib/financeFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'balance' | 'statistics' | 'categories' | 'analysis';

const TABS: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'balance', label: 'Balance', icon: Scale },
  { id: 'statistics', label: 'Tendencia', icon: BarChart3 },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'analysis', label: 'Análisis', icon: TrendingUp },
];

export default function Finances() {
  const {
    memberStats, collaboratorStats, projects, transactions, totalInBox, loading,
  } = useDashboardData();
  // En la URL para que volver de otra pantalla regrese a la misma pestaña
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.find((t) => t.id === searchParams.get('tab'))?.id ?? 'balance';
  const updateParams = (change: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    change(next);
    setSearchParams(next, { replace: true });
  };
  const setActiveTab = (tab: TabType) => updateParams((p) => { if (tab === 'balance') p.delete('tab'); else p.set('tab', tab); });

  // También en la URL: el filtro se conserva al cambiar de pestaña y al volver de otra pantalla
  const periodParam = searchParams.get('period');
  const filter: FinanceFilter = {
    period: PERIODS.some((p) => p.id === periodParam) ? periodParam as PeriodId : DEFAULT_PERIOD,
    projectId: searchParams.get('project') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
  };
  const handleFilterChange = (change: Partial<FinanceFilter>) => updateParams((p) => {
    const next = { ...filter, ...change };
    p.set('period', next.period);
    for (const [key, value] of [['project', next.projectId], ['from', next.from], ['to', next.to]]) {
      if (value) p.set(key, value); else p.delete(key);
    }
  });
  const range = useMemo(() => periodRange(filter), [filter.period, filter.from, filter.to]);
  const rangeLabel = periodLabel(filter);
  const selectedProject = projects.find((p) => p.id === filter.projectId);
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  const periodTransactions = useMemo(() =>
    transactions.filter((t) => isInRange(t.date, range)),
    [transactions, range],
  );
  const periodExpenses = useMemo(() =>
    periodTransactions.filter((t) => t.type === 'expense' && (!filter.projectId || t.projectId === filter.projectId)),
    [periodTransactions, filter.projectId],
  );

  // Los aportes van a la caja, no a un proyecto: al filtrar por proyecto solo se comparan gastos
  const trendData = useMemo(() => {
    const buckets = buildBuckets(range, periodTransactions.map((t) => t.date));
    return buckets.map((bucket) => {
      const within = (t: { date: Date }) => t.date >= bucket.start && t.date <= bucket.end;
      return {
        label: bucket.label,
        Aportes: periodTransactions.filter((t) => t.type === 'contribution' && within(t)).reduce((s, t) => s + t.amount, 0),
        Gastos: periodExpenses.filter(within).reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [range, periodTransactions, periodExpenses]);
  const [selectedBucket, setSelectedBucket] = useChartSelection(trendData.length);
  const bucket = trendData[selectedBucket];

  const periodSpent = periodExpenses.reduce((s, t) => s + t.amount, 0);
  const periodContributed = periodTransactions.filter((t) => t.type === 'contribution').reduce((s, t) => s + t.amount, 0);

  const projectDistribution = useMemo(() => {
    const totals = new Map<string, { spent: number; count: number }>();
    periodExpenses.forEach((t) => {
      if (!t.projectId) return;
      const current = totals.get(t.projectId) ?? { spent: 0, count: 0 };
      totals.set(t.projectId, { spent: current.spent + t.amount, count: current.count + 1 });
    });
    return Array.from(totals.entries())
      .map(([id, total]) => ({ id, name: projects.find((p) => p.id === id)?.name ?? 'Sin proyecto', ...total }))
      .sort((a, b) => b.spent - a.spent);
  }, [periodExpenses, projects]);

  // Resumen del mes actual, compartible por WhatsApp o el share nativo
  const handleShareSummary = async () => {
    const now = new Date();
    const start = startOfMonth(now);
    const monthTx = transactions.filter(t => t.date >= start);
    const aportes = monthTx.filter(t => t.type === 'contribution').reduce((s, t) => s + t.amount, 0);
    const gastos = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const text = [
      `📊 FamiliaBuilder — Resumen de ${format(now, 'MMMM yyyy', { locale: es })}`,
      '',
      `🟢 Aportes del mes: ${formatCurrency(aportes)}`,
      `🔴 Gastos del mes: ${formatCurrency(gastos)}`,
      `💰 En caja: ${formatCurrency(totalInBox)}`,
      '',
      'Balance por miembro:',
      ...memberStats.map(s =>
        `• ${s.userName}: ${s.balance >= 0 ? 'a favor' : 'debe'} ${formatCurrency(Math.abs(s.balance))}`
      ),
    ].join('\n');

    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* usuario canceló */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="px-4 lg:px-8 py-3 lg:py-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Finanzas</h1>
            <p className="text-xs lg:text-sm text-gray-500">Tu balance, la caja y los reportes</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShareSummary}
              aria-label="Compartir resumen del mes"
              className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <NotificationButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 min-w-0 min-h-11 py-3 px-1 text-xs sm:text-sm font-semibold transition-colors relative flex items-center justify-center gap-1 sm:gap-2",
                activeTab === id
                  ? "text-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4 hidden sm:block" />
              <span className="truncate">{label}</span>
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-6 max-w-7xl mx-auto">

        {/* Cargando: el header y los tabs siguen visibles */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Tab: Balance */}
        {!loading && activeTab === 'balance' && <Balance />}

        {/* Filtro común de Tendencia y Categorías */}
        {!loading && (activeTab === 'statistics' || activeTab === 'categories') && (
          <FinanceFilterBar filter={filter} projects={projects} onChange={handleFilterChange} />
        )}

        {/* Tab: Tendencia */}
        {!loading && activeTab === 'statistics' && (
          <>
            {/* --- GRÁFICA: APORTES VS GASTOS --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800">{selectedProject ? `Gastos de ${selectedProject.name}` : 'Aportes vs Gastos'}</h3>
              <p className="text-xs text-gray-500 mb-3">
                {rangeLabel}: {selectedProject ? formatCurrency(periodSpent) : `entraron ${formatCurrency(periodContributed)} y salieron ${formatCurrency(periodSpent)}`}
              </p>
              {bucket ? (
                <>
                  <ChartReadout
                    period={bucket.label}
                    items={[
                      ...(selectedProject ? [] : [{ name: 'Aportes', value: formatCurrency(bucket.Aportes), color: CHART_BLUE }]),
                      { name: 'Gastos', value: formatCurrency(bucket.Gastos), color: CHART_ORANGE },
                    ]}
                  />
                  <TapChart labels={trendData.map((d) => d.label)} selected={selectedBucket} onSelect={setSelectedBucket}>
                    <BarChart data={trendData} margin={CHART_MARGIN} barGap={2}>
                      <CartesianGrid vertical={false} stroke={CHART_GRID} />
                      <XAxis dataKey="label" {...xAxisProps} />
                      <YAxis {...yAxisProps} />
                      {!selectedProject && <Bar dataKey="Aportes" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />}
                      <Bar dataKey="Gastos" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} maxBarSize={selectedProject ? 36 : 22} isAnimationActive={false} />
                    </BarChart>
                  </TapChart>
                </>
              ) : (
                <p className="text-center text-gray-500 text-sm py-6">Elige un rango de fechas válido.</p>
              )}
            </div>

            {/* --- CUMPLIMIENTO Y PROGRESO: no dependen del periodo elegido --- */}
            <CommitmentGrid
              people={[...memberStats, ...collaboratorStats]}
              transactions={transactions}
            />
            <ContributionProgress />

            {/* --- GASTOS POR PROYECTO --- */}
            {!selectedProject && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Distribución de Gastos
                </h2>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-5">
                  {projectDistribution.map((stat) => {
                    const percentage = periodSpent > 0 ? (stat.spent / periodSpent) * 100 : 0;
                    return (
                      <div key={stat.id}>
                        <div className="flex justify-between items-end gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800 min-w-0">{stat.name}</span>
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(stat.spent)}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: CHART_BLUE }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">{percentage.toFixed(1)}% · {stat.count} mov.</p>
                      </div>
                    );
                  })}
                  {projectDistribution.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-2">No hay gastos en este periodo</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab: Categorías */}
        {!loading && activeTab === 'categories' && (
          <CategoryReport range={range} projectId={filter.projectId} periodLabel={rangeLabel} />
        )}

        {/* Tab: Análisis (flujo de caja, estimado vs real, precios) */}
        {!loading && activeTab === 'analysis' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/obra/estimador" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-semibold text-gray-900">Estimador de costos</p>
                <p className="text-xs text-gray-500 mt-0.5">Cuánto costará un trabajo</p>
              </Link>
              <Link to="/finanzas/simulador" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-semibold text-gray-900">Simulador de arriendo</p>
                <p className="text-xs text-gray-500 mt-0.5">En cuánto se recupera</p>
              </Link>
            </div>
            <AnalysisReport />
          </>
        )}
      </div>
    </div>
  );
}
