import { startOfDay } from 'date-fns';
import type { Payable } from '../types';

export const isOverdue = (payable: Payable, now: Date = new Date()): boolean =>
  payable.status === 'pending' && startOfDay(payable.dueDate) < startOfDay(now);

export interface SupplierDebt {
  name: string;
  phone?: string;
  total: number;
  count: number;
}

export interface PayablesSummary {
  totalPending: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
  bySupplier: SupplierDebt[]; // Mayor deuda primero
}

export function summarizePayables(payables: Payable[], now: Date = new Date()): PayablesSummary {
  const summary: PayablesSummary = { totalPending: 0, pendingCount: 0, overdueAmount: 0, overdueCount: 0, bySupplier: [] };
  const suppliers = new Map<string, SupplierDebt>();

  for (const p of payables) {
    if (p.status !== 'pending') continue;
    summary.totalPending += p.amount;
    summary.pendingCount++;
    if (isOverdue(p, now)) {
      summary.overdueAmount += p.amount;
      summary.overdueCount++;
    }
    // "Ferretería López" y "ferreteria lopez " son el mismo proveedor
    const key = p.supplierName.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const debt = suppliers.get(key) ?? { name: p.supplierName.trim(), total: 0, count: 0 };
    debt.total += p.amount;
    debt.count++;
    debt.phone = debt.phone || p.supplierPhone;
    suppliers.set(key, debt);
  }

  summary.bySupplier = [...suppliers.values()].sort((a, b) => b.total - a.total);
  return summary;
}
