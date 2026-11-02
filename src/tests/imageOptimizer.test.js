import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateRawAvatarFile,
  calculateCenterSquareCrop,
  dataUrlToBlob,
  optimizeAvatarImage,
  saveOfflineAvatar,
  getOfflineAvatar,
  clearOfflineAvatar,
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_RAW_AVATAR_SIZE_BYTES,
  MAX_TARGET_AVATAR_SIZE_BYTES,
  TARGET_AVATAR_DIMENSION
} from '../utils/imageOptimizer';

describe('imageOptimizer - Validación y Compresión de Avatar en Cliente', () => {

  describe('1. Validación estricta de archivos de entrada (MIME y Peso)', () => {
    it('acepta formatos permitidos (JPG, PNG, WebP) dentro del límite de 10 MB', () => {
      ALLOWED_AVATAR_MIME_TYPES.forEach((mime) => {
        const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
        const validFile = {
          name: `user_photo.${ext}`,
          type: mime,
          size: 4 * 1024 * 1024 // 4 MB
        };
        const result = validateRawAvatarFile(validFile);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    it('rechaza estrictamente tipos MIME no soportados (ej. GIF, SVG, PDF, EXE)', () => {
      const invalidFiles = [
        { name: 'anim.gif', type: 'image/gif', size: 1024 * 100 },
        { name: 'vector.svg', type: 'image/svg+xml', size: 1024 * 10 },
        { name: 'doc.pdf', type: 'application/pdf', size: 1024 * 500 },
        { name: 'virus.exe', type: 'application/x-msdownload', size: 1024 * 200 },
        { name: 'code.html', type: 'text/html', size: 1024 }
      ];

      invalidFiles.forEach((file) => {
        const result = validateRawAvatarFile(file);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Formato no permitido');
      });
    });

    it('rechaza archivos con extensiones no permitidas aunque el MIME sea falseado', () => {
      const spoofedFile = {
        name: 'script.exe',
        type: 'image/jpeg',
        size: 1024 * 500
      };
      const result = validateRawAvatarFile(spoofedFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Extensión de archivo no permitida');
    });

    it('rechaza de inmediato archivos que superan 10 MB con el mensaje de toast requerido', () => {
      const oversizedFile = {
        name: 'heavy_dslr_photo.jpg',
        type: 'image/jpeg',
        size: 11 * 1024 * 1024 // 11 MB > 10 MB
      };
      const result = validateRawAvatarFile(oversizedFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('La imagen es demasiado pesada. Elige una de menor tamaño.');
    });

    it('acepta un archivo justo en el límite permitido (ej. 9.5 MB)', () => {
      const heavyValidFile = {
        name: 'portrait.webp',
        type: 'image/webp',
        size: 9.5 * 1024 * 1024
      };
      const result = validateRawAvatarFile(heavyValidFile);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('rechaza archivos corruptos, vacíos (0 bytes) o no seleccionados', () => {
      expect(validateRawAvatarFile(null).isValid).toBe(false);
      expect(validateRawAvatarFile(undefined).isValid).toBe(false);

      const emptyFile = {
        name: 'corrupt.png',
        type: 'image/png',
        size: 0
      };
      const result = validateRawAvatarFile(emptyFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('vacío o dañado');
    });
  });

  describe('2. Recorte cuadrado proporcional centrado (512x512 max)', () => {
    it('recorta el centro exacto de una imagen horizontal (landscape)', () => {
      const crop = calculateCenterSquareCrop(1920, 1080, 512);
      expect(crop.sWidth).toBe(1080);
      expect(crop.sHeight).toBe(1080);
      expect(crop.sx).toBe((1920 - 1080) / 2); // 420
      expect(crop.sy).toBe(0);
      expect(crop.targetWidth).toBe(512);
      expect(crop.targetHeight).toBe(512);
    });

    it('recorta el centro exacto de una imagen vertical (portrait)', () => {
      const crop = calculateCenterSquareCrop(800, 1200, 512);
      expect(crop.sWidth).toBe(800);
      expect(crop.sHeight).toBe(800);
      expect(crop.sx).toBe(0);
      expect(crop.sy).toBe((1200 - 800) / 2); // 200
      expect(crop.targetWidth).toBe(512);
      expect(crop.targetHeight).toBe(512);
    });

    it('mantiene la escala de imágenes cuadradas menores a 512px sin deformar', () => {
      const crop = calculateCenterSquareCrop(256, 256, 512);
      expect(crop.sx).toBe(0);
      expect(crop.sy).toBe(0);
      expect(crop.sWidth).toBe(256);
      expect(crop.targetWidth).toBe(256);
      expect(crop.targetHeight).toBe(256);
    });

    it('arroja error ante dimensiones inválidas', () => {
      expect(() => calculateCenterSquareCrop(0, 500)).toThrow();
      expect(() => calculateCenterSquareCrop(-100, -100)).toThrow();
    });
  });

  describe('3. Conversión de DataURL y Blob', () => {
    it('convierte un DataURL base64 válido en un Blob con el tipo correcto', () => {
      // 1x1 transparent PNG data url
      const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = dataUrlToBlob(sampleDataUrl);
      expect(blob).toBeDefined();
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('lanza error ante DataURLs malformados', () => {
      expect(() => dataUrlToBlob('')).toThrow();
      expect(() => dataUrlToBlob('invalid_string_no_comma')).toThrow();
    });
  });

  describe('4. Compresión adaptativa y generación de Blob (< 200 KB)', () => {
    // Generador mock de Canvas para pruebas en entorno Node
    const createMockCanvas = (targetW, targetH) => {
      return {
        width: targetW,
        height: targetH,
        getContext: () => ({
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
          drawImage: vi.fn()
        }),
        toDataURL: (mime, quality) => `data:${mime};base64,mockCompressedData_q${Math.round(quality * 100)}`
      };
    };

    it('genera un Blob optimizado menor a 200 KB en formato WebP', async () => {
      const mockRawFile = {
        name: 'camera_shot.jpg',
        type: 'image/jpeg',
        size: 6 * 1024 * 1024 // 6 MB
      };

      const mockImageSource = {
        naturalWidth: 2048,
        naturalHeight: 1536
      };

      // Simula compresión con salida de 95 KB
      const mockBlob = new Blob([new Uint8Array(95 * 1024)], { type: 'image/webp' });

      const result = await optimizeAvatarImage(mockRawFile, {
        userId: 'mateo-usr-1',
        isWebpSupported: true,
        loadImage: vi.fn().mockResolvedValue(mockImageSource),
        createCanvas: createMockCanvas,
        canvasToBlob: vi.fn().mockResolvedValue(mockBlob)
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('image/webp');
      expect(result.width).toBeLessThanOrEqual(TARGET_AVATAR_DIMENSION);
      expect(result.height).toBeLessThanOrEqual(TARGET_AVATAR_DIMENSION);
      expect(result.size).toBeLessThanOrEqual(MAX_TARGET_AVATAR_SIZE_BYTES); // < 200 KB
      expect(result.fileName).toMatch(/^mateo-usr-1-\d+\.webp$/);
      expect(result.dataUrl).toContain('data:image/webp;base64');
    });

    it('aplica fallback a JPEG si el entorno no soporta WebP', async () => {
      const mockRawFile = {
        name: 'legacy_photo.png',
        type: 'image/png',
        size: 3 * 1024 * 1024
      };

      const mockImageSource = { width: 1024, height: 1024 };
      const mockBlob = new Blob([new Uint8Array(120 * 1024)], { type: 'image/jpeg' });

      const result = await optimizeAvatarImage(mockRawFile, {
        userId: 'legacy-usr',
        isWebpSupported: false,
        loadImage: vi.fn().mockResolvedValue(mockImageSource),
        createCanvas: createMockCanvas,
        canvasToBlob: vi.fn().mockResolvedValue(mockBlob)
      });

      expect(result.format).toBe('image/jpeg');
      expect(result.fileName).toMatch(/^legacy-usr-\d+\.jpg$/);
      expect(result.size).toBeLessThanOrEqual(MAX_TARGET_AVATAR_SIZE_BYTES);
    });

    it('rechaza y arroja excepción si la imagen está corrupta o no decodifica', async () => {
      const corruptFile = {
        name: 'broken.jpg',
        type: 'image/jpeg',
        size: 1024 * 50
      };

      await expect(
        optimizeAvatarImage(corruptFile, {
          loadImage: vi.fn().mockRejectedValue(new Error('Corrupt header'))
        })
      ).rejects.toThrow('El archivo de imagen está dañado o no se puede procesar.');
    });

    it('reduce calidad si el primer intento supera los 200 KB hasta entrar en el límite', async () => {
      const mockRawFile = {
        name: 'large_texture.png',
        type: 'image/png',
        size: 8 * 1024 * 1024
      };

      const mockImageSource = { width: 1600, height: 1600 };
      let attemptCount = 0;

      // El primer intento retorna 250 KB (> 200 KB), el segundo intento retorna 160 KB (< 200 KB)
      const dynamicCanvasToBlob = vi.fn().mockImplementation((_canvas, mime) => {
        attemptCount++;
        const sizeBytes = attemptCount === 1 ? 250 * 1024 : 160 * 1024;
        return Promise.resolve(new Blob([new Uint8Array(sizeBytes)], { type: mime }));
      });

      const result = await optimizeAvatarImage(mockRawFile, {
        userId: 'opt-usr',
        isWebpSupported: true,
        loadImage: vi.fn().mockResolvedValue(mockImageSource),
        createCanvas: createMockCanvas,
        canvasToBlob: dynamicCanvasToBlob
      });

      expect(attemptCount).toBe(2);
      expect(result.size).toBe(160 * 1024);
      expect(result.size).toBeLessThanOrEqual(MAX_TARGET_AVATAR_SIZE_BYTES);
    });
  });

  describe('5. Resiliencia y almacenamiento en caché offline (LocalStorage)', () => {
    let mockStorage = {};

    beforeEach(() => {
      mockStorage = {};
      globalThis.localStorage = {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, value) => { mockStorage[key] = String(value); }),
        removeItem: vi.fn((key) => { delete mockStorage[key]; }),
        clear: vi.fn(() => { mockStorage = {}; })
      };
    });

    it('guarda, recupera y limpia la vista previa offline correctamente', () => {
      const userId = 'offline-tester-99';
      const fakeDataUrl = 'data:image/webp;base64,offlinePreviewData';
      const fakeFileName = `${userId}-1700000000.webp`;

      // 1. Guardar
      const saved = saveOfflineAvatar(fakeDataUrl, userId, fakeFileName, 'image/webp');
      expect(saved).toBe(true);

      // 2. Recuperar
      const cached = getOfflineAvatar(userId);
      expect(cached).toBeDefined();
      expect(cached.dataUrl).toBe(fakeDataUrl);
      expect(cached.fileName).toBe(fakeFileName);
      expect(cached.mimeType).toBe('image/webp');
      expect(cached.timestamp).toBeGreaterThan(0);

      // 3. Limpiar
      const cleared = clearOfflineAvatar(userId);
      expect(cleared).toBe(true);
      expect(getOfflineAvatar(userId)).toBeNull();
    });

    it('retorna null silenciosamente si no existe entrada offline', () => {
      expect(getOfflineAvatar('non-existent-user')).toBeNull();
    });
  });
});

