import { collection, deleteField, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { addAuditEntry } from './auditService';
import type { AuditChange, Payable } from '../types';

const PAYABLES_COLLECTION = 'payables';

interface Actor {
  id: string;
  name: string;
}

export interface PayableInput {
  supplierName: string;
  supplierPhone?: string;
  description: string;
  amount: number;
  dueDate: Date;
}

export const subscribePayables = (callback: (payables: Payable[]) => void, onError: () => void) =>
  onSnapshot(
    collection(db, PAYABLES_COLLECTION),
    (snapshot) => {
      callback(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          supplierName: data.supplierName,
          supplierPhone: data.supplierPhone ?? undefined,
          description: data.description,
          amount: data.amount,
          dueDate: data.dueDate?.toDate() ?? new Date(),
          status: data.status,
          paidTransactionId: data.paidTransactionId,
        };
      }));
    },
    (error) => {
      console.error('Error al cargar cuentas por pagar:', error);
      onError();
    }
  );

const entryBase = (id: string, summary: string, amount: number, actor: Actor) => ({
  entityType: 'payable' as const,
  entityId: id,
  summary,
  amount,
  actorId: actor.id,
  actorName: actor.name,
});

export const createPayable = async (input: PayableInput, actor: Actor): Promise<void> => {
  const ref = doc(collection(db, PAYABLES_COLLECTION));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...input,
    supplierPhone: input.supplierPhone ?? null,
    status: 'pending',
    createdBy: actor.id,
    createdAt: serverTimestamp(),
  });
  addAuditEntry(batch, {
    ...entryBase(ref.id, input.description, input.amount, actor),
    action: 'create',
    changes: [{ field: 'supplierName', from: null, to: input.supplierName }],
  });
  await batch.commit();
};

export const updatePayable = async (before: Payable, input: PayableInput, actor: Actor): Promise<void> => {
  const changes: AuditChange[] = [];
  if (before.amount !== input.amount) changes.push({ field: 'amount', from: before.amount, to: input.amount });
  if (before.description !== input.description) changes.push({ field: 'description', from: before.description, to: input.description });
  if (before.supplierName !== input.supplierName) changes.push({ field: 'supplierName', from: before.supplierName, to: input.supplierName });
  if (before.dueDate.getTime() !== input.dueDate.getTime()) {
    changes.push({ field: 'dueDate', from: before.dueDate.toISOString(), to: input.dueDate.toISOString() });
  }

  const batch = writeBatch(db);
  batch.update(doc(db, PAYABLES_COLLECTION, before.id), { ...input, supplierPhone: input.supplierPhone || deleteField() });
  if (changes.length > 0) {
    addAuditEntry(batch, { ...entryBase(before.id, input.description, input.amount, actor), action: 'update', changes });
  }
  await batch.commit();
};

export const deletePayable = async (payable: Payable, actor: Actor): Promise<void> => {
  const batch = writeBatch(db);
  batch.delete(doc(db, PAYABLES_COLLECTION, payable.id));
  addAuditEntry(batch, {
    ...entryBase(payable.id, payable.description, payable.amount, actor),
    action: 'delete',
    changes: [{ field: 'supplierName', from: payable.supplierName, to: null }],
  });
  await batch.commit();
};

export const markPayablePaid = async (payable: Payable, transactionId: string, actor: Actor): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, PAYABLES_COLLECTION, payable.id), {
    status: 'paid',
    paidTransactionId: transactionId,
    paidAt: serverTimestamp(),
  });
  addAuditEntry(batch, {
    ...entryBase(payable.id, payable.description, payable.amount, actor),
    action: 'update',
    changes: [{ field: 'payableStatus', from: 'Pendiente', to: 'Pagada' }],
  });
  await batch.commit();
};

// Volver a pendiente no toca el gasto: si también sobra, se elimina en Movimientos
export const reopenPayable = async (payable: Payable, actor: Actor): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, PAYABLES_COLLECTION, payable.id), {
    status: 'pending',
    paidTransactionId: deleteField(),
    paidAt: deleteField(),
  });
  addAuditEntry(batch, {
    ...entryBase(payable.id, payable.description, payable.amount, actor),
    action: 'update',
    changes: [{ field: 'payableStatus', from: 'Pagada', to: 'Pendiente' }],
  });
  await batch.commit();
};
