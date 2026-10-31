import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatShort } from '../lib/utils';
import {
  Loader2, TrendingUp, Briefcase, BarChart3, Tag, Share2, Scale,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import Balance from './Balance';
import CategoryReport from './CategoryReport';
import AnalysisReport from './AnalysisReport';
import NotificationButton from '../components/NotificationButton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'balance' | 'statistics' | 'categories' | 'analysis';

const TABS: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'balance', label: 'Balance', icon: Scale },
  { id: 'statistics', label: 'Mensual', icon: BarChart3 },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'analysis', label: 'Análisis', icon: TrendingUp },
];

export default function Finances() {
  const {
    memberStats, projectStats, transactions, totalInBox, totalExpenses, loading,
  } = useDashboardData();
  // En la URL para que volver de otra pantalla regrese a la misma pestaña
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.find((t) => t.id === searchParams.get('tab'))?.id ?? 'balance';
  const setActiveTab = (tab: TabType) => setSearchParams(tab === 'balance' ? {} : { tab }, { replace: true });
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  // Aportes vs gastos de los últimos 6 meses (incluye meses en cero)
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const inMonth = transactions.filter(t => t.date >= start && t.date <= end);
      return {
        month: format(monthDate, 'MMM', { locale: es }),
        Aportes: inMonth.filter(t => t.type === 'contribution').reduce((s, t) => s + t.amount, 0),
        Gastos: inMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

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
                "flex-1 min-w-0 py-3 px-1 text-xs sm:text-sm font-semibold transition-colors relative flex items-center justify-center gap-1 sm:gap-2",
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

        {/* Tab: Mensual */}
        {!loading && activeTab === 'statistics' && (
          <>
            {/* --- GRÁFICA: APORTES VS GASTOS POR MES --- */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Aportes vs Gastos</h3>
                    <p className="text-[11px] text-gray-500 font-medium">Últimos 6 meses</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Aportes</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Gastos</span>
                </div>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tickFormatter={formatShort} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6', radius: 8 }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
                      labelStyle={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}
                    />
                    <Bar dataKey="Aportes" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Gastos" fill="#f87171" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* --- GASTOS POR PROYECTO (Con Barras de Progreso) --- */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Distribución de Gastos
              </h2>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-5">
                {projectStats.map((stat) => {
                  const percentage = totalExpenses > 0 ? (stat.totalSpent / totalExpenses) * 100 : 0;

                  return (
                    <div key={stat.projectId}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm font-semibold text-gray-800">{stat.projectName}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(stat.totalSpent)}</span>
                          <span className="text-xs text-gray-400 ml-2">({stat.transactionCount} mov.)</span>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 text-right">{percentage.toFixed(1)}% del total</p>
                    </div>
                  );
                })}
                 {projectStats.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-2">No hay gastos registrados por proyecto</p>
                 )}
              </div>
            </div>

          </>
        )}

        {/* Tab: Categorías */}
        {!loading && activeTab === 'categories' && <CategoryReport />}

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
