import { collection, doc, serverTimestamp, deleteField, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, TransactionType } from '../types';
import { createNotification } from './notificationService';
import { deleteReceipt } from './receiptService';
import { addAuditEntry } from './auditService';
import { diffTransaction } from '../lib/audit';

interface Actor {
  id: string;
  name: string;
}

interface AddTransactionParams {
  amount: number;
  project: string;
  type: TransactionType;
  projectId: string | null;
  categoryId: string | null; // null for contributions
  categoryName: string; // Nombre de la categoría
  userId: string; // Usuario que hace el aporte o gasto
  registeredBy: string; // Usuario que registra la transacción
  registeredByName: string; // Nombre del usuario que registra
  description: string; // Nombre corto de la transacción
  notes?: string; // Notas adicionales opcionales
  quantity?: number; // Cantidad de productos (opcional)
  unitPrice?: number; // Precio unitario (opcional)
  date?: Date; // Fecha opcional, si no se proporciona usa la fecha actual
  activityId?: string | null;
  activityName?: string | null;
  stageId?: string | null;
  stageName?: string | null;
}

const buildTransactionData = (params: AddTransactionParams) => {
  const { amount, project, type, projectId, categoryId, categoryName, userId, registeredBy, description, notes, quantity, unitPrice, date, activityId, activityName, stageId, stageName } = params;

  const data: any = {
    amount,
    project,
    type,
    projectId,
    categoryId,
    categoryName,
    userId,
    registeredBy,
    description,
    date: date || new Date(), // Usa la fecha proporcionada o la fecha actual
    createdAt: serverTimestamp(),
  };

  // Solo incluir notes si tiene valor
  if (notes) {
    data.notes = notes;
  }

  if (quantity !== undefined && quantity !== null) {
    data.quantity = quantity;
  }
  if (unitPrice !== undefined && unitPrice !== null) {
    data.unitPrice = unitPrice;
  }
  if (activityId) {
    data.activityId = activityId;
    data.activityName = activityName ?? null;
    data.stageId = stageId ?? null;
    data.stageName = stageName ?? null;
  }

  return data;
};

// Pago directo: el aporte y el gasto se guardan juntos y vinculados, o no se
// guarda ninguno. Devuelve el id del gasto (necesario para asociarle un recibo).
export const addDirectPayment = async (
  expense: AddTransactionParams,
  contribution: AddTransactionParams
): Promise<string> => {
  const transactionsRef = collection(db, 'transactions');
  const expenseRef = doc(transactionsRef);
  const contributionRef = doc(transactionsRef);

  const batch = writeBatch(db);
  batch.set(expenseRef, { ...buildTransactionData(expense), linkedTransactionId: contributionRef.id });
  batch.set(contributionRef, { ...buildTransactionData(contribution), linkedTransactionId: expenseRef.id });
  addAuditEntry(batch, {
    action: 'create',
    entityType: 'transaction',
    entityId: expenseRef.id,
    summary: expense.description,
    transactionType: 'expense',
    amount: expense.amount,
    changes: [{ field: 'payerId', from: null, to: contribution.userId }],
    actorId: expense.registeredBy,
    actorName: expense.registeredByName,
  });
  await batch.commit();

  // Notificación secundaria: un solo aviso por el pago, no uno por cada documento
  try {
    await createNotification({
      type: 'expense_created',
      message: `${expense.registeredByName} registró un gasto en ${expense.project}`,
      createdBy: expense.registeredBy,
      createdByName: expense.registeredByName,
      transactionId: expenseRef.id,
      transactionDescription: expense.description,
      amount: expense.amount,
      projectName: expense.project,
      excludeUserId: expense.registeredBy,
    });
  } catch (notificationError) {
    console.error('Pago directo guardado, pero falló la notificación:', notificationError);
  }

  return expenseRef.id;
};

