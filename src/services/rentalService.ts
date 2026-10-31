import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { RentalScenario } from '../types';

const SCENARIOS_COLLECTION = 'rentalScenarios';

// Un escenario compartido por proyecto: todos ven los mismos supuestos
export const subscribeRentalScenarios = (callback: (scenarios: RentalScenario[]) => void, onError: () => void) =>
  onSnapshot(
    collection(db, SCENARIOS_COLLECTION),
    (snapshot) => {
      callback(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          projectId: d.id,
          totalCost: data.totalCost ?? 0,
          units: data.units ?? 1,
          monthlyRentPerUnit: data.monthlyRentPerUnit ?? 0,
          monthlyExpensesPerUnit: data.monthlyExpensesPerUnit ?? 0,
          occupancyPercent: data.occupancyPercent ?? 100,
          annualIncreasePercent: data.annualIncreasePercent ?? 0,
        };
      }));
    },
    (error) => {
      console.error('Error al cargar escenarios:', error);
      onError();
    }
  );

export const saveRentalScenario = async ({ projectId, ...scenario }: RentalScenario, userId: string): Promise<void> => {
  await setDoc(doc(db, SCENARIOS_COLLECTION, projectId), { ...scenario, updatedBy: userId, updatedAt: serverTimestamp() });
};
