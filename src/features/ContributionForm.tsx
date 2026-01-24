import { useState, FormEvent, useEffect } from 'react';
import { X, Loader2, DollarSign, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { addTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import type { Transaction } from '../types';

interface ContributionFormProps {
  onClose: () => void;
  transactionToEdit?: Transaction; // Nueva prop para edición
}

export default function ContributionForm({ onClose, transactionToEdit }: ContributionFormProps) {
  const { users } = useDashboardData();
  const currentUser = useAuthStore((state) => state.user);

  const isEditMode = !!transactionToEdit;

  const [userId, setUserId] = useState(currentUser?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Cargar datos si está en modo edición
  useEffect(() => {
    if (transactionToEdit) {
      setUserId(transactionToEdit.userId);
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description);
      setDate(format(transactionToEdit.date, 'yyyy-MM-dd'));
    }
  }, [transactionToEdit]);

  const handleDelete = async () => {
    if (!transactionToEdit) return;

    setLoading(true);
    try {
      await deleteTransaction(transactionToEdit.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar aporte:', err);
      setError('Error al eliminar. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Debes iniciar sesión');
      return;
    }

    if (!userId) {
      setError('Selecciona quién hace el aporte');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      const userName = users.find(u => u.id === userId)?.name || 'usuario';

      if (isEditMode && transactionToEdit) {
        // Actualizar aporte existente
        await updateTransaction({
          id: transactionToEdit.id,
          amount: parseFloat(amount),
          project: 'Aporte',
          type: 'contribution',
          projectId: null,
          categoryId: null,
          categoryName: 'N/A',
          userId: userId,
          description: description || `Aporte de ${userName}`,
          date: new Date(date),
        });
      } else {
        // Crear nuevo aporte
        await addTransaction({
          amount: parseFloat(amount),
          project: 'Aporte',
          type: 'contribution',
          projectId: null,
          categoryId: null,
          categoryName: 'N/A',
          userId: userId,
          registeredBy: currentUser.id,
          description: description || `Aporte de ${userName}`,
          date: new Date(date),
        });
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar aporte:', err);
      setError('Error al guardar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-full">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {isEditMode ? 'Editar Aporte' : 'Registrar Aporte'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
                aria-label="Eliminar"
                title="Eliminar aporte"
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

          {/* Usuario que aporta */}
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
              ¿Quién hace el aporte?
            </label>
            <select
              id="user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.id === currentUser?.id ? '(Yo)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Puedes registrar un aporte de otro hermano
            </p>
          </div>

          {/* Monto */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Monto del Aporte
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
                className="w-full pl-10 pr-4 py-4 text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles del aporte..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Aporte
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Fecha en que se realizó el aporte
            </p>
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> Este aporte se sumará al total en caja y será distribuido equitativamente entre los 4 hermanos.
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
                'flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                isEditMode ? 'Actualizar Aporte' : 'Registrar Aporte'
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
              ¿Estás seguro de que deseas eliminar este aporte?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Advertencia:</strong> Esta acción es irreversible. Se actualizarán automáticamente:
              </p>
              <ul className="text-xs text-yellow-700 mt-2 ml-4 list-disc space-y-1">
                <li>Total en caja</li>
                <li>Balance de todos los hermanos</li>
                <li>Estadísticas de aportes</li>
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
