import { useState, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { Search, Filter, Plus, Minus, ArrowUpCircle, ArrowDownCircle, Calendar, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';
import TransactionForm from './TransactionForm';

export default function Expenses() {
  const { transactions, projects, categories, totalContributions, totalExpenses } = useDashboardData();
  const user = useAuthStore((state) => state.user);

  // Estados para modales
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'contribution' | 'expense'>('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar y ordenar transacciones
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Filtro por proyecto
    if (filterProject !== 'all') {
      filtered = filtered.filter((t) => t.projectId === filterProject);
    }

    // Filtro por categoría (solo para gastos)
    if (filterCategory !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === filterCategory);
    }

    // Búsqueda por descripción
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por fecha (más reciente primero)
    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

    return filtered;
  }, [transactions, filterType, filterProject, filterCategory, searchTerm]);

  // Calcular totales filtrados
  const filteredStats = useMemo(() => {
    const contributions = filteredTransactions
      .filter((t) => t.type === 'contribution')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { contributions, expenses };
  }, [filteredTransactions]);

  const hasActiveFilters = filterType !== 'all' || filterProject !== 'all' || filterCategory !== 'all' || searchTerm !== '';

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Historial</h1>
          <p className="text-sm text-gray-600">Gastos y aportes registrados</p>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-green-700">Aportes</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(hasActiveFilters ? filteredStats.contributions : totalContributions)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-5 h-5 text-red-600" />
            <span className="text-xs font-medium text-red-700">Gastos</span>
          </div>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(hasActiveFilters ? filteredStats.expenses : totalExpenses)}
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Botón de Filtros */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors',
          showFilters || hasActiveFilters
            ? 'bg-primary-50 border-primary-500 text-primary-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        )}
      >
        <Filter className="w-5 h-5" />
        <span className="font-medium">
          Filtros {hasActiveFilters && `(${filteredTransactions.length})`}
        </span>
      </button>

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 space-y-4">
          {/* Filtro por Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos</option>
              <option value="contribution">Solo Aportes</option>
              <option value="expense">Solo Gastos</option>
            </select>
          </div>

          {/* Filtro por Proyecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Proyecto</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Categoría (solo visible si no está filtrando solo aportes) */}
          {filterType !== 'contribution' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botón Limpiar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterType('all');
                setFilterProject('all');
                setFilterCategory('all');
                setSearchTerm('');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Lista de Transacciones */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {hasActiveFilters ? 'No hay transacciones que coincidan con los filtros' : 'No hay transacciones registradas'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const isExpense = transaction.type === 'expense';
            return (
              <div
                key={transaction.id}
                className={cn(
                  'bg-white border-2 rounded-lg p-4 shadow-sm transition-all hover:shadow-md',
                  isExpense ? 'border-red-200' : 'border-green-200'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Tipo y Fecha */}
                    <div className="flex items-center gap-2 mb-2">
                      {isExpense ? (
                        <ArrowDownCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                      <span className="text-xs text-gray-500">
                        {format(transaction.date, "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
                      </span>
                    </div>

                    {/* Descripción */}
                    <p className="font-medium text-gray-800 mb-2">{transaction.description}</p>

                    {/* Detalles */}
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Proyecto:</span> {transaction.project}
                      </p>
                      {isExpense && transaction.categoryName !== 'N/A' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Categoría:</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {transaction.categoryName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        isExpense ? 'text-red-600' : 'text-green-600'
                      )}
                    >
                      {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FABs - Floating Action Buttons */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 flex flex-col gap-3 z-40">
        {/* FAB Aporte (Verde) */}
        <button
          onClick={() => setShowContributionForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
          aria-label="Agregar Aporte"
        >
          <Plus className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
            Aporte
          </span>
        </button>

        {/* FAB Gasto (Rojo) */}
        <button
          onClick={() => setShowExpenseForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
          aria-label="Agregar Gasto"
        >
          <Minus className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
            Gasto
          </span>
        </button>
      </div>

      {/* Modales */}
      {showContributionForm && <ContributionForm onClose={() => setShowContributionForm(false)} />}
      {showExpenseForm && <TransactionForm onClose={() => setShowExpenseForm(false)} />}
    </div>
  );
}
