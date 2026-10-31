import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis,
} from 'recharts';
import {
  addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarClock, CheckCircle2, Landmark, Users } from 'lucide-react';
import TapChart, {
  CHART_BLUE, CHART_GRID, CHART_MARGIN, CHART_ORANGE, ChartReadout, useChartSelection, xAxisProps, yAxisProps,
} from './TapChart';
import { amountForMonth, monthKey } from '../lib/commitments';
import { isOverdue } from '../lib/payables';
import { cn, formatCurrency } from '../lib/utils';
import { subscribeCommitments } from '../services/commitmentService';
import { subscribePayables } from '../services/payableService';
import type { Commitment, Payable } from '../types';

function ChartCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-start gap-2 mb-3">
        <Icon className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Saldo de la caja en el tiempo ───────────────────────────────────────────

interface Movement {
  type: string;
  amount: number;
  date: Date;
}

export function CashBalanceChart({ transactions, totalInBox }: { transactions: Movement[]; totalInBox: number }) {
  const data = useMemo(() => {
    if (transactions.length === 0) return [];
    const now = new Date();
    const first = startOfMonth(transactions.reduce((d, t) => (t.date < d ? t.date : d), now));
    const points = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i))
      .filter((month) => endOfMonth(month) >= first)
      .map((month) => {
        const end = endOfMonth(month);
        // Se parte del saldo real de hoy para que el último punto siempre coincida con la caja
        const after = transactions
          .filter((t) => t.date > end)
          .reduce((sum, t) => sum + (t.type === 'contribution' ? t.amount : -t.amount), 0);
        return { month: format(month, 'MMM', { locale: es }), full: format(month, 'MMMM yyyy', { locale: es }), saldo: totalInBox - after };
      });
    return points;
  }, [transactions, totalInBox]);

  const [selected, setSelected] = useChartSelection(data.length);
  if (data.length < 2) return null;
  const point = data[selected];

  return (
    <ChartCard icon={Landmark} title="Saldo de la caja" subtitle="Cómo cerró cada mes">
      <ChartReadout period={point.full} items={[{ name: selected === data.length - 1 ? 'En caja hoy' : 'Saldo al cierre', value: formatCurrency(point.saldo) }]} />
      <TapChart labels={data.map((d) => d.month)} selected={selected} onSelect={setSelected} heightClass="h-44">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis dataKey="month" scale="band" {...xAxisProps} />
          <YAxis {...yAxisProps} />
          {data.some((d) => d.saldo < 0) && <ReferenceLine y={0} stroke="#6b7280" />}
          <Area type="linear" dataKey="saldo" stroke={CHART_BLUE} strokeWidth={2} fill={CHART_BLUE} fillOpacity={0.12} dot={false} isAnimationActive={false} />
        </AreaChart>
      </TapChart>
    </ChartCard>
  );
}

// ── Cumplimiento de compromisos ─────────────────────────────────────────────

type CellState = 'full' | 'partial' | 'none' | 'free' | 'extra';

const CELL: Record<CellState, { mark: string; className: string; label: string }> = {
  full: { mark: '✓', className: 'bg-emerald-100 text-emerald-800', label: 'cumplió' },
  partial: { mark: '½', className: 'bg-amber-100 text-amber-800', label: 'aporte parcial' },
  none: { mark: '✕', className: 'bg-red-100 text-red-700', label: 'sin aporte' },
  extra: { mark: '+', className: 'bg-blue-100 text-blue-800', label: 'aportó sin compromiso' },
  free: { mark: '–', className: 'bg-gray-50 text-gray-400', label: 'sin compromiso' },
};

interface Person {
  userId: string;
  userName: string;
}

