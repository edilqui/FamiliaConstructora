import { collection, doc, getDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SiteLogEntry } from '../types';

const LOG_COLLECTION = 'siteLog';
// La foto va aparte para no descargar todas las imágenes al abrir la lista
const PHOTOS_COLLECTION = 'siteLogPhotos';

export const subscribeSiteLog = (callback: (entries: SiteLogEntry[]) => void, onError: () => void) =>
  onSnapshot(
    collection(db, LOG_COLLECTION),
    (snapshot) => {
      callback(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date,
          text: data.text,
          hasPhoto: !!data.hasPhoto,
          activityName: data.activityName ?? undefined,
          authorId: data.authorId,
          authorName: data.authorName,
          createdAt: data.createdAt?.toDate() ?? new Date(),
        };
      }));
    },
    (error) => {
      console.error('Error al cargar la bitácora:', error);
      onError();
    }
  );

interface NewSiteLogEntry {
  date: string;
  text: string;
  activityId: string | null;
  activityName: string | null;
  photo: string | null;
  authorId: string;
  authorName: string;
}

export const addSiteLogEntry = async ({ photo, ...entry }: NewSiteLogEntry): Promise<void> => {
  const ref = doc(collection(db, LOG_COLLECTION));
  const batch = writeBatch(db);
  batch.set(ref, { ...entry, hasPhoto: !!photo, createdAt: serverTimestamp() });
  if (photo) batch.set(doc(db, PHOTOS_COLLECTION, ref.id), { image: photo });
  await batch.commit();
};

export const getSiteLogPhoto = async (entryId: string): Promise<string | null> => {
  const snap = await getDoc(doc(db, PHOTOS_COLLECTION, entryId));
  return snap.exists() ? (snap.data().image as string) : null;
};

export const deleteSiteLogEntry = async (entryId: string): Promise<void> => {
  const batch = writeBatch(db);
  batch.delete(doc(db, LOG_COLLECTION, entryId));
  batch.delete(doc(db, PHOTOS_COLLECTION, entryId));
  await batch.commit();
};
