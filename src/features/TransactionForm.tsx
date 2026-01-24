import { useState, FormEvent, useEffect } from 'react';
import { X, Loader2, Receipt, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { addTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import type { Transaction } from '../types';

interface TransactionFormProps {
  onClose: () => void;
  defaultProjectId?: string;
  transactionToEdit?: Transaction; // Nueva prop para edición
}

export default function TransactionForm({ onClose, defaultProjectId, transactionToEdit }: TransactionFormProps) {
  const { projects, categories, totalInBox } = useDashboardData();
  const user = useAuthStore((state) => state.user);

  const isEditMode = !!transactionToEdit;

  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Cargar datos si está en modo edición
  useEffect(() => {
    if (transactionToEdit) {
      setProjectId(transactionToEdit.projectId || '');
      setCategoryId(transactionToEdit.categoryId || '');
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description);
      setDate(format(transactionToEdit.date, 'yyyy-MM-dd'));
    }
  }, [transactionToEdit]);

  // Log para depuración
  console.log('📊 TransactionForm - Categorías recibidas:', categories.length, categories);

  const handleDelete = async () => {
    if (!transactionToEdit) return;

    setLoading(true);
    try {
      await deleteTransaction(transactionToEdit.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
      setError('Error al eliminar. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Debes iniciar sesión');
      return;
    }

    if (!projectId) {
      setError('Selecciona un proyecto');
      return;
    }

    if (!categoryId) {
      setError('Selecciona una categoría');
      return;
    }

    const amountValue = parseFloat(amount);
    if (!amount || amountValue <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    // Validar que hay suficiente dinero en caja (solo al crear, no al editar)
    if (!isEditMode && amountValue > totalInBox) {
      setError(`No hay suficiente dinero en caja. Disponible: ${formatCurrency(totalInBox)}`);
      return;
    }

    setLoading(true);

    try {
      const selectedProject = projects.find(p => p.id === projectId);
      const selectedCategory = categories.find(c => c.id === categoryId);

      if (isEditMode && transactionToEdit) {
        // Actualizar transacción existente
        await updateTransaction({
          id: transactionToEdit.id,
          amount: amountValue,
          project: selectedProject?.name || 'Gasto',
          type: 'expense',
          projectId: projectId,
          categoryId: categoryId,
          categoryName: selectedCategory?.name || 'Sin categoría',
          userId: transactionToEdit.userId, // Mantener el usuario original
          description: description || `Gasto en ${selectedProject?.name}`,
          date: new Date(date),
        });
      } else {
        // Crear nueva transacción
        await addTransaction({
          amount: amountValue,
          project: selectedProject?.name || 'Gasto',
          type: 'expense',
          projectId: projectId,
          categoryId: categoryId,
          categoryName: selectedCategory?.name || 'Sin categoría',
          userId: user.id,
          registeredBy: user.id,
          description: description || `Gasto en ${selectedProject?.name}`,
          date: new Date(date),
        });
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      setError('Error al guardar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-full">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {isEditMode ? 'Editar Gasto' : 'Registrar Gasto'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
                aria-label="Eliminar"
                title="Eliminar gasto"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Saldo disponible */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Disponible en caja:</strong> {formatCurrency(totalInBox)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Este gasto se restará del total en caja
            </p>
          </div>

          {/* Proyecto */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
              Proyecto
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar proyecto...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Categoría del Gasto
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monto */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Monto del Gasto
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del Gasto
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Compra de cerámica, Pago de mano de obra..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Gasto
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Fecha en que se realizó el gasto
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                isEditMode ? 'Actualizar Gasto' : 'Registrar Gasto'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirmar Eliminación</h3>
            </div>

            <p className="text-gray-700 mb-2">
              ¿Estás seguro de que deseas eliminar este gasto?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Advertencia:</strong> Esta acción es irreversible. Se actualizarán automáticamente:
              </p>
              <ul className="text-xs text-yellow-700 mt-2 ml-4 list-disc space-y-1">
                <li>Total en caja</li>
                <li>Balance de todos los hermanos</li>
                <li>Estadísticas del proyecto</li>
                <li>Todos los gráficos y reportes</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className={cn(
                  'flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
