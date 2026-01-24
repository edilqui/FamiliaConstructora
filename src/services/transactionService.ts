import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TransactionType } from '../types';

interface AddTransactionParams {
  amount: number;
  project: string;
  type: TransactionType;
  projectId: string | null;
  categoryId: string | null; // null for contributions
  categoryName: string; // Nombre de la categoría
  userId: string; // Usuario que hace el aporte o gasto
  registeredBy: string; // Usuario que registra la transacción
  description: string;
  date?: Date; // Fecha opcional, si no se proporciona usa la fecha actual
}

export const addTransaction = async (params: AddTransactionParams): Promise<void> => {
  const { amount, project, type, projectId, categoryId, categoryName, userId, registeredBy, description, date } = params;

  try {
    const transactionsRef = collection(db, 'transactions');

    await addDoc(transactionsRef, {
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
    });

    console.log('Transacción agregada exitosamente');
  } catch (error) {
    console.error('Error al agregar transacción:', error);
    throw error;
  }
};
