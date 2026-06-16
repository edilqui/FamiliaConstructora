import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { StageStatus } from '../types';

interface CreateStageParams {
  name: string;
  projectId: string;
  estimatedBudget: number;
  status: StageStatus;
  order: number;
}

export const createStage = async (params: CreateStageParams): Promise<string> => {
  const ref = await addDoc(collection(db, 'stages'), {
    ...params,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateStage = async (
  id: string,
  params: Partial<CreateStageParams> & { completedAt?: Date | null },
): Promise<void> => {
  await updateDoc(doc(db, 'stages', id), {
    ...params,
    updatedAt: serverTimestamp(),
  });
};

export const deleteStage = async (
  stageId: string,
): Promise<{ success: boolean; message: string }> => {
  const activitiesSnap = await getDocs(
    query(collection(db, 'activities'), where('stageId', '==', stageId)),
  );
  if (activitiesSnap.size > 0) {
    return {
      success: false,
      message: `No se puede eliminar. La etapa tiene ${activitiesSnap.size} actividad(es) asociada(s).`,
    };
  }
  await deleteDoc(doc(db, 'stages', stageId));
  return { success: true, message: 'Etapa eliminada.' };
};

export const getNextStageOrder = async (): Promise<number> => {
  const snap = await getDocs(collection(db, 'stages'));
  if (snap.empty) return 1;
  return snap.docs.reduce((max, d) => Math.max(max, (d.data().order as number) || 0), 0) + 1;
};
