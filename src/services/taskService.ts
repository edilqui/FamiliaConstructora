import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Task } from '../types';

const TASKS_COLLECTION = 'tasks';

/**
 * Crea una nueva tarea
 */
export const createTask = async (title: string, userId: string): Promise<void> => {
  try {
    await addDoc(collection(db, TASKS_COLLECTION), {
      title,
      completed: false,
      createdBy: userId,
      createdAt: serverTimestamp(),
      completedAt: null
    });
    console.log('✅ Tarea creada');
  } catch (error) {
    console.error('Error al crear tarea:', error);
    throw error;
  }
};

/**
 * Actualiza el estado de completado de una tarea
 */
export const toggleTaskCompleted = async (taskId: string, completed: boolean): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      completed,
      completedAt: completed ? serverTimestamp() : null
    });
    console.log('✅ Tarea actualizada');
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    throw error;
  }
};

/**
 * Elimina una tarea
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);
    console.log('✅ Tarea eliminada');
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
};

/**
 * Obtiene todas las tareas de un usuario
 */
export const getUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('createdBy', '==', userId)
    );

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        title: data.title,
        completed: data.completed,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate()
      });
    });

    // Ordenar en el cliente por fecha de creación (más reciente primero)
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return tasks;
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return [];
  }
};

/**
 * Suscribirse a las tareas de un usuario en tiempo real
 */
export const subscribeToUserTasks = (
  userId: string,
  callback: (tasks: Task[]) => void
) => {
  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(
    tasksRef,
    where('createdBy', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        title: data.title,
        completed: data.completed,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate()
      });
    });

    // Ordenar en el cliente por fecha de creación (más reciente primero)
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    callback(tasks);
  });
};
