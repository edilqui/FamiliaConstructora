import { useState, useMemo, useRef, useCallback } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useConstructionData } from '../hooks/useConstructionData';
import { useAuthStore } from '../store/useAuthStore';
import {
  Search, Filter, Plus, Minus, ArrowUpCircle, ArrowDownCircle,
  Trash2, Wallet, ArrowLeft, MoreVertical, Check, Tag, HardHat,
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';
import TransactionForm from './TransactionForm';
import NotificationButton from '../components/NotificationButton';
import CategorySelector from '../components/CategorySelector';
import ActivitySelector from '../components/ActivitySelector';
import { bulkUpdateTransactions, bulkClearActivityFromTransactions } from '../services/transactionService';

export default function Expenses() {
  const { transactions, projects, categories, totalContributions, totalExpenses } = useDashboardData();
  const { stages, activities } = useConstructionData();
  const user = useAuthStore((state) => state.user);

  // ── Formularios normales ────────────────────────────────────────────────────
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const handleEditTransaction = (transaction: typeof transactions[0]) => {
    setTransactionToEdit(transaction);
    if (transaction.type === 'expense') setShowExpenseForm(true);
    else setShowContributionForm(true);
  };
  const handleCloseExpenseForm = () => { setShowExpenseForm(false); setTransactionToEdit(undefined); };
  const handleCloseContributionForm = () => { setShowContributionForm(false); setTransactionToEdit(undefined); };

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'contribution' | 'expense'>('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // ── Selección múltiple ──────────────────────────────────────────────────────
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'none' | 'menu' | 'category' | 'activity'>('none');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkCategoryName, setBulkCategoryName] = useState('');
  const [bulkStageId, setBulkStageId] = useState('');
  const [bulkStageName, setBulkStageName] = useState('');
  const [bulkActivityId, setBulkActivityId] = useState('');
  const [bulkActivityName, setBulkActivityName] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // ── Long press refs ─────────────────────────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivated = useRef(false);

  const startLongPress = useCallback((id: string) => {
    longPressActivated.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleItemClick = (t: typeof transactions[0]) => {
    if (longPressActivated.current) {
      longPressActivated.current = false;
      return;
    }
    if (isSelectionMode) {
      toggleSelection(t.id);
      return;
    }
    handleEditTransaction(t);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredTransactions.map(t => t.id)));

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setBulkAction('none');
    setBulkError('');
  };

  // ── Bulk actions (solo aplican a gastos) ───────────────────────────────────
  const handleBulkCategory = async () => {
    if (!bulkCategoryId) { setBulkError('Selecciona una categoría'); return; }
    if (selectedExpenseIds.length === 0) { setBulkError('Ningún gasto seleccionado'); return; }
    setIsBulkSaving(true); setBulkError('');
    try {
      await bulkUpdateTransactions(selectedExpenseIds, { categoryId: bulkCategoryId, categoryName: bulkCategoryName });
      exitSelectionMode();
    } catch { setBulkError('Error al guardar, intenta de nuevo'); }
    finally { setIsBulkSaving(false); }
  };

  const handleBulkActivity = async () => {
    if (!bulkActivityId) { setBulkError('Selecciona una actividad'); return; }
    if (selectedExpenseIds.length === 0) { setBulkError('Ningún gasto seleccionado'); return; }
    setIsBulkSaving(true); setBulkError('');
    try {
      await bulkUpdateTransactions(selectedExpenseIds, {
        stageId: bulkStageId, stageName: bulkStageName,
        activityId: bulkActivityId, activityName: bulkActivityName,
      });
      exitSelectionMode();
    } catch { setBulkError('Error al guardar, intenta de nuevo'); }
    finally { setIsBulkSaving(false); }
  };

  const handleBulkClearActivity = async () => {
    if (selectedExpenseIds.length === 0) { setBulkError('Ningún gasto seleccionado'); return; }
    setIsBulkSaving(true); setBulkError('');
    try {
      await bulkClearActivityFromTransactions(selectedExpenseIds);
      exitSelectionMode();
    } catch { setBulkError('Error al guardar, intenta de nuevo'); }
    finally { setIsBulkSaving(false); }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (filterType !== 'all') filtered = filtered.filter(t => t.type === filterType);
    if (filterProject !== 'all') filtered = filtered.filter(t => t.projectId === filterProject);
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.categoryId === filterCategory);
    if (searchTerm) filtered = filtered.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    return filtered;
  }, [transactions, filterType, filterProject, filterCategory, searchTerm]);

  const filteredStats = useMemo(() => ({
    contributions: filteredTransactions.filter(t => t.type === 'contribution').reduce((s, t) => s + t.amount, 0),
    expenses: filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  }), [filteredTransactions]);

  const selectedTotal = useMemo(
    () => filteredTransactions.filter(t => selectedIds.has(t.id)).reduce((s, t) => s + t.amount, 0),
    [filteredTransactions, selectedIds],
  );

  const hasActiveFilters = filterType !== 'all' || filterProject !== 'all' || filterCategory !== 'all' || searchTerm !== '';
  const allVisibleSelected = filteredTransactions.length > 0 && filteredTransactions.every(t => selectedIds.has(t.id));

  // Solo los gastos dentro de la selección son elegibles para cambios de categoría/actividad
  const selectedExpenseIds = useMemo(
    () => filteredTransactions.filter(t => selectedIds.has(t.id) && t.type === 'expense').map(t => t.id),
    [filteredTransactions, selectedIds],
  );

  const groupedCategories = useMemo(() => {
    const groups = categories.filter(c => c.isGroup === true);
    const regular = categories.filter(c => !c.isGroup);
    const grouped: { group: { id: string; name: string } | null; items: typeof categories }[] = [];
    groups.forEach(g => {
      const items = regular.filter(c => c.parentId === g.id);
      if (items.length > 0) grouped.push({ group: { id: g.id, name: g.name }, items });
    });
    const orphans = regular.filter(c => !c.parentId);
    if (orphans.length > 0) grouped.push({ group: null, items: orphans });
    return grouped;
  }, [categories]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: typeof filteredTransactions } = {};
    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const { hidden, spacerHeight, headerRef } = useScrollAwareHeader();
  const headerHidden = !isSelectionMode && hidden;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* HEADER */}
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >

        {isSelectionMode ? (
          /* ── Barra de selección ── */
          <div className="flex items-center gap-3 min-h-[40px]">
            <button
              onClick={exitSelectionMode}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">
                {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-600 font-semibold">{formatCurrency(selectedTotal)}</p>
            </div>
            <button
              onClick={allVisibleSelected ? () => setSelectedIds(new Set()) : selectAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              {allVisibleSelected ? 'Ninguno' : 'Todos'}
            </button>
            <button
              onClick={() => { setBulkAction('menu'); setBulkError(''); }}
              disabled={selectedIds.size === 0}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 flex-shrink-0"
            >
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        ) : (
          /* ── Header normal ── */
          <>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Historial</h1>
              <div className="flex items-center gap-2">
                <NotificationButton />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn('p-2 rounded-full transition-colors relative', hasActiveFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100')}
                >
                  <Filter className="w-5 h-5" />
                  {hasActiveFilters && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />}
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar gasto o aporte..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
              />
            </div>
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="bg-gray-50 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">Todos los tipos</option>
                    <option value="contribution">Solo Ingresos</option>
                    <option value="expense">Solo Gastos</option>
                  </select>
                  <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="bg-gray-50 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">Todos los proy.</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {filterType !== 'contribution' && (
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-gray-50 text-sm border border-gray-200 rounded-lg px-2 py-2 mb-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">Todas las categorías</option>
                    {groupedCategories.map((group, idx) =>
                      group.group
                        ? <optgroup key={group.group.id} label={group.group.name}>{group.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                        : <optgroup key={`orphan-${idx}`} label="Sin grupo">{group.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                    )}
                  </select>
                )}
                {hasActiveFilters && (
                  <button onClick={() => { setFilterType('all'); setFilterProject('all'); setFilterCategory('all'); setSearchTerm(''); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg mt-1">
                    <Trash2 className="w-3 h-3" /> Limpiar todo
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 max-w-7xl mx-auto">

        {/* RESUMEN */}
        {!isSelectionMode && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><ArrowUpCircle className="w-12 h-12 text-emerald-600" /></div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Total Aportes</p>
              <p className="text-xl font-bold text-emerald-800">{formatCurrency((hasActiveFilters ? filteredStats.contributions : totalContributions) || 0)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><ArrowDownCircle className="w-12 h-12 text-red-600" /></div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Total Gastos</p>
              <p className="text-xl font-bold text-red-800">{formatCurrency((hasActiveFilters ? filteredStats.expenses : totalExpenses) || 0)}</p>
            </div>
          </div>
        )}

        {/* HINT de selección (solo aparece cuando hay items) */}
        {!isSelectionMode && filteredTransactions.length > 0 && (
          <p className="text-[10px] text-gray-400 text-center mb-3 select-none">
            Mantén presionado un movimiento para seleccionarlo
          </p>
        )}

        {/* LISTA DE TRANSACCIONES */}
        <div className="space-y-6">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
              <p className="text-gray-500 text-sm">No se encontraron movimientos</p>
            </div>
          ) : (
            Object.entries(groupedTransactions)
              .sort((a, b) => new Date(b[0] + 'T12:00:00').getTime() - new Date(a[0] + 'T12:00:00').getTime())
              .map(([dateKey, groupItems]) => {
                const [year, month, day] = dateKey.split('-').map(Number);
                const headerDate = new Date(year, month - 1, day);
                return (
                  <div key={dateKey}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-28 ml-1">
                      {format(headerDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Header tabla desktop */}
                      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_180px_150px_120px_140px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="w-10" />
                        <div>Descripción</div>
                        <div>Proyecto</div>
                        <div>Categoría</div>
                        <div className="text-center">Detalle</div>
                        <div className="text-right">Monto</div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {groupItems.map(t => {
                          const isExpense = t.type === 'expense';
                          const isSelected = selectedIds.has(t.id);
                          return (
                            <button
                              key={t.id}
                              onClick={() => handleItemClick(t)}
                              onTouchStart={() => startLongPress(t.id)}
                              onTouchEnd={cancelLongPress}
                              onTouchMove={cancelLongPress}
                              onMouseDown={() => startLongPress(t.id)}
                              onMouseUp={cancelLongPress}
                              onMouseLeave={cancelLongPress}
                              onContextMenu={e => e.preventDefault()}
                              className={cn(
                                'w-full p-3.5 lg:px-4 lg:py-3 flex lg:grid lg:grid-cols-[auto_1fr_180px_150px_120px_140px] items-center gap-3 lg:gap-4 transition-colors text-left select-none',
                                isSelectionMode && isSelected ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-100',
                              )}
                            >
                              {/* Icono / Checkbox */}
                              <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                                isSelectionMode
                                  ? isSelected ? 'bg-blue-500' : 'bg-white border-2 border-gray-300'
                                  : isExpense ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500',
                              )}>
                                {isSelectionMode
                                  ? isSelected && <Check className="w-5 h-5 text-white" />
                                  : isExpense ? <ArrowDownCircle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                              </div>

                              {/* Descripción */}
                              <div className="flex-1 min-w-0 lg:flex-none">
                                <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 lg:hidden">
                                  <span className="truncate max-w-[100px]">{t.project}</span>
                                  {isExpense && t.categoryName !== 'N/A' && (
                                    <>
                                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                      <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-medium">{t.categoryName}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Columnas desktop */}
                              <div className="hidden lg:block text-sm text-gray-600 truncate">{t.project}</div>
                              <div className="hidden lg:block">
                                {isExpense && t.categoryName !== 'N/A'
                                  ? <span className="inline-block text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md font-medium truncate max-w-full">{t.categoryName}</span>
                                  : <span className="text-xs text-gray-400">—</span>}
                              </div>
                              <div className="hidden lg:block text-center text-xs text-gray-500">
                                {t.quantity && t.unitPrice
                                  ? <span className="font-medium">{t.quantity} × {formatCurrency(t.unitPrice)}</span>
                                  : <span className="text-gray-400">{format(t.date, 'HH:mm')}</span>}
                              </div>

                              {/* Monto */}
                              <div className="text-right flex-shrink-0">
                                <p className={cn('text-sm lg:text-base font-bold', isExpense ? 'text-gray-900' : 'text-emerald-600')}>
                                  {isExpense ? '-' : '+'}{formatCurrency(t.amount || 0)}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5 lg:hidden">
                                  {t.quantity && t.unitPrice
                                    ? <span>{t.quantity} × {formatCurrency(t.unitPrice)}</span>
                                    : format(t.date, 'HH:mm')}
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

      {/* FAB */}
      {!isSelectionMode && (
        <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3">
          {isFabOpen && (
            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-1">
              <button onClick={() => { setShowContributionForm(true); setIsFabOpen(false); }} className="flex items-center gap-3 pr-1">
                <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">Nuevo Aporte</span>
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"><Plus className="w-6 h-6" /></div>
              </button>
              <button onClick={() => { setShowExpenseForm(true); setIsFabOpen(false); }} className="flex items-center gap-3 pr-1">
                <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100">Registrar Gasto</span>
                <div className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors"><Minus className="w-6 h-6" /></div>
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
      )}

      {/* ── MENÚ BULK (bottom sheet) ── */}
      {bulkAction === 'menu' && (
        <div className="fixed inset-0 bottom-20 sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBulkAction('none')} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
            <p className="px-5 pt-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Acciones en lote · {selectedIds.size} transacciones
            </p>
            <div className="divide-y divide-gray-50 px-3 pb-3">
              <button
                onClick={() => { setBulkAction('category'); setBulkCategoryId(''); setBulkCategoryName(''); setBulkError(''); }}
                className="w-full flex items-center gap-4 px-3 py-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Cambiar Categoría</p>
                  <p className="text-xs text-gray-400">Asignar la misma categoría a todas</p>
                </div>
              </button>
              <button
                onClick={() => { setBulkAction('activity'); setBulkStageId(''); setBulkStageName(''); setBulkActivityId(''); setBulkActivityName(''); setBulkError(''); }}
                className="w-full flex items-center gap-4 px-3 py-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <HardHat className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Cambiar Etapa y Actividad</p>
                  <p className="text-xs text-gray-400">Asociar a la misma actividad de obra</p>
                </div>
              </button>
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setBulkAction('none')} className="w-full py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL BULK CATEGORÍA ── */}
      {bulkAction === 'category' && (
        <div className="fixed inset-0 bottom-20 sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBulkAction('menu')} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Cambiar Categoría</h2>
                  <p className="text-xs text-gray-400">
                    {selectedExpenseIds.length} gasto{selectedExpenseIds.length !== 1 ? 's' : ''} afectado{selectedExpenseIds.length !== 1 ? 's' : ''}
                    {selectedIds.size > selectedExpenseIds.length && (
                      <span className="text-amber-500"> · {selectedIds.size - selectedExpenseIds.length} ingreso{selectedIds.size - selectedExpenseIds.length !== 1 ? 's' : ''} ignorado{selectedIds.size - selectedExpenseIds.length !== 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
              </div>
              <CategorySelector
                categories={categories.filter(c => !c.isGroup)}
                value={bulkCategoryId}
                onChange={(id) => {
                  const cat = categories.find(c => c.id === id);
                  setBulkCategoryId(id);
                  setBulkCategoryName(cat?.name ?? '');
                  setBulkError('');
                }}
                placeholder="Seleccionar categoría..."
              />
              {bulkError && <p className="text-xs text-red-500 mt-2">{bulkError}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={() => setBulkAction('menu')} className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl">
                  Atrás
                </button>
                <button
                  onClick={handleBulkCategory}
                  disabled={isBulkSaving || !bulkCategoryId}
                  className="flex-1 py-3 text-sm font-bold text-white bg-purple-600 rounded-2xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isBulkSaving ? 'Guardando...' : 'Aplicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL BULK ACTIVIDAD ── */}
      {bulkAction === 'activity' && (
        <div className="fixed inset-0 bottom-20 sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBulkAction('menu')} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Cambiar Etapa y Actividad</h2>
                  <p className="text-xs text-gray-400">
                    {selectedExpenseIds.length} gasto{selectedExpenseIds.length !== 1 ? 's' : ''} afectado{selectedExpenseIds.length !== 1 ? 's' : ''}
                    {selectedIds.size > selectedExpenseIds.length && (
                      <span className="text-amber-500"> · {selectedIds.size - selectedExpenseIds.length} ingreso{selectedIds.size - selectedExpenseIds.length !== 1 ? 's' : ''} ignorado{selectedIds.size - selectedExpenseIds.length !== 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
              </div>
              <ActivitySelector
                stages={stages}
                activities={activities}
                selectedStageId={bulkStageId}
                selectedActivityId={bulkActivityId}
                onStageChange={(id, name) => { setBulkStageId(id); setBulkStageName(name); setBulkActivityId(''); setBulkActivityName(''); setBulkError(''); }}
                onActivityChange={(id, name) => { setBulkActivityId(id); setBulkActivityName(name); setBulkError(''); }}
              />
              {bulkError && <p className="text-xs text-red-500 mt-2">{bulkError}</p>}
              <button
                onClick={handleBulkClearActivity}
                disabled={isBulkSaving}
                className="w-full mt-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Quitar asociación de obra a todas
              </button>
              <div className="flex gap-3 mt-3">
                <button onClick={() => setBulkAction('menu')} className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl">
                  Atrás
                </button>
                <button
                  onClick={handleBulkActivity}
                  disabled={isBulkSaving || !bulkActivityId}
                  className="flex-1 py-3 text-sm font-bold text-white bg-orange-500 rounded-2xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {isBulkSaving ? 'Guardando...' : 'Aplicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales normales */}
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
