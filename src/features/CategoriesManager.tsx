import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Hash,
  Activity,
  FolderOpen,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getNextOrder,
  getAllCategoryUsageCounts
} from '../services/categoryService';
import type { Category } from '../types';

interface CategoryFormData {
  id?: string;
  name: string;
  order: number;
  isGroup: boolean;
  parentId: string | null;
}

type FormType = 'group' | 'category' | null;

export default function CategoriesManager() {
  const navigate = useNavigate();
  const { categories } = useDashboardData();

  // Estados
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FormType>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    order: 1,
    isGroup: false,
    parentId: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de feedback
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Separar grupos y categorías
  const groups = useMemo(() => {
    return categories
      .filter(c => c.isGroup === true)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  const regularCategories = useMemo(() => {
    return categories
      .filter(c => c.isGroup === false || c.isGroup === undefined)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  // Cargar conteos de uso
  useEffect(() => {
    const loadUsageCounts = async () => {
      setLoadingUsage(true);
      try {
        const counts = await getAllCategoryUsageCounts(categories);
        setUsageCounts(counts);
      } catch (error) {
        console.error('Error al cargar conteos:', error);
      } finally {
        setLoadingUsage(false);
      }
    };

    if (categories.length > 0) loadUsageCounts();
    else setLoadingUsage(false);
  }, [categories]);

  // Filtrar categorías
  const filteredCategories = useMemo(() => {
    const filtered = categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupar por grupos
    const grouped: { group: Category | null; items: Category[] }[] = [];

    // Primero agregar grupos
    groups.forEach(group => {
      const groupCategories = filtered.filter(c =>
        c.parentId === group.id && !c.isGroup
      );
      if (groupCategories.length > 0 || searchTerm === '' || group.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        grouped.push({ group, items: groupCategories });
      }
    });

    // Luego categorías sin grupo
    const orphanCategories = filtered.filter(c =>
      (!c.isGroup || c.isGroup === undefined) && !c.parentId
    );
    if (orphanCategories.length > 0) {
      grouped.push({ group: null, items: orphanCategories });
    }

    return grouped;
  }, [categories, groups, searchTerm]);

  // --- HANDLERS ---
  const handleOpenCreateForm = async (type: FormType) => {
    const nextOrder = await getNextOrder();
    setFormData({
      name: '',
      order: nextOrder,
      isGroup: type === 'group',
      parentId: null
    });
    setFormType(type);
    setIsEditing(false);
    setShowForm(true);
    setMessage('');
  };

  const handleOpenEditForm = (category: Category) => {
    setFormData({
      id: category.id,
      name: category.name,
      order: category.order,
      isGroup: category.isGroup || false,
      parentId: category.parentId || null
    });
    setFormType(category.isGroup ? 'group' : 'category');
    setIsEditing(true);
    setShowForm(true);
    setMessage('');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({ name: '', order: 1, isGroup: false, parentId: null });
    setFormType(null);
    setIsEditing(false);
    setMessage('');
  };

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showFeedback('El nombre es requerido', 'error');

    setLoading(true);
    try {
      if (isEditing && formData.id) {
        await updateCategory({
          id: formData.id,
          name: formData.name.trim(),
          order: formData.order,
          isGroup: formData.isGroup,
          parentId: formData.parentId
        });
        showFeedback('Actualizado correctamente', 'success');
      } else {
        await createCategory({
          name: formData.name.trim(),
          order: formData.order,
          isGroup: formData.isGroup,
          parentId: formData.parentId
        });
        showFeedback('Creado correctamente', 'success');
      }
      setTimeout(handleCloseForm, 1000);
    } catch (error) {
      showFeedback('Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`¿Eliminar "${category.name}"?`)) return;
    setLoading(true);
    try {
      const result = await deleteCategory(category.id);
      if (result.success) showFeedback(result.message, 'success');
      else showFeedback(result.message, 'error');
    } catch (error) {
      showFeedback('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY CON BUSCADOR --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm transition-all">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Categorías</h1>
        </div>

        {/* Buscador Integrado */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar categoría o grupo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-gray-400"
          />
        </div>
      </header>

      {/* --- ALERTA FLOTANTE (Toast) --- */}
      {message && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 w-[90%] max-w-sm">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl shadow-lg border text-sm font-medium",
            messageType === 'success' ? "bg-white border-green-200 text-green-700" : "bg-white border-red-200 text-red-700"
          )}>
            {messageType === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            {message}
          </div>
        </div>
      )}

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 max-w-7xl mx-auto space-y-4">

        {/* --- LISTA DE CATEGORÍAS AGRUPADAS --- */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 opacity-60">
            <Tag className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No se encontraron resultados' : 'No hay categorías creadas'}
            </p>
          </div>
        ) : (
          filteredCategories.map((groupData, idx) => (
            <div key={groupData.group?.id || 'orphan'} className="space-y-2">
              {/* Cabecera del Grupo */}
              {groupData.group && (
                <div className="flex items-center justify-between px-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-gray-700">{groupData.group.name}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Grupo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditForm(groupData.group!)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Categorías del grupo */}
              {groupData.items.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {groupData.items.map((category) => {
                    const usageCount = usageCounts.get(category.id) || 0;
                    const canDelete = usageCount === 0;

                    return (
                      <div key={category.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Icono / Orden */}
                          <div className="w-10 h-10 rounded-xl bg-purple-50 flex flex-col items-center justify-center flex-shrink-0 text-purple-600 border border-purple-100">
                            <span className="text-[10px] font-bold">#{category.order}</span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{category.name}</p>

                            {/* Info de uso */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {loadingUsage ? (
                                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                              ) : (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1",
                                  usageCount > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                                )}>
                                  <Activity className="w-3 h-3" />
                                  {usageCount > 0 ? `${usageCount} usos` : 'Sin uso'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditForm(category)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {canDelete && !loadingUsage && (
                            <button
                              onClick={() => handleDelete(category)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sin categorías asignadas */}
              {!groupData.group && groupData.items.length === 0 && (
                <div className="text-xs text-gray-400 px-2">Sin categorías asignadas</div>
              )}
            </div>
          ))
        )}

        {/* --- INFO CARD COMPACTA --- */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-3 items-start">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Los <strong>grupos</strong> organizan las categorías. Asigna cada categoría a un grupo para mejor organización.
          </p>
        </div>

      </div>

      {/* --- FAB CON MENÚ EXPANDIBLE --- */}
      <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleOpenCreateForm('group')}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 rounded-full pl-4 pr-3 py-2.5 shadow-lg border border-gray-200 active:scale-95 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="font-medium text-sm">Nuevo Grupo</span>
          </button>

          <button
            onClick={() => handleOpenCreateForm('category')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white rounded-full pl-4 pr-3 py-2.5 shadow-xl active:scale-95 transition-all"
          >
            <Tag className="w-4 h-4" />
            <span className="font-medium text-sm">Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* --- MODAL FORMULARIO --- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-800">
                {isEditing
                  ? (formType === 'group' ? 'Editar Grupo' : 'Editar Categoría')
                  : (formType === 'group' ? 'Nuevo Grupo' : 'Nueva Categoría')}
              </h2>
              <button onClick={handleCloseForm} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formType === 'group' ? "Ej: Materiales" : "Ej: Cemento"}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Selector de Grupo Padre (solo para categorías) */}
              {formType === 'category' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Grupo</label>
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition-all appearance-none"
                    >
                      <option value="">Sin grupo</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Orden de aparición</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