// Devuelve el id del documento creado (necesario para asociarle un recibo)
export const addTransaction = async (params: AddTransactionParams): Promise<string> => {
  const { amount, project, type, registeredBy, registeredByName, description } = params;

  try {
    const docRef = doc(collection(db, 'transactions'));
    const batch = writeBatch(db);
    batch.set(docRef, buildTransactionData(params));
    addAuditEntry(batch, {
      action: 'create',
      entityType: 'transaction',
      entityId: docRef.id,
      summary: description,
      transactionType: type,
      amount,
      actorId: registeredBy,
      actorName: registeredByName,
    });
    await batch.commit();

    // La notificación es secundaria: si falla, la transacción YA se guardó y no
    // debe reportarse como error (el usuario reintentaría y duplicaría el movimiento).
    try {
      const notificationType = type === 'contribution' ? 'contribution_created' : 'expense_created';
      const actionText = type === 'contribution' ? 'registró un aporte' : 'registró un gasto';
      const message = `${registeredByName} ${actionText} en ${project}`;

      await createNotification({
        type: notificationType,
        message,
        createdBy: registeredBy,
        createdByName: registeredByName,
        transactionId: docRef.id,
        transactionDescription: description,
        amount,
        projectName: project,
        excludeUserId: registeredBy // No notificar al usuario que creó la transacción
      });
    } catch (notificationError) {
      console.error('Transacción guardada, pero falló la notificación:', notificationError);
    }

    console.log('Transacción agregada exitosamente');
    return docRef.id;
  } catch (error) {
    console.error('Error al agregar transacción:', error);
    throw error;
  }
};

/** Marca (o desmarca) que una transacción tiene foto de recibo asociada */
export const setTransactionHasReceipt = async (id: string, hasReceipt: boolean, description: string, actor: Actor): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'transactions', id), {
    hasReceipt: hasReceipt ? true : deleteField(),
  });
  addAuditEntry(batch, {
    action: 'update',
    entityType: 'transaction',
    entityId: id,
    summary: description,
    transactionType: 'expense',
    changes: [{ field: 'receipt', from: hasReceipt ? null : 'Con foto', to: hasReceipt ? 'Con foto' : null }],
    actorId: actor.id,
    actorName: actor.name,
  });
  await batch.commit();
};

interface UpdateTransactionParams {
  id: string;
  amount: number;
  project: string;
  type: TransactionType;
  projectId: string | null;
  categoryId: string | null;
  categoryName: string;
  userId: string;
  updatedBy: string; // Usuario que actualiza
  updatedByName: string; // Nombre del usuario que actualiza
  description: string; // Nombre corto de la transacción
  notes?: string; // Notas adicionales opcionales
  quantity?: number | null; // Cantidad de productos (opcional, null para eliminar)
  unitPrice?: number | null; // Precio unitario (opcional, null para eliminar)
  date: Date;
  activityId?: string | null;
  activityName?: string | null;
  stageId?: string | null;
  stageName?: string | null;
  linkedContribution?: { id: string; description: string }; // Pago directo: aporte que debe seguir al gasto
  before: Transaction; // Estado previo, para el registro de cambios
}

export const updateTransaction = async (params: UpdateTransactionParams): Promise<void> => {
  const { id, amount, project, type, projectId, categoryId, categoryName, userId, updatedBy, updatedByName, description, notes, quantity, unitPrice, date, activityId, activityName, stageId, stageName, linkedContribution, before } = params;

  try {
    const transactionRef = doc(db, 'transactions', id);

    const data: any = {
      amount,
      project,
      type,
      projectId,
      categoryId,
      categoryName,
      userId,
      description,
      date,
      // Los formularios siempre envían las notas: vacío significa que se borraron
      notes: notes || deleteField(),
    };

    // Manejar quantity y unitPrice:
    // - Si tienen valor, guardarlos
    // - Si son null (modo simple), eliminarlos del documento
    // - Si son undefined, no hacer nada (mantener valor existente)
    if (quantity !== undefined) {
      data.quantity = quantity !== null ? quantity : deleteField();
    }
    if (unitPrice !== undefined) {
      data.unitPrice = unitPrice !== null ? unitPrice : deleteField();
    }

    // Guardar o limpiar campos de actividad de obra
    data.activityId   = activityId   || deleteField();
    data.activityName = activityName || deleteField();
    data.stageId      = stageId      || deleteField();
    data.stageName    = stageName    || deleteField();

    const batch = writeBatch(db);
    batch.update(transactionRef, data);
    if (linkedContribution) {
      batch.update(doc(db, 'transactions', linkedContribution.id), {
        amount,
        date,
        description: linkedContribution.description,
        notes: notes || deleteField(),
      });
    }
    const changes = diffTransaction(before, {
      amount, description, date, notes, project, categoryName, userId,
      // undefined = el campo no se tocó (ver arriba)
      quantity: quantity === undefined ? before.quantity : quantity,
      unitPrice: unitPrice === undefined ? before.unitPrice : unitPrice,
      stageName, activityName,
    });
    if (changes.length > 0) {
      addAuditEntry(batch, {
        action: 'update',
        entityType: 'transaction',
        entityId: id,
        summary: description,
        transactionType: type,
        amount,
        changes,
        actorId: updatedBy,
        actorName: updatedByName,
      });
    }
    await batch.commit();

    // Notificación secundaria: no debe convertir una edición exitosa en "error"
    try {
      const actionText = type === 'contribution' ? 'editó un aporte' : 'editó un gasto';
      const message = `${updatedByName} ${actionText} en ${project}`;

      await createNotification({
        type: 'transaction_edited',
        message,
        createdBy: updatedBy,
        createdByName: updatedByName,
        transactionId: id,
        transactionDescription: description,
        amount,
        projectName: project,
        excludeUserId: updatedBy
      });
    } catch (notificationError) {
      console.error('Transacción actualizada, pero falló la notificación:', notificationError);
    }

    console.log('Transacción actualizada exitosamente');
  } catch (error) {
    console.error('Error al actualizar transacción:', error);
    throw error;
  }
};

