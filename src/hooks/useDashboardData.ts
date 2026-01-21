import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Project, Transaction, DashboardData } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useDashboardData = (): DashboardData & { loading: boolean } => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((state) => state.user);

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
      unsubTransactions();
    };
  }, []);

  // Calcular balance global (Total Aportes - Total Gastos)
  const totalContributions = transactions
    .filter((t) => t.type === 'contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const globalBalance = totalContributions - totalExpenses;

  // Calcular balance del usuario actual
  // (Lo que ha aportado - (Total Gastado / 4))
  const userContributions = currentUser
    ? transactions
        .filter((t) => t.type === 'contribution' && t.userId === currentUser.id)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const userShare = totalExpenses / 4; // Asumiendo 4 hermanos
  const userBalance = userContributions - userShare;

  return {
    users,
    projects,
    transactions,
    globalBalance,
    userBalance,
    loading,
  };
};
