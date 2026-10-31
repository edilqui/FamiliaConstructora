import { useState, FormEvent, useEffect, useMemo } from 'react';
import { X, Loader2, Receipt, Calendar, Trash2, AlertTriangle, Wallet, Clock, ChevronDown, Calculator, Package, HardHat, ChevronRight, Camera, ImageOff } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useConstructionData } from '../hooks/useConstructionData';
import { useAuthStore } from '../store/useAuthStore';
import { addTransaction, addDirectPayment, updateTransaction, deleteTransaction, setTransactionHasReceipt } from '../services/transactionService';
import { buildDirectPaymentDescription } from '../lib/directPayments';
import { saveReceipt, deleteReceipt } from '../services/receiptService';
import ReceiptField, { useReceiptField } from '../components/ReceiptField';
import { compressImageToDataUrl } from '../lib/imageCompression';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import type { Transaction } from '../types';
import CalculatorComponent from '../components/Calculator';
import CategorySelector from '../components/CategorySelector';
import ActivitySelector from '../components/ActivitySelector';
import AmountInput from '../components/AmountInput';
import { useModalHistory } from '../hooks/useModalHistory';
import { toast } from '../store/useToastStore';

interface TransactionFormProps {
  onClose: () => void;
  defaultProjectId?: string;
  transactionToEdit?: Transaction;
  defaultActivity?: { id: string; name: string; stageId: string; stageName: string };
  prefill?: { amount: number; description: string };
  onSaved?: (transactionId: string) => Promise<void>; // No debe lanzar: el gasto ya quedó guardado
}