// Cada movimiento usa 2 escrituras (cambio + registro); Firestore limita los lotes
const BULK_CHUNK_SIZE = 200;

const applyBulkUpdate = async (
  transactions: Transaction[],
  updates: Record<string, any>,
  auditedValues: Record<string, string | null>,
  actor: Actor
): Promise<void> => {
  for (let i = 0; i < transactions.length; i += BULK_CHUNK_SIZE) {
    const batch = writeBatch(db);
    transactions.slice(i, i + BULK_CHUNK_SIZE).forEach((t) => {
      batch.update(doc(db, 'transactions', t.id), updates);
      const changes = diffTransaction(t, { ...t, ...auditedValues });
      if (changes.length > 0) {
        addAuditEntry(batch, {
          action: 'update',
          entityType: 'transaction',
          entityId: t.id,
          summary: t.description,
          transactionType: t.type,
          amount: t.amount,
          changes,
          actorId: actor.id,
          actorName: actor.name,
        });
      }
    });
    await batch.commit();
  }
};

export const bulkUpdateTransactions = (
  transactions: Transaction[],
  updates: Record<string, string>,
  actor: Actor
): Promise<void> => applyBulkUpdate(transactions, updates, updates, actor);

export const bulkClearActivityFromTransactions = (transactions: Transaction[], actor: Actor): Promise<void> =>
  applyBulkUpdate(
    transactions,
    {
      stageId: deleteField(),
      stageName: deleteField(),
      activityId: deleteField(),
      activityName: deleteField(),
    },
    { stageName: null, activityName: null },
    actor
  );

interface DeleteTransactionParams {
  id: string;
  deletedBy: string; // Usuario que elimina
  deletedByName: string; // Nombre del usuario que elimina
  description: string; // Descripción de la transacción eliminada
  projectName: string; // Nombre del proyecto
  linkedTransactionId?: string; // Pago directo: la otra mitad se elimina junto con esta
  before: Transaction; // Lo que se elimina, para que quede en el registro de cambios
}

export const deleteTransaction = async (params: DeleteTransactionParams): Promise<void> => {
  const { id, deletedBy, deletedByName, description, projectName, linkedTransactionId, before } = params;

  try {
    const transactionRef = doc(db, 'transactions', id);
    const batch = writeBatch(db);
    batch.delete(transactionRef);
    if (linkedTransactionId) {
      batch.delete(doc(db, 'transactions', linkedTransactionId));
    }
    addAuditEntry(batch, {
      action: 'delete',
      entityType: 'transaction',
      entityId: id,
      summary: description,
      transactionType: before.type,
      amount: before.amount,
      changes: diffTransaction(before, {}),
      actorId: deletedBy,
      actorName: deletedByName,
    });
    await batch.commit();

    // Borrar la foto del recibo asociada (si existe); no es fatal si falla
    try {
      await deleteReceipt(id);
    } catch (receiptError) {
      console.error('Transacción eliminada, pero falló el borrado del recibo:', receiptError);
    }

    // Notificación secundaria: no debe convertir una eliminación exitosa en "error"
    try {
      const message = `${deletedByName} eliminó una transacción en ${projectName}`;

      await createNotification({
        type: 'transaction_deleted',
        message,
        createdBy: deletedBy,
        createdByName: deletedByName,
        transactionDescription: description,
        projectName,
        excludeUserId: deletedBy
      });
    } catch (notificationError) {
      console.error('Transacción eliminada, pero falló la notificación:', notificationError);
    }

    console.log('Transacción eliminada exitosamente');
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    throw error;
  }
};
