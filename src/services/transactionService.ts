import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, TransactionType } from '../types';

interface AddTransactionParams {
  amount: number;
  category: string;
  type: TransactionType;
  projectId: string | null;
  userId: string;
  description: string;
}

export const addTransaction = async (params: AddTransactionParams): Promise<void> => {
  const { amount, category, type, projectId, userId, description } = params;

  try {
    await runTransaction(db, async (transaction) => {
      // Referencias
      const transactionRef = doc(collection(db, 'transactions'));

      // Crear el documento de la transacción
      const newTransaction = {
        amount,
        category,
        type,
        projectId,
        userId,
        description,
        date: new Date(),
        createdAt: serverTimestamp(),
      };

      transaction.set(transactionRef, newTransaction);

      // Si es un gasto de proyecto, actualizar el totalSpent del proyecto
      if (type === 'expense' && projectId) {
        const projectRef = doc(db, 'projects', projectId);
        const projectDoc = await transaction.get(projectRef);

        if (projectDoc.exists()) {
          const currentSpent = projectDoc.data().totalSpent || 0;
          transaction.update(projectRef, {
            totalSpent: currentSpent + amount,
          });
        }
      }

      // Si es un aporte, actualizar el totalContributed del usuario
      if (type === 'contribution') {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists()) {
          const currentContributed = userDoc.data().totalContributed || 0;
          transaction.update(userRef, {
            totalContributed: currentContributed + amount,
          });
        }
      }
    });

    console.log('Transacción agregada exitosamente');
  } catch (error) {
    console.error('Error al agregar transacción:', error);
    throw error;
  }
};
