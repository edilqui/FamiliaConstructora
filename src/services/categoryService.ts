import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Category } from '../types';

interface CreateCategoryParams {
  name: string;
  order: number;
  isGroup: boolean;
  parentId: string | null;
}

interface UpdateCategoryParams {
  id: string;
  name: string;
  order: number;
  isGroup?: boolean;
  parentId?: string | null;
}

/**
 * Crea una nueva categoría
 */
export const createCategory = async (params: CreateCategoryParams): Promise<void> => {
  const { name, order, isGroup, parentId } = params;

  const categoriesRef = collection(db, 'categories');
  await addDoc(categoriesRef, {
    name,
    order,
    isGroup,
    parentId,
    createdAt: serverTimestamp(),
  });
};

/**
 * Actualiza una categoría existente
 */
export const updateCategory = async (params: UpdateCategoryParams): Promise<void> => {
  const { id, name, order, isGroup, parentId } = params;

  const categoryRef = doc(db, 'categories', id);
  const updateData: any = {
    name,
    order,
    updatedAt: serverTimestamp(),
  };

  // Solo actualizar isGroup y parentId si se proporcionan
  if (isGroup !== undefined) {
    updateData.isGroup = isGroup;
  }
  if (parentId !== undefined) {
    updateData.parentId = parentId;
  }

  await updateDoc(categoryRef, updateData);
};

/**
 * Obtiene el número de transacciones que usan una categoría
 */
export const getCategoryUsageCount = async (categoryId: string): Promise<number> => {
  const transactionsRef = collection(db, 'transactions');
  const q = query(transactionsRef, where('categoryId', '==', categoryId));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Elimina una categoría si no está en uso
 * @returns { success: boolean, message: string, usageCount?: number }
 */
export const deleteCategory = async (categoryId: string): Promise<{ success: boolean; message: string; usageCount?: number }> => {
  try {
    // Verificar si la categoría está en uso
    const usageCount = await getCategoryUsageCount(categoryId);

    if (usageCount > 0) {
      return {
        success: false,
        message: `No se puede eliminar. Esta categoría está siendo usada en ${usageCount} transacción(es).`,
        usageCount,
      };
    }

    // Si no está en uso, eliminar
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);

    return {
      success: true,
      message: 'Categoría eliminada exitosamente',
    };
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return {
      success: false,
      message: 'Error al eliminar la categoría. Intenta nuevamente.',
    };
  }
};

/**
 * Obtiene el siguiente número de orden disponible
 */
export const getNextOrder = async (): Promise<number> => {
  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(categoriesRef);

  if (snapshot.empty) {
    return 1;
  }

  const maxOrder = snapshot.docs.reduce((max, doc) => {
    const data = doc.data() as Category;
    return Math.max(max, data.order || 0);
  }, 0);

  return maxOrder + 1;
};

/**
 * Obtiene el conteo de uso para todas las categorías
 */
export const getAllCategoryUsageCounts = async (categories: Category[]): Promise<Map<string, number>> => {
  const usageCounts = new Map<string, number>();

  // Obtener todas las transacciones una sola vez
  const transactionsRef = collection(db, 'transactions');
  const snapshot = await getDocs(transactionsRef);

  // Contar usos por categoría
  snapshot.forEach((doc) => {
    const transaction = doc.data();
    const categoryId = transaction.categoryId;

    if (categoryId) {
      usageCounts.set(categoryId, (usageCounts.get(categoryId) || 0) + 1);
    }
  });

  return usageCounts;
};
