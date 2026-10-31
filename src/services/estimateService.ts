import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Estimate } from '../types';

const ESTIMATES_COLLECTION = 'estimates';

export const subscribeEstimates = (callback: (estimates: Estimate[]) => void, onError: () => void) =>
  onSnapshot(
    collection(db, ESTIMATES_COLLECTION),
    (snapshot) => {
      callback(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          activityId: data.activityId ?? null,
          wastePercent: data.wastePercent ?? 0,
          laborCost: data.laborCost ?? 0,
          items: data.items ?? [],
        };
      }));
    },
    (error) => {
      console.error('Error al cargar estimaciones:', error);
      onError();
    }
  );

export const saveEstimate = async ({ id, ...estimate }: Omit<Estimate, 'id'> & { id?: string }, userId: string): Promise<void> => {
  const ref = id ? doc(db, ESTIMATES_COLLECTION, id) : doc(collection(db, ESTIMATES_COLLECTION));
  await setDoc(ref, { ...estimate, updatedBy: userId, updatedAt: serverTimestamp() });
};

export const deleteEstimate = (id: string): Promise<void> => deleteDoc(doc(db, ESTIMATES_COLLECTION, id));
