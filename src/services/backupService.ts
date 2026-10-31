import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { addAuditEntry } from './auditService';

// Se guarda en la copia, pero restaurar nunca lo modifica: el registro de cambios
// no se puede editar ni borrar, y debe seguir mostrando lo ocurrido.
const EXPORT_ONLY_COLLECTIONS = ['auditLog'];

// Colecciones a respaldar. Toda colección nueva de la app debe agregarse aquí.
const COLLECTIONS_TO_BACKUP = [
  'users',
  'projects',
  'categories',
  'transactions',
  'stages',
  'activities',
  'receipts',
  'cashCounts',
  'commitments',
  'notifications',
  'tasks',
  'brassGames'
];

const BACKUP_VERSION = '2.0';
// Firestore limita cada lote en documentos y en bytes; los recibos pesan hasta ~700 KB
const MAX_BATCH_DOCS = 400;
const MAX_BATCH_BYTES = 5 * 1024 * 1024;

export interface BackupData {
  version: string;
  createdAt: string;
  createdBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  collections: {
    [collectionName: string]: {
      count: number;
      documents: Array<{
        id: string;
        data: Record<string, unknown>;
      }>;
    };
  };
  metadata: {
    totalDocuments: number;
    appVersion: string;
  };
}

/**
 * Exporta todos los datos de Firestore a un objeto BackupData
 */
export async function exportAllData(userId: string, userName: string, userEmail: string): Promise<BackupData> {
  const backup: BackupData = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: {
      userId,
      userName,
      userEmail
    },
    collections: {},
    metadata: {
      totalDocuments: 0,
      appVersion: '1.0.0'
    }
  };

  for (const collectionName of [...COLLECTIONS_TO_BACKUP, ...EXPORT_ONLY_COLLECTIONS]) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      const documents: Array<{ id: string; data: Record<string, unknown> }> = [];

      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          // Convertir Timestamps a ISO strings para serialización
          data: serializeValue(doc.data()) as Record<string, unknown>
        });
      });

      backup.collections[collectionName] = {
        count: documents.length,
        documents
      };

      backup.metadata.totalDocuments += documents.length;
    } catch (error) {
      // Una copia incompleta no debe presentarse como exitosa
      console.error(`Error al exportar colección ${collectionName}:`, error);
      throw new Error(`No se pudo leer "${collectionName}". La copia no se creó; intenta de nuevo.`);
    }
  }

  return backup;
}

/**
 * Serializa un valor de Firestore para JSON (convierte Timestamps, etc.)
 */
function serializeValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return { _type: 'date', value: value.toISOString() };
  if ('toDate' in value && typeof value.toDate === 'function') {
    // Es un Timestamp de Firestore
    return { _type: 'timestamp', value: (value as { toDate: () => Date }).toDate().toISOString() };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
}

/**
 * Deserializa un valor de JSON a formato Firestore
 */
function deserializeValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deserializeValue);
  const obj = value as Record<string, unknown>;
  if (obj._type === 'date' || obj._type === 'timestamp') return new Date(obj.value as string);
  return Object.fromEntries(Object.entries(obj).map(([key, item]) => [key, deserializeValue(item)]));
}

/**
 * Genera el nombre del archivo de backup
 */
export function generateBackupFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `FamiliaBuilder_Backup_${dateStr}_${timeStr}.json`;
}

/**
 * Descarga el backup como archivo JSON
 */
export function downloadBackupFile(backup: BackupData, fileName: string): void {
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Comparte el archivo de backup usando Web Share API (móvil)
 */
export async function shareBackupFile(backup: BackupData, fileName: string): Promise<boolean> {
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Backup FamiliaBuilder',
        text: `Copia de seguridad creada el ${new Date().toLocaleDateString('es-ES')}`
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error al compartir:', error);
      }
      return false;
    }
  }
  return false;
}

/**
 * Lee un archivo de backup y valida su estructura
 */
