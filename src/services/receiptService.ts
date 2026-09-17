import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Cada recibo vive en receipts/{transactionId} como data URL JPEG comprimido
// (ver lib/imageCompression). Colección aparte para no engordar los documentos
// de transacciones que se descargan en todas las listas.

export const saveReceipt = async (
  transactionId: string,
  imageDataUrl: string,
  uploadedBy: string
): Promise<void> => {
  await setDoc(doc(db, 'receipts', transactionId), {
    image: imageDataUrl,
    uploadedBy,
    updatedAt: serverTimestamp(),
  });
};

export const getReceipt = async (transactionId: string): Promise<string | null> => {
  const snap = await getDoc(doc(db, 'receipts', transactionId));
  return snap.exists() ? (snap.data().image as string) : null;
};

export const deleteReceipt = async (transactionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'receipts', transactionId));
};
