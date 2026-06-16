import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Stage, Activity } from '../types';

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
      },
    );

    let activitiesReady = false;
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
        if (!activitiesReady) {
          activitiesReady = true;
          setLoading(false);
        }
      },
    );

    return () => {
      unsubStages();
      unsubActivities();
    };
  }, []);

  return { stages, activities, loading };
};
