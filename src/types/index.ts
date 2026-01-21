export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  budget: number; // Presupuesto estimado (puede ser 0)
  status: 'active' | 'completed' | 'paused';
}

export type TransactionType = 'expense' | 'contribution';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: TransactionType;
  projectId: string | null; // null for general contributions
  userId: string; // Usuario que hace el aporte o gasto
  registeredBy: string; // Usuario que registra la transacción
  date: Date;
  description: string;
  createdAt: Date;
}

export interface UserStats {
  userId: string;
  userName: string;
  totalContributed: number;
  totalExpenses: number;
  share: number; // Parte proporcional de gastos totales (total / 4)
  balance: number; // totalContributed - share
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  totalSpent: number;
  transactionCount: number;
}

export interface DashboardData {
  users: User[];
  projects: Project[];
  transactions: Transaction[];
  totalInBox: number; // Total aportes - Total gastos
  userStats: UserStats[];
  projectStats: ProjectStats[];
}
