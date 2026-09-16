import {
  collection,
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CashCount } from '../types';

interface AddCashCountParams {
  countedAmount: number; // efectivo contado físicamente
  expectedAmount: number; // saldo teórico de caja en ese momento
  countedBy: string;
  countedByName: string;
  notes?: string;
}

/** Registra un arqueo de caja (conteo físico vs saldo teórico). */
export const addCashCount = async (params: AddCashCountParams): Promise<void> => {
  const { countedAmount, expectedAmount, countedBy, countedByName, notes } = params;

  const data: Record<string, unknown> = {
    countedAmount,
    expectedAmount,
    difference: countedAmount - expectedAmount,
    countedBy,
    countedByName,
    createdAt: serverTimestamp(),
  };
  if (notes) data.notes = notes;

  await addDoc(collection(db, 'cashCounts'), data);
};

/** Suscripción en tiempo real a los arqueos (más recientes primero). */
export const subscribeCashCounts = (
  callback: (counts: CashCount[]) => void
): (() => void) => {
  const q = query(collection(db, 'cashCounts'));
  return onSnapshot(q, (snapshot) => {
    const counts = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as CashCount;
    });
    counts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(counts);
  });
};
