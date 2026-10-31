import { ReactNode, useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

// Colores validados para daltonismo; identifican la serie, no su puesto
export const CHART_BLUE = '#2a78d6';
export const CHART_ORANGE = '#eb6834';
export const CHART_GRID = '#e5e7eb';

// Eje compacto y sin símbolo de moneda: los valores completos están en la lectura
export const axisMoney = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${Number((abs / 1e6).toFixed(1))} M`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)} k`;
  return `${value}`;
};

const Y_AXIS_WIDTH = 44;
export const CHART_MARGIN = { top: 8, right: 4, left: 0, bottom: 0 };
export const xAxisProps = {
  tick: { fontSize: 12, fill: '#6b7280' },
  axisLine: false,
  tickLine: false,
  dy: 6,
  height: 30,
  minTickGap: 6,
} as const;
export const yAxisProps = {
  tick: { fontSize: 12, fill: '#6b7280' },
  axisLine: false,
  tickLine: false,
  width: Y_AXIS_WIDTH,
  tickCount: 4,
  tickFormatter: axisMoney,
} as const;

// Por defecto queda elegido el periodo más reciente, así se lee sin tocar nada
export function useChartSelection(length: number) {
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked === null || picked >= length ? length - 1 : picked;
  return [selected, setPicked] as const;
}

export interface ReadoutItem {
  name: string;
  value: string;
  color?: string;
}

// Lectura fija encima de la gráfica: reemplaza la etiqueta flotante que tapaba los datos
export function ChartReadout({ period, items }: { period?: string; items: ReadoutItem[] }) {
  return (
    <div className="mb-3 pb-3 border-b border-gray-100" aria-live="polite">
      {period && <p className="text-xs font-semibold text-gray-500 first-letter:uppercase mb-1">{period}</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map((item) => (
          <div key={item.name} className="min-w-0">
            <p className="text-base font-bold text-gray-900 tabular-nums">{item.value}</p>
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              {item.color && <span className="w-3 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />}
              {item.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TapChartProps {
  labels: string[];
  selected: number;
  onSelect: (index: number) => void;
  heightClass?: string;
  children: ReactNode; // Un solo gráfico de recharts, sin Tooltip
}

// Cada periodo es una columna tocable de todo el alto: no hay que atinarle a una barra o punto
export default function TapChart({ labels, selected, onSelect, heightClass = 'h-52', children }: TapChartProps) {
  return (
    <div className={cn('relative w-full', heightClass)}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
      <div
        className="absolute inset-y-0 flex"
        style={{ left: Y_AXIS_WIDTH + CHART_MARGIN.left, right: CHART_MARGIN.right }}
      >
        {labels.map((label, index) => (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Ver ${label}`}
            aria-pressed={index === selected}
            style={{ minWidth: 0, minHeight: 0 }}
            className={cn('flex-1 rounded-lg transition-colors', index === selected && 'bg-gray-900/[0.07]')}
          />
        ))}
      </div>
    </div>
  );
}
