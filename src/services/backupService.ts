import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Colecciones a respaldar
const COLLECTIONS_TO_BACKUP = [
  'users',
  'projects',
  'categories',
  'transactions',
  'notifications',
  'tasks'
];

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
    version: '1.0',
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

  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      const documents: Array<{ id: string; data: Record<string, unknown> }> = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Convertir Timestamps a ISO strings para serialización
        const serializedData = serializeFirestoreData(data);
        documents.push({
          id: doc.id,
          data: serializedData
        });
      });

      backup.collections[collectionName] = {
        count: documents.length,
        documents
      };

      backup.metadata.totalDocuments += documents.length;
    } catch (error) {
      console.error(`Error al exportar colección ${collectionName}:`, error);
      // Continuar con las demás colecciones
      backup.collections[collectionName] = {
        count: 0,
        documents: []
      };
    }
  }

  return backup;
}

/**
 * Serializa datos de Firestore para JSON (convierte Timestamps, etc.)
 */
function serializeFirestoreData(data: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      serialized[key] = value;
    } else if (value instanceof Date) {
      serialized[key] = { _type: 'date', value: value.toISOString() };
    } else if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      // Es un Timestamp de Firestore
      serialized[key] = { _type: 'timestamp', value: (value as { toDate: () => Date }).toDate().toISOString() };
    } else if (Array.isArray(value)) {
      serialized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? serializeFirestoreData(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object') {
      serialized[key] = serializeFirestoreData(value as Record<string, unknown>);
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
}

/**
 * Deserializa datos de JSON a formato Firestore
 */
function deserializeFirestoreData(data: Record<string, unknown>): Record<string, unknown> {
  const deserialized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      deserialized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj._type === 'date' || obj._type === 'timestamp') {
        deserialized[key] = new Date(obj.value as string);
      } else if (Array.isArray(value)) {
        deserialized[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? deserializeFirestoreData(item as Record<string, unknown>)
            : item
        );
      } else {
        deserialized[key] = deserializeFirestoreData(obj);
      }
    } else {
      deserialized[key] = value;
    }
  }

  return deserialized;
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
 * Importa datos de un backup a Firestore
 * ADVERTENCIA: Esto sobrescribirá datos existentes
 */
export async function importBackupData(
  backup: BackupData,
  options: {
    clearExisting?: boolean;
    collectionsToImport?: string[];
  } = {}
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const { clearExisting = false, collectionsToImport = COLLECTIONS_TO_BACKUP } = options;
  const errors: string[] = [];
  let imported = 0;

  for (const collectionName of collectionsToImport) {
    const collectionData = backup.collections[collectionName];

    if (!collectionData) {
      continue;
    }

    try {
      // Opcionalmente limpiar la colección existente
      if (clearExisting) {
        const existingDocs = await getDocs(collection(db, collectionName));
        const batch = writeBatch(db);
        existingDocs.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });
        await batch.commit();
      }

      // Importar documentos en batches de 500 (límite de Firestore)
      const BATCH_SIZE = 500;
      const documents = collectionData.documents;

      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchDocs = documents.slice(i, i + BATCH_SIZE);

        for (const docData of batchDocs) {
          const docRef = doc(db, collectionName, docData.id);
          const deserializedData = deserializeFirestoreData(docData.data);
          batch.set(docRef, deserializedData);
        }

        await batch.commit();
        imported += batchDocs.length;
      }
    } catch (error) {
      errors.push(`Error en ${collectionName}: ${(error as Error).message}`);
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors
  };
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
