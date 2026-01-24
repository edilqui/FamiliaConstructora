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

const initialCategories = [
  { name: "Materiales", order: 1 },
  { name: "Jornales", order: 2 },
  { name: "Enseres", order: 3 },
  { name: "Pagos Extra", order: 4 },
  { name: "Cemento", order: 5 },
  { name: "Varilla", order: 6 },
  { name: "Arena", order: 7 },
  { name: "Electricidad", order: 8 },
  { name: "Aguas Limpias", order: 9 },
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
    const projectPromises = initialProjects.map((project) =>
      addDoc(projectsRef, project)
    );

    await Promise.all(projectPromises);

    // Inicializar categorías automáticamente
    await initializeCategories();

    return {
      success: true,
      message: `✅ ${initialProjects.length} proyectos y ${initialCategories.length} categorías creados exitosamente.`,
    };
  } catch (error) {
    console.error('Error al inicializar proyectos:', error);
    return {
      success: false,
      message: `❌ Error al crear proyectos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
};

export const initializeCategories = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Verificar si ya existen categorías
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);

    if (snapshot.size > 0) {
      return {
        success: false,
        message: `Ya existen ${snapshot.size} categoría(s) en la base de datos.`,
      };
    }

    // Crear las categorías iniciales
    const categoryPromises = initialCategories.map((category) =>
      addDoc(categoriesRef, category)
    );

    await Promise.all(categoryPromises);

    return {
      success: true,
      message: `✅ ${initialCategories.length} categorías creadas exitosamente.`,
    };
  } catch (error) {
    console.error('Error al inicializar categorías:', error);
    return {
      success: false,
      message: `❌ Error al crear categorías: ${error instanceof Error ? error.message : 'Error desconocido'}`,
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
      categoryId: null,
      categoryName: 'N/A',
      userId,
      registeredBy: userId,
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
