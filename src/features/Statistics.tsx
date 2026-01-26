import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Loader2, TrendingUp, TrendingDown, Wallet,
  Users, Briefcase, Activity, BarChart3, Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import CategoryReport from './CategoryReport';

type TabType = 'statistics' | 'categories';

export default function Statistics() {
  const { userStats, projectStats, transactions, totalInBox, loading } = useDashboardData();
  const [activeTab, setActiveTab] = useState<TabType>('statistics');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calcular totales (Asegurando que no haya NaN)
  const totalContributions = transactions
    .filter((t) => t.type === 'contribution')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Últimas 5 transacciones (Solo necesitamos un resumen aquí, no las 20)
  const recentTransactions = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Reportes</h1>
          <p className="text-xs text-gray-500">Análisis y estadísticas financieras</p>
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
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6 max-w-lg mx-auto">

        {/* Tab: Estadísticas */}
        {activeTab === 'statistics' && (
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

            {/* --- LISTA DE HERMANOS (Reemplazo de Tabla) --- */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Balance por Miembro
              </h2>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {userStats.map((stat) => {
                  const isPositive = stat.balance >= 0;
                  return (
                    <div key={stat.userId} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
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
                        <p className="text-[10px] text-gray-400 uppercase font-medium">
                          {isPositive ? 'A favor' : 'Debe'}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                      <p className="text-[10px] text-gray-400 mt-1 text-right">{percentage.toFixed(1)}% del total</p>
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

               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {recentTransactions.map((transaction) => {
                     const isExpense = transaction.type === 'expense';
                     return (
                       <div key={transaction.id} className="p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className={cn(
                               "w-2 h-2 rounded-full flex-shrink-0",
                               isExpense ? "bg-red-500" : "bg-emerald-500"
                             )} />
                             <div className="min-w-0">
                               <p className="text-sm font-medium text-gray-900 truncate pr-2">
                                 {transaction.description}
                               </p>
                               <p className="text-xs text-gray-400">
                                 {formatDate(transaction.date)}
                               </p>
                             </div>
                          </div>
                          <span className={cn(
                            "text-sm font-bold whitespace-nowrap",
                            isExpense ? "text-gray-900" : "text-emerald-600"
                          )}>
                            {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
                          </span>
                       </div>
                     )
                  })}
                  {recentTransactions.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-sm">Sin actividad reciente</div>
                  )}
               </div>
            </div>
          </>
        )}

        {/* Tab: Categorías */}
        {activeTab === 'categories' && <CategoryReport />}
      </div>
    </div>
  );
}
