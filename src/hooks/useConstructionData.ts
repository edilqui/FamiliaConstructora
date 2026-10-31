import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Stage, Activity } from '../types';
import { toast } from '../store/useToastStore';

interface ConstructionData {
  stages: Stage[];
  activities: Activity[];
  loading: boolean;
}

export const useConstructionData = (): ConstructionData => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pending = new Set(['stages', 'activities']);
    const markReady = (name: string) => {
      pending.delete(name);
      if (pending.size === 0) setLoading(false);
    };
    const onError = (error: Error) => {
      console.error('Error al cargar la obra:', error);
      toast('No se pudo cargar la obra. Revisa tu conexión y vuelve a abrir la app.', { type: 'error' });
    };

    const unsubStages = onSnapshot(
      query(collection(db, 'stages'), orderBy('order', 'asc')),
      (snap) => {
        setStages(
          snap.docs.map((d) => ({
            ...(d.data() as Omit<Stage, 'id' | 'createdAt' | 'completedAt'>),
            id: d.id,
            createdAt: d.data().createdAt?.toDate() ?? new Date(),
            completedAt: d.data().completedAt?.toDate(),
          })),
        );
        markReady('stages');
      },
      onError,
    );

    const unsubActivities = onSnapshot(
      query(collection(db, 'activities'), orderBy('order', 'asc')),
      (snap) => {
        setActivities(
          snap.docs.map((d) => ({
            ...(d.data() as Omit<Activity, 'id' | 'createdAt' | 'completedAt'>),
            id: d.id,
            createdAt: d.data().createdAt?.toDate() ?? new Date(),
            completedAt: d.data().completedAt?.toDate(),
          })),
        );
        markReady('activities');
      },
      onError,
    );

    return () => {
      unsubStages();
      unsubActivities();
    };
  }, []);

  return { stages, activities, loading };
};
