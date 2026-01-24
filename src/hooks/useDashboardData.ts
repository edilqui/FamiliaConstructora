import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Project, Category, Transaction, DashboardData, UserStats, ProjectStats } from '../types';

export const useDashboardData = (): DashboardData & { loading: boolean } => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Suscribirse a usuarios
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as User[];
      setUsers(usersData);
    });

    // Suscribirse a proyectos
    const projectsQuery = query(collection(db, 'projects'));
    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Project[];
      setProjects(projectsData);
    });

    // Suscribirse a categorías
    const categoriesQuery = query(collection(db, 'categories'));
    const unsubCategories = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Category[];
        // Ordenar manualmente en el cliente
        categoriesData.sort((a, b) => a.order - b.order);
        setCategories(categoriesData);
        console.log('✅ Categorías cargadas:', categoriesData.length);
      },
      (error) => {
        console.error('❌ Error al cargar categorías:', error);
        setCategories([]);
      }
    );

    // Suscribirse a transacciones
    const transactionsQuery = query(collection(db, 'transactions'));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as Transaction[];
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubProjects();
      unsubCategories();
      unsubTransactions();
    };
  }, []);

  // Calcular total de aportes
  const totalContributions = transactions
    .filter((t) => t.type === 'contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calcular total de gastos
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Total en caja = Aportes - Gastos
  const totalInBox = totalContributions - totalExpenses;

  // Calcular estadísticas por usuario
  const userStats: UserStats[] = users.map((user) => {
    const userContributions = transactions
      .filter((t) => t.type === 'contribution' && t.userId === user.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const userExpenses = transactions
      .filter((t) => t.type === 'expense' && t.userId === user.id)
      .reduce((sum, t) => sum + t.amount, 0);

    // Cada hermano debe pagar 1/4 del total de gastos
    const share = totalExpenses / 4;

    // Balance = Lo que ha aportado - Su parte proporcional
    const balance = userContributions - share;

    return {
      userId: user.id,
      userName: user.name,
      totalContributed: userContributions,
      totalExpenses: userExpenses,
      share,
      balance,
    };
  });

  // Calcular estadísticas por proyecto
  const projectStats: ProjectStats[] = projects.map((project) => {
    const projectTransactions = transactions.filter(
      (t) => t.type === 'expense' && t.projectId === project.id
    );

    const totalSpent = projectTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      projectId: project.id,
      projectName: project.name,
      totalSpent,
      transactionCount: projectTransactions.length,
    };
  });

  return {
    users,
    projects,
    categories,
    transactions,
    totalInBox,
    userStats,
    projectStats,
    loading,
  };
};
