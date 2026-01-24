import { useState, useEffect, FormEvent } from 'react';
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
  AlertCircle,
  CheckCircle2,
  Hash
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
}

export default function CategoriesManager() {
  const navigate = useNavigate();
  const { categories } = useDashboardData();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', order: 1 });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Cargar conteos de uso
  useEffect(() => {
    const loadUsageCounts = async () => {
      setLoadingUsage(true);
      try {
        const counts = await getAllCategoryUsageCounts(categories);
        setUsageCounts(counts);
      } catch (error) {
        console.error('Error al cargar conteos de uso:', error);
      } finally {
        setLoadingUsage(false);
      }
    };

    if (categories.length > 0) {
      loadUsageCounts();
    } else {
      setLoadingUsage(false);
    }
  }, [categories]);

  const handleOpenCreateForm = async () => {
    const nextOrder = await getNextOrder();
    setFormData({ name: '', order: nextOrder });
    setIsEditing(false);
    setShowForm(true);
    setMessage('');
  };

  const handleOpenEditForm = (category: Category) => {
    setFormData({ id: category.id, name: category.name, order: category.order });
    setIsEditing(true);
    setShowForm(true);
    setMessage('');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({ name: '', order: 1 });
    setIsEditing(false);
    setMessage('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!formData.name.trim()) {
      setMessage('El nombre es requerido');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && formData.id) {
        await updateCategory({
          id: formData.id,
          name: formData.name.trim(),
          order: formData.order,
        });
        setMessage('Categoría actualizada exitosamente');
      } else {
        await createCategory({
          name: formData.name.trim(),
          order: formData.order,
        });
        setMessage('Categoría creada exitosamente');
      }

      setMessageType('success');
      setTimeout(() => {
        handleCloseForm();
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      setMessage('Error al guardar. Intenta nuevamente.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar la categoría "${category.name}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await deleteCategory(category.id);

      if (result.success) {
        setMessage(result.message);
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message);
        setMessageType('error');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      setMessage('Error al eliminar. Intenta nuevamente.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-purple-100 rounded-full">
            <Tag className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Categorías</h1>
            <p className="text-sm text-gray-600">Gestionar categorías de gastos</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'p-3 rounded-lg flex items-start gap-2',
            messageType === 'success' && 'bg-green-50 border border-green-200 text-green-800',
            messageType === 'error' && 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {messageType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-2">No hay categorías</p>
            <p className="text-sm text-gray-400">Crea la primera categoría para comenzar</p>
          </div>
        ) : (
          categories.map((category) => {
            const usageCount = usageCounts.get(category.id) || 0;
            const canDelete = usageCount === 0;

            return (
              <div
                key={category.id}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Tag className="w-5 h-5 text-purple-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-800">{category.name}</p>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {category.order}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600">
                        {loadingUsage ? (
                          <span className="text-gray-400">Cargando...</span>
                        ) : (
                          <>
                            {usageCount === 0 ? (
                              <span className="text-gray-400">Sin usar</span>
                            ) : (
                              <span>
                                Usado en <strong>{usageCount}</strong> transacción{usageCount !== 1 ? 'es' : ''}
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditForm(category)}
                      disabled={loading}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDelete(category)}
                      disabled={loading || !canDelete || loadingUsage}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        canDelete && !loadingUsage
                          ? 'hover:bg-red-50 text-red-600'
                          : 'text-gray-300 cursor-not-allowed'
                      )}
                      aria-label="Eliminar"
                      title={!canDelete ? 'No se puede eliminar porque está en uso' : 'Eliminar'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Solo puedes eliminar categorías que no estén en uso</li>
              <li>El número de orden determina cómo aparecen en los formularios</li>
              <li>Puedes editar el nombre y orden de cualquier categoría</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAB - Add Category */}
      <button
        onClick={handleOpenCreateForm}
        className="fixed bottom-20 sm:bottom-24 right-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-40 flex items-center gap-2 group"
        aria-label="Agregar Categoría"
      >
        <Plus className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
          Nueva Categoría
        </span>
      </button>

      {/* Modal - Create/Edit Category */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-full">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Nombre */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Categoría
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Materiales, Jornales..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              {/* Orden */}
              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2">
                  Orden (posición en la lista)
                </label>
                <input
                  id="order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Las categorías se ordenan de menor a mayor número
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>{isEditing ? 'Actualizar' : 'Crear Categoría'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
