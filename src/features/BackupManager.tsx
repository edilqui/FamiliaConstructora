import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  ArrowLeft,
  Download,
  Upload,
  HardDrive,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Share2,
  Clock,
  User,
  Database,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  exportAllData,
  generateBackupFileName,
  downloadBackupFile,
  shareBackupFile,
  readBackupFile,
  importBackupData,
  canShareFiles,
  BackupData
} from '../services/backupService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
type ImportStatus = 'idle' | 'reading' | 'preview' | 'importing' | 'success' | 'error';

export default function BackupManager() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de exportación
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportError, setExportError] = useState<string>('');
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);

  // Estados de importación
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importError, setImportError] = useState<string>('');
  const [backupToImport, setBackupToImport] = useState<BackupData | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  // Modal de confirmación
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const canShare = canShareFiles();

  // --- EXPORTAR BACKUP ---
  const handleExport = async () => {
    if (!user) return;

    setExportStatus('exporting');
    setExportError('');

    try {
      const backup = await exportAllData(user.id, user.name, user.email);
      setLastBackup(backup);

      const fileName = generateBackupFileName();

      // Intentar compartir primero (mejor UX en móvil)
      if (canShare) {
        const shared = await shareBackupFile(backup, fileName);
        if (shared) {
          setExportStatus('success');
          return;
        }
      }

      // Fallback: descargar directamente
      downloadBackupFile(backup, fileName);
      setExportStatus('success');
    } catch (error) {
      setExportError((error as Error).message);
      setExportStatus('error');
    }
  };

  // --- SOLO DESCARGAR (sin compartir) ---
  const handleDownloadOnly = () => {
    if (!lastBackup) return;
    const fileName = generateBackupFileName();
    downloadBackupFile(lastBackup, fileName);
  };

  // --- SELECCIONAR ARCHIVO PARA IMPORTAR ---
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('reading');
    setImportError('');

    try {
      const backup = await readBackupFile(file);
      setBackupToImport(backup);
      setImportStatus('preview');
    } catch (error) {
      setImportError((error as Error).message);
      setImportStatus('error');
    }

    // Limpiar el input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  // --- CONFIRMAR IMPORTACIÓN ---
  const handleConfirmImport = async () => {
    if (!backupToImport) return;

    setShowImportConfirm(false);
    setImportStatus('importing');

    try {
      const result = await importBackupData(backupToImport, {
        clearExisting: true // Sobrescribir datos existentes
      });

      setImportResult(result);
      setImportStatus(result.success ? 'success' : 'error');

      if (!result.success) {
        setImportError(result.errors.join('\n'));
      }
    } catch (error) {
      setImportError((error as Error).message);
      setImportStatus('error');
    }
  };

  // --- CANCELAR IMPORTACIÓN ---
  const handleCancelImport = () => {
    setBackupToImport(null);
    setImportStatus('idle');
    setImportError('');
  };

  // --- RESETEAR TODO ---
  const resetAll = () => {
    setExportStatus('idle');
    setExportError('');
    setImportStatus('idle');
    setImportError('');
    setBackupToImport(null);
    setImportResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Copias de Seguridad</h1>
          <p className="text-xs lg:text-sm text-gray-500">Exporta e importa tus datos</p>
        </div>
        <div className="p-2 bg-blue-100 rounded-full">
          <HardDrive className="w-5 h-5 text-blue-600" />
        </div>
      </header>

      <div className="px-4 lg:px-8 pt-6 max-w-2xl mx-auto space-y-6">

        {/* --- SECCIÓN EXPORTAR --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Crear Copia de Seguridad</h2>
                <p className="text-xs text-gray-500">Guarda todos tus datos en un archivo</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {exportStatus === 'idle' && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Se exportarán: usuarios, proyectos, categorías, transacciones, notificaciones y tareas.
                </p>
                <button
                  onClick={handleExport}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {canShare ? (
                    <>
                      <Share2 className="w-5 h-5" />
                      Crear y Guardar Backup
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Crear y Descargar Backup
                    </>
                  )}
                </button>
                {canShare && (
                  <p className="text-xs text-gray-400 text-center mt-3">
                    Podrás guardar en Google Drive, enviar por WhatsApp, etc.
                  </p>
                )}
              </>
            )}

            {exportStatus === 'exporting' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-medium">Preparando backup...</p>
                <p className="text-xs text-gray-400 mt-1">Esto puede tardar unos segundos</p>
              </div>
            )}

            {exportStatus === 'success' && lastBackup && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Backup creado exitosamente</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {lastBackup.metadata.totalDocuments} documentos exportados
                    </p>
                  </div>
                </div>

                {/* Resumen del backup */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{format(new Date(lastBackup.createdAt), "d MMM yyyy • HH:mm", { locale: es })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {Object.entries(lastBackup.collections).map(([name, data]) => (
                      <div key={name} className="bg-white rounded-lg p-2 text-xs">
                        <span className="text-gray-500 capitalize">{name}</span>
                        <span className="font-bold text-gray-900 ml-2">{data.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadOnly}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </button>
                  <button
                    onClick={() => setExportStatus('idle')}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Crear Otro
                  </button>
                </div>
              </div>
            )}

            {exportStatus === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Error al crear backup</p>
                    <p className="text-xs text-red-600 mt-1">{exportError}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExportStatus('idle')}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- SECCIÓN IMPORTAR --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Restaurar Copia de Seguridad</h2>
                <p className="text-xs text-gray-500">Importa datos desde un archivo</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* Input oculto para seleccionar archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {importStatus === 'idle' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-700">
                      <strong>Importante:</strong> Restaurar un backup reemplazará todos los datos actuales.
                      Asegúrate de tener un backup reciente antes de continuar.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSelectFile}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <FileJson className="w-5 h-5" />
                  Seleccionar Archivo de Backup
                </button>
              </>
            )}

            {importStatus === 'reading' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-medium">Leyendo archivo...</p>
              </div>
            )}

            {importStatus === 'preview' && backupToImport && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-3">Información del Backup</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Creado: {format(new Date(backupToImport.createdAt), "d MMM yyyy • HH:mm", { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-3.5 h-3.5" />
                      <span>Por: {backupToImport.createdBy.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Database className="w-3.5 h-3.5" />
                      <span>{backupToImport.metadata.totalDocuments} documentos</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {Object.entries(backupToImport.collections).map(([name, data]) => (
                      <div key={name} className="bg-white rounded-lg p-2 text-xs">
                        <span className="text-gray-500 capitalize">{name}</span>
                        <span className="font-bold text-gray-900 ml-2">{data.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelImport}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setShowImportConfirm(true)}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Restaurar
                  </button>
                </div>
              </div>
            )}

            {importStatus === 'importing' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-medium">Restaurando datos...</p>
                <p className="text-xs text-gray-400 mt-1">No cierres la aplicación</p>
              </div>
            )}

            {importStatus === 'success' && importResult && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Restauración completada</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {importResult.imported} documentos importados
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Aceptar
                </button>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Error al restaurar</p>
                    <p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{importError}</p>
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- INFO ADICIONAL --- */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Consejos</h3>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              <span>Crea backups regularmente, especialmente antes de cambios importantes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              <span>Guarda tus backups en Google Drive o un lugar seguro</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              <span>Los backups incluyen toda la información de la app</span>
            </li>
          </ul>
        </div>

      </div>

      {/* --- MODAL DE CONFIRMACIÓN --- */}
      {showImportConfirm && (
        <div className="fixed inset-0 bottom-20 sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowImportConfirm(false)}
          />

          {/* Modal */}
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-200">
            {/* Handle para móvil */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Confirmar restauración?
              </h3>

              <p className="text-sm text-gray-500 mb-6">
                Esta acción <strong>reemplazará todos los datos actuales</strong> con los del backup.
                Este proceso no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
                >
                  Sí, Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
