import { useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency } from '../lib/utils';
import { AlertTriangle, Folder, Tag } from 'lucide-react';
import { DateRange, isInRange } from '../lib/financeFilters';

interface CategoryReportProps {
  range: DateRange;
  projectId: string;
  periodLabel: string;
}

export default function CategoryReport({ range, projectId, periodLabel }: CategoryReportProps) {
  const { transactions, categories } = useDashboardData();

  const filteredTransactions = useMemo(() =>
    transactions.filter(t =>
      t.type === 'expense' && (!projectId || t.projectId === projectId) && isInRange(t.date, range)
    ),
    [transactions, projectId, range],
  );

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
  const { groupedData, orphanCategories, unlistedTotal } = useMemo(() => {
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

    // Sin categoría, o con una categoría o grupo que ya no existe: suman al total y deben verse
    const listed = groupedData.reduce((sum, g) => sum + g.categories.reduce((s, c) => s + c.total, 0), 0)
      + orphanCategories.reduce((sum, c) => sum + c.total, 0);

    return { groupedData, orphanCategories, unlistedTotal: Math.round(totalExpenses - listed) };
  }, [categories, categoryTotals, groupTotals, totalExpenses]);

  const hasActiveFilters = !!projectId || !!range.start || !!range.end;

  return (
    <div className="space-y-4">
      {/* Total General */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-5 text-white">
        <p className="text-blue-100 text-sm font-medium mb-1">Total Gastado</p>
        <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalExpenses)}</p>
        <p className="text-xs text-blue-100 mt-2">{periodLabel}</p>
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

      {/* Lo que suma al total pero no pertenece a una categoría vigente */}
      {unlistedTotal > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800">Sin categoría vigente</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(unlistedTotal)}</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">Gastos sin categoría o con una categoría que ya no existe.</p>
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
