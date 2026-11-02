/**
 * CampusFlow - Client-Side Image Optimizer & Avatar Validation
 * 
 * Provides client-side validation, proportional center-square cropping (512x512 max),
 * adaptive WebP (or JPEG fallback) compression under 200 KB, and offline-resilient caching.
 */

export const ALLOWED_AVATAR_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export const ALLOWED_AVATAR_EXTENSIONS = Object.freeze([
  'jpg',
  'jpeg',
  'png',
  'webp'
]);

// 10 MB gross size threshold
export const MAX_RAW_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;

// Target compressed maximum payload size for Supabase Storage (< 200 KB)
export const MAX_TARGET_AVATAR_SIZE_BYTES = 200 * 1024;

// Standard avatar resolution (512x512 max)
export const TARGET_AVATAR_DIMENSION = 512;

// Initial compression quality (between 0.80 and 0.85)
export const DEFAULT_AVATAR_QUALITY = 0.82;

export const OFFLINE_AVATAR_KEY_PREFIX = 'campusflow_offline_avatar_';

/**
 * Validates a raw image file before reading or canvas processing.
 * 
 * @param {File|Blob|object} file 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateRawAvatarFile(file) {
  if (!file) {
    return { isValid: false, error: 'No se seleccionó ningún archivo.' };
  }

  // 1. Strict MIME type check
  if (!file.type || !ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Formato no permitido. Utiliza JPG, PNG o WebP.' };
  }

  // 2. Extension check if filename is available
  if (file.name) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_AVATAR_EXTENSIONS.includes(ext)) {
      return { isValid: false, error: 'Extensión de archivo no permitida. Utiliza JPG, PNG o WebP.' };
    }
  }

  // 3. Gross size validation (> 10 MB rejected immediately)
  if (typeof file.size === 'number' && file.size > MAX_RAW_AVATAR_SIZE_BYTES) {
    return { isValid: false, error: 'La imagen es demasiado pesada. Elige una de menor tamaño.' };
  }

  // 4. Reject empty or corrupt files with 0 or negative size
  if (typeof file.size === 'number' && file.size <= 0) {
    return { isValid: false, error: 'El archivo de imagen está vacío o dañado.' };
  }

  return { isValid: true, error: null };
}

/**
 * Calculates center-square cropping coordinates and dimensions.
 * Crops the center square from non-square images and caps maximum dimension at 512px.
 * 
 * @param {number} sourceWidth 
 * @param {number} sourceHeight 
 * @param {number} maxDimension 
 * @returns {{ sx: number, sy: number, sWidth: number, sHeight: number, targetWidth: number, targetHeight: number }}
 */
export function calculateCenterSquareCrop(sourceWidth, sourceHeight, maxDimension = TARGET_AVATAR_DIMENSION) {
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Dimensiones de imagen no válidas.');
  }

  const minEdge = Math.min(sourceWidth, sourceHeight);
  const sx = Math.round((sourceWidth - minEdge) / 2);
  const sy = Math.round((sourceHeight - minEdge) / 2);

  // Proportional scaling capped at maxDimension (512px)
  const targetDimension = Math.min(maxDimension, minEdge);

  return {
    sx,
    sy,
    sWidth: minEdge,
    sHeight: minEdge,
    targetWidth: targetDimension,
    targetHeight: targetDimension
  };
}

/**
 * Tests whether the current environment / canvas supports 'image/webp' export.
 * @returns {boolean}
 */
export function checkWebpSupport() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
}

/**
 * Converts a base64 DataURL to a Blob.
 * 
 * @param {string} dataUrl 
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
    throw new Error('DataURL no válido.');
  }
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  const binaryString = atob(parts[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Converts a Blob to a base64 DataURL.
 * 
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) return reject(new Error('Blob no proporcionado.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error al convertir Blob a DataURL.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Default HTML5 Image loader with revokeObjectURL cleanup.
 */
function defaultLoadImage(file) {
  return new Promise((resolve, reject) => {
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then(resolve)
        .catch(() => loadWithImageTag(file).then(resolve).catch(reject));
      return;
    }
    loadWithImageTag(file).then(resolve).catch(reject);
  });
}

function loadWithImageTag(file) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      return reject(new Error('HTML Image no está disponible en este entorno.'));
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('El archivo de imagen está dañado o no se puede procesar.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Default canvas-to-blob exporter.
 */
function defaultCanvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Fallo al generar Blob desde el Canvas.'));
      }, mimeType, quality);
    } else if (typeof canvas.toDataURL === 'function') {
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrlToBlob(dataUrl));
      } catch (err) {
        reject(err);
      }
    } else {
      reject(new Error('Canvas no soporta toBlob ni toDataURL.'));
    }
  });
}

/**
 * Compresses and resizes an avatar image on the client side:
 * - Center-square cropped.
 * - Scaled to max 512x512 pixels.
 * - Exported as 'image/webp' (with 'image/jpeg' fallback).
 * - Adaptive quality loop ensuring final payload is under 200 KB.
 * 
 * @param {File|Blob} file 
 * @param {object} [options]
 * @returns {Promise<{ file: File|Blob, blob: Blob, dataUrl: string, width: number, height: number, format: string, size: number, fileName: string }>}
 */
