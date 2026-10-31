import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatDate, formatShort } from '../lib/utils';
import {
  Loader2, TrendingUp, TrendingDown, Wallet,
  Users, Briefcase, Activity, BarChart3, Tag, Share2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import CategoryReport from './CategoryReport';
import AnalysisReport from './AnalysisReport';
import NotificationButton from '../components/NotificationButton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'statistics' | 'categories' | 'analysis';

export default function Statistics() {
  const {
    memberStats, collaboratorStats, projectStats, transactions,
    totalInBox, totalContributions, totalExpenses, loading,
  } = useDashboardData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  // Últimas 5 transacciones. Copia antes de ordenar: el array viene compartido
  // desde useDashboardData y ordenarlo in-place desordenaba las otras pantallas.
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

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
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Reportes</h1>
            <p className="text-xs lg:text-sm text-gray-500">Análisis y estadísticas financieras</p>
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
          <button
            onClick={() => setActiveTab('statistics')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-semibold transition-colors relative flex items-center justify-center gap-2",
              activeTab === 'statistics'
                ? "text-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas</span>
            {activeTab === 'statistics' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-semibold transition-colors relative flex items-center justify-center gap-2",
              activeTab === 'categories'
                ? "text-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Tag className="w-4 h-4" />
            <span>Categorías</span>
            {activeTab === 'categories' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-semibold transition-colors relative flex items-center justify-center gap-2",
              activeTab === 'analysis'
                ? "text-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Análisis</span>
            {activeTab === 'analysis' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
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

        {/* Tab: Estadísticas */}
        {!loading && activeTab === 'statistics' && (
          <>
            {/* --- TARJETAS DE RESUMEN (KPIs) --- */}
            <div className="grid grid-cols-2 gap-3">
              {/* Aportes */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="p-2 bg-emerald-50 w-fit rounded-lg mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Ingresos Totales</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalContributions)}</p>
                </div>
              </div>

              {/* Gastos */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingDown className="w-12 h-12 text-red-600" />
                </div>
                <div className="p-2 bg-red-50 w-fit rounded-lg mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Gastos Totales</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>

              {/* Caja (Ocupa ancho completo) */}
              <div className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg text-white flex items-center justify-between relative overflow-hidden">
                 <div className="absolute -right-6 -bottom-6 opacity-20">
                  <Wallet className="w-32 h-32" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Saldo Disponible en Caja</p>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalInBox)}</p>
                </div>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

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

            {/* --- BALANCE POR MIEMBRO (Solo los que dividen gastos) --- */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Balance por Miembro
              </h2>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {memberStats.map((stat) => {
                  const isPositive = stat.balance >= 0;
                  return (
                    <button
                      key={stat.userId}
                      onClick={() => navigate(`/user/${stat.userId}/contributions`)}
                      aria-label={`Ver aportes de ${stat.userName}`}
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar con iniciales */}
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                          {stat.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{stat.userName}</p>
                          <p className="text-xs text-gray-400">Cuota: {formatCurrency(stat.share)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={cn(
                          "font-bold text-sm",
                          isPositive ? "text-emerald-600" : "text-red-600"
                        )}>
                          {isPositive ? '+' : ''}{formatCurrency(stat.balance)}
                        </p>
                        <p className="text-[11px] text-gray-500 uppercase font-medium">
                          {isPositive ? 'A favor' : 'Debe'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- COLABORADORES (Si hay) --- */}
            {collaboratorStats.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Colaboradores
                </h2>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {collaboratorStats.map((stat) => {
                    return (
                      <button
                        key={stat.userId}
                        onClick={() => navigate(`/user/${stat.userId}/contributions`)}
                        aria-label={`Ver aportes de ${stat.userName}`}
                        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar con iniciales */}
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold border border-purple-200">
                            {stat.userName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{stat.userName}</p>
                            <p className="text-xs text-purple-500">No divide gastos</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm text-emerald-600">
                            +{formatCurrency(stat.totalContributed)}
                          </p>
                          <p className="text-[11px] text-gray-500 uppercase font-medium">
                            Aportado
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

            {/* --- ACTIVIDAD RECIENTE (Resumen Compacto) --- */}
            <div>
               <div className="flex items-center justify-between mb-3">
                 <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Última Actividad
                </h2>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Header de tabla (solo desktop) */}
                  <div className="hidden lg:grid lg:grid-cols-[auto_1fr_180px_120px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="w-2"></div>
                    <div>Descripción</div>
                    <div className="text-center">Fecha</div>
                    <div className="text-right">Monto</div>
                  </div>

                  {/* Filas */}
                  <div className="divide-y divide-gray-50">
                    {recentTransactions.map((transaction) => {
                       const isExpense = transaction.type === 'expense';
                       return (
                         <div key={transaction.id} className="p-3.5 lg:px-4 lg:py-3 flex lg:grid lg:grid-cols-[auto_1fr_180px_120px] items-center gap-3 lg:gap-4">
                            {/* Indicador de tipo */}
                            <div className={cn(
                              "w-2 h-2 rounded-full flex-shrink-0",
                              isExpense ? "bg-red-500" : "bg-emerald-500"
                            )} />

                            {/* Descripción - Layout móvil y desktop */}
                            <div className="flex-1 min-w-0 lg:flex-none overflow-hidden">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.description}
                              </p>
                              {/* Fecha solo en móvil */}
                              <p className="text-xs text-gray-400 lg:hidden">
                                {formatDate(transaction.date)}
                              </p>
                            </div>

                            {/* Fecha (solo desktop) */}
                            <div className="hidden lg:block text-center text-sm text-gray-600">
                              {formatDate(transaction.date)}
                            </div>

                            {/* Monto */}
                            <div className="text-right flex-shrink-0">
                              <span className={cn(
                                "text-sm lg:text-base font-bold whitespace-nowrap",
                                isExpense ? "text-gray-900" : "text-emerald-600"
                              )}>
                                {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
                              </span>
                            </div>
                         </div>
                       )
                    })}
                    {recentTransactions.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-sm">Sin actividad reciente</div>
                    )}
                  </div>
               </div>
            </div>
          </>
        )}

        {/* Tab: Categorías */}
        {!loading && activeTab === 'categories' && <CategoryReport />}

        {/* Tab: Análisis (flujo de caja, estimado vs real, precios) */}
        {!loading && activeTab === 'analysis' && <AnalysisReport />}
      </div>
    </div>
  );
}
