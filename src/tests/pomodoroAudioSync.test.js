import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPlaylistMetadata, cleanTrackTitle, isAudioFile } from '../lib/playlistService';

describe('Pomodoro Audio Synchronization Logic', () => {
  let mockAudio;
  let syncAudioWithTimer;

  beforeEach(() => {
    mockAudio = {
      src: '',
      volume: 0.5,
      currentTime: 10,
      load: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    };

    /**
     * Simulador de la función reactiva que sincroniza audioRef con (ambientSound, isActive, volume, customUrl)
     * correspondiente al useEffect en Pomodoro.jsx
     */
    syncAudioWithTimer = ({
      ambientSound,
      isActive,
      volume = 0.5,
      customAudioUrl = null,
      soundscapes = [
        { id: 'rain', src: '/sounds/rain.mp3' },
        { id: 'lofi', src: '/sounds/lofi.mp3' },
        { id: 'white', src: '/sounds/white.mp3' },
      ],
      audioEl = mockAudio
    }) => {
      if (!audioEl) return;

      if (!ambientSound) {
        audioEl.pause();
        audioEl.currentTime = 0;
        return;
      }

      const targetSrc = ambientSound === 'custom'
        ? customAudioUrl
        : (soundscapes.find(s => s.id === ambientSound)?.src || '');

      if (!targetSrc) {
        audioEl.pause();
        return;
      }

      if (!audioEl.src.endsWith(targetSrc)) {
        audioEl.src = targetSrc;
        audioEl.volume = volume;
        audioEl.load();
      }

      if (isActive) {
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        audioEl.pause();
      }
    };
  });

  it('no reproduce audio si no hay ambiente sonoro seleccionado', () => {
    syncAudioWithTimer({ ambientSound: '', isActive: true });
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.currentTime).toBe(0);
    expect(mockAudio.play).not.toHaveBeenCalled();
  });

  it('no reproduce audio si hay una pista seleccionada pero el cronómetro está detenido (isActive === false)', () => {
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: false });
    expect(mockAudio.src).toBe('/sounds/lofi.mp3');
    expect(mockAudio.load).toHaveBeenCalled();
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.play).not.toHaveBeenCalled();
  });

  it('reproduce el audio automáticamente cuando el cronómetro está en marcha (isActive === true) y hay pista', () => {
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: true });
    expect(mockAudio.src).toBe('/sounds/lofi.mp3');
    expect(mockAudio.play).toHaveBeenCalledTimes(1);
    expect(mockAudio.pause).not.toHaveBeenCalled();
  });

  it('pausa inmediatamente el audio cuando el cronómetro pasa de activo a pausado (isActive: true -> false)', () => {
    // 1. En marcha
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: true });
    expect(mockAudio.play).toHaveBeenCalledTimes(1);

    // 2. Pausar
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: false });
    expect(mockAudio.pause).toHaveBeenCalledTimes(1);
  });

  it('reanuda la reproducción suavemente al volver a activar el cronómetro (Play)', () => {
    // 1. Pausa
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: false });
    expect(mockAudio.pause).toHaveBeenCalled();

    // 2. Play
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: true });
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it('detiene el audio al reiniciar el temporizador o cambiar de fase', () => {
    // Temporizador activo con Lofi
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: true });
    expect(mockAudio.play).toHaveBeenCalled();

    // Reset o cambio de fase fija isActive a false
    syncAudioWithTimer({ ambientSound: 'lofi', isActive: false });
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it('silencia y reinicia currentTime si el usuario deselecciona el ambiente sonoro', () => {
    syncAudioWithTimer({ ambientSound: 'rain', isActive: true });
    mockAudio.currentTime = 45;

    // Deseleccionar ambiente sonoro
    syncAudioWithTimer({ ambientSound: '', isActive: true });
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.currentTime).toBe(0);
  });

  it('soporta pistas de audio personalizado y sincroniza según isActive', () => {
    syncAudioWithTimer({ ambientSound: 'custom', customAudioUrl: 'blob:http://localhost/test-audio', isActive: false });
    expect(mockAudio.src).toBe('blob:http://localhost/test-audio');
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.play).not.toHaveBeenCalled();

    syncAudioWithTimer({ ambientSound: 'custom', customAudioUrl: 'blob:http://localhost/test-audio', isActive: true });
    expect(mockAudio.play).toHaveBeenCalled();
  });

  describe('Sistema de Playlist Local y Reproducción Continua', () => {
    let playlist;
    let currentTrackIndex;
    let handleAudioEnded;
    let handleNextTrack;
    let handlePrevTrack;

    beforeEach(() => {
      playlist = [
        { id: 't1', name: 'cancion_1.mp3', url: 'blob:http://localhost/t1' },
        { id: 't2', name: 'cancion_2.mp3', url: 'blob:http://localhost/t2' },
        { id: 't3', name: 'cancion_3.mp3', url: 'blob:http://localhost/t3' },
      ];
      currentTrackIndex = 0;

      handleNextTrack = () => {
        if (!playlist.length) return;
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
      };

      handlePrevTrack = () => {
        if (!playlist.length) return;
        currentTrackIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : playlist.length - 1;
      };

      handleAudioEnded = (isActive) => {
        if (playlist.length === 1) {
          if (mockAudio && isActive) {
            mockAudio.currentTime = 0;
            mockAudio.play();
          }
        } else if (playlist.length > 1) {
          handleNextTrack();
        }
      };
    });

    it('sincroniza la pista activa de la playlist con el temporizador', () => {
      syncAudioWithTimer({
        ambientSound: 'custom',
        customAudioUrl: playlist[currentTrackIndex].url,
        isActive: false
      });
      expect(mockAudio.src).toBe('blob:http://localhost/t1');
      expect(mockAudio.pause).toHaveBeenCalled();

      syncAudioWithTimer({
        ambientSound: 'custom',
        customAudioUrl: playlist[currentTrackIndex].url,
        isActive: true
      });
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('avanza automáticamente a la siguiente canción al finalizar una pista (onEnded)', () => {
      expect(currentTrackIndex).toBe(0);
      handleAudioEnded(true);
      expect(currentTrackIndex).toBe(1);

      syncAudioWithTimer({
        ambientSound: 'custom',
        customAudioUrl: playlist[currentTrackIndex].url,
        isActive: true
      });
      expect(mockAudio.src).toBe('blob:http://localhost/t2');
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('mantiene la reproducción continua en bucle infinito al terminar la última canción', () => {
      currentTrackIndex = 2; // última canción
      handleAudioEnded(true);
      expect(currentTrackIndex).toBe(0); // vuelve a la primera
    });

    it('reinicia y reproduce en bucle continuo cuando la playlist contiene una sola pista', () => {
      playlist = [{ id: 't1', name: 'solo_lofi.mp3', url: 'blob:http://localhost/single' }];
      mockAudio.currentTime = 120;

      handleAudioEnded(true);
      expect(mockAudio.currentTime).toBe(0);
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('permite navegación manual hacia adelante y hacia atrás con wrap-around', () => {
      // 0 -> 1 -> 2
      handleNextTrack();
      expect(currentTrackIndex).toBe(1);
      handleNextTrack();
      expect(currentTrackIndex).toBe(2);
      handleNextTrack();
      expect(currentTrackIndex).toBe(0); // wrap-around adelante

      // 0 -> 2 -> 1
      handlePrevTrack();
      expect(currentTrackIndex).toBe(2); // wrap-around atrás
      handlePrevTrack();
      expect(currentTrackIndex).toBe(1);
    });

    it('pausa inmediatamente la playlist al pausar el cronómetro pomodoro', () => {
      // Corriendo con pista 2
      currentTrackIndex = 1;
      syncAudioWithTimer({
        ambientSound: 'custom',
        customAudioUrl: playlist[currentTrackIndex].url,
        isActive: true
      });
      expect(mockAudio.play).toHaveBeenCalled();

      // Pausa pomodoro
      syncAudioWithTimer({
        ambientSound: 'custom',
        customAudioUrl: playlist[currentTrackIndex].url,
        isActive: false
      });
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('permite el salto directo a cualquier pista arbitraria de la lista y la sincroniza', () => {
      // Simulación de handleSelectTrack(2)
      const handleSelectTrack = (index) => {
        if (!playlist[index]) return;
        currentTrackIndex = index;
        syncAudioWithTimer({
          ambientSound: 'custom',
          customAudioUrl: playlist[currentTrackIndex].url,
          isActive: true
        });
      };

      handleSelectTrack(2);
      expect(currentTrackIndex).toBe(2);
      expect(mockAudio.src).toBe('blob:http://localhost/t3');
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });

  describe('Detección y Armado de Playlist desde Carpeta (Folder Picker)', () => {
    it('reconoce formatos de audio válidos e ignora otros archivos', () => {
      expect(isAudioFile({ name: 'song.mp3', type: 'audio/mpeg' })).toBe(true);
      expect(isAudioFile({ name: 'sound.wav', type: 'audio/wav' })).toBe(true);
      expect(isAudioFile({ name: 'beat.ogg', type: 'audio/ogg' })).toBe(true);
      expect(isAudioFile({ name: 'track.m4a', type: 'audio/mp4' })).toBe(true);
      expect(isAudioFile({ name: 'music.flac', type: '' })).toBe(true);
      expect(isAudioFile({ name: 'sample.aac', type: '' })).toBe(true);

      expect(isAudioFile({ name: 'document.pdf', type: 'application/pdf' })).toBe(false);
      expect(isAudioFile({ name: 'cover.jpg', type: 'image/jpeg' })).toBe(false);
      expect(isAudioFile({ name: '.DS_Store', type: '' })).toBe(false);
      expect(isAudioFile(null)).toBe(false);
    });

    it('extrae el nombre de la carpeta de webkitRelativePath y genera el título oficial', () => {
      const mockFiles = [
        {
          name: '01. Chill Beats.mp3',
          type: 'audio/mpeg',
          webkitRelativePath: 'Lo-Fi Chill/01. Chill Beats.mp3'
        },
        {
          name: '02. Midnight Rain.wav',
          type: 'audio/wav',
          webkitRelativePath: 'Lo-Fi Chill/02. Midnight Rain.wav'
        },
        {
          name: 'notes.txt',
          type: 'text/plain',
          webkitRelativePath: 'Lo-Fi Chill/notes.txt'
        }
      ];

      const result = extractPlaylistMetadata(mockFiles);
      expect(result.folderName).toBe('Lo-Fi Chill');
      expect(result.trackCount).toBe(2);
      expect(result.title).toBe('📁 Carpeta: Lo-Fi Chill · 2 pistas');
      expect(result.tracks.length).toBe(2);
      expect(result.tracks[0].name).toBe('01. Chill Beats.mp3');
      expect(result.tracks[1].name).toBe('02. Midnight Rain.wav');
    });

    it('usa el título por defecto cuando los archivos no provienen de una carpeta relativa', () => {
      const mockFiles = [
        { name: 'synth.mp3', type: 'audio/mpeg' },
        { name: 'piano.wav', type: 'audio/wav' }
      ];

      const result = extractPlaylistMetadata(mockFiles, 'Mi Playlist');
      expect(result.folderName).toBeNull();
      expect(result.trackCount).toBe(2);
      expect(result.title).toBe('Mi Playlist · 2 pistas');
      expect(result.tracks.length).toBe(2);
    });

    it('retorna una lista vacía si la carpeta no contiene ningún archivo de audio válido', () => {
      const mockFiles = [
        { name: 'readme.txt', type: 'text/plain', webkitRelativePath: 'Vacio/readme.txt' },
        { name: 'photo.png', type: 'image/png', webkitRelativePath: 'Vacio/photo.png' }
      ];

      const result = extractPlaylistMetadata(mockFiles);
      expect(result.tracks.length).toBe(0);
      expect(result.folderName).toBeNull();
    });

    it('limpia y embellece nombres de canciones con cleanTrackTitle', () => {
      expect(cleanTrackTitle('01. Lo-Fi Hip Hop Beat.mp3')).toBe('Lo-Fi Hip Hop Beat');
      expect(cleanTrackTitle('12 - Midnight Rain.wav')).toBe('Midnight Rain');
      expect(cleanTrackTitle('3_deep_focus_waves.flac')).toBe('deep_focus_waves');
      expect(cleanTrackTitle('lofi_guitar.m4a')).toBe('lofi_guitar');
      expect(cleanTrackTitle(null)).toBe('');
    });
  });

  describe('Control de Fugas de Memoria en Audio (URL.revokeObjectURL)', () => {
    it('revoca todas las ObjectURLs previas al cargar una nueva carpeta de audios', () => {
      const originalRevoke = URL.revokeObjectURL;
      const revokeMock = vi.fn();
      URL.revokeObjectURL = revokeMock;

      try {
        const oldPlaylist = [
          { id: 'trk-1', name: 'song1.mp3', url: 'blob:http://localhost/track-1', file: new Blob() },
          { id: 'trk-2', name: 'song2.wav', url: 'blob:http://localhost/track-2', file: new Blob() }
        ];

        // Simulación de la limpieza al recibir nueva carpeta
        if (Array.isArray(oldPlaylist) && oldPlaylist.length > 0) {
          oldPlaylist.forEach(track => {
            if (track?.url && typeof track.url === 'string') {
              try { URL.revokeObjectURL(track.url); } catch (_err) { void _err; }
            }
          });
        }

        expect(revokeMock).toHaveBeenCalledTimes(2);
        expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/track-1');
        expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/track-2');
      } finally {
        URL.revokeObjectURL = originalRevoke;
      }
    });

    it('ejecuta URL.revokeObjectURL para cada pista generada al desmontar el componente (cleanup)', () => {
      const originalRevoke = URL.revokeObjectURL;
      const revokeMock = vi.fn();
      URL.revokeObjectURL = revokeMock;

      try {
        const activePlaylist = [
          { id: 'trk-3', name: 'ambient.mp3', url: 'blob:http://localhost/track-3', file: new Blob() },
          { id: 'trk-4', name: 'rain.ogg', url: 'blob:http://localhost/track-4', file: new Blob() },
          { id: 'trk-5', name: 'waves.flac', url: 'blob:http://localhost/track-5', file: new Blob() }
        ];

        // Simulación del retorno de limpieza (cleanup function) del componente
        const cleanup = (tracks) => {
          (tracks || []).forEach(track => {
            if (track?.url && typeof track.url === 'string') {
              try { URL.revokeObjectURL(track.url); } catch (_err) { void _err; }
            }
          });
        };

        cleanup(activePlaylist);

        expect(revokeMock).toHaveBeenCalledTimes(3);
        expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/track-3');
        expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/track-4');
        expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/track-5');
      } finally {
        URL.revokeObjectURL = originalRevoke;
      }
    });
  });
});


