import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useConstructionData } from '../hooks/useConstructionData';
import { formatCurrency, cn } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import {
  Plus, Minus, Wallet, Loader2, TrendingUp, TrendingDown,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Building2, ChevronRight,
} from 'lucide-react';
import TransactionForm from './TransactionForm';
import ContributionForm from './ContributionForm';
import InitializeDataPanel from '../components/InitializeDataPanel';
import NotificationButton from '../components/NotificationButton';
import CommitmentCard from '../components/CommitmentCard';
import { useAuthStore } from '../store/useAuthStore';
import { format, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, transactions, totalInBox, userStats, projectStats, loading } = useDashboardData();
  const { stages, activities } = useConstructionData();
  const currentUser = useAuthStore((state) => state.user);

  // El indicador de "sin conexión" ahora es global (OfflineBanner en Layout)
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  // ── Gasto del mes actual y anterior ──────────────────────────────────────
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonthExpenses = useMemo(() =>
    transactions
      .filter(t => t.type === 'expense' && t.date >= currentMonthStart)
      .reduce((s, t) => s + t.amount, 0),
    [transactions, currentMonthStart],
  );

  const prevMonthExpenses = useMemo(() =>
    transactions
      .filter(t => t.type === 'expense' && t.date >= prevMonthStart && t.date <= prevMonthEnd)
      .reduce((s, t) => s + t.amount, 0),
    [transactions, prevMonthStart, prevMonthEnd],
  );

  const monthDelta = prevMonthExpenses > 0
    ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
    : 0;

  // ── Obra en progreso ──────────────────────────────────────────────────────
  const activeStages = useMemo(() =>
    stages.filter(s => s.status === 'in_progress'),
    [stages],
  );

  const spentByStage = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'expense' && t.stageId) {
        map.set(t.stageId, (map.get(t.stageId) ?? 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  // ── Proyectos enriquecidos con presupuesto ────────────────────────────────
  const enrichedProjectStats = useMemo(() =>
    projectStats.map(stat => {
      const project = projects.find(p => p.id === stat.projectId);
      return { ...stat, budget: project?.budget ?? 0, status: project?.status ?? 'active' };
    }),
    [projectStats, projects],
  );

  // ── Últimas 3 transacciones ───────────────────────────────────────────────
  const recentTransactions = useMemo(() =>
    [...transactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3),
    [transactions],
  );

  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const myStats = userStats.find(s => s.userId === currentUser?.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">

      {/* HEADER */}
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md px-4 lg:px-8 py-3 lg:py-4 border-b border-gray-100 flex justify-between items-center shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Inicio</h1>
        <div className="flex items-center gap-2">
          <NotificationButton />
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-6 space-y-6 max-w-7xl mx-auto">

        {/* ── 1. TARJETA PRINCIPAL CAJA ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl p-6">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-gray-300">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">Total Disponible</span>
            </div>
            <p className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(totalInBox)}</p>
            {myStats && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Tu Balance</p>
                  <div className={cn('flex items-center gap-1.5 font-bold', myStats.balance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {myStats.balance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{formatCurrency(Math.abs(myStats.balance))}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Aportado</p>
                  <p className="font-semibold">{formatCurrency(myStats.totalContributed)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. GASTO DEL MES ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Este mes</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">{formatCurrency(currentMonthExpenses)}</p>
            {prevMonthExpenses > 0 ? (
              <div className="flex items-center gap-1">
                {monthDelta > 0
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  : <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                <span className={cn('text-xs font-semibold', monthDelta > 0 ? 'text-red-500' : 'text-emerald-500')}>
                  {Math.abs(monthDelta).toFixed(0)}% vs mes ant.
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400">en gastos</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mes anterior</span>
            </div>
            <p className="text-xl font-bold text-gray-700 mb-1">{formatCurrency(prevMonthExpenses)}</p>
            <p className="text-xs text-gray-500">
              {format(subMonths(now, 1), 'MMMM yyyy', { locale: es })}
            </p>
          </div>
        </div>

        {/* ── 3. OBRA EN PROGRESO ── */}
        {activeStages.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Obra en Progreso</h3>
              <button
                onClick={() => navigate('/obra')}
                className="min-h-11 flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                Ver todo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {activeStages.slice(0, 2).map(stage => {
                const spent = spentByStage.get(stage.id) ?? 0;
                const stageActs = activities.filter(a => a.stageId === stage.id);
                const activeActs = stageActs.filter(a => a.status === 'in_progress').length;
                const completedActs = stageActs.filter(a => a.status === 'completed').length;
                const pct = stage.estimatedBudget > 0 ? Math.min((spent / stage.estimatedBudget) * 100, 100) : 0;
                const overBudget = stage.estimatedBudget > 0 && spent > stage.estimatedBudget;
                const nearBudget = stage.estimatedBudget > 0 && !overBudget && spent / stage.estimatedBudget >= 0.8;
                const projectName = projects.find(p => p.id === stage.projectId)?.name ?? '';

                return (
                  <button
                    key={stage.id}
                    onClick={() => navigate('/obra')}
                    className="w-full bg-orange-50 border border-orange-100 hover:border-orange-300 rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{stage.name}</p>
                          <p className="text-xs text-gray-500">{projectName}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        {activeActs > 0 && (
                          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {activeActs} activa{activeActs !== 1 ? 's' : ''}
                          </span>
                        )}
                        {completedActs > 0 && (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            {completedActs} ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-1.5 mb-1.5">
                      <div
                        className={cn('h-1.5 rounded-full transition-all', overBudget ? 'bg-red-500' : nearBudget ? 'bg-amber-500' : 'bg-orange-500')}
                        style={{ width: stage.estimatedBudget > 0 ? `${pct}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className={cn('font-medium', overBudget && 'text-red-600', nearBudget && 'text-amber-600')}>
                        {formatCurrency(spent)} gastado
                        {overBudget && ' · presupuesto excedido'}
                        {nearBudget && ' · cerca del límite'}
                      </span>
                      <span>
                        {stage.estimatedBudget > 0
                          ? `${pct.toFixed(0)}% de ${formatCurrency(stage.estimatedBudget)}`
                          : 'Sin presupuesto definido'}
                      </span>
                    </div>
                  </button>
                );
              })}
              {activeStages.length > 2 && (
                <button
                  onClick={() => navigate('/obra')}
                  className="w-full min-h-11 text-center text-xs font-semibold text-orange-600 py-2 bg-orange-50 rounded-xl border border-orange-100 hover:border-orange-300 transition-colors"
                >
                  +{activeStages.length - 2} etapa{activeStages.length - 2 !== 1 ? 's' : ''} más en progreso
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 4. COMPROMISO Y ACCESO A LOS REPORTES ── */}
        {myStats && currentUser && (
          <CommitmentCard
            userId={currentUser.id}
            userName={myStats.userName}
            contributions={transactions.filter(t => t.type === 'contribution' && t.userId === currentUser.id)}
          />
        )}
        <button
          onClick={() => navigate('/balance?tab=statistics')}
          className="w-full min-h-[56px] bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 text-left active:bg-gray-50"
        >
          <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-900">Ver gráficas y reportes</span>
            <span className="block text-xs text-gray-500">Tendencia, aportes, categorías y proyecciones</span>
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </button>

        {/* ── 5. PROYECTOS ACTIVOS (mejorados) ── */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Proyectos</h3>
          <div className="grid grid-cols-2 gap-3">
            {enrichedProjectStats.slice(0, 4).map(stat => {
              const overBudget = stat.budget > 0 && stat.totalSpent > stat.budget;
              const pct = stat.budget > 0 ? Math.min((stat.totalSpent / stat.budget) * 100, 100) : 0;

              return (
                <button
                  key={stat.projectId}
                  onClick={() => navigate(`/project/${stat.projectId}`)}
                  className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-left hover:border-blue-300 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-sm font-bold text-gray-800 truncate flex-1">{stat.projectName}</p>
                    {overBudget && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded flex-shrink-0">⚠ Excedido</span>
                    )}
                  </div>
                  <p className={cn('text-sm font-bold mb-1.5', overBudget ? 'text-red-600' : 'text-blue-600')}>
                    {formatCurrency(stat.totalSpent)}
                  </p>
                  {stat.budget > 0 ? (
                    <>
                      <div className="w-full bg-gray-100 rounded-full h-1 mb-1">
                        <div
                          className={cn('h-1 rounded-full transition-all', overBudget ? 'bg-red-500' : 'bg-blue-500')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 tabular-nums">{pct.toFixed(0)}% de {formatCurrency(stat.budget)}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">{stat.transactionCount} movimientos</p>
                  )}
                </button>
              );
            })}
            {projects.length === 0 && <InitializeDataPanel />}
          </div>
        </div>

        {/* ── 6. ÚLTIMAS TRANSACCIONES ── */}
        {recentTransactions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Últimos Movimientos</h3>
              <button
                onClick={() => navigate('/expenses')}
                className="min-h-11 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {recentTransactions.map(t => {
                const isExpense = t.type === 'expense';
                return (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', isExpense ? 'bg-red-50' : 'bg-emerald-50')}>
                      {isExpense
                        ? <Minus className="w-4 h-4 text-red-500" />
                        : <Plus className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                      {t.activityName ? (
                        <p className="text-xs text-orange-500 font-medium truncate">
                          {t.stageName} › {t.activityName}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {format(t.date, "dd MMM · HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn('text-sm font-bold', isExpense ? 'text-gray-900' : 'text-emerald-600')}>
                        {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>
                      {t.activityName && (
                        <p className="text-xs text-gray-400">{format(t.date, "dd MMM", { locale: es })}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* FAB */}
      <div className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] right-6 z-40 flex flex-col items-end gap-3">
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-1">
            <button onClick={() => { setShowContributionForm(true); setIsFabOpen(false); }} className="flex items-center gap-3 pr-1 group">
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">Ingreso</span>
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
            </button>
            {currentUser?.role !== 'collaborator' && (
              <button onClick={() => { setShowExpenseForm(true); setIsFabOpen(false); }} className="flex items-center gap-3 pr-1 group">
                <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">Gasto</span>
                <div className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Minus className="w-6 h-6" />
                </div>
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          aria-label={isFabOpen ? 'Cerrar menú de registro' : 'Registrar aporte o gasto'}
          className={cn('w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 bg-gray-900 text-white', isFabOpen && 'rotate-45')}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {showExpenseForm && <TransactionForm onClose={() => setShowExpenseForm(false)} />}
      {showContributionForm && <ContributionForm onClose={() => setShowContributionForm(false)} />}
    </div>
  );
}
