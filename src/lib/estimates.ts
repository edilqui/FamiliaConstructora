import { findMaterial, type MaterialHistory } from './materials';
import type { EstimateItem } from '../types';

export interface EstimateTemplate {
  id: string;
  label: string;
  unit: string;
  materials: { name: string; unit: string; perUnit: number }[];
}

// Cantidades de referencia para partir de algo: cada obra las ajusta con su maestro
export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
  {
    id: 'concrete',
    label: 'Concreto 3000 PSI',
    unit: 'm³',
    materials: [
      { name: 'Cemento', unit: 'bulto 50 kg', perUnit: 7 },
      { name: 'Arena', unit: 'm³', perUnit: 0.56 },
      { name: 'Grava', unit: 'm³', perUnit: 0.84 },
    ],
  },
  {
    id: 'wall',
    label: 'Muro en bloque',
    unit: 'm²',
    materials: [
      { name: 'Bloque', unit: 'und', perUnit: 12.5 },
      { name: 'Cemento', unit: 'bulto 50 kg', perUnit: 0.2 },
      { name: 'Arena', unit: 'm³', perUnit: 0.03 },
    ],
  },
  {
    id: 'plaster',
    label: 'Pañete',
    unit: 'm²',
    materials: [
      { name: 'Cemento', unit: 'bulto 50 kg', perUnit: 0.15 },
      { name: 'Arena', unit: 'm³', perUnit: 0.02 },
    ],
  },
  {
    id: 'tile',
    label: 'Piso enchapado',
    unit: 'm²',
    materials: [
      { name: 'Baldosa', unit: 'm²', perUnit: 1 },
      { name: 'Pegante', unit: 'bulto 25 kg', perUnit: 0.2 },
      { name: 'Boquilla', unit: 'kg', perUnit: 0.3 },
    ],
  },
  {
    id: 'paint',
    label: 'Pintura (2 manos)',
    unit: 'm²',
    materials: [{ name: 'Pintura', unit: 'galón', perUnit: 0.07 }],
  },
];

// Lo que se suma a lo ya estimado; el mismo material de dos plantillas queda en una sola línea
export function addTemplateItems(items: EstimateItem[], template: EstimateTemplate, workQuantity: number): EstimateItem[] {
  const result = items.map((item) => ({ ...item }));
  for (const material of template.materials) {
    const quantity = Math.round(material.perUnit * workQuantity * 100) / 100;
    const existing = result.find((i) => i.name === material.name && i.unit === material.unit);
    if (existing) existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
    else result.push({ name: material.name, unit: material.unit, quantity, unitPrice: null });
  }
  return result;
}

// Un precio escrito manda; si no hay, se usa la última compra registrada
export const resolveUnitPrice = (item: EstimateItem, history: MaterialHistory[]): number | null =>
  item.unitPrice ?? findMaterial(item.name, history)?.last.unitPrice ?? null;

export interface EstimateTotals {
  materials: number;
  waste: number;
  labor: number;
  total: number;
  missingPrices: number; // Con estas líneas sin precio, el total se queda corto
}

export function computeEstimate(
  items: EstimateItem[],
  wastePercent: number,
  laborCost: number,
  history: MaterialHistory[]
): EstimateTotals {
  let materials = 0;
  let missingPrices = 0;
  for (const item of items) {
    const price = resolveUnitPrice(item, history);
    if (price === null) missingPrices++;
    else materials += price * item.quantity;
  }
  const waste = materials * (wastePercent / 100);
  return { materials, waste, labor: laborCost, total: materials + waste + laborCost, missingPrices };
}
