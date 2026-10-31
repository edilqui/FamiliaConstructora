import { useEffect, useState } from 'react';
import { Camera, ImageOff, Loader2 } from 'lucide-react';
import { compressImageToDataUrl } from '../lib/imageCompression';
import { getReceipt } from '../services/receiptService';
import type { Transaction } from '../types';

// Foto asociada a un movimiento: la que ya tiene y lo que se cambió en el formulario
export function useReceiptField(existing?: Transaction) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const existingId = existing?.hasReceipt ? existing.id : undefined;
  useEffect(() => {
    if (!existingId) return;
    setLoading(true);
    getReceipt(existingId)
      .then((image) => setDataUrl(image))
      .catch(() => setError('No se pudo cargar la foto.'))
      .finally(() => setLoading(false));
  }, [existingId]);

  const select = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      setDataUrl(await compressImageToDataUrl(file));
      setChanged(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la foto.');
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    setDataUrl(null);
    setChanged(true);
    setError('');
  };

  return { dataUrl, changed, loading, error, select, remove };
}

interface ReceiptFieldProps {
  field: ReturnType<typeof useReceiptField>;
  label: string;
  alt: string;
  readOnly?: boolean;
}

export default function ReceiptField({ field, label, alt, readOnly = false }: ReceiptFieldProps) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">{label}</label>
      <input
        id="receipt-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { field.select(e.target.files?.[0]); e.target.value = ''; }}
      />
      {field.loading ? (
        <div className="flex items-center justify-center gap-2 py-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Procesando foto...
        </div>
      ) : field.dataUrl ? (
        <div className="space-y-2">
          <img
            src={field.dataUrl}
            alt={alt}
            className="w-full max-h-56 object-contain bg-gray-900/5 rounded-xl border border-gray-200"
          />
          {!readOnly && (
            <div className="flex gap-2">
              <label
                htmlFor="receipt-input"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4" /> Cambiar foto
              </label>
              <button
                type="button"
                onClick={field.remove}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <ImageOff className="w-4 h-4" /> Quitar foto
              </button>
            </div>
          )}
        </div>
      ) : !readOnly && (
        <label
          htmlFor="receipt-input"
          className="flex items-center justify-center gap-2 py-6 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 cursor-pointer transition-colors"
        >
          <Camera className="w-5 h-5 text-gray-400" />
          Tomar o elegir foto
        </label>
      )}
      {field.error && <p className="text-xs text-red-500 mt-2">{field.error}</p>}
    </div>
  );
}