export async function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BackupData;

        // Validar estructura básica
        if (!data.version || !data.collections || !data.createdAt) {
          throw new Error('El archivo no tiene el formato de backup válido');
        }

        resolve(data);
      } catch (error) {
        reject(new Error('Error al leer el archivo: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
}

/**
 * Colecciones que el backup realmente trae. Las copias 1.0 guardaban una
 * colección vacía cuando fallaba su lectura, así que ahí "vacía" no significa
 * que no hubiera datos: se trata como no incluida para no borrar nada por error.
 */
export function getIncludedCollections(backup: BackupData): string[] {
  return COLLECTIONS_TO_BACKUP.filter((name) => {
    const data = backup.collections[name];
    return !!data && (backup.version !== '1.0' || data.documents.length > 0);
  });
}

export function getMissingCollections(backup: BackupData): string[] {
  const included = getIncludedCollections(backup);
  return COLLECTIONS_TO_BACKUP.filter((name) => !included.includes(name));
}

/**
 * Revisa el archivo completo antes de tocar cualquier dato.
 * Devuelve el problema encontrado, o null si se puede restaurar.
 */
export function validateBackup(backup: BackupData, currentUserId: string): string | null {
  for (const [name, data] of Object.entries(backup.collections)) {
    if (!Array.isArray(data?.documents) || data.documents.length !== data.count) {
      return `El archivo está incompleto o dañado (${name}).`;
    }
    const invalid = data.documents.some((d) =>
      typeof d?.id !== 'string' || !d.id || d.id.includes('/') ||
      d.data === null || typeof d.data !== 'object' || Array.isArray(d.data)
    );
    if (invalid) return `El archivo tiene documentos inválidos (${name}).`;
  }

  // Sin esto, restaurar dejaría sin acceso a quien lo está haciendo
  const me = backup.collections.users?.documents?.find((d) => d.id === currentUserId);
  if (!me || me.data.approved === false) {
    return 'Tu usuario no aparece aprobado en este backup. Restaurarlo te dejaría sin acceso.';
  }
  return null;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  deleted: number;
  errors: string[];
}

/**
 * Reemplaza los datos actuales por los del backup, sin perder nada si falla:
 * 1. Escribe todos los documentos del backup.
 * 2. Solo si todo se escribió, borra lo que no estaba en el backup.
 * Las colecciones que el backup no trae no se tocan. `users` se limpia de
 * último y nunca se borra al usuario actual: sin su documento, las reglas de
 * Firestore le negarían cualquier otra escritura.
 */
export async function importBackupData(backup: BackupData, currentUserId: string, currentUserName = ''): Promise<ImportResult> {
  const problem = validateBackup(backup, currentUserId);
  if (problem) return { success: false, imported: 0, deleted: 0, errors: [problem] };

  const included = getIncludedCollections(backup);
  let imported = 0;
  let deleted = 0;

  for (const collectionName of included) {
    try {
      let batch = writeBatch(db);
      let batchDocs = 0;
      let batchBytes = 0;

      for (const docData of backup.collections[collectionName].documents) {
        const data = deserializeValue(docData.data) as Record<string, unknown>;
        const bytes = JSON.stringify(docData.data).length;

        if (batchDocs > 0 && (batchDocs >= MAX_BATCH_DOCS || batchBytes + bytes > MAX_BATCH_BYTES)) {
          await batch.commit();
          imported += batchDocs;
          batch = writeBatch(db);
          batchDocs = 0;
          batchBytes = 0;
        }

        batch.set(doc(db, collectionName, docData.id), data);
        batchDocs++;
        batchBytes += bytes;
      }

      if (batchDocs > 0) {
        await batch.commit();
        imported += batchDocs;
      }
    } catch (error) {
      return {
        success: false,
        imported,
        deleted,
        errors: [`Error en ${collectionName}: ${(error as Error).message}. No se eliminó ningún dato; puedes intentar de nuevo.`]
      };
    }
  }

  const deleteOrder = [...included.filter((name) => name !== 'users'), ...included.filter((name) => name === 'users')];

  for (const collectionName of deleteOrder) {
    try {
      const keep = new Set(backup.collections[collectionName].documents.map((d) => d.id));
      const existing = await getDocs(collection(db, collectionName));
      const toDelete = existing.docs.filter((d) =>
        !keep.has(d.id) && !(collectionName === 'users' && d.id === currentUserId)
      );

      for (let i = 0; i < toDelete.length; i += MAX_BATCH_DOCS) {
        const batch = writeBatch(db);
        const chunk = toDelete.slice(i, i + MAX_BATCH_DOCS);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deleted += chunk.length;
      }
    } catch (error) {
      return {
        success: false,
        imported,
        deleted,
        errors: [`Los datos del backup se escribieron, pero falló la limpieza de ${collectionName}: ${(error as Error).message}. Puedes intentar de nuevo.`]
      };
    }
  }

  // Secundario: los datos ya se restauraron, un fallo aquí no debe reportarse como error
  try {
    const batch = writeBatch(db);
    addAuditEntry(batch, {
      action: 'restore',
      entityType: 'backup',
      entityId: backup.createdAt,
      summary: `Copia del ${new Date(backup.createdAt).toLocaleDateString('es-CO')}: ${imported} restaurados, ${deleted} eliminados`,
      actorId: currentUserId,
      actorName: currentUserName,
    });
    await batch.commit();
  } catch (error) {
    console.error('Restauración completa, pero no se pudo registrar:', error);
  }

  return { success: true, imported, deleted, errors: [] };
}

/**
 * Verifica si el navegador soporta Web Share API con archivos
 */
export function canShareFiles(): boolean {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  // Crear un archivo de prueba para verificar soporte
  const testFile = new File(['test'], 'test.json', { type: 'application/json' });
  return navigator.canShare({ files: [testFile] });
}
