export interface User {
  id: string;
  name: string;
  email: string;
  totalContributed: number;
}

export interface Project {
  id: string;
  name: string;
  budget: number;
  totalSpent: number;
  status: 'active' | 'completed' | 'paused';
}

export type TransactionType = 'expense' | 'contribution';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: TransactionType;
  projectId: string | null; // null for tools/general expenses
  userId: string;
  date: Date;
  description: string;
  createdAt: Date;
}

export interface DashboardData {
  users: User[];
  projects: Project[];
  transactions: Transaction[];
  globalBalance: number;
  userBalance: number;
}
