import type { Transaction } from '../types';

/** Normaliza descripciones para agrupar compras del mismo material */
export function materialKey(description: string): string {
  return description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export interface MaterialPurchase {
  date: Date;
  unitPrice: number;
  quantity: number;
}

export interface MaterialHistory {
  key: string;
  name: string;
  purchases: MaterialPurchase[]; // Más antigua primero
  first: MaterialPurchase;
  last: MaterialPurchase;
  changePct: number;
}

// Solo cuentan las compras registradas con cantidad × precio. La más reciente va primero.
export function buildMaterialHistory(transactions: Transaction[]): MaterialHistory[] {
  const map = new Map<string, { name: string; purchases: MaterialPurchase[] }>();
  transactions.forEach((t) => {
    if (t.type === 'expense' && t.quantity && t.unitPrice) {
      const key = materialKey(t.description);
      if (!map.has(key)) map.set(key, { name: t.description, purchases: [] });
      map.get(key)!.purchases.push({ date: t.date, unitPrice: t.unitPrice, quantity: t.quantity });
    }
  });
  return Array.from(map.entries())
    .map(([key, g]) => {
      const purchases = [...g.purchases].sort((a, b) => a.date.getTime() - b.date.getTime());
      const first = purchases[0];
      const last = purchases[purchases.length - 1];
      const changePct = first.unitPrice > 0 ? ((last.unitPrice - first.unitPrice) / first.unitPrice) * 100 : 0;
      return { key, name: g.name, purchases, first, last, changePct };
    })
    .sort((a, b) => b.last.date.getTime() - a.last.date.getTime());
}

// "Cemento" encuentra "Cemento gris Argos". El historial viene con lo más reciente primero.
export function findMaterial(name: string, history: MaterialHistory[]): MaterialHistory | null {
  const key = materialKey(name);
  if (!key) return null;
  return history.find((m) => m.key === key) ?? history.find((m) => m.key.includes(key) || key.includes(m.key)) ?? null;
}
