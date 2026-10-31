import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, WriteBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuditEntry } from '../types';

const AUDIT_COLLECTION = 'auditLog';

type NewAuditEntry = Omit<AuditEntry, 'id' | 'createdAt' | 'transactionType' | 'amount' | 'changes'> &
  Partial<Pick<AuditEntry, 'transactionType' | 'amount' | 'changes'>>;

// La entrada va en el mismo lote que el cambio: se guardan juntos o no se guarda ninguno
export const addAuditEntry = (batch: WriteBatch, entry: NewAuditEntry): void => {
  batch.set(doc(collection(db, AUDIT_COLLECTION)), {
    ...entry,
    // Hay movimientos antiguos con campos faltantes; Firestore rechaza undefined
    summary: entry.summary ?? 'Sin descripción',
    transactionType: entry.transactionType ?? null,
    amount: entry.amount ?? null,
    changes: entry.changes ?? [],
    createdAt: serverTimestamp(),
  });
};

export const subscribeAuditLog = (maxEntries: number, callback: (entries: AuditEntry[]) => void) => {
  const q = query(collection(db, AUDIT_COLLECTION), orderBy('createdAt', 'desc'), limit(maxEntries));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({
      ...(d.data() as Omit<AuditEntry, 'id' | 'createdAt'>),
      id: d.id,
      createdAt: d.data().createdAt?.toDate() ?? new Date(),
    })));
  });
};
