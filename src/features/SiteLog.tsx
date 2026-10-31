import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, BookOpen, Image as ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import ReceiptField, { useReceiptField } from '../components/ReceiptField';
import { useAuthStore } from '../store/useAuthStore';
import { useConstructionData } from '../hooks/useConstructionData';
import { useModalHistory } from '../hooks/useModalHistory';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { todayKey } from '../lib/schedule';
import { cn } from '../lib/utils';
import { addSiteLogEntry, deleteSiteLogEntry, getSiteLogPhoto, subscribeSiteLog } from '../services/siteLogService';
import { toast } from '../store/useToastStore';
import type { SiteLogEntry } from '../types';

const entryDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return format(new Date(y, m - 1, d), "EEEE, d 'de' MMMM yyyy", { locale: es });
};

function NewEntryForm({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((state) => state.user);
  const { activities } = useConstructionData();
  const photo = useReceiptField();
  const [date, setDate] = useState(todayKey());
  const [text, setText] = useState('');
  const [activityId, setActivityId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useModalHistory(true, onClose);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !user) return;
    if (!text.trim()) return setError('Escribe qué pasó en la obra');
    if (date > todayKey()) return setError('La fecha no puede ser futura');
    setSaving(true);
    setError('');
    try {
      await addSiteLogEntry({
        date,
        text: text.trim(),
        activityId: activityId || null,
        activityName: activities.find((a) => a.id === activityId)?.name ?? null,
        photo: photo.dataUrl,
        authorId: user.id,
        authorName: user.name,
      });
      toast('Anotación guardada');
      onClose();
    } catch (err) {
      console.error('Error al guardar la anotación:', err);
      setError('Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Nueva anotación" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nueva anotación</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
        <div>
          <label htmlFor="log-text" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">¿Qué pasó hoy?</label>
          <textarea
            id="log-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Ej: Se fundió la placa del segundo piso"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="log-date" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Fecha</label>
            <input
              id="log-date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>
          <div>
            <label htmlFor="log-activity" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Actividad</label>
            <select
              id="log-activity"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 outline-none"
            >
              <option value="">Ninguna</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <ReceiptField field={photo} label="Foto (Opcional)" alt="Foto de la obra" />
        <button
          type="submit"
          disabled={saving || photo.loading}
          className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          Guardar anotación
        </button>
      </form>
    </div>
  );
}

function EntryPhoto({ entryId }: { entryId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [image, setImage] = useState<string | null>(null);

  const load = async () => {
    setState('loading');
    try {
      setImage(await getSiteLogPhoto(entryId));
      setState('idle');
    } catch {
      setState('failed');
    }
  };

  if (image) {
    return <img src={image} alt="Foto de la obra" className="w-full max-h-80 object-contain bg-gray-900/5 rounded-xl border border-gray-200 mt-3" />;
  }
  return (
    <button onClick={load} disabled={state === 'loading'} className="mt-3 flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50">
      {state === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
      {state === 'failed' ? 'No se pudo cargar. Reintentar' : 'Ver foto'}
    </button>
  );
}

export default function SiteLog() {
  const goBack = useSmartBack('/obra');
  const canEdit = useAuthStore((state) => state.user?.role !== 'collaborator');
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  const [entries, setEntries] = useState<SiteLogEntry[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<SiteLogEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => subscribeSiteLog(setEntries, () => setLoadFailed(true)), []);

  const sorted = useMemo(
    () => [...(entries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.getTime() - a.createdAt.getTime()),
    [entries]
  );

  const confirmDelete = async () => {
    if (!deleting || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteSiteLogEntry(deleting.id);
      toast('Anotación eliminada');
    } catch (error) {
      console.error('Error al eliminar la anotación:', error);
      toast('No se pudo eliminar. Intenta de nuevo.', { type: 'error' });
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm',
          'transition-transform duration-300 ease-in-out',
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button onClick={goBack} aria-label="Volver" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Bitácora de obra</h1>
            <p className="text-xs text-gray-500">Lo que pasa en la obra, día a día</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-3 max-w-4xl mx-auto">
        {loadFailed ? (
          <p className="text-center text-sm text-red-600 py-12">No se pudo cargar la bitácora. Revisa tu conexión y vuelve a intentarlo.</p>
        ) : entries === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-500 font-medium">Aún no hay anotaciones</p>
          </div>
        ) : (
          sorted.map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{entryDate(entry.date)}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {entry.authorName}{entry.activityName && ` · ${entry.activityName}`}
                  </p>
                </div>
                {canEdit && (
                  <button onClick={() => setDeleting(entry)} aria-label="Eliminar anotación" className="p-2.5 -mt-1 -mr-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-900 mt-2 whitespace-pre-wrap break-words">{entry.text}</p>
              {entry.hasPhoto && <EntryPhoto entryId={entry.id} />}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-20 right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-xl active:scale-95 transition-all z-40 flex items-center gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium text-sm pr-1">Anotar</span>
        </button>
      )}

      {showForm && <NewEntryForm onClose={() => setShowForm(false)} />}

      <ConfirmDialog
        open={deleting !== null}
        title="¿Eliminar anotación?"
        message="Se borra también su foto. Esto no se puede deshacer."
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
