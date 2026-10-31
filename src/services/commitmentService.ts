import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { addAuditEntry } from './auditService';
import type { Commitment, CommitmentPeriod } from '../types';

const COMMITMENTS_COLLECTION = 'commitments';

export const subscribeCommitments = (callback: (commitments: Commitment[]) => void) =>
  onSnapshot(
    collection(db, COMMITMENTS_COLLECTION),
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ userId: d.id, periods: (d.data().periods ?? []) as CommitmentPeriod[] })));
    },
    (error) => console.error('Error al cargar compromisos:', error)
  );

interface SaveCommitmentParams {
  userId: string;
  userName: string;
  periods: CommitmentPeriod[];
  fromAmount: number;
  toAmount: number;
  actor: { id: string; name: string };
}

export const saveCommitment = async ({ userId, userName, periods, fromAmount, toAmount, actor }: SaveCommitmentParams): Promise<void> => {
  const batch = writeBatch(db);
  batch.set(doc(db, COMMITMENTS_COLLECTION, userId), { periods, updatedBy: actor.id, updatedAt: serverTimestamp() });
  addAuditEntry(batch, {
    action: 'update',
    entityType: 'commitment',
    entityId: userId,
    summary: userName,
    changes: [{ field: 'commitment', from: fromAmount, to: toAmount }],
    actorId: actor.id,
    actorName: actor.name,
  });
  await batch.commit();
};
