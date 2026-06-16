import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useConstructionData } from '../hooks/useConstructionData';
import { formatCurrency, cn } from '../lib/utils';
import {
  Plus, Minus, Wallet, Loader2, TrendingUp, TrendingDown,
  BarChart3, Filter, X, Check, Users,
  Calendar, ArrowUpRight, ArrowDownRight, Building2, ChevronRight,
  Tag,
} from 'lucide-react';
import TransactionForm from './TransactionForm';
import ContributionForm from './ContributionForm';
import InitializeDataPanel from '../components/InitializeDataPanel';
import NotificationButton from '../components/NotificationButton';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import {
  format, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval,
  isWithinInterval, addMonths, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, categories, transactions, totalInBox, userStats, memberStats, collaboratorStats, memberCount, projectStats, loading } = useDashboardData();
  const { stages, activities } = useConstructionData();
  const currentUser = useAuthStore((state) => state.user);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    if (projects.length > 0 && selectedProjects.length === 0) {
      setSelectedProjects(projects.map(p => p.id));
    }
  }, [projects, selectedProjects.length]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

  const formatShort = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

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

  // ── Gráficos (existentes) ─────────────────────────────────────────────────
  const filteredExpenses = useMemo(() =>
    transactions.filter(t => t.type === 'expense' && t.projectId && selectedProjects.includes(t.projectId)),
    [transactions, selectedProjects],
  );

  const expenseTrendData = useMemo(() => {
    if (filteredExpenses.length === 0) return [];
    const sixMonthsAgo = addMonths(now, -6);
    const intervals = timePeriod === 'weekly'
      ? eachWeekOfInterval({ start: sixMonthsAgo, end: now }, { weekStartsOn: 1 })
      : eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    return intervals.map(start => {
      const end = timePeriod === 'weekly' ? endOfWeek(start, { weekStartsOn: 1 }) : endOfMonth(start);
      const total = filteredExpenses
        .filter(t => isWithinInterval(t.date, { start, end }))
        .reduce((s, t) => s + t.amount, 0);
      return { period: format(start, timePeriod === 'weekly' ? 'dd MMM' : 'MMM', { locale: es }), total };
    }).filter(d => d.total > 0).slice(-6);
  }, [filteredExpenses, timePeriod]);

  const allCategoryData = useMemo(() => {
    const totals = new Map<string, number>();
    filteredExpenses.forEach(t => {
      if (t.categoryId) totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount);
    });
    return Array.from(totals.entries())
      .map(([id, val]) => ({ name: categories.find(c => c.id === id)?.name || 'Sin categoría', value: val }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories]);

  const memberContributionProgress = useMemo(() => {
    const effectiveBudgetTotal = projects.reduce((sum, project) => {
      if (project.budget > 0) return sum + project.budget;
      return sum + transactions
        .filter(t => t.type === 'expense' && t.projectId === project.id)
        .reduce((s, t) => s + t.amount, 0);
    }, 0);
    const expectedPerMember = effectiveBudgetTotal / (memberCount || 4);
    return memberStats.map(stats => {
      const contributed = stats.totalContributed;
      const remaining = Math.max(0, expectedPerMember - contributed);
      const percentage = expectedPerMember > 0 ? (contributed / expectedPerMember) * 100 : 0;
      return {
        userId: stats.userId, name: stats.userName, contributed,
        remaining, expected: expectedPerMember,
        percentage: Math.min(100, percentage),
        isCurrentUser: stats.userId === currentUser?.id,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [memberStats, memberCount, projects, transactions, currentUser]);

  const collaboratorContributionProgress = useMemo(() =>
    collaboratorStats.map(stats => ({
      userId: stats.userId, name: stats.userName,
      contributed: stats.totalContributed,
      isCurrentUser: stats.userId === currentUser?.id,
    })),
    [collaboratorStats, currentUser],
  );

  const toggleProject = (id: string) =>
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const toggleAllProjects = () =>
    setSelectedProjects(selectedProjects.length === projects.length ? [] : projects.map(p => p.id));
  const hasActiveFilters = selectedProjects.length < projects.length;

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const myStats = userStats.find(s => s.userId === currentUser?.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 lg:px-8 py-3 lg:py-4 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
        <NotificationButton />
      </header>

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
            <p className="text-xl font-bold text-gray-400 mb-1">{formatCurrency(prevMonthExpenses)}</p>
            <p className="text-xs text-gray-400">
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
                className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
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
                          <p className="font-bold text-gray-900 text-sm truncate">{stage.name}</p>
                          <p className="text-[10px] text-gray-400">{projectName}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        {activeActs > 0 && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {activeActs} activa{activeActs !== 1 ? 's' : ''}
                          </span>
                        )}
                        {completedActs > 0 && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            {completedActs} ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-1.5 mb-1.5">
                      <div
                        className={cn('h-1.5 rounded-full transition-all', overBudget ? 'bg-red-500' : 'bg-orange-500')}
                        style={{ width: stage.estimatedBudget > 0 ? `${pct}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className={cn('font-medium', overBudget && 'text-red-600')}>
                        {formatCurrency(spent)} gastado{overBudget && ' ⚠'}
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
                  className="w-full text-center text-xs font-semibold text-orange-600 py-2 bg-orange-50 rounded-xl border border-orange-100 hover:border-orange-300 transition-colors"
                >
                  +{activeStages.length - 2} etapa{activeStages.length - 2 !== 1 ? 's' : ''} más en progreso
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 4. GRÁFICOS ── */}
        {filteredExpenses.length > 0 ? (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 animate-in slide-in-from-bottom-4 duration-500">

            {/* Gráfico de Tendencia */}
            <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Gráfico de Gastos</h3>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {timePeriod === 'weekly' ? 'Vista Semanal' : 'Vista Mensual'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors relative"
                >
                  <Filter className="w-4 h-4" />
                  {hasActiveFilters && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
                  )}
                </button>
              </div>
              <div className="h-56 lg:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseTrendData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tickFormatter={formatShort}
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                    />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6', radius: 8 }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Total gastado']}
                      labelStyle={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: unknown) => formatShort(Number(v))}
                        style={{ fontSize: '9px', fill: '#6b7280', fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Categorías — lista scrollable con barras */}
            <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Categorías</h3>
                    <p className="text-[10px] text-gray-400">{allCategoryData.length} con gastos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors relative"
                >
                  <Filter className="w-4 h-4" />
                  {hasActiveFilters && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full ring-2 ring-white" />
                  )}
                </button>
              </div>

              {(() => {
                const total = filteredExpenses.reduce((a, b) => a + b.amount, 0);
                return (
                  <div className="overflow-y-auto max-h-56 lg:max-h-64 space-y-3 pr-1">
                    {allCategoryData.map((entry, index) => {
                      const pct = total > 0 ? (entry.value / total) * 100 : 0;
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
                );
              })()}
            </div>

            {/* Progreso de Aportes */}
            <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Progreso de Aportes</h3>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Basado en presupuestos ({formatCurrency(
                      projects.reduce((sum, p) => {
                        if (p.budget > 0) return sum + p.budget;
                        return sum + transactions.filter(t => t.type === 'expense' && t.projectId === p.id).reduce((s, t) => s + t.amount, 0);
                      }, 0)
                    )}) ÷ {memberCount} miembros
                  </p>
                </div>
              </div>

              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {memberContributionProgress.map((user, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/user/${user.userId}/contributions`)}
                    className={cn(
                      'p-3 rounded-xl border transition-all w-full text-left hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
                      user.isCurrentUser ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' : 'bg-gray-50 border-gray-100 hover:border-gray-200',
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold', user.isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700')}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className={cn('text-sm font-bold', user.isCurrentUser ? 'text-blue-900' : 'text-gray-800')}>
                            {user.name} {user.isCurrentUser && '(Tú)'}
                          </p>
                          <p className="text-[10px] text-gray-500">{formatCurrency(user.contributed)} / {formatCurrency(user.expected)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-lg font-bold', user.percentage >= 100 ? 'text-emerald-600' : user.percentage >= 50 ? 'text-blue-600' : 'text-amber-600')}>
                          {user.percentage.toFixed(0)}%
                        </p>
                        {user.remaining > 0 && <p className="text-[10px] text-gray-500">Falta: {formatCurrency(user.remaining)}</p>}
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-500 rounded-full', user.percentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : user.percentage >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-amber-500 to-amber-600')}
                        style={{ width: `${Math.min(100, user.percentage)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {collaboratorContributionProgress.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">Colaboradores</p>
                  <div className="space-y-2">
                    {collaboratorContributionProgress.map((user, i) => (
                      <button
                        key={i}
                        onClick={() => navigate(`/user/${user.userId}/contributions`)}
                        className={cn('p-3 rounded-xl border transition-all w-full text-left hover:shadow-md', user.isCurrentUser ? 'bg-purple-50/50 border-purple-200' : 'bg-gray-50 border-gray-100')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold', user.isCurrentUser ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700')}>
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className={cn('text-sm font-bold', user.isCurrentUser ? 'text-purple-900' : 'text-gray-800')}>
                                {user.name} {user.isCurrentUser && '(Tú)'}
                              </p>
                              <p className="text-[10px] text-purple-500">No participa en división de gastos</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">+{formatCurrency(user.contributed)}</p>
                            <p className="text-[10px] text-gray-500">Aportado</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                {[['bg-emerald-500', '100%+'], ['bg-blue-500', '50-99%'], ['bg-amber-500', '<50%']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={cn('w-2 h-2 rounded-full', color)} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center opacity-60">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay datos suficientes para los gráficos</p>
          </div>
        )}

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
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded flex-shrink-0">⚠ Excedido</span>
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
                      <p className="text-[10px] text-gray-400">{pct.toFixed(0)}% de {formatCurrency(stat.budget)}</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-gray-400">{stat.transactionCount} movimientos</p>
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
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
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
                        <p className="text-[10px] text-orange-500 font-medium truncate">
                          {t.stageName} › {t.activityName}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400">
                          {format(t.date, "dd MMM · HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn('text-sm font-bold', isExpense ? 'text-gray-900' : 'text-emerald-600')}>
                        {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>
                      {t.activityName && (
                        <p className="text-[10px] text-gray-400">{format(t.date, "dd MMM", { locale: es })}</p>
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
      <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3">
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-1">
            <button onClick={() => { setShowContributionForm(true); setIsFabOpen(false); }} className="flex items-center gap-3 pr-1 group">
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">Ingreso</span>
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
            </button>
            <button onClick={() => { setShowExpenseForm(true); setIsFabOpen(false); }} className="flex items-center gap-3 pr-1 group">
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">Gasto</span>
              <div className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                <Minus className="w-6 h-6" />
              </div>
            </button>
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={cn('w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 bg-gray-900 text-white', isFabOpen && 'rotate-45')}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* MODAL FILTROS */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowFilterModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Configurar Gráfico</h2>
              <button onClick={() => setShowFilterModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Período de Tiempo</label>
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  {(['weekly', 'monthly'] as const).map(p => (
                    <button key={p} onClick={() => setTimePeriod(p)} className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', timePeriod === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                      {p === 'weekly' ? 'Semanal' : 'Mensual'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Proyectos Incluidos</label>
                  <button onClick={toggleAllProjects} className="text-xs font-medium text-blue-600">
                    {selectedProjects.length === projects.length ? 'Ocultar todos' : 'Ver todos'}
                  </button>
                </div>
                <div className="space-y-2">
                  {projects.map(p => (
                    <label
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      className={cn('flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all', selectedProjects.includes(p.id) ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-white')}
                    >
                      <span className={cn('text-sm font-medium', selectedProjects.includes(p.id) ? 'text-blue-900' : 'text-gray-600')}>{p.name}</span>
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center border transition-colors', selectedProjects.includes(p.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white')}>
                        {selectedProjects.includes(p.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setShowFilterModal(false)} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl mt-6 active:scale-95 transition-transform">
              Aplicar Configuración
            </button>
          </div>
        </div>
      )}

      {showExpenseForm && <TransactionForm onClose={() => setShowExpenseForm(false)} />}
      {showContributionForm && <ContributionForm onClose={() => setShowContributionForm(false)} />}
    </div>
  );
}
