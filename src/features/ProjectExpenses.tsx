import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  Search, Filter, Minus, Trash2, ArrowLeft,
  FolderKanban, Receipt, ArrowDownCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TransactionForm from './TransactionForm';

export default function ProjectExpenses() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { transactions, projects, categories } = useDashboardData();

  // Estados
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const handleEditTransaction = (transaction: typeof transactions[0]) => {
    setTransactionToEdit(transaction);
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setTransactionToEdit(undefined);
  };

  // Encontrar el proyecto actual
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === projectId);
  }, [projects, projectId]);

  // Filtrar transacciones
  const projectTransactions = useMemo(() => {
    let filtered = transactions.filter(
      (t) => t.projectId === projectId && t.type === 'expense'
    );

    if (filterCategory !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === filterCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar: Más reciente primero
    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    return filtered;
  }, [transactions, projectId, filterCategory, searchTerm]);

  // Agrupar por fecha (Lógica clave para UX móvil)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: typeof projectTransactions } = {};
    projectTransactions.forEach(t => {
      // Usar getFullYear, getMonth, getDate para obtener la fecha en zona horaria local
      const year = t.date.getFullYear();
      const month = String(t.date.getMonth() + 1).padStart(2, '0');
      const day = String(t.date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [projectTransactions]);

  // Total gastado filtrado
  const totalSpent = useMemo(() => {
    return projectTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [projectTransactions]);

  const hasActiveFilters = filterCategory !== 'all' || searchTerm !== '';

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

  // --- UI ERROR SI NO EXISTE PROYECTO ---
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <FolderKanban className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-800">Proyecto no encontrado</h1>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 font-medium">Volver al inicio</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">{currentProject.name}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <FolderKanban className="w-3 h-3" /> Detalle de gastos
            </p>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2 rounded-full transition-colors relative",
              hasActiveFilters ? "bg-red-50 text-red-600" : "text-gray-400 hover:bg-gray-100"
            )}
          >
            <Filter className="w-5 h-5" />
            {hasActiveFilters && <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full" />}
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en este proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Panel Filtros */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-gray-50 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
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
            
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterCategory('all'); setSearchTerm(''); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 hover:text-red-600 mt-2"
              >
                <Trash2 className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </header>

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 max-w-7xl mx-auto space-y-5">
        
        {/* --- TARJETA RESUMEN (TOTAL GASTADO) --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Gastado</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(totalSpent)}</p>
            <div className="flex items-center gap-2 mt-2">
               <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                 {projectTransactions.length} movimientos
               </span>
            </div>
          </div>
          
          <div className="p-3 bg-red-50 rounded-2xl">
            <ArrowDownCircle className="w-8 h-8 text-red-600" />
          </div>
          
          {/* Decoración de fondo */}
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-red-50 rounded-full opacity-50 blur-xl" />
        </div>

        {/* --- LISTA AGRUPADA POR FECHAS --- */}
        <div className="space-y-6">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-12 opacity-60">
              <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">
                {hasActiveFilters ? 'Sin resultados' : 'Aún no hay gastos en este proyecto'}
              </p>
            </div>
          ) : (
            Object.entries(groupedTransactions)
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()) // Ordenar grupos descendente
              .map(([dateKey, groupItems]) => (
                <div key={dateKey}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1 sticky top-32">
                    {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: es })}
                  </h3>
                  
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {groupItems.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleEditTransaction(t)}
                        className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Icono de Categoría */}
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-red-600">
                             <Receipt className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate pr-2">
                              {t.description}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {t.categoryName !== 'N/A' && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium truncate">
                                  {t.categoryName}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {t.quantity && t.unitPrice ? (
                                  <span>{t.quantity} × {formatCurrency(t.unitPrice)}</span>
                                ) : (
                                  format(t.date, 'HH:mm')
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            -{formatCurrency(t.amount)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* --- FAB (Agregar Gasto Rápido) --- */}
      <button
        onClick={() => setShowExpenseForm(true)}
        className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl active:scale-95 transition-all z-40 flex items-center gap-2"
      >
        <Minus className="w-6 h-6" />
        <span className="font-medium text-sm pr-1">Gasto</span>
      </button>

      {/* --- MODAL FORM --- */}
      {showExpenseForm && (
        <TransactionForm
          onClose={handleCloseForm}
          defaultProjectId={projectId} // Preselecciona este proyecto
          transactionToEdit={transactionToEdit}
        />
      )}
    </div>
  );
}