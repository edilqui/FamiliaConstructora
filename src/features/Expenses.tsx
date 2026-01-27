import { useState, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Search, Filter, Plus, Minus, ArrowUpCircle, ArrowDownCircle, 
  Trash2, X, Wallet
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';
import TransactionForm from './TransactionForm';
import NotificationButton from '../components/NotificationButton';

export default function Expenses() {
  const { transactions, projects, categories, totalContributions, totalExpenses } = useDashboardData();
  const user = useAuthStore((state) => state.user);

  // Estados
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);

  // Estado para menú de acciones flotante (FAB expandible)
  const [isFabOpen, setIsFabOpen] = useState(false);

  const handleEditTransaction = (transaction: typeof transactions[0]) => {
    setTransactionToEdit(transaction);
    if (transaction.type === 'expense') {
      setShowExpenseForm(true);
    } else {
      setShowContributionForm(true);
    }
  };

  const handleCloseExpenseForm = () => {
    setShowExpenseForm(false);
    setTransactionToEdit(undefined);
  };

  const handleCloseContributionForm = () => {
    setShowContributionForm(false);
    setTransactionToEdit(undefined);
  };

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'contribution' | 'expense'>('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- LÓGICA DE FILTRADO ---
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filterType !== 'all') filtered = filtered.filter((t) => t.type === filterType);
    if (filterProject !== 'all') filtered = filtered.filter((t) => t.projectId === filterProject);
    if (filterCategory !== 'all') filtered = filtered.filter((t) => t.categoryId === filterCategory);
    
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    return filtered;
  }, [transactions, filterType, filterProject, filterCategory, searchTerm]);

  const filteredStats = useMemo(() => {
    const contributions = filteredTransactions
      .filter((t) => t.type === 'contribution')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    return { contributions, expenses };
  }, [filteredTransactions]);

  const hasActiveFilters = filterType !== 'all' || filterProject !== 'all' || filterCategory !== 'all' || searchTerm !== '';

  // Organizar categorías por grupos para el filtro
  const groupedCategories = useMemo(() => {
    const groups = categories.filter(c => c.isGroup === true);
    const regularCategories = categories.filter(c => c.isGroup === false || c.isGroup === undefined);

    const grouped: { group: { id: string; name: string } | null; items: typeof categories }[] = [];

    // Categorías agrupadas por su parent
    groups.forEach(group => {
      const groupItems = regularCategories.filter(c => c.parentId === group.id);
      if (groupItems.length > 0) {
        grouped.push({ group: { id: group.id, name: group.name }, items: groupItems });
      }
    });

    // Categorías sin grupo (huérfanas)
    const orphanCategories = regularCategories.filter(c => !c.parentId);
    if (orphanCategories.length > 0) {
      grouped.push({ group: null, items: orphanCategories });
    }

    return grouped;
  }, [categories]);

  // --- AGRUPACIÓN POR FECHA (CORREGIDA) ---
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: typeof filteredTransactions } = {};
    filteredTransactions.forEach(t => {
      // Usamos getFullYear, getMonth, getDate para obtener la fecha LOCAL
      const date = new Date(t.date); 
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Creamos la llave como string "2026-01-24"
      const dateKey = `${year}-${month}-${day}`;
      
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Historial</h1>

          <div className="flex items-center gap-2">
            <NotificationButton />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                hasActiveFilters ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <Filter className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>

        {/* Buscador Integrado */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar gasto o aporte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Panel de Filtros Expandible */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-gray-50 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todos los tipos</option>
                <option value="contribution">Solo Ingresos</option>
                <option value="expense">Solo Gastos</option>
              </select>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="bg-gray-50 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todos los proy.</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            {filterType !== 'contribution' && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-gray-50 text-sm border border-gray-200 rounded-lg px-2 py-2 mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todas las categorías</option>
                {groupedCategories.map((group, index) => {
                  if (group.group) {
                    // Categorías agrupadas
                    return (
                      <optgroup key={group.group.id} label={group.group.name}>
                        {group.items.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                    );
                  } else {
                    // Categorías sin grupo
                    return (
                      <optgroup key={`orphan-${index}`} label="Sin grupo">
                        {group.items.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                    );
                  }
                })}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterType('all'); setFilterProject('all'); setFilterCategory('all'); setSearchTerm('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg mt-1"
              >
                <Trash2 className="w-3 h-3" /> Limpiar todo
              </button>
            )}
          </div>
        )}
      </header>

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 max-w-7xl mx-auto">
        
        {/* --- WIDGETS DE RESUMEN --- */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <ArrowUpCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Total Aportes</p>
            <p className="text-xl font-bold text-emerald-800">
              {formatCurrency((hasActiveFilters ? filteredStats.contributions : totalContributions) || 0)}
            </p>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
              <ArrowDownCircle className="w-12 h-12 text-red-600" />
            </div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Total Gastos</p>
            <p className="text-xl font-bold text-red-800">
              {formatCurrency((hasActiveFilters ? filteredStats.expenses : totalExpenses) || 0)}
            </p>
          </div>
        </div>

        {/* --- LISTA DE TRANSACCIONES --- */}
        <div className="space-y-6">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
              <p className="text-gray-500 text-sm">No se encontraron movimientos</p>
            </div>
          ) : (
            Object.entries(groupedTransactions)
              .sort((a, b) => new Date(b[0] + 'T12:00:00').getTime() - new Date(a[0] + 'T12:00:00').getTime())
              .map(([dateKey, groupItems]) => {
                
                // --- CORRECCIÓN DE FECHA ---
                const [year, month, day] = dateKey.split('-').map(Number);
                const headerDate = new Date(year, month - 1, day);

                return (
                  <div key={dateKey}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-28 ml-1">
                      {format(headerDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </h3>
                    
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Header de tabla (solo desktop) */}
                      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_180px_150px_120px_140px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="w-10"></div>
                        <div>Descripción</div>
                        <div>Proyecto</div>
                        <div>Categoría</div>
                        <div className="text-center">Detalle</div>
                        <div className="text-right">Monto</div>
                      </div>

                      {/* Filas */}
                      <div className="divide-y divide-gray-50">
                        {groupItems.map((t) => {
                          const isExpense = t.type === 'expense';
                          return (
                            <button
                              key={t.id}
                              onClick={() => handleEditTransaction(t)}
                              className="w-full p-3.5 lg:px-4 lg:py-3 flex lg:grid lg:grid-cols-[auto_1fr_180px_150px_120px_140px] items-center gap-3 lg:gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                            >
                              {/* Icono */}
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                isExpense ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                              )}>
                                {isExpense ? <ArrowDownCircle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                              </div>

                              {/* Descripción - Layout móvil y desktop */}
                              <div className="flex-1 min-w-0 lg:flex-none">
                                <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                                {/* Info adicional solo en móvil */}
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 lg:hidden">
                                  <span className="truncate max-w-[100px]">{t.project}</span>
                                  {isExpense && t.categoryName !== 'N/A' && (
                                    <>
                                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                      <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        {t.categoryName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Columnas solo desktop */}
                              <div className="hidden lg:block text-sm text-gray-600 truncate">
                                {t.project}
                              </div>

                              <div className="hidden lg:block">
                                {isExpense && t.categoryName !== 'N/A' ? (
                                  <span className="inline-block text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md font-medium truncate max-w-full">
                                    {t.categoryName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>

                              <div className="hidden lg:block text-center text-xs text-gray-500">
                                {t.quantity && t.unitPrice ? (
                                  <span className="font-medium">{t.quantity} × {formatCurrency(t.unitPrice)}</span>
                                ) : (
                                  <span className="text-gray-400">{format(t.date, 'HH:mm')}</span>
                                )}
                              </div>

                              {/* Monto */}
                              <div className="text-right flex-shrink-0">
                                <p className={cn(
                                  "text-sm lg:text-base font-bold",
                                  isExpense ? "text-gray-900" : "text-emerald-600"
                                )}>
                                  {isExpense ? '-' : '+'}{formatCurrency(t.amount || 0)}
                                </p>
                                {/* Detalle solo móvil */}
                                <p className="text-[10px] text-gray-400 mt-0.5 lg:hidden">
                                  {t.quantity && t.unitPrice ? (
                                    <span>{t.quantity} × {formatCurrency(t.unitPrice)}</span>
                                  ) : (
                                    format(t.date, 'HH:mm')
                                  )}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* --- BOTÓN FLOTANTE (FAB) RESTAURADO --- */}
      <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3">
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-1">
            <button 
              onClick={() => { setShowContributionForm(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 pr-1 group"
            >
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">
                Nuevo Aporte
              </span>
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
            </button>

            <button 
              onClick={() => { setShowExpenseForm(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 pr-1 group"
            >
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">
                Registrar Gasto
              </span>
              <div className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                <Minus className="w-6 h-6" />
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 bg-gray-900 text-white",
            isFabOpen && "rotate-45"
          )}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Modales */}
      {showContributionForm && (
        <ContributionForm
          onClose={handleCloseContributionForm}
          transactionToEdit={transactionToEdit?.type === 'contribution' ? transactionToEdit : undefined}
        />
      )}
      {showExpenseForm && (
        <TransactionForm
          onClose={handleCloseExpenseForm}
          transactionToEdit={transactionToEdit?.type === 'expense' ? transactionToEdit : undefined}
        />
      )}
    </div>
  );
}