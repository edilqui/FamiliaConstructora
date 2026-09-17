/**
 * Comprime una foto a JPEG apto para guardarse como data URL en un documento
 * de Firestore (límite duro de 1 MB por documento). Se usa para los recibos:
 * evita depender de Firebase Storage, que en proyectos nuevos exige plan Blaze.
 */
const MAX_DIMENSION = 1200;
const TARGET_MAX_CHARS = 700_000; // ~700 KB en base64, margen bajo el límite de 1 MB

export async function compressImageToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Baja la calidad progresivamente hasta caber en el documento
  for (const quality of [0.7, 0.55, 0.4, 0.28]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= TARGET_MAX_CHARS) return dataUrl;
  }
  throw new Error('La foto es demasiado grande incluso comprimida. Intenta con otra.');
}
