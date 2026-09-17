import { format } from 'date-fns';
import type { Transaction } from '../types';

// Separador ';' y BOM UTF-8: es lo que Excel en español espera para abrir
// el archivo con columnas y tildes correctas sin pasos intermedios.
const SEP = ';';

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(SEP) || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildTransactionsCsv(transactions: Transaction[]): string {
  const header = [
    'Fecha', 'Hora', 'Tipo', 'Descripción', 'Proyecto', 'Categoría',
    'Monto', 'Cantidad', 'Precio unitario', 'Etapa', 'Actividad', 'Notas',
  ].join(SEP);

  const rows = transactions.map((t) => [
    csvCell(format(t.date, 'yyyy-MM-dd')),
    csvCell(format(t.date, 'HH:mm')),
    csvCell(t.type === 'expense' ? 'Gasto' : 'Aporte'),
    csvCell(t.description),
    csvCell(t.project),
    csvCell(t.type === 'expense' && t.categoryName !== 'N/A' ? t.categoryName : ''),
    // Gastos en negativo para que la columna sume el neto directamente en Excel
    csvCell(t.type === 'expense' ? -t.amount : t.amount),
    csvCell(t.quantity ?? ''),
    csvCell(t.unitPrice ?? ''),
    csvCell(t.stageName ?? ''),
    csvCell(t.activityName ?? ''),
    csvCell(t.notes ?? ''),
  ].join(SEP));

  return '﻿' + [header, ...rows].join('\r\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
