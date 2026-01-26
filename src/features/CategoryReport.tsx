import { useState, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency } from '../lib/utils';
import { Filter, Calendar, ChevronDown, Folder, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns';
import { es } from 'date-fns/locale';

type DateRangePreset = 'all' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'this-quarter' | 'last-quarter' | 'custom';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

export default function CategoryReport() {
  const { transactions, categories, projects } = useDashboardData();

  // Estados para filtros
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ start: null, end: null });
  const [showFilters, setShowFilters] = useState(false);

  // Calcular el rango de fechas según el preset
  const dateRange = useMemo((): DateRange => {
    const now = new Date();

    switch (dateRangePreset) {
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'this-year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last-year':
        const lastYear = subYears(now, 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
      case 'this-quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
      case 'custom':
        return customDateRange;
      case 'all':
      default:
        return { start: null, end: null };
    }
  }, [dateRangePreset, customDateRange]);

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.type === 'expense');

    // Filtrar por proyecto
    if (selectedProject !== 'all') {
      filtered = filtered.filter(t => t.projectId === selectedProject);
    }

    // Filtrar por rango de fechas
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dateRange.start! && transactionDate <= dateRange.end!;
      });
    }

    return filtered;
  }, [transactions, selectedProject, dateRange]);

  // Calcular totales por categoría
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();

    filteredTransactions.forEach(t => {
      if (t.categoryId) {
        const current = totals.get(t.categoryId) || 0;
        totals.set(t.categoryId, current + t.amount);
      }
    });

    return totals;
  }, [filteredTransactions]);

  // Calcular totales por grupo
  const groupTotals = useMemo(() => {
    const totals = new Map<string, number>();

    filteredTransactions.forEach(t => {
      if (t.categoryId) {
        const category = categories.find(c => c.id === t.categoryId);
        if (category && category.parentId) {
          const current = totals.get(category.parentId) || 0;
          totals.set(category.parentId, current + t.amount);
        }
      }
    });

    return totals;
  }, [filteredTransactions, categories]);

  // Total general
  const totalExpenses = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // Organizar categorías por grupos
  const { groups, groupedData, orphanCategories } = useMemo(() => {
    const groups = categories.filter(c => c.isGroup === true).sort((a, b) => a.order - b.order);
    const regularCategories = categories.filter(c => c.isGroup === false || c.isGroup === undefined);

    const groupedData = groups.map(group => {
      const groupCategories = regularCategories
        .filter(c => c.parentId === group.id)
        .map(cat => ({
          category: cat,
          total: categoryTotals.get(cat.id) || 0,
          percentage: totalExpenses > 0 ? ((categoryTotals.get(cat.id) || 0) / totalExpenses) * 100 : 0,
        }))
        .filter(item => item.total > 0)
        .sort((a, b) => b.total - a.total);

      const groupTotal = groupTotals.get(group.id) || 0;
      const groupPercentage = totalExpenses > 0 ? (groupTotal / totalExpenses) * 100 : 0;

      return {
        group,
        categories: groupCategories,
        total: groupTotal,
        percentage: groupPercentage,
      };
    }).filter(item => item.total > 0);

    const orphanCategories = regularCategories
      .filter(c => !c.parentId)
      .map(cat => ({
        category: cat,
        total: categoryTotals.get(cat.id) || 0,
        percentage: totalExpenses > 0 ? ((categoryTotals.get(cat.id) || 0) / totalExpenses) * 100 : 0,
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    return { groups, groupedData, orphanCategories };
  }, [categories, categoryTotals, groupTotals, totalExpenses]);

  const hasActiveFilters = selectedProject !== 'all' || dateRangePreset !== 'all';

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </div>
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showFilters && "rotate-180")} />
        </button>

        {showFilters && (
          <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2">
            {/* Filtro de Proyecto */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Proyecto</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todos los proyectos</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Fecha */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Período</label>
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todo el tiempo</option>
                <option value="this-month">Este mes</option>
                <option value="last-month">Mes pasado</option>
                <option value="this-quarter">Este trimestre</option>
                <option value="last-quarter">Trimestre pasado</option>
                <option value="this-year">Este año</option>
                <option value="last-year">Año pasado</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Fechas personalizadas */}
            {dateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Desde</label>
                  <input
                    type="date"
                    value={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      start: e.target.value ? new Date(e.target.value) : null
                    }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
                  <input
                    type="date"
                    value={customDateRange.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      end: e.target.value ? new Date(e.target.value) : null
                    }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total General */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-5 text-white">
        <p className="text-blue-100 text-sm font-medium mb-1">Total Gastado</p>
        <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalExpenses)}</p>
        {hasActiveFilters && (
          <p className="text-xs text-blue-200 mt-2">Filtros aplicados</p>
        )}
      </div>

      {/* Grupos de Categorías */}
      {groupedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Por Grupo de Categorías
          </h3>

          {groupedData.map(({ group, categories: groupCategories, total, percentage }) => (
            <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header del Grupo */}
              <div className="bg-gray-50 p-4 border-b border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-900">{group.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}% del total</p>
                  </div>
                </div>

                {/* Barra de progreso del grupo */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Categorías del grupo */}
              <div className="divide-y divide-gray-50">
                {groupCategories.map(({ category, total: catTotal, percentage: catPercentage }) => (
                  <div key={category.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(catTotal)}</p>
                        <p className="text-xs text-gray-400">{catPercentage.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Barra de progreso de la categoría (relativa al grupo) */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${total > 0 ? (catTotal / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categorías sin Grupo */}
      {orphanCategories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Categorías sin Grupo
          </h3>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {orphanCategories.map(({ category, total, percentage }) => (
              <div key={category.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-800">{category.name}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(total)}</p>
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}% del total</p>
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {totalExpenses === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {hasActiveFilters
              ? 'No hay gastos con los filtros aplicados'
              : 'Aún no hay gastos registrados'}
          </p>
        </div>
      )}
    </div>
  );
}
