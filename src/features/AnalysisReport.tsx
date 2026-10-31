import { useState, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useConstructionData } from '../hooks/useConstructionData';
import { formatCurrency, formatShort, cn } from '../lib/utils';
import {
  Wallet, TrendingDown, TrendingUp, Scale, Building2, Search,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, PiggyBank,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import TapChart, {
  CHART_BLUE, CHART_GRID, CHART_MARGIN, CHART_ORANGE, ChartReadout, xAxisProps, yAxisProps,
} from '../components/TapChart';
import { PayablesVsCash } from '../components/FinanceCharts';
import { format, addMonths, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { buildMaterialHistory, materialKey } from '../lib/materials';

// Línea pequeña del precio por compra, de la más antigua a la última
function PriceSparkline({ prices }: { prices: number[] }) {
  const low = Math.min(...prices);
  const span = Math.max(...prices) - low || 1;
  const points = prices
    .map((price, i) => `${(i / (prices.length - 1)) * 100},${26 - ((price - low) / span) * 22}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label="Evolución del precio por compra" className="w-full h-10 mb-2">
      <polyline points={points} fill="none" stroke={CHART_BLUE} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AnalysisReport() {
  const { transactions, totalInBox, memberCount } = useDashboardData();
  const { stages, activities } = useConstructionData();

  const [materialSearch, setMaterialSearch] = useState('');
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(1);

  // ══════════ 1. FLUJO DE CAJA PROYECTADO ══════════
  // Promedios de los últimos 90 días: robusto ante meses sueltos atípicos
  const cashFlow = useMemo(() => {
    const since = subDays(new Date(), 90);
    const recent = transactions.filter(t => t.date >= since);
    const spent90 = recent.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const contributed90 = recent.filter(t => t.type === 'contribution').reduce((s, t) => s + t.amount, 0);
    const monthlySpend = spent90 / 3;
    const monthlyContribution = contributed90 / 3;
    const monthlyNet = monthlyContribution - monthlySpend;

    // Meses de caja: sin más aportes, y al ritmo actual de aportes
    const runwayNoContrib = monthlySpend > 0 ? Math.max(0, totalInBox) / monthlySpend : Infinity;
    const runwayCurrent = monthlyNet < 0 ? Math.max(0, totalInBox) / -monthlyNet : Infinity;

    // Proyección a 6 meses para la gráfica
    const projection = Array.from({ length: 7 }, (_, i) => {
      const month = addMonths(new Date(), i);
      return {
        month: i === 0 ? 'Hoy' : format(month, 'MMM', { locale: es }),
        'Al ritmo actual': Math.round(totalInBox + monthlyNet * i),
        'Sin más aportes': Math.round(totalInBox - monthlySpend * i),
      };
    });

    return { monthlySpend, monthlyContribution, monthlyNet, runwayNoContrib, runwayCurrent, projection };
  }, [transactions, totalInBox]);

  // Presupuesto de obra restante (etapas no completadas, con presupuesto)
  const spentByStage = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'expense' && t.stageId) {
        map.set(t.stageId, (map.get(t.stageId) ?? 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  const spentByActivity = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'expense' && t.activityId) {
        map.set(t.activityId, (map.get(t.activityId) ?? 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  const remainingBudget = useMemo(() =>
    stages
      .filter(s => s.status !== 'completed' && s.estimatedBudget > 0)
      .reduce((sum, s) => sum + Math.max(0, s.estimatedBudget - (spentByStage.get(s.id) ?? 0)), 0),
    [stages, spentByStage],
  );

  const monthsToFinish = cashFlow.monthlySpend > 0 ? remainingBudget / cashFlow.monthlySpend : 0;

  // ══════════ 2. ESTIMADO VS REAL POR ETAPA ══════════
  const stageComparison = useMemo(() =>
    stages
      .filter(s => s.estimatedBudget > 0)
      .map(stage => {
        const spent = spentByStage.get(stage.id) ?? 0;
        const deviation = spent - stage.estimatedBudget;
        const pct = (spent / stage.estimatedBudget) * 100;
        const stageActivities = activities
          .filter(a => a.stageId === stage.id && a.estimatedBudget > 0)
          .map(a => {
            const actSpent = spentByActivity.get(a.id) ?? 0;
            return { ...a, spent: actSpent, deviation: actSpent - a.estimatedBudget, pct: (actSpent / a.estimatedBudget) * 100 };
          });
        return { ...stage, spent, deviation, pct, stageActivities };
      })
      .sort((a, b) => b.pct - a.pct),
    [stages, activities, spentByStage, spentByActivity],
  );

  const comparisonTotals = useMemo(() => {
    const estimated = stageComparison.reduce((s, st) => s + st.estimatedBudget, 0);
    const spent = stageComparison.reduce((s, st) => s + st.spent, 0);
    return { estimated, spent, deviation: spent - estimated };
  }, [stageComparison]);

  // ══════════ 3. HISTORIAL DE PRECIOS POR MATERIAL ══════════
  const materials = useMemo(() => buildMaterialHistory(transactions), [transactions]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return materials;
    const q = materialKey(materialSearch);
    return materials.filter(m => m.key.includes(q));
  }, [materials, materialSearch]);

  const deviationColor = (pct: number) =>
    pct > 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="space-y-6">

      {/* ══════════ FLUJO DE CAJA PROYECTADO ══════════ */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <PiggyBank className="w-4 h-4" />
          Flujo de Caja Proyectado
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Gasto / mes</span>
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(cashFlow.monthlySpend)}</p>
            <p className="text-xs text-gray-500">promedio últimos 3 meses</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Aportes / mes</span>
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(cashFlow.monthlyContribution)}</p>
            <p className="text-xs text-gray-500">promedio últimos 3 meses</p>
          </div>
        </div>

        {/* Veredicto de la caja */}
        <div className={cn(
          'rounded-2xl p-4 border mb-3',
          cashFlow.monthlyNet >= 0
            ? 'bg-emerald-50 border-emerald-100'
            : cashFlow.runwayCurrent < 2
              ? 'bg-red-50 border-red-100'
              : 'bg-amber-50 border-amber-100'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-full flex-shrink-0',
              cashFlow.monthlyNet >= 0 ? 'bg-emerald-100' : cashFlow.runwayCurrent < 2 ? 'bg-red-100' : 'bg-amber-100'
            )}>
              <Wallet className={cn(
                'w-5 h-5',
                cashFlow.monthlyNet >= 0 ? 'text-emerald-600' : cashFlow.runwayCurrent < 2 ? 'text-red-600' : 'text-amber-600'
              )} />
            </div>
            <div className="text-sm text-gray-700">
              {cashFlow.monthlySpend === 0 ? (
                <p>Sin gastos en los últimos 3 meses: no hay ritmo para proyectar.</p>
              ) : cashFlow.monthlyNet >= 0 ? (
                <p>
                  Al ritmo actual <b>la caja se sostiene</b>: entran {formatCurrency(cashFlow.monthlyNet)} netos al mes.
                  Sin más aportes, el saldo actual cubre <b>~{cashFlow.runwayNoContrib.toFixed(1)} meses</b> de obra.
                </p>
              ) : (
                <p>
                  Al ritmo actual la caja alcanza para <b>~{cashFlow.runwayCurrent.toFixed(1)} meses</b>
                  {' '}(hasta ~{format(addMonths(new Date(), Math.max(0, Math.floor(cashFlow.runwayCurrent))), 'MMMM yyyy', { locale: es })}).
                  Sin más aportes, solo <b>~{cashFlow.runwayNoContrib.toFixed(1)} meses</b>.
                </p>
              )}
              {remainingBudget > 0 && (
                <p className="mt-2">
                  Falta por invertir según presupuestos de obra: <b>{formatCurrency(remainingBudget)}</b>
                  {' '}(≈ {formatCurrency(remainingBudget / (memberCount || 4))} por miembro,
                  ~{monthsToFinish.toFixed(1)} meses de obra al ritmo actual).
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Proyección 6 meses */}
        {cashFlow.monthlySpend > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Saldo de caja a 6 meses</h3>
            <ChartReadout
              period={cashFlow.projection[selectedMonth].month}
              items={[
                { name: 'Al ritmo actual', value: formatCurrency(cashFlow.projection[selectedMonth]['Al ritmo actual']), color: CHART_BLUE },
                { name: 'Sin más aportes', value: formatCurrency(cashFlow.projection[selectedMonth]['Sin más aportes']), color: CHART_ORANGE },
              ]}
            />
            <TapChart labels={cashFlow.projection.map((p) => p.month)} selected={selectedMonth} onSelect={setSelectedMonth}>
              <LineChart data={cashFlow.projection} margin={CHART_MARGIN}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="month" scale="band" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <ReferenceLine y={0} stroke="#111827" label={{ value: 'Caja en cero', position: 'insideBottomRight', fontSize: 12, fill: '#111827' }} />
                <Line type="linear" dataKey="Al ritmo actual" stroke={CHART_BLUE} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="Sin más aportes" stroke={CHART_ORANGE} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </TapChart>
          </div>
        )}

        <div className="mt-3">
          <PayablesVsCash totalInBox={totalInBox} />
        </div>
      </div>

      {/* ══════════ ESTIMADO VS REAL ══════════ */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Estimado vs Real por Etapa
        </h2>

        {stageComparison.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              Ninguna etapa de obra tiene presupuesto definido. Asigna presupuestos en Avance de Obra para comparar.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Total */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-sm">
              <span className="font-bold text-gray-700">Total etapas presupuestadas</span>
              <div className="text-right">
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(comparisonTotals.spent)}</span>
                <span className="text-gray-500"> / {formatCurrency(comparisonTotals.estimated)}</span>
                <span className={cn('block text-xs font-semibold tabular-nums', comparisonTotals.deviation > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {comparisonTotals.deviation > 0 ? '+' : ''}{formatCurrency(comparisonTotals.deviation)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {stageComparison.map(stage => (
                <div key={stage.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-800 truncate mr-2">{stage.name}</span>
                    <span className={cn('text-sm font-bold tabular-nums flex-shrink-0', deviationColor(stage.pct))}>
                      {stage.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={cn('h-full rounded-full transition-all', stage.pct > 100 ? 'bg-red-500' : stage.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.min(100, stage.pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 tabular-nums">
                    <span>Real: <b className="text-gray-700">{formatCurrency(stage.spent)}</b> / est. {formatCurrency(stage.estimatedBudget)}</span>
                    <span className={cn('font-semibold', stage.deviation > 0 ? 'text-red-600' : 'text-emerald-600')}>
                      {stage.deviation > 0 ? '+' : ''}{formatCurrency(stage.deviation)}
                    </span>
                  </div>
                  {stage.stageActivities.length > 0 && (
                    <div className="mt-2 space-y-1 border-l-2 border-gray-100 pl-3">
                      {stage.stageActivities.map(a => (
                        <div key={a.id} className="flex justify-between text-xs text-gray-500 tabular-nums">
                          <span className="truncate mr-2">{a.name}</span>
                          <span className={cn('font-semibold flex-shrink-0', deviationColor(a.pct))}>
                            {formatCurrency(a.spent)} / {formatShort(a.estimatedBudget)} ({a.pct.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ PRECIOS DE MATERIALES ══════════ */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Precios de Materiales
        </h2>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar material (ej: cemento)..."
            value={materialSearch}
            onChange={e => setMaterialSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {materials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-500">
              Aún no hay compras con cantidad × precio unitario. Usa "Calcular por cantidad" al registrar
              un gasto de material para alimentar este historial.
            </p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-500">Sin resultados para "{materialSearch}"</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {filteredMaterials.map(m => {
              const isExpanded = expandedMaterial === m.key;
              const hasTrend = m.purchases.length >= 2;
              return (
                <div key={m.key}>
                  <button
                    onClick={() => setExpandedMaterial(isExpanded ? null : m.key)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.purchases.length} compra{m.purchases.length !== 1 ? 's' : ''} · última {format(m.last.date, 'd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(m.last.unitPrice)}</p>
                      {hasTrend ? (
                        <p className={cn(
                          'text-xs font-semibold flex items-center justify-end gap-0.5 tabular-nums',
                          m.changePct > 1 ? 'text-red-600' : m.changePct < -1 ? 'text-emerald-600' : 'text-gray-500'
                        )}>
                          {m.changePct > 1 ? <ArrowUpRight className="w-3 h-3" /> : m.changePct < -1 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {Math.abs(m.changePct).toFixed(0)}% desde la 1ª compra
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">precio de referencia</p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 bg-gray-50/60">
                      {hasTrend && <PriceSparkline prices={m.purchases.map(p => p.unitPrice)} />}
                      <div className="divide-y divide-gray-100">
                        {[...m.purchases].reverse().map((p, i) => (
                          <div key={i} className="flex justify-between py-2 text-xs text-gray-600 tabular-nums">
                            <span>{format(p.date, 'd MMM yyyy', { locale: es })}</span>
                            <span>{p.quantity} × <b className="text-gray-800">{formatCurrency(p.unitPrice)}</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-500 text-center mt-2 px-4">
          Se agrupa por el nombre del gasto: usa el mismo nombre al comprar el mismo material (ej. siempre "Cemento gris").
        </p>
      </div>
    </div>
  );
}
