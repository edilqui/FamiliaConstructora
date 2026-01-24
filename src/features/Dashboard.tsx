import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { Plus, Minus, Wallet, Loader2, TrendingUp, TrendingDown, BarChart3, Filter, ChevronDown } from 'lucide-react';
import TransactionForm from './TransactionForm';
import ContributionForm from './ContributionForm';
import InitializeDataPanel from '../components/InitializeDataPanel';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, categories, transactions, totalInBox, userStats, projectStats, loading } = useDashboardData();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  // Analytics states
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Update selected projects when projects load
  useEffect(() => {
    if (projects.length > 0 && selectedProjects.length === 0) {
      setSelectedProjects(projects.map(p => p.id));
    }
  }, [projects, selectedProjects.length]);

  // Color palettes for charts
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Filter expenses by selected projects
  const filteredExpenses = useMemo(() => {
    return transactions.filter(
      t => t.type === 'expense' &&
      t.projectId &&
      selectedProjects.includes(t.projectId)
    );
  }, [transactions, selectedProjects]);

  // Data for expense trend chart (bar/line chart over time)
  const expenseTrendData = useMemo(() => {
    if (filteredExpenses.length === 0) return [];

    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);

    if (timePeriod === 'weekly') {
      const weeks = eachWeekOfInterval({ start: sixMonthsAgo, end: now }, { weekStartsOn: 1 });

      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekExpenses = filteredExpenses.filter(t =>
          isWithinInterval(t.date, { start: weekStart, end: weekEnd })
        );

        const total = weekExpenses.reduce((sum, t) => sum + t.amount, 0);

        return {
          period: format(weekStart, 'dd MMM', { locale: es }),
          total,
          count: weekExpenses.length,
        };
      }).filter(d => d.total > 0 || d.count > 0);
    } else {
      const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthExpenses = filteredExpenses.filter(t =>
          isWithinInterval(t.date, { start: monthStart, end: monthEnd })
        );

        const total = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

        return {
          period: format(monthStart, 'MMM yyyy', { locale: es }),
          total,
          count: monthExpenses.length,
        };
      }).filter(d => d.total > 0 || d.count > 0);
    }
  }, [filteredExpenses, timePeriod]);

  // Data for category distribution pie chart
  const categoryDistributionData = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    filteredExpenses.forEach(t => {
      if (t.categoryId) {
        const current = categoryTotals.get(t.categoryId) || 0;
        categoryTotals.set(t.categoryId, current + t.amount);
      }
    });

    return Array.from(categoryTotals.entries())
      .map(([categoryId, total]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
          name: category?.name || 'Sin categoría',
          value: total,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories]);

  // Data for project distribution pie chart
  const projectDistributionData = useMemo(() => {
    const projectTotals = new Map<string, number>();

    filteredExpenses.forEach(t => {
      if (t.projectId) {
        const current = projectTotals.get(t.projectId) || 0;
        projectTotals.set(t.projectId, current + t.amount);
      }
    });

    return Array.from(projectTotals.entries())
      .map(([projectId, total]) => {
        const project = projects.find(p => p.id === projectId);
        return {
          name: project?.name || 'Sin proyecto',
          value: total,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, projects]);

  // Data for cumulative spending trend
  const cumulativeSpendingData = useMemo(() => {
    if (filteredExpenses.length === 0) return [];

    const sortedExpenses = [...filteredExpenses].sort((a, b) => a.date.getTime() - b.date.getTime());

    let cumulative = 0;
    const cumulativeByPeriod = new Map<string, number>();

    sortedExpenses.forEach(t => {
      cumulative += t.amount;
      const periodKey = timePeriod === 'weekly'
        ? format(startOfWeek(t.date, { weekStartsOn: 1 }), 'dd MMM', { locale: es })
        : format(startOfMonth(t.date), 'MMM yyyy', { locale: es });

      cumulativeByPeriod.set(periodKey, cumulative);
    });

    return Array.from(cumulativeByPeriod.entries()).map(([period, total]) => ({
      period,
      total,
    }));
  }, [filteredExpenses, timePeriod]);

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  // Toggle all projects
  const toggleAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(p => p.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Obtener estadísticas del usuario actual
  const myStats = userStats.find(s => s.userId === currentUser?.id);

  return (
    <div className="space-y-6 pb-24">
      {/* Total en Caja */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6" />
          <h2 className="text-lg font-semibold">Total en Caja</h2>
        </div>
        <p className="text-4xl font-bold">{formatCurrency(totalInBox)}</p>
        <p className="text-sm text-blue-100 mt-2">Disponible para gastos</p>
      </div>

      {/* Balance Personal */}
      {myStats && (
        <div
          className={cn(
            'p-6 rounded-lg shadow-md',
            myStats.balance >= 0
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-red-50 border-2 border-red-500'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'p-2 rounded-full',
                myStats.balance >= 0 ? 'bg-green-500' : 'bg-red-500'
              )}
            >
              {myStats.balance >= 0 ? (
                <TrendingUp className="w-5 h-5 text-white" />
              ) : (
                <TrendingDown className="w-5 h-5 text-white" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-700">Tu Balance</h2>
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              myStats.balance >= 0 ? 'text-green-700' : 'text-red-700'
            )}
          >
            {formatCurrency(Math.abs(myStats.balance))}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {myStats.balance >= 0 ? 'A tu favor' : 'Debes aportar'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Aportado</p>
              <p className="font-semibold text-gray-800">{formatCurrency(myStats.totalContributed)}</p>
            </div>
            <div>
              <p className="text-gray-600">Tu parte (25%)</p>
              <p className="font-semibold text-gray-800">{formatCurrency(myStats.share)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      {transactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-800">Análisis de Gastos</h2>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                showFilters ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white p-4 rounded-lg shadow-md space-y-4 animate-in slide-in-from-top-2">
              {/* Time Period Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período de tiempo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimePeriod('weekly')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                      timePeriod === 'weekly'
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Semanal
                  </button>
                  <button
                    onClick={() => setTimePeriod('monthly')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                      timePeriod === 'monthly'
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Mensual
                  </button>
                </div>
              </div>

              {/* Project Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Proyectos</label>
                  <button
                    onClick={toggleAllProjects}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedProjects.length === projects.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {projects.map(project => (
                    <label
                      key={project.id}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                        selectedProjects.includes(project.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => toggleProject(project.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{project.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          {selectedProjects.length > 0 && filteredExpenses.length > 0 ? (
            <div className="space-y-4">
              {/* Expense Trend Chart */}
              {expenseTrendData.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Evolución de Gastos ({timePeriod === 'weekly' ? 'Semanal' : 'Mensual'})
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Cumulative Spending Chart */}
              {cumulativeSpendingData.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Gasto Acumulado
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cumulativeSpendingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Acumulado']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Category Distribution */}
                {categoryDistributionData.length > 0 && (
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Distribución por Categoría
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Project Distribution */}
                {projectDistributionData.length > 0 && (
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Distribución por Proyecto
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={projectDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {projectDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {selectedProjects.length === 0
                  ? 'Selecciona al menos un proyecto para ver los análisis'
                  : 'No hay gastos registrados para los proyectos seleccionados'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Aportes por Usuario */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Aportes por Hermano</h2>
        {userStats.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            <p>No hay aportes registrados aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userStats.map((stat) => {
              const isCurrentUser = stat.userId === currentUser?.id;

              return (
                <div
                  key={stat.userId}
                  className={cn(
                    'bg-white p-4 rounded-lg shadow-md',
                    isCurrentUser && 'ring-2 ring-primary-500'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {stat.userName}
                      {isCurrentUser && <span className="text-primary-600 ml-1">(Tú)</span>}
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stat.totalContributed)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Aportado</p>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600">
                      Balance:{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          stat.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {formatCurrency(Math.abs(stat.balance))}
                        {stat.balance >= 0 ? ' a favor' : ' debe'}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proyectos */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gastos por Proyecto</h2>

        {projects.length === 0 ? (
          <InitializeDataPanel />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectStats.map((stat) => {
              const project = projects.find(p => p.id === stat.projectId);
              if (!project) return null;

              return (
                <button
                  key={stat.projectId}
                  onClick={() => navigate(`/project/${stat.projectId}`)}
                  className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-all text-left w-full cursor-pointer hover:border-2 hover:border-primary-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{stat.projectName}</h3>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        project.status === 'active' && 'bg-green-100 text-green-700',
                        project.status === 'completed' && 'bg-blue-100 text-blue-700',
                        project.status === 'paused' && 'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {project.status === 'active' && 'Activo'}
                      {project.status === 'completed' && 'Completado'}
                      {project.status === 'paused' && 'Pausado'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(stat.totalSpent)}
                      </p>
                      <p className="text-xs text-gray-500">Gastado</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600">
                        {stat.transactionCount} {stat.transactionCount === 1 ? 'gasto' : 'gastos'} registrados
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FABs - Floating Action Buttons */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 flex flex-col gap-3 z-40">
        {/* FAB Aporte (Verde) */}
        <button
          onClick={() => setShowContributionForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          aria-label="Agregar aporte"
          title="Agregar Aporte"
        >
          <Plus className="w-6 h-6" />
          <span className="absolute right-16 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Agregar Aporte
          </span>
        </button>

        {/* FAB Gasto (Rojo) */}
        <button
          onClick={() => setShowExpenseForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          aria-label="Agregar gasto"
          title="Agregar Gasto"
        >
          <Minus className="w-6 h-6" />
          <span className="absolute right-16 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Agregar Gasto
          </span>
        </button>
      </div>

      {/* Modals */}
      {showExpenseForm && <TransactionForm onClose={() => setShowExpenseForm(false)} />}
      {showContributionForm && <ContributionForm onClose={() => setShowContributionForm(false)} />}
    </div>
  );
}
