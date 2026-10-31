import { useState, FormEvent, useEffect } from 'react';
import { X, Loader2, DollarSign, Calendar, Trash2, AlertTriangle, Clock, ChevronDown, User, Calculator } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { addTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { format } from 'date-fns';
import type { Transaction } from '../types';
import CalculatorComponent from '../components/Calculator';
import AmountInput from '../components/AmountInput';
import { useModalHistory } from '../hooks/useModalHistory';
import { toast } from '../store/useToastStore';
import { isCollaborator } from '../lib/roles';

interface ContributionFormProps {
  onClose: () => void;
  transactionToEdit?: Transaction;
}

export default function ContributionForm({ onClose, transactionToEdit }: ContributionFormProps) {
  const { users, transactions } = useDashboardData();
  const currentUser = useAuthStore((state) => state.user);
  const isEditMode = !!transactionToEdit;
  // Pago directo: este aporte solo cambia junto con su gasto, desde el gasto
  const isLinked = !!transactionToEdit?.linkedTransactionId;
  const linkedExpense = transactions.find((t) => t.id === transactionToEdit?.linkedTransactionId);
  // Un colaborador registra sus propios aportes, pero no los modifica
  const collaborator = isCollaborator(currentUser);
  const isLocked = isLinked || (isEditMode && collaborator);

  // Estados
  const [userId, setUserId] = useState(currentUser?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(''); // Nombre corto
  const [notes, setNotes] = useState(''); // Notas adicionales

  // FECHA Y HORA SEPARADAS
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // El atrás del sistema cierra el formulario (y primero la confirmación de borrado)
  useModalHistory(true, onClose);
  useModalHistory(showDeleteConfirm, () => setShowDeleteConfirm(false));

  // Cargar datos en edición
  useEffect(() => {
    if (transactionToEdit) {
      setUserId(transactionToEdit.userId);
      setAmount(String(Math.round(transactionToEdit.amount)));
      setDescription(transactionToEdit.description);
      setNotes(transactionToEdit.notes || '');
      setDate(format(transactionToEdit.date, 'yyyy-MM-dd'));
      setTime(format(transactionToEdit.date, 'HH:mm')); // Extraer hora
    }
  }, [transactionToEdit]);

  const handleDelete = async () => {
    if (!transactionToEdit || !currentUser || isLocked) return;
    setLoading(true);
    try {
      const deleted = transactionToEdit; // Copia para poder deshacer
      await deleteTransaction({
        id: deleted.id,
        deletedBy: currentUser.id,
        deletedByName: currentUser.name,
        description: deleted.description,
        projectName: 'Aporte',
        before: deleted,
      });
      toast('Aporte eliminado', {
        actionLabel: 'Deshacer',
        onAction: () => {
          addTransaction({
            amount: deleted.amount,
            project: deleted.project,
            type: deleted.type,
            projectId: deleted.projectId,
            categoryId: deleted.categoryId,
            categoryName: deleted.categoryName,
            userId: deleted.userId,
            registeredBy: currentUser.id,
            registeredByName: currentUser.name,
            description: deleted.description,
            notes: deleted.notes,
            date: deleted.date,
          }).then(() => toast('Aporte restaurado'))
            .catch(() => toast('No se pudo restaurar el aporte', { type: 'error' }));
        },
      });
      onClose();
    } catch (err) {
      setError('Error al eliminar. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked) return;
    if (!currentUser) return setError('Debes iniciar sesión');
    if (!userId) return setError('Selecciona quién hace el aporte');
    
    const amountValue = parseFloat(amount);
    if (!amount || amountValue <= 0) return setError('Ingresa un monto válido');

    setLoading(true);

    try {
      const userName = users.find(u => u.id === userId)?.name || 'usuario';

      // COMBINAR FECHA Y HORA
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const transactionDate = new Date(year, month - 1, day, hours, minutes);

      if (transactionDate.getTime() > Date.now()) {
        setLoading(false);
        return setError('La fecha y hora no pueden ser futuras');
      }

      if (isEditMode && transactionToEdit) {
        await updateTransaction({
          id: transactionToEdit.id,
          amount: amountValue,
          project: 'Aporte',
          type: 'contribution',
          projectId: null,
          categoryId: null,
          categoryName: 'N/A',
          userId: userId,
          description: description || `Aporte de ${userName}`,
          notes: notes || undefined,
          date: transactionDate,
          updatedBy: currentUser.id,
          updatedByName: currentUser.name,
          before: transactionToEdit,
        });
      } else {
        await addTransaction({
          amount: amountValue,
          project: 'Aporte',
          type: 'contribution',
          projectId: null,
          categoryId: null,
          categoryName: 'N/A',
          userId: userId,
          registeredBy: currentUser.id,
          registeredByName: currentUser.name,
          description: description || `Aporte de ${userName}`,
          notes: notes || undefined,
          date: transactionDate,
        });
      }
      toast(isEditMode ? 'Cambios guardados' : 'Aporte registrado');
      onClose();
    } catch (err) {
      setError('Error al guardar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* Drag Handle (Mobile) */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
              <DollarSign className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isLinked ? 'Pago directo' : isLocked ? 'Detalle del Aporte' : isEditMode ? 'Editar Aporte' : 'Nuevo Aporte'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar formulario" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {isLocked && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex gap-3">
              <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                {collaborator ? (
                  'Solo un miembro puede cambiar o eliminar un aporte ya registrado.'
                ) : (
                  <>Este aporte viene del gasto <strong>{linkedExpense?.description ?? 'vinculado'}</strong>. Para cambiarlo o eliminarlo, abre ese gasto en Movimientos.</>
                )}
              </p>
            </div>
          )}

          <fieldset disabled={isLocked} className="space-y-6 min-w-0 disabled:opacity-70">
          {/* MONTO (Input Gigante) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Monto del Aporte</label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-light text-gray-400">$</span>
                <AmountInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  aria-label="Monto del aporte"
                  className="w-full pl-10 pr-4 py-4 text-4xl font-bold text-gray-900 bg-emerald-50/50 border-2 border-transparent focus:border-emerald-500 rounded-2xl focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
                  required
                  autoFocus={!isEditMode}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCalculator(true)}
                aria-label="Abrir calculadora"
                className="flex-shrink-0 w-16 h-16 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                title="Abrir calculadora"
              >
                <Calculator className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* NOMBRE */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Nombre del Aporte</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Aporte mensual, Cuota extra..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium"
              required
            />
          </div>

          {/* QUIÉN APORTA */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">¿Quién aporta?</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={collaborator}
                className="w-full appearance-none pl-10 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                required
              >
                <option value="">Seleccionar miembro...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.id === currentUser?.id ? '(Yo)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {userId && userId !== currentUser?.id && (
               <p className="text-xs text-emerald-600 mt-2 ml-1">
                 Estás registrando un aporte a nombre de <strong>{users.find(u => u.id === userId)?.name}</strong>
               </p>
            )}
          </div>

          {/* NOTAS */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Notas (Opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade detalles adicionales sobre este aporte..."
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all resize-none"
            />
          </div>

          {/* FECHA Y HORA (GRID) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Fecha</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  required
                />
              </div>
            </div>
            
            <div className="col-span-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  required
                />
              </div>
            </div>
          </div>

          </fieldset>

          {/* INFO CARD */}
          {!isLocked && <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex gap-3">
             <div className="mt-0.5">
               <DollarSign className="w-4 h-4 text-blue-600" />
             </div>
             <p className="text-xs text-blue-800 leading-relaxed">
               Este dinero entrará a la <strong>caja común</strong> y afectará positivamente el balance de {users.find(u => u.id === userId)?.name || 'el usuario'}.
             </p>
          </div>}

          {/* BOTONES DE ACCIÓN */}
          {!isLocked && <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
              {isEditMode ? 'Actualizar Aporte' : 'Registrar Aporte'}
            </button>

            {isEditMode && (
               <button
                 type="button"
                 onClick={() => setShowDeleteConfirm(true)}
                 className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
               >
                 <Trash2 className="w-4 h-4" /> Eliminar este aporte
               </button>
            )}
          </div>}
        </form>

        {/* --- MODAL CONFIRMACIÓN BORRADO (NESTED) --- */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex items-center justify-center p-6 rounded-3xl animate-in fade-in">
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">¿Eliminar aporte?</h3>
              <p className="text-sm text-gray-500">
                Se reducirá el dinero en caja y se ajustará el balance de quien aportó. Tendrás unos segundos para deshacer.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calculadora Modal */}
      {showCalculator && (
        <CalculatorComponent
          onClose={() => setShowCalculator(false)}
          onConfirm={(value) => {
            setAmount(String(Math.max(0, Math.round(parseFloat(value) || 0))));
            setShowCalculator(false);
          }}
          initialValue={amount}
        />
      )}
    </div>
  );
}