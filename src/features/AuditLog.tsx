import { useEffect, useState } from 'react';
import { ArrowLeft, History, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDashboardData } from '../hooks/useDashboardData';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { cn, formatCurrency } from '../lib/utils';
import { subscribeAuditLog } from '../services/auditService';
import type { AuditChange, AuditEntry } from '../types';

const PAGE_SIZE = 50;

const FIELD_LABELS: Record<string, string> = {
  amount: 'Monto',
  description: 'Descripción',
  date: 'Fecha',
  notes: 'Notas',
  project: 'Proyecto',
  categoryName: 'Categoría',
  userId: 'Persona',
  payerId: 'Pagó de su bolsillo',
  quantity: 'Cantidad',
  unitPrice: 'Precio unitario',
  stageName: 'Etapa',
  activityName: 'Actividad',
  receipt: 'Recibo',
  role: 'Rol',
  commitment: 'Compromiso mensual',
  supplierName: 'Proveedor',
  dueDate: 'Fecha de pago',
  payableStatus: 'Estado',
};

const ROLE_LABELS: Record<string, string> = { member: 'Miembro', collaborator: 'Colaborador' };

function describeAction(entry: AuditEntry): string {
  const kind = entry.entityType === 'payable' ? 'una cuenta por pagar' : entry.transactionType === 'expense' ? 'un gasto' : 'un aporte';
  switch (entry.action) {
    case 'create': return `registró ${kind}`;
    case 'update': return entry.entityType === 'commitment' ? 'cambió un compromiso de aporte' : `editó ${kind}`;
    case 'delete': return `eliminó ${kind}`;
    case 'approve': return 'aprobó a un usuario';
    case 'role_change': return 'cambió el rol de un usuario';
    case 'user_removed': return 'eliminó a un usuario';
    case 'restore': return 'restauró una copia de seguridad';
  }
}

export default function AuditLog() {
  const goBack = useSmartBack('/settings');
  const { users } = useDashboardData();
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [maxEntries, setMaxEntries] = useState(PAGE_SIZE);

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => subscribeAuditLog(maxEntries, setEntries, () => setLoadFailed(true)), [maxEntries]);

  const formatValue = (change: AuditChange, value: AuditChange['from']): string => {
    if (value === null) return '—';
    switch (change.field) {
      case 'amount':
      case 'unitPrice':
      case 'commitment':
        return formatCurrency(Number(value));
      case 'date':
      case 'dueDate':
        return format(new Date(String(value)), 'd MMM yyyy, HH:mm', { locale: es });
      case 'userId':
      case 'payerId':
        return users.find((u) => u.id === value)?.name ?? 'Usuario';
      case 'role':
        return ROLE_LABELS[String(value)] ?? String(value);
      default:
        return String(value);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button onClick={goBack} aria-label="Volver" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Registro de cambios</h1>
            <p className="text-xs text-gray-500">Quién registró, editó o eliminó cada movimiento</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-3 max-w-4xl mx-auto">
        {loadFailed ? (
          <p className="text-center text-sm text-red-600 py-12">No se pudo cargar el registro. Revisa tu conexión y vuelve a intentarlo.</p>
        ) : entries === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <History className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">Aún no hay cambios registrados</p>
            <p className="text-gray-400 text-xs mt-1">El registro empieza a partir de esta versión de la app</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-900 min-w-0">
                      <strong>{entry.actorName}</strong> {describeAction(entry)}
                    </p>
                    {entry.amount !== null && (
                      <span className={cn('text-sm font-bold tabular-nums flex-shrink-0', entry.action === 'delete' ? 'text-red-600' : 'text-gray-900')}>
                        {formatCurrency(entry.amount)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 break-words">{entry.summary}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(entry.createdAt, 'd MMM yyyy • HH:mm', { locale: es })}</p>
                  {entry.changes.length > 0 && (
                    <ul className="mt-2 bg-gray-50 rounded-lg p-2.5 space-y-1">
                      {entry.changes.map((change) => (
                        <li key={change.field} className="text-xs text-gray-600 break-words">
                          <span className="font-semibold text-gray-700">{FIELD_LABELS[change.field] ?? change.field}:</span>{' '}
                          {entry.action === 'delete'
                            ? formatValue(change, change.from)
                            : entry.action === 'create'
                              ? formatValue(change, change.to)
                              : `${formatValue(change, change.from)} → ${formatValue(change, change.to)}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {entries.length === maxEntries && (
              <button
                onClick={() => setMaxEntries((m) => m + PAGE_SIZE)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Ver más
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
