import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const initialProjects = [
  {
    name: "Construcción de Apartamentos",
    budget: 0,
    totalSpent: 0,
    status: "active" as const,
  },
  {
    name: "Adecuación de casa de papás",
    budget: 0,
    totalSpent: 0,
    status: "active" as const,
  },
  {
    name: "Aportes herramientas",
    budget: 0,
    totalSpent: 0,
    status: "active" as const,
  },
];

export const initializeProjects = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Verificar si ya existen proyectos
    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(projectsRef);

    if (snapshot.size > 0) {
      return {
        success: false,
        message: `Ya existen ${snapshot.size} proyecto(s) en la base de datos. No se crearon proyectos nuevos.`,
      };
    }

    // Crear los proyectos iniciales
    const promises = initialProjects.map((project) =>
      addDoc(projectsRef, project)
    );

    await Promise.all(promises);

    return {
      success: true,
      message: `✅ ${initialProjects.length} proyectos creados exitosamente: Construcción de Apartamentos, Adecuación de casa de papás y Aportes herramientas.`,
    };
  } catch (error) {
    console.error('Error al inicializar proyectos:', error);
    return {
      success: false,
      message: `❌ Error al crear proyectos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
};

// Función para agregar un aporte inicial (opcional)
export const addInitialContribution = async (
  userId: string,
  amount: number,
  description: string = 'Aporte inicial'
): Promise<{ success: boolean; message: string }> => {
  try {
    const transactionsRef = collection(db, 'transactions');

    await addDoc(transactionsRef, {
      amount,
      project: 'Aporte',
      type: 'contribution',
      projectId: null,
      userId,
      description,
      date: new Date(),
      createdAt: new Date(),
    });

    return {
      success: true,
      message: `✅ Aporte de $${amount} registrado exitosamente.`,
    };
  } catch (error) {
    console.error('Error al registrar aporte:', error);
    return {
      success: false,
      message: `❌ Error al registrar aporte: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
};
