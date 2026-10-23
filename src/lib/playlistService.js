/**
 * Playlist Service & Directory Ingestion Utilities — CampusFlow
 * Módulo para detección de formatos de audio, ingesta de carpetas locales (webkitdirectory)
 * y gestión de listas de reproducción para la Sala de Estudio.
 */

/**
 * Extensiones de audio soportadas en navegadores modernos.
 */
const SUPPORTED_AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;

/**
 * Valida si un archivo es un audio reproducible soportado.
 * @param {File|{name: string, type?: string}} file
 * @returns {boolean}
 */
export function isAudioFile(file) {
  if (!file) return false;
  const name = file.name || '';
  const type = file.type || '';
  return type.startsWith('audio/') || SUPPORTED_AUDIO_EXTENSIONS.test(name);
}

/**
 * Extrae metadatos y nombre de carpeta de una lista de archivos seleccionados
 * mediante selector de carpeta nativo (webkitdirectory) o selector de archivos múltiples.
 * 
 * @param {FileList|File[]} fileList - Lista de archivos del selector
 * @param {string} [defaultTitle='Mi Playlist Local'] - Título por defecto si no es carpeta
 * @returns {{ title: string, folderName: string|null, tracks: File[] }}
 */
export function extractPlaylistMetadata(fileList, defaultTitle = 'Mi Playlist Local') {
  const files = Array.from(fileList || []);
  const validFiles = files.filter(isAudioFile);

  if (!validFiles.length) {
    return { title: defaultTitle, folderName: null, tracks: [] };
  }

  // Detectar si provino de una carpeta mediante webkitRelativePath
  let detectedFolder = null;
  const firstWithPath = validFiles.find(
    f => typeof f.webkitRelativePath === 'string' && f.webkitRelativePath.includes('/')
  );

  if (firstWithPath) {
    const segments = firstWithPath.webkitRelativePath.split('/');
    if (segments.length > 1 && segments[0].trim()) {
      detectedFolder = segments[0].trim();
    }
  }

  const countLabel = `${validFiles.length} ${validFiles.length === 1 ? 'pista' : 'pistas'}`;
  const title = detectedFolder 
    ? `📁 Carpeta: ${detectedFolder} · ${countLabel}`
    : `${defaultTitle} · ${countLabel}`;

  return {
    title,
    folderName: detectedFolder,
    countLabel,
    trackCount: validFiles.length,
    tracks: validFiles
  };
}

/**
 * Limpia y embellece el nombre del archivo de la canción quitando la extensión.
 * @param {string} rawName
 * @returns {string}
 */
export function cleanTrackTitle(rawName) {
  if (typeof rawName !== 'string') return '';
  return rawName.replace(SUPPORTED_AUDIO_EXTENSIONS, '').replace(/^[0-9]+[\s.\-_]+/, '').trim() || rawName;
}