export function CommitmentGrid({ people, transactions }: {
  people: Person[];
  transactions: { type: string; userId: string; amount: number; date: Date }[];
}) {
  const navigate = useNavigate();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  useEffect(() => subscribeCommitments(setCommitments), []);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
  }, []);

  const rows = useMemo(() => {
    const paid = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type !== 'contribution') return;
      const key = `${t.userId}|${monthKey(t.date)}`;
      paid.set(key, (paid.get(key) ?? 0) + t.amount);
    });
    return people.map((person) => {
      const periods = commitments.find((c) => c.userId === person.userId)?.periods ?? [];
      const cells = months.map((month) => {
        const key = monthKey(month);
        const expected = amountForMonth(periods, key);
        const amount = paid.get(`${person.userId}|${key}`) ?? 0;
        let state: CellState = 'free';
        if (expected > 0) state = amount >= expected ? 'full' : amount > 0 ? 'partial' : 'none';
        else if (amount > 0) state = 'extra';
        return { key, state, amount, expected };
      });
      return { ...person, cells };
    });
  }, [people, commitments, months, transactions]);

  if (rows.length === 0) return null;

  return (
    <ChartCard icon={Users} title="Cumplimiento de compromisos" subtitle="Últimos 6 meses, según lo que entró cada mes">
      <div className="grid gap-1 items-center text-xs" style={{ gridTemplateColumns: 'minmax(68px, 1.5fr) repeat(6, minmax(0, 1fr))' }}>
        <div />
        {months.map((m) => <div key={m.toISOString()} className="text-center text-gray-500 capitalize pb-1">{format(m, 'MMM', { locale: es })}</div>)}
        {rows.map((row) => (
          <div key={row.userId} className="contents">
            <button
              onClick={() => navigate(`/user/${row.userId}/contributions`)}
              className="min-h-11 text-left text-sm font-medium text-gray-800 truncate pr-1"
            >
              {row.userName.split(' ')[0]}
            </button>
            {row.cells.map((cell) => (
              <div
                key={cell.key}
                role="img"
                aria-label={`${row.userName}, ${cell.key}: ${CELL[cell.state].label}, ${formatCurrency(cell.amount)}`}
                className={cn('h-9 rounded-md flex items-center justify-center text-sm font-bold', CELL[cell.state].className)}
              >
                {CELL[cell.state].mark}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">✓ cumplió · ½ parcial · ✕ sin aporte · + sin compromiso · Toca un nombre para ver el detalle.</p>
    </ChartCard>
  );
}

// ── Vencimientos contra la caja ─────────────────────────────────────────────

export function PayablesVsCash({ totalInBox }: { totalInBox: number }) {
  const [payables, setPayables] = useState<Payable[] | null>(null);
  useEffect(() => subscribePayables(setPayables, () => setPayables([])), []);

  const { data, later } = useMemo(() => {
    const now = new Date();
    const pending = (payables ?? []).filter((p) => p.status === 'pending');
    let cumulative = pending.filter((p) => isOverdue(p, now)).reduce((s, p) => s + p.amount, 0);
    const today = startOfDay(now);
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const start = addDays(today, i * 7);
      const end = endOfDay(addDays(start, 6));
      cumulative += pending
        .filter((p) => p.dueDate >= start && p.dueDate <= end)
        .reduce((s, p) => s + p.amount, 0);
      return { label: `Sem ${i + 1}`, range: `Hasta el ${format(end, "d 'de' MMM", { locale: es })}`, acumulado: cumulative, queda: totalInBox - cumulative };
    });
    const limit = endOfDay(addDays(today, 27));
    return { data: weeks, later: pending.filter((p) => p.dueDate > limit).reduce((s, p) => s + p.amount, 0) };
  }, [payables, totalInBox]);

  // Por defecto se muestra la primera semana en que no alcanza, que es lo urgente
  const firstShort = data.findIndex((w) => w.queda < 0);
  const [selected, setSelected] = useState<number | null>(null);
  if (!payables || data[3].acumulado === 0) return null;
  const index = selected ?? (firstShort >= 0 ? firstShort : 3);
  const week = data[index];
  const short = week.queda < 0;

  return (
    <ChartCard icon={CalendarClock} title="Pagos próximos contra la caja" subtitle="Cuentas por pagar acumuladas, incluidas las vencidas">
      <ChartReadout
        period={week.range}
        items={[
          { name: 'A pagar acumulado', value: formatCurrency(week.acumulado), color: CHART_ORANGE },
          { name: short ? 'Faltaría en caja' : 'Quedaría en caja', value: formatCurrency(Math.abs(week.queda)) },
        ]}
      />
      <p className={cn('flex items-center gap-1.5 text-xs font-semibold mb-2', short ? 'text-red-700' : 'text-emerald-700')}>
        {short ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        {short ? 'Con el saldo de hoy no alcanza' : 'Con el saldo de hoy alcanza'}
      </p>
      <TapChart labels={data.map((d) => d.label)} selected={index} onSelect={setSelected} heightClass="h-44">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis dataKey="label" {...xAxisProps} />
          <YAxis domain={[0, (max: number) => Math.max(max, totalInBox, 1)]} {...yAxisProps} />
          <Bar dataKey="acumulado" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
          {totalInBox > 0 && <ReferenceLine y={totalInBox} stroke="#111827" strokeWidth={1.5} label={{ value: 'Caja hoy', position: 'insideTopRight', fontSize: 12, fill: '#111827' }} />}
        </BarChart>
      </TapChart>
      {later > 0 && <p className="text-xs text-gray-500 mt-2">Después de estas 4 semanas vencen {formatCurrency(later)} más.</p>}
    </ChartCard>
  );
}
