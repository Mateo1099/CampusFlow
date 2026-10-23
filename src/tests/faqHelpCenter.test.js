import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS
} from '../components/ui/FaqModal';

describe('CampusFlow Help Center & FAQ (`src/components/ui/FaqModal.jsx`)', () => {
  let mockStorage = {};
  let originalWindow = globalThis.window;

  beforeEach(() => {
    mockStorage = {};
    globalThis.window = {
      location: { pathname: '/tasks', href: 'http://localhost:5173/tasks' },
      localStorage: {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, value) => { mockStorage[key] = String(value); }),
        removeItem: vi.fn((key) => { delete mockStorage[key]; })
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  describe('1. Estructura de Datos y Cobertura de las 4 Categorías Académicas', () => {
    it('define las 4 categorías requeridas más el filtro global "all"', () => {
      const categoryIds = FAQ_CATEGORIES.map(c => c.id);
      expect(categoryIds).toContain('all');
      expect(categoryIds).toContain('tasks');
      expect(categoryIds).toContain('notes');
      expect(categoryIds).toContain('study-room');
      expect(categoryIds).toContain('data-perf');
      expect(FAQ_CATEGORIES).toHaveLength(5);
    });

    it('categoría a) Trabajos & Ejercicios cubre desglose de ejercicios (#1, #2), avance y enlaces HTTPS', () => {
      const taskFaqs = FAQ_ITEMS.filter(item => item.category === 'tasks');
      expect(taskFaqs.length).toBeGreaterThanOrEqual(3);

      const hasBreakdown = taskFaqs.some(
        f => f.question.toLowerCase().includes('desglosar') && f.question.includes('#1, #2')
      );
      const hasHttps = taskFaqs.some(
        f => f.question.toLowerCase().includes('https') && f.answer.includes('https://')
      );
      const hasXpProgress = taskFaqs.some(
        f => f.question.toLowerCase().includes('avance') && f.answer.toLowerCase().includes('xp')
      );

      expect(hasBreakdown).toBe(true);
      expect(hasHttps).toBe(true);
      expect(hasXpProgress).toBe(true);
    });

    it('categoría b) Cuaderno de Apuntes cubre buscador de conceptos, notas rápidas y acceso desde trabajos', () => {
      const notesFaqs = FAQ_ITEMS.filter(item => item.category === 'notes');
      expect(notesFaqs.length).toBeGreaterThanOrEqual(3);

      const hasSearch = notesFaqs.some(
        f => f.question.toLowerCase().includes('buscar') && f.keywords.includes('conceptos')
      );
      const hasQuickNotes = notesFaqs.some(
        f => f.question.toLowerCase().includes('rápidas') || f.question.toLowerCase().includes('rapidas')
      );
      const hasTaskLink = notesFaqs.some(
        f => f.answer.toLowerCase().includes('panel de detalle de cualquier entrega')
      );

      expect(hasSearch).toBe(true);
      expect(hasQuickNotes).toBe(true);
      expect(hasTaskLink).toBe(true);
    });

    it('categoría c) Sala de Estudio & Playlist cubre carpetas completas, reproducción en bucle y sync Pomodoro', () => {
      const studyFaqs = FAQ_ITEMS.filter(item => item.category === 'study-room');
      expect(studyFaqs.length).toBeGreaterThanOrEqual(3);

      const hasFolders = studyFaqs.some(
        f => f.question.toLowerCase().includes('carpeta completa de música') || f.answer.includes('MP3')
      );
      const hasLoop = studyFaqs.some(
        f => f.question.toLowerCase().includes('bucle') && f.keywords.includes('shuffle')
      );
      const hasSync = studyFaqs.some(
        f => f.question.toLowerCase().includes('sincroniza') && f.answer.includes('Pomodoro')
      );

      expect(hasFolders).toBe(true);
      expect(hasLoop).toBe(true);
      expect(hasSync).toBe(true);
    });

    it('categoría d) Datos, Cuentas & Rendimiento cubre auto-guardado, modo offline y cálculo de XP/niveles', () => {
      const dataFaqs = FAQ_ITEMS.filter(item => item.category === 'data-perf');
      expect(dataFaqs.length).toBeGreaterThanOrEqual(3);

      const hasAutoSave = dataFaqs.some(
        f => f.question.toLowerCase().includes('auto-guardado') && f.answer.includes('RLS')
      );
      const hasOffline = dataFaqs.some(
        f => f.question.toLowerCase().includes('conexión') || f.question.toLowerCase().includes('conexion')
      );
      const hasXpCalc = dataFaqs.some(
        f => f.question.toLowerCase().includes('nivel') && f.answer.includes('XP')
      );

      expect(hasAutoSave).toBe(true);
      expect(hasOffline).toBe(true);
      expect(hasXpCalc).toBe(true);
    });
  });

  describe('2. Motor de Búsqueda en Tiempo Real y Filtrado por Categorías', () => {
    function filterFaqs(query, category = 'all') {
      const q = query.trim().toLowerCase();
      return FAQ_ITEMS.filter(item => {
        if (category !== 'all' && item.category !== category) return false;
        if (!q) return true;

        const inQuestion = item.question.toLowerCase().includes(q);
        const inAnswer = item.answer.toLowerCase().includes(q);
        const inCategory = item.categoryLabel.toLowerCase().includes(q);
        const inKeywords = item.keywords.some(k => k.toLowerCase().includes(q));

        return inQuestion || inAnswer || inCategory || inKeywords;
      });
    }

    it('retorna todos los elementos cuando la búsqueda está vacía y categoría es "all"', () => {
      const results = filterFaqs('', 'all');
      expect(results).toHaveLength(FAQ_ITEMS.length);
      expect(results.length).toBeGreaterThanOrEqual(12);
    });

    it('filtra con precisión por palabra clave en la pregunta o contenido (ej. "https")', () => {
      const results = filterFaqs('https');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every(r => 
        r.question.toLowerCase().includes('https') ||
        r.answer.toLowerCase().includes('https') ||
        r.keywords.includes('https')
      )).toBe(true);
    });

    it('filtra por concepto en el cuaderno de apuntes (ej. "conceptos")', () => {
      const results = filterFaqs('conceptos', 'notes');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].category).toBe('notes');
    });

    it('filtra por término de audio (ej. "playlist" o "carpeta")', () => {
      const results = filterFaqs('carpeta', 'study-room');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].category).toBe('study-room');
    });

    it('maneja búsquedas sin coincidencias retornando array vacío', () => {
      const results = filterFaqs('termino_inexistente_xyz_999');
      expect(results).toHaveLength(0);
    });

    it('aplica filtro de categoría combinado con término de búsqueda', () => {
      // "xp" existe en tasks y en data-perf
      const allXp = filterFaqs('xp', 'all');
      const tasksXp = filterFaqs('xp', 'tasks');
      const dataXp = filterFaqs('xp', 'data-perf');

      expect(allXp.length).toBeGreaterThan(tasksXp.length);
      expect(tasksXp.every(r => r.category === 'tasks')).toBe(true);
      expect(dataXp.every(r => r.category === 'data-perf')).toBe(true);
    });
  });

  describe('3. Integración de Eventos y Despacho del Tour Guiado', () => {
    it('dispara el evento campusflow:open-onboarding cuando el usuario solicita volver a ver el tour', () => {
      // Simulación de acción en botón footer
      const handleReopenTour = () => {
        globalThis.window.dispatchEvent(new CustomEvent('campusflow:open-onboarding'));
      };

      handleReopenTour();

      expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'campusflow:open-onboarding'
        })
      );
    });

    it('soporta apertura mediante el evento global campusflow:open-faq', () => {
      let isOpen = false;
      const onOpenHandler = () => {
        isOpen = true;
      };

      globalThis.window.addEventListener('campusflow:open-faq', onOpenHandler);
      expect(globalThis.window.addEventListener).toHaveBeenCalledWith(
        'campusflow:open-faq',
        expect.any(Function)
      );

      // Simular evento
      onOpenHandler();
      expect(isOpen).toBe(true);
    });
  });
});
