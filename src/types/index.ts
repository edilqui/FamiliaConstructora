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

export interface Category {
  id: string;
  name: string;
  order: number; // Para ordenar las categorías
  isGroup: boolean; // true si es un grupo padre, false si es una categoría normal
  parentId: string | null; // null si es grupo, ID del grupo padre si es categoría
}

export type TransactionType = 'expense' | 'contribution';

export interface Transaction {
  id: string;
  amount: number;
  project: string;
  type: TransactionType;
  projectId: string | null; // null for general contributions
  categoryId: string | null; // null for contributions, required for expenses
  categoryName: string; // Nombre de la categoría para mostrar
  userId: string; // Usuario que hace el aporte o gasto
  registeredBy: string; // Usuario que registra la transacción
  date: Date;
  description: string; // Nombre corto de la transacción
  notes?: string; // Notas adicionales (opcional)
  quantity?: number; // Cantidad de productos (opcional, para gastos detallados)
  unitPrice?: number; // Precio unitario (opcional, para gastos detallados)
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
  categories: Category[];
  transactions: Transaction[];
  totalInBox: number; // Total aportes - Total gastos
  totalContributions: number; // Total de aportes
  totalExpenses: number; // Total de gastos
  userStats: UserStats[];
  projectStats: ProjectStats[];
}

export type NotificationType = 'contribution_created' | 'expense_created' | 'transaction_edited' | 'transaction_deleted';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  createdBy: string; // userId del usuario que realizó la acción
  createdByName: string; // Nombre del usuario
  createdAt: Date;
  transactionId?: string; // ID de la transacción relacionada
  transactionDescription?: string; // Descripción de la transacción
  amount?: number; // Monto de la transacción
  projectName?: string; // Nombre del proyecto
  readBy: string[]; // Array de userIds que ya la leyeron/eliminaron
}

// --- TAREAS / NOTAS ---
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  createdBy: string; // userId del usuario que creó la tarea
  completedAt?: Date;
}
