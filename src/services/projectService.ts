import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Project } from '../types';

interface CreateProjectParams {
  name: string;
  budget: number;
  status: 'active' | 'paused' | 'completed';
}

interface UpdateProjectParams {
  id: string;
  name: string;
  budget: number;
  status: 'active' | 'paused' | 'completed';
}

/**
 * Crea un nuevo proyecto
 */
export const createProject = async (params: CreateProjectParams): Promise<void> => {
  const { name, budget, status } = params;

  const projectsRef = collection(db, 'projects');
  await addDoc(projectsRef, {
    name,
    budget,
    status,
    totalSpent: 0,
    createdAt: serverTimestamp(),
  });
};

/**
 * Actualiza un proyecto existente
 */
export const updateProject = async (params: UpdateProjectParams): Promise<void> => {
  const { id, name, budget, status } = params;

  const projectRef = doc(db, 'projects', id);
  await updateDoc(projectRef, {
    name,
    budget,
    status,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Obtiene el número de transacciones que usan un proyecto
 */
export const getProjectUsageCount = async (projectId: string): Promise<number> => {
  const transactionsRef = collection(db, 'transactions');
  const q = query(transactionsRef, where('projectId', '==', projectId));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Obtiene estadísticas de un proyecto
 */
export const getProjectStats = async (projectId: string): Promise<{
  totalSpent: number;
  transactionCount: number;
  contributionCount: number;
  expenseCount: number;
}> => {
  const transactionsRef = collection(db, 'transactions');
  const q = query(transactionsRef, where('projectId', '==', projectId));
  const snapshot = await getDocs(q);

  let totalSpent = 0;
  let contributionCount = 0;
  let expenseCount = 0;

  snapshot.forEach((doc) => {
    const transaction = doc.data();
    if (transaction.type === 'expense') {
      totalSpent += transaction.amount;
      expenseCount++;
    } else if (transaction.type === 'contribution') {
      contributionCount++;
    }
  });

  return {
    totalSpent,
    transactionCount: snapshot.size,
    contributionCount,
    expenseCount,
  };
};

/**
 * Elimina un proyecto si no está en uso
 * @returns { success: boolean, message: string, usageCount?: number }
 */
export const deleteProject = async (projectId: string): Promise<{ success: boolean; message: string; usageCount?: number }> => {
  try {
    // Verificar si el proyecto está en uso
    const usageCount = await getProjectUsageCount(projectId);

    if (usageCount > 0) {
      return {
        success: false,
        message: `No se puede eliminar. Este proyecto tiene ${usageCount} transacción(es) asociadas.`,
        usageCount,
      };
    }

    // Si no está en uso, eliminar
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);

    return {
      success: true,
      message: 'Proyecto eliminado exitosamente',
    };
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    return {
      success: false,
      message: 'Error al eliminar el proyecto. Intenta nuevamente.',
    };
  }
};

/**
 * Obtiene estadísticas para todos los proyectos
 */
export const getAllProjectsStats = async (projects: Project[]): Promise<Map<string, {
  totalSpent: number;
  transactionCount: number;
  contributionCount: number;
  expenseCount: number;
}>> => {
  const projectsStats = new Map();

  // Obtener todas las transacciones una sola vez
  const transactionsRef = collection(db, 'transactions');
  const snapshot = await getDocs(transactionsRef);

  // Inicializar stats para cada proyecto
  projects.forEach((project) => {
    projectsStats.set(project.id, {
      totalSpent: 0,
      transactionCount: 0,
      contributionCount: 0,
      expenseCount: 0,
    });
  });

  // Calcular stats por proyecto
  snapshot.forEach((doc) => {
    const transaction = doc.data();
    const projectId = transaction.projectId;

    if (projectId && projectsStats.has(projectId)) {
      const stats = projectsStats.get(projectId);
      stats.transactionCount++;

      if (transaction.type === 'expense') {
        stats.totalSpent += transaction.amount;
        stats.expenseCount++;
      } else if (transaction.type === 'contribution') {
        stats.contributionCount++;
      }
    }
  });

  return projectsStats;
};

/**
 * Cambia el estado de un proyecto
 */
export const updateProjectStatus = async (
  projectId: string,
  status: 'active' | 'paused' | 'completed'
): Promise<void> => {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};
