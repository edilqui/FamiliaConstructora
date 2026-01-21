import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TransactionType } from '../types';

interface AddTransactionParams {
  amount: number;
  category: string;
  type: TransactionType;
  projectId: string | null;
  userId: string; // Usuario que hace el aporte o gasto
  registeredBy: string; // Usuario que registra la transacción
  description: string;
}

export const addTransaction = async (params: AddTransactionParams): Promise<void> => {
  const { amount, category, type, projectId, userId, registeredBy, description } = params;

  try {
    const transactionsRef = collection(db, 'transactions');

    await addDoc(transactionsRef, {
      amount,
      category,
      type,
      projectId,
      userId,
      registeredBy,
      description,
      date: new Date(),
      createdAt: serverTimestamp(),
    });

    console.log('Transacción agregada exitosamente');
  } catch (error) {
    console.error('Error al agregar transacción:', error);
    throw error;
  }
};