export default function TransactionForm({ onClose, defaultProjectId, transactionToEdit, defaultActivity, prefill, onSaved }: TransactionFormProps) {
  const { projects, categories, totalInBox, users, transactions, loading: dataLoading } = useDashboardData();
  const { stages, activities } = useConstructionData();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!transactionToEdit;

  // Pago directo: aporte vinculado que debe seguir a este gasto
  const linkedContribution = transactionToEdit?.linkedTransactionId
    ? transactions.find((t) => t.id === transactionToEdit.linkedTransactionId)
    : undefined;
  const directPayerName = users.find((u) => u.id === linkedContribution?.userId)?.name;
  // Sin los movimientos cargados no se sabe si el aporte vinculado existe
  const waitingForLinkedData = !!transactionToEdit?.linkedTransactionId && dataLoading;

  // Estados
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState(prefill ? String(Math.round(prefill.amount)) : '');
  const [description, setDescription] = useState(prefill?.description ?? ''); // Nombre corto
  const [notes, setNotes] = useState(''); // Notas adicionales

  // FECHA Y HORA SEPARADAS
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const [paymentSource, setPaymentSource] = useState<string>('caja');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Actividad de obra (opcional)
  const [showActivitySelector, setShowActivitySelector] = useState(!!defaultActivity);
  const [selectedStageId, setSelectedStageId] = useState(defaultActivity?.stageId ?? '');
  const [selectedStageName, setSelectedStageName] = useState(defaultActivity?.stageName ?? '');
  const [selectedActivityId, setSelectedActivityId] = useState(defaultActivity?.id ?? '');
  const [selectedActivityName, setSelectedActivityName] = useState(defaultActivity?.name ?? '');

  // Modo detallado (cantidad × valor unitario)
  const [detailedMode, setDetailedMode] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // Foto del recibo (opcional)
  const receipt = useReceiptField(transactionToEdit);

  // El atrás del sistema cierra el formulario (y primero la confirmación de borrado)
  useModalHistory(true, onClose);
  useModalHistory(showDeleteConfirm, () => setShowDeleteConfirm(false));

  // Calcular monto automáticamente en modo detallado
  useEffect(() => {
    if (detailedMode && quantity && unitPrice) {
      const calculatedAmount = parseFloat(quantity) * parseFloat(unitPrice);
      if (!isNaN(calculatedAmount)) {
        setAmount(String(Math.round(calculatedAmount)));
      }
    }
  }, [quantity, unitPrice, detailedMode]);

  // Cargar datos en edición
  useEffect(() => {
    if (transactionToEdit) {
      setProjectId(transactionToEdit.projectId || '');
      setCategoryId(transactionToEdit.categoryId || '');
      setAmount(String(Math.round(transactionToEdit.amount)));
      setDescription(transactionToEdit.description);
      setNotes(transactionToEdit.notes || '');
      setDate(format(transactionToEdit.date, 'yyyy-MM-dd'));
      setTime(format(transactionToEdit.date, 'HH:mm'));

      if (transactionToEdit.quantity !== undefined && transactionToEdit.unitPrice !== undefined) {
        setDetailedMode(true);
        setQuantity(transactionToEdit.quantity.toString());
        setUnitPrice(transactionToEdit.unitPrice.toString());
      }

      if (transactionToEdit.activityId) {
        setShowActivitySelector(true);
        setSelectedStageId(transactionToEdit.stageId || '');
        setSelectedStageName(transactionToEdit.stageName || '');
        setSelectedActivityId(transactionToEdit.activityId);
        setSelectedActivityName(transactionToEdit.activityName || '');
      }

      // Cargar la foto del recibo existente
    }
  }, [transactionToEdit]);

  const handleDelete = async () => {
    if (!transactionToEdit || !user) return;
    if (waitingForLinkedData) return setError('Cargando datos del pago. Intenta en un momento.');
    setLoading(true);
    try {
      const selectedProject = projects.find(p => p.id === transactionToEdit.projectId);
      const deleted = transactionToEdit; // Copia para poder deshacer
      const deletedContribution = linkedContribution;
      await deleteTransaction({
        id: deleted.id,
        deletedBy: user.id,
        deletedByName: user.name,
        description: deleted.description,
        projectName: selectedProject?.name || 'Proyecto',
        linkedTransactionId: deleted.linkedTransactionId,
        before: deleted,
      });
      toast(deletedContribution ? 'Gasto y aporte vinculado eliminados' : 'Gasto eliminado', {
        actionLabel: 'Deshacer',
        onAction: () => {
          const restoredExpense = {
            amount: deleted.amount,
            project: deleted.project,
            type: deleted.type,
            projectId: deleted.projectId,
            categoryId: deleted.categoryId,
            categoryName: deleted.categoryName,
            userId: deleted.userId,
            registeredBy: user.id,
            registeredByName: user.name,
            description: deleted.description,
            notes: deleted.notes,
            quantity: deleted.quantity,
            unitPrice: deleted.unitPrice,
            date: deleted.date,
            activityId: deleted.activityId,
            activityName: deleted.activityName,
            stageId: deleted.stageId,
            stageName: deleted.stageName,
          };
          const restored = deletedContribution
            ? addDirectPayment(restoredExpense, {
                amount: deletedContribution.amount,
                project: deletedContribution.project,
                type: deletedContribution.type,
                projectId: deletedContribution.projectId,
                categoryId: deletedContribution.categoryId,
                categoryName: deletedContribution.categoryName,
                userId: deletedContribution.userId,
                registeredBy: user.id,
                registeredByName: user.name,
                description: deletedContribution.description,
                notes: deletedContribution.notes,
                date: deletedContribution.date,
              })
            : addTransaction(restoredExpense);
          restored
            .then(() => toast('Gasto restaurado'))
            .catch(() => toast('No se pudo restaurar el gasto', { type: 'error' }));
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
    if (loading) return;
    setError('');

    if (!user) return setError('Debes iniciar sesión');
    if (waitingForLinkedData) return setError('Cargando datos del pago. Intenta en un momento.');
    if (!projectId) return setError('Selecciona un proyecto');
    if (!categoryId) return setError('Selecciona una categoría');
    
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) return setError('Ingresa un monto válido');

    if (!isEditMode && paymentSource === 'caja' && amountValue > totalInBox) {
      return setError(`Saldo insuficiente. Disponible: ${formatCurrency(totalInBox)}`);
    }

    setLoading(true);

    try {
      const selectedProject = projects.find(p => p.id === projectId);
      const selectedCategory = categories.find(c => c.id === categoryId);

      // COMBINAR FECHA Y HORA
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const transactionDate = new Date(year, month - 1, day, hours, minutes);

      if (transactionDate.getTime() > Date.now()) {
        setLoading(false);
        return setError('La fecha y hora no pueden ser futuras');
      }

      let savedId = transactionToEdit?.id ?? '';

      const expenseDescription = description || `Gasto en ${selectedProject?.name}`;

      if (isEditMode && transactionToEdit) {
        await updateTransaction({
          id: transactionToEdit.id,
          amount: amountValue,
          project: selectedProject?.name || 'Gasto',
          type: 'expense',
          projectId: projectId,
          categoryId: categoryId,
          categoryName: selectedCategory?.name || 'Sin categoría',
          userId: transactionToEdit.userId,
          description: expenseDescription,
          notes: notes || undefined,
          quantity: detailedMode && quantity ? parseFloat(quantity) : null,
          unitPrice: detailedMode && unitPrice ? parseFloat(unitPrice) : null,
          date: transactionDate,
          updatedBy: user.id,
          updatedByName: user.name,
          activityId: selectedActivityId || null,
          activityName: selectedActivityName || null,
          stageId: selectedStageId || null,
          stageName: selectedStageName || null,
          linkedContribution: linkedContribution && {
            id: linkedContribution.id,
            description: buildDirectPaymentDescription(directPayerName || 'usuario', expenseDescription),
          },
          before: transactionToEdit,
        });
      } else {
        if (paymentSource !== 'caja') {
          const payingUser = users.find(u => u.id === paymentSource);
          const directExpenseDescription = description || `Gasto en ${selectedProject?.name} (por ${payingUser?.name})`;
          savedId = await addDirectPayment(
            {
              amount: amountValue,
              project: selectedProject?.name || 'Gasto',
              type: 'expense',
              projectId: projectId,
              categoryId: categoryId,
              categoryName: selectedCategory?.name || 'Sin categoría',
              userId: user.id,
              registeredBy: user.id,
              registeredByName: user.name,
              description: directExpenseDescription,
              notes: notes || undefined,
              quantity: detailedMode && quantity ? parseFloat(quantity) : undefined,
              unitPrice: detailedMode && unitPrice ? parseFloat(unitPrice) : undefined,
              date: transactionDate,
              activityId: selectedActivityId || null,
              activityName: selectedActivityName || null,
              stageId: selectedStageId || null,
              stageName: selectedStageName || null,
            },
            {
              amount: amountValue,
              project: 'Aporte',
              type: 'contribution',
              projectId: null,
              categoryId: null,
              categoryName: 'N/A',
              userId: paymentSource,
              registeredBy: user.id,
              registeredByName: user.name,
              description: buildDirectPaymentDescription(payingUser?.name || 'usuario', directExpenseDescription),
              notes: notes || undefined,
              date: transactionDate,
            }
          );
        } else {
          savedId = await addTransaction({
            amount: amountValue,
            project: selectedProject?.name || 'Gasto',
            type: 'expense',
            projectId: projectId,
            categoryId: categoryId,
            categoryName: selectedCategory?.name || 'Sin categoría',
            userId: user.id,
            registeredBy: user.id,
            registeredByName: user.name,
            description: description || `Gasto en ${selectedProject?.name}`,
            notes: notes || undefined,
            quantity: detailedMode && quantity ? parseFloat(quantity) : undefined,
            unitPrice: detailedMode && unitPrice ? parseFloat(unitPrice) : undefined,
            date: transactionDate,
            activityId: selectedActivityId || null,
            activityName: selectedActivityName || null,
            stageId: selectedStageId || null,
            stageName: selectedStageName || null,
          });
        }
      }

      // Guardar/quitar la foto del recibo (secundario: el gasto ya se guardó)
      if (receipt.changed && savedId) {
        try {
          if (receipt.dataUrl) {
            await saveReceipt(savedId, receipt.dataUrl, user.id);
            await setTransactionHasReceipt(savedId, true, expenseDescription, user);
          } else if (isEditMode) {
            await deleteReceipt(savedId);
            await setTransactionHasReceipt(savedId, false, expenseDescription, user);
          }
        } catch {
          toast('El gasto se guardó, pero la foto del recibo no se pudo subir', { type: 'error' });
        }
      }

      if (onSaved && savedId) await onSaved(savedId);

      toast(isEditMode ? 'Cambios guardados' : 'Gasto registrado');
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
        
        {/* Drag Handle (Mobile only visual cue) */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Editar Gasto' : 'Registrar Gasto'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar formulario" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Alerta de Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* MONTO (Input Gigante) */}
          <div>
            <div className="flex items-center justify-between mb-2 ml-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</label>
              <button
                type="button"
                onClick={() => {
                  setDetailedMode(!detailedMode);
                  // No limpiar los valores al cambiar de modo
                  // Los valores se mantienen en el estado para que el usuario pueda volver
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Package className="w-3.5 h-3.5" />
                {detailedMode ? 'Modo simple' : 'Calcular por cantidad'}
              </button>
            </div>

            {/* Modo Detallado: Cantidad y Valor Unitario */}
            {detailedMode && (
              <div className="mb-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 animate-in slide-in-from-top-2 fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-blue-700 mb-1.5 block">Cantidad</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-lg font-semibold text-gray-900 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      autoFocus={detailedMode}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-blue-700 mb-1.5 block">Precio Unit.</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
                      <AmountInput
                        value={unitPrice}
                        onChange={setUnitPrice}
                        placeholder="0"
                        aria-label="Precio unitario"
                        className="w-full pl-7 pr-3 py-2 text-lg font-semibold text-gray-900 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <div className="flex-shrink-0 w-1 h-1 bg-blue-400 rounded-full"></div>
                  <span>El monto se calculará automáticamente</span>
                </div>
              </div>
            )}

            {/* Campo de Monto */}
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-light text-gray-400">$</span>
                <AmountInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0"
                  aria-label="Monto del gasto"
                  className={cn(
                    "w-full pl-10 pr-4 py-4 text-4xl font-bold text-gray-900 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all placeholder:text-gray-300",
                    detailedMode
                      ? "border-blue-200 bg-blue-50/30 cursor-not-allowed"
                      : "border-transparent focus:border-red-500 focus:bg-white"
                  )}
                  required
                  autoFocus={!isEditMode && !detailedMode}
                  disabled={detailedMode}
                  readOnly={detailedMode}
                />
              </div>
              {!detailedMode && (
                <button
                  type="button"
                  onClick={() => setShowCalculator(true)}
                  className="flex-shrink-0 w-16 h-16 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                  title="Abrir calculadora"
                >
                  <Calculator className="w-7 h-7" />
                </button>
              )}
            </div>
            {!isEditMode && paymentSource === 'caja' && (
              <p className="text-xs text-gray-400 mt-2 text-right">
                Disponible: <span className="font-semibold text-gray-600">{formatCurrency(totalInBox)}</span>
              </p>
            )}
          </div>

          {/* NOMBRE */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Nombre del Gasto</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Cemento, Pintura, Electricista..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all font-medium"
              required
            />
          </div>

          {/* SELECTORES (Proyecto y Categoría) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Proyecto</label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Categoría</label>
              <CategorySelector
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Seleccionar..."
                required
              />
            </div>
          </div>

          {/* ACTIVIDAD DE OBRA (Opcional) */}
          <div className="rounded-2xl border border-orange-100 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowActivitySelector(!showActivitySelector);
                if (showActivitySelector) {
                  setSelectedStageId('');
                  setSelectedStageName('');
                  setSelectedActivityId('');
                  setSelectedActivityName('');
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-700">
                  {showActivitySelector && selectedActivityName
                    ? `${selectedStageName} › ${selectedActivityName}`
                    : 'Asociar a actividad de obra'}
                </span>
              </div>
              <ChevronRight className={cn('w-4 h-4 text-orange-400 transition-transform', showActivitySelector && 'rotate-90')} />
            </button>
            {showActivitySelector && (
              <div className="p-4 bg-orange-50/40 border-t border-orange-100">
                <ActivitySelector
                  stages={stages}
                  activities={activities}
                  selectedStageId={selectedStageId}
                  selectedActivityId={selectedActivityId}
                  onStageChange={(id, name) => { setSelectedStageId(id); setSelectedStageName(name); }}
                  onActivityChange={(id, name) => { setSelectedActivityId(id); setSelectedActivityName(name); }}
                  projectId={projectId}
                />
              </div>
            )}
          </div>

          {/* FUENTE DE PAGO (Solo Crear) */}
          {!isEditMode && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
               <label className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 block flex items-center gap-1">
                 <Wallet className="w-3 h-3" /> Método de Pago
               </label>
               <div className="relative">
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                    className="w-full appearance-none bg-white border border-blue-200 text-blue-900 text-sm rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 outline-none font-medium shadow-sm"
                  >
                    <option value="caja">Caja Común (Efectivo disponible)</option>
                    <optgroup label="Pago directo (Aporte automático)">
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.id === user?.id ? '(Yo)' : ''} paga de su bolsillo
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
               </div>
            </div>
          )}

          {/* PAGO DIRECTO VINCULADO (Solo Editar) */}
          {linkedContribution && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex gap-3">
              <Wallet className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>{directPayerName || 'Un miembro'}</strong> pagó este gasto de su bolsillo. Si cambias el monto, la fecha o las notas, o lo eliminas, su aporte cambiará igual.
              </p>
            </div>
          )}

          {/* NOTAS */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Notas (Opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade detalles adicionales sobre este gasto..."
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all resize-none"
            />
          </div>

          {/* FOTO DEL RECIBO (Opcional) */}
          <ReceiptField field={receipt} label="Foto del Recibo (Opcional)" alt="Recibo del gasto" />

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
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
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
                  className="w-full pl-9 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
              {isEditMode ? 'Guardar Cambios' : 'Registrar Gasto'}
            </button>

            {isEditMode && (
               <button
                 type="button"
                 onClick={() => setShowDeleteConfirm(true)}
                 className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
               >
                 <Trash2 className="w-4 h-4" /> Eliminar este gasto
               </button>
            )}
          </div>
        </form>

        {/* --- MODAL CONFIRMACIÓN BORRADO (NESTED) --- */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex items-center justify-center p-6 rounded-3xl animate-in fade-in">
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">¿Eliminar gasto?</h3>
              <p className="text-sm text-gray-500">
                Esta acción afectará los balances de caja y reportes del proyecto. No se puede deshacer.
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