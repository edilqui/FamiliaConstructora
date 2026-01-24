import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
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
  description: string; // Nombre corto de la transacción
  notes?: string; // Notas adicionales opcionales
  date?: Date; // Fecha opcional, si no se proporciona usa la fecha actual
}

export const addTransaction = async (params: AddTransactionParams): Promise<void> => {
  const { amount, project, type, projectId, categoryId, categoryName, userId, registeredBy, description, notes, date } = params;

  try {
    const transactionsRef = collection(db, 'transactions');

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

    await addDoc(transactionsRef, data);

    console.log('Transacción agregada exitosamente');
  } catch (error) {
    console.error('Error al agregar transacción:', error);
    throw error;
  }
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
  description: string; // Nombre corto de la transacción
  notes?: string; // Notas adicionales opcionales
  date: Date;
}

export const updateTransaction = async (params: UpdateTransactionParams): Promise<void> => {
  const { id, amount, project, type, projectId, categoryId, categoryName, userId, description, notes, date } = params;

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
    };

    // Solo incluir notes si tiene valor
    if (notes) {
      data.notes = notes;
    }

    await updateDoc(transactionRef, data);

    console.log('Transacción actualizada exitosamente');
  } catch (error) {
    console.error('Error al actualizar transacción:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const transactionRef = doc(db, 'transactions', id);
    await deleteDoc(transactionRef);
    console.log('Transacción eliminada exitosamente');
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    throw error;
  }
};