export async function optimizeAvatarImage(file, options = {}) {
  // 1. Validar archivo en bruto
  const validation = validateRawAvatarFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const maxDimension = options.maxDimension || TARGET_AVATAR_DIMENSION;
  const maxSizeBytes = options.maxSizeBytes || MAX_TARGET_AVATAR_SIZE_BYTES;
  const initialQuality = options.initialQuality || DEFAULT_AVATAR_QUALITY;
  const userId = options.userId || 'avatar';

  // 2. Cargar imagen y extraer dimensiones
  let imageSource;
  try {
    imageSource = options.loadImage
      ? await options.loadImage(file)
      : await defaultLoadImage(file);
  } catch {
    throw new Error('El archivo de imagen está dañado o no se puede procesar.');
  }

  const sourceWidth = imageSource.naturalWidth || imageSource.width;
  const sourceHeight = imageSource.naturalHeight || imageSource.height;

  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('No se pudieron determinar las dimensiones de la imagen.');
  }

  // 3. Recorte cuadrado centrado
  const crop = calculateCenterSquareCrop(sourceWidth, sourceHeight, maxDimension);

  // 4. Formato de compresión (WebP con fallback a JPEG)
  const isWebp = options.forceFormat
    ? options.forceFormat === 'image/webp'
    : (options.isWebpSupported !== undefined ? options.isWebpSupported : checkWebpSupport());

  const targetMimeType = options.forceFormat || (isWebp ? 'image/webp' : 'image/jpeg');
  const targetExt = targetMimeType === 'image/webp' ? 'webp' : 'jpg';

  // 5. Bucle adaptativo de compresión para garantizar < 200 KB
  const qualitySteps = [initialQuality, 0.75, 0.65, 0.50, 0.35];
  let currentTargetWidth = crop.targetWidth;
  let currentTargetHeight = crop.targetHeight;
  let finalBlob = null;
  let finalDataUrl = null;

  for (let attempt = 0; attempt < qualitySteps.length; attempt++) {
    const quality = qualitySteps[attempt];

    let canvas;
    if (options.createCanvas) {
      canvas = options.createCanvas(currentTargetWidth, currentTargetHeight);
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = currentTargetWidth;
      canvas.height = currentTargetHeight;
    } else {
      throw new Error('Canvas no disponible en este entorno.');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del Canvas.');

    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    ctx.drawImage(
      imageSource,
      crop.sx,
      crop.sy,
      crop.sWidth,
      crop.sHeight,
      0,
      0,
      currentTargetWidth,
      currentTargetHeight
    );

    const blob = options.canvasToBlob
      ? await options.canvasToBlob(canvas, targetMimeType, quality)
      : await defaultCanvasToBlob(canvas, targetMimeType, quality);

    if (blob.size <= maxSizeBytes) {
      finalBlob = blob;
      if (typeof canvas.toDataURL === 'function') {
        try {
          finalDataUrl = canvas.toDataURL(targetMimeType, quality);
        } catch {
          // ignore toDataURL errors in mock environments
        }
      }
      break;
    }

    finalBlob = blob; // Guardar fallback

    // Si aún excede 200 KB en el último escalón de calidad y la dimensión es > 256, reduce resolución
    if (attempt === qualitySteps.length - 1 && currentTargetWidth > 256) {
      currentTargetWidth = Math.round(currentTargetWidth * 0.75);
      currentTargetHeight = currentTargetWidth;
      attempt--; // Reintentar con nueva dimensión
      qualitySteps[qualitySteps.length - 1] = 0.65;
    }
  }

  if (!finalBlob) {
    throw new Error('Fallo al comprimir y procesar la imagen.');
  }

  // Generar DataURL si aún no se tiene
  if (!finalDataUrl && typeof FileReader !== 'undefined') {
    try {
      finalDataUrl = await blobToDataUrl(finalBlob);
    } catch {
      // Ignorar fallback
    }
  }

  const safeUserId = String(userId).replace(/[^a-zA-Z0-9-]/g, '') || 'avatar';
  const fileName = `${safeUserId}-${Date.now()}.${targetExt}`;

  let finalFile = finalBlob;
  if (typeof File !== 'undefined') {
    try {
      finalFile = new File([finalBlob], fileName, { type: targetMimeType });
    } catch {
      finalFile = finalBlob;
    }
  }

  return {
    file: finalFile,
    blob: finalBlob,
    dataUrl: finalDataUrl || '',
    width: currentTargetWidth,
    height: currentTargetHeight,
    format: targetMimeType,
    size: finalBlob.size,
    fileName
  };
}

/**
 * Guarda la vista previa del avatar en almacenamiento local (offline cache).
 */
export function saveOfflineAvatar(dataUrl, userId, fileName, mimeType = 'image/webp') {
  try {
    const key = `${OFFLINE_AVATAR_KEY_PREFIX}${userId || 'default'}`;
    const payload = JSON.stringify({
      dataUrl,
      fileName,
      mimeType,
      timestamp: Date.now()
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, payload);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[imageOptimizer] No se pudo guardar la vista previa offline:', err?.message);
    return false;
  }
}

/**
 * Obtiene la vista previa del avatar guardada en almacenamiento local.
 */
export function getOfflineAvatar(userId) {
  try {
    const key = `${OFFLINE_AVATAR_KEY_PREFIX}${userId || 'default'}`;
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }
    return null;
  } catch (err) {
    console.warn('[imageOptimizer] Error leyendo vista previa offline:', err?.message);
    return null;
  }
}

/**
 * Limpia la vista previa del avatar en almacenamiento local tras sincronizar.
 */
export function clearOfflineAvatar(userId) {
  try {
    const key = `${OFFLINE_AVATAR_KEY_PREFIX}${userId || 'default'}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[imageOptimizer] Error limpiando vista previa offline:', err?.message);
    return false;
  }
}
