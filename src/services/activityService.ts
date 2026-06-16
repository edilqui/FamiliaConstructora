import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActivityStatus } from '../types';

interface CreateActivityParams {
  name: string;
  stageId: string;
  projectId: string;
  estimatedBudget: number;
  status: ActivityStatus;
  progressPercent: number;
  order: number;
}

export const createActivity = async (params: CreateActivityParams): Promise<string> => {
  const ref = await addDoc(collection(db, 'activities'), {
    ...params,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateActivity = async (
  id: string,
  params: Partial<CreateActivityParams> & { completedAt?: Date | null },
): Promise<void> => {
  await updateDoc(doc(db, 'activities', id), {
    ...params,
    updatedAt: serverTimestamp(),
  });
};

export const deleteActivity = async (
  activityId: string,
): Promise<{ success: boolean; message: string }> => {
  const txSnap = await getDocs(
    query(collection(db, 'transactions'), where('activityId', '==', activityId)),
  );
  if (txSnap.size > 0) {
    return {
      success: false,
      message: `No se puede eliminar. La actividad tiene ${txSnap.size} transacción(es) asociada(s).`,
    };
  }
  await deleteDoc(doc(db, 'activities', activityId));
  return { success: true, message: 'Actividad eliminada.' };
};

export const getNextActivityOrder = async (stageId: string): Promise<number> => {
  const snap = await getDocs(
    query(collection(db, 'activities'), where('stageId', '==', stageId)),
  );
  if (snap.empty) return 1;
  return snap.docs.reduce((max, d) => Math.max(max, (d.data().order as number) || 0), 0) + 1;
};
