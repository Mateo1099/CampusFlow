import { describe, it, expect } from 'vitest';
import {
  normalizeDateStr,
  getTaskDate,
  getTaskTime,
  getTaskInstitution,
  matchesInstitutionFilter,
  getTaskPriority,
  getMonthMatrix,
  getWeekDays,
  groupTasksByDate,
  formatWeekRange,
  formatLongDate,
  INSTITUTION_THEMES,
  generateICalFile,
  getGoogleCalendarUrl,
  getRelativeDueDate
} from '../components/calendar/calendarUtils.js';

describe('calendarUtils — Utilidades del Calendario', () => {
  describe('normalizeDateStr', () => {
    it('normaliza strings en formato YYYY-MM-DD', () => {
      expect(normalizeDateStr('2026-11-05')).toBe('2026-11-05');
    });

    it('normaliza strings ISO con hora', () => {
      expect(normalizeDateStr('2026-11-05T18:30:00Z')).toBe('2026-11-05');
      expect(normalizeDateStr('2026-11-05 23:59:00')).toBe('2026-11-05');
    });

    it('normaliza objetos Date', () => {
      const d = new Date(2026, 9, 30); // 30 Oct 2026
      expect(normalizeDateStr(d)).toBe('2026-10-30');
    });

    it('retorna null para valores nulos o inválidos', () => {
      expect(normalizeDateStr(null)).toBeNull();
      expect(normalizeDateStr(undefined)).toBeNull();
      expect(normalizeDateStr('')).toBeNull();
    });
  });

  describe('getTaskDate & getTaskTime', () => {
    it('extrae fecha desde deadline, due_date o start_date', () => {
      expect(getTaskDate({ deadline: '2026-10-31T23:59:00' })).toBe('2026-10-31');
      expect(getTaskDate({ due_date: '2026-11-01' })).toBe('2026-11-01');
      expect(getTaskDate({ start_date: '2026-11-02' })).toBe('2026-11-02');
      expect(getTaskDate({})).toBeNull();
    });

    it('extrae la hora correctamente', () => {
      expect(getTaskTime({ deadline_time: '23:59' })).toBe('23:59');
      expect(getTaskTime({ deadline: '2026-11-05T18:30:00' })).toBe('18:30');
      expect(getTaskTime({ deadline: '2026-11-05T00:00:00' })).toBeNull();
    });
  });

  describe('Instituciones y Filtros', () => {
    const mockCourses = [
      { id: 'c1', name: 'Cálculo', institution: 'UNAD', color: '#ffcc00' },
      { id: 'c2', name: 'Programación', institution: 'SENA', color: '#00ff88' },
      { id: 'c3', name: 'Inglés', institution: 'Harvard', color: '#bc13fe' }
    ];

    it('determina UNAD correctamente', () => {
      expect(getTaskInstitution({ course_id: 'c1' }, mockCourses)).toBe('UNAD');
      expect(getTaskInstitution({ institution: 'UNAD' }, [])).toBe('UNAD');
    });

    it('determina SENA correctamente', () => {
      expect(getTaskInstitution({ course_id: 'c2' }, mockCourses)).toBe('SENA');
      expect(getTaskInstitution({ institution: 'sena regional' }, [])).toBe('SENA');
    });

    it('determina Personalizado para otras instituciones o sin curso', () => {
      expect(getTaskInstitution({ course_id: 'c3' }, mockCourses)).toBe('Personalizado');
      expect(getTaskInstitution({}, mockCourses)).toBe('Personalizado');
    });

    it('filtra correctamente según la institución seleccionada', () => {
      const taskUNAD = { id: 1, course_id: 'c1' };
      const taskSENA = { id: 2, course_id: 'c2' };
      const taskCustom = { id: 3, course_id: 'c3' };

      expect(matchesInstitutionFilter(taskUNAD, mockCourses, 'TODAS')).toBe(true);
      expect(matchesInstitutionFilter(taskUNAD, mockCourses, 'UNAD')).toBe(true);
      expect(matchesInstitutionFilter(taskUNAD, mockCourses, 'SENA')).toBe(false);

      expect(matchesInstitutionFilter(taskSENA, mockCourses, 'SENA')).toBe(true);
      expect(matchesInstitutionFilter(taskSENA, mockCourses, 'UNAD')).toBe(false);

      expect(matchesInstitutionFilter(taskCustom, mockCourses, 'PERSONALIZADO')).toBe(true);
      expect(matchesInstitutionFilter(taskCustom, mockCourses, 'UNAD')).toBe(false);
    });

    it('provee colores diferenciados para UNAD, SENA y Personalizado', () => {
      expect(INSTITUTION_THEMES.UNAD.color).toBe('#ffcc00');
      expect(INSTITUTION_THEMES.SENA.color).toBe('#00ff88');
      expect(INSTITUTION_THEMES.Personalizado.color).toBe('#bc13fe');
    });
  });

  describe('Prioridad de entregas', () => {
    it('marca entregado si el status es entregado', () => {
      const p = getTaskPriority({ status: 'entregado', deadline: '2026-10-01' });
      expect(p.label).toBe('ENTREGADO');
      expect(p.color).toBe('#10b981');
    });
  });

  describe('getMonthMatrix', () => {
    it('genera semanas completas múltiplos de 7', () => {
      const days = getMonthMatrix(2026, 9); // Octubre 2026 (mes 9)
      expect(days.length % 7).toBe(0);
      expect(days.length).toBeGreaterThanOrEqual(28);

      const currentMonthDays = days.filter(d => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(31);
    });
  });

  describe('getWeekDays', () => {
    it('genera exactamente 7 días de Lunes a Domingo', () => {
      const week = getWeekDays(new Date(2026, 9, 30)); // 30 Oct 2026 (Viernes)
      expect(week.length).toBe(7);
      expect(week[0].dayName).toBe('Lunes');
      expect(week[6].dayName).toBe('Domingo');
    });
  });

  describe('groupTasksByDate', () => {
    it('agrupa tareas por fecha YYYY-MM-DD y respeta filtros', () => {
      const mockCourses = [{ id: 'c1', institution: 'UNAD' }];
      const tasks = [
        { id: 1, course_id: 'c1', deadline: '2026-11-05T10:00:00', title: 'Tarea 1' },
        { id: 2, course_id: 'c1', deadline: '2026-11-05T08:00:00', title: 'Tarea 2' },
        { id: 3, course_id: 'c1', deadline: '2026-11-06T12:00:00', title: 'Tarea 3' }
      ];

      const grouped = groupTasksByDate(tasks, mockCourses, 'TODAS');
      expect(grouped['2026-11-05'].length).toBe(2);
      expect(grouped['2026-11-05'][0].title).toBe('Tarea 2'); // Ordenada por hora (08:00 antes de 10:00)
      expect(grouped['2026-11-06'].length).toBe(1);
    });
  });

  describe('Formateadores de texto', () => {
    it('formatea rangos de semana y fechas legibles', () => {
      const week = getWeekDays(new Date(2026, 9, 30));
      const range = formatWeekRange(week);
      expect(range).toContain('2026');

      const formatted = formatLongDate('2026-10-30');
      expect(formatted).toContain('30 de Octubre');
    });
  });

  describe('generateICalFile — Exportación estándar RFC 5545 (.ics)', () => {
    it('construye la estructura base VCALENDAR y VEVENT', () => {
      const task = {
        id: 'task-101',
        title: 'Taller de Algoritmos',
        deadline: '2026-11-15T23:59:00',
        deadline_time: '23:59',
        institution: 'UNAD',
        task_notes: 'Entrega en PDF'
      };

      const ical = generateICalFile([task]);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('VERSION:2.0');
      expect(ical).toContain('PRODID:-//CampusFlow//CampusFlow Calendar//ES');
      expect(ical).toContain('BEGIN:VEVENT');
      expect(ical).toContain('UID:task-101@campusflow.app');
      expect(ical).toContain('SUMMARY:Taller de Algoritmos');
      expect(ical).toContain('DTSTART:20261115T235900');
      expect(ical).toContain('CATEGORIES:UNAD');
      expect(ical).toContain('END:VEVENT');
      expect(ical).toContain('END:VCALENDAR');
    });

    it('escapa caracteres especiales según el estándar', () => {
      const task = {
        id: 'task-102',
        title: 'Proyecto, Parte 1; Fase final',
        deadline: '2026-11-20T18:00:00',
        task_notes: 'Línea 1\nLínea 2'
      };

      const ical = generateICalFile([task]);
      expect(ical).toContain('Proyecto\\, Parte 1\\; Fase final');
      expect(ical).toContain('Línea 1\\nLínea 2');
    });

    it('acepta una sola tarea u objeto sin fallar', () => {
      const task = {
        title: 'Entrega única',
        deadline: '2026-11-25T12:00:00'
      };

      const ical = generateICalFile(task);
      expect(ical).toContain('SUMMARY:Entrega única');
      expect(ical).toContain('BEGIN:VEVENT');
    });
  });

  describe('getGoogleCalendarUrl — Enlace a Google Calendar', () => {
    it('construye la URL de creación con parámetros codificados', () => {
      const task = {
        title: 'Entrega Fase 4',
        deadline: '2026-11-10T20:00:00',
        deadline_time: '20:00',
        institution: 'SENA',
        task_notes: 'Subir a plataforma'
      };

      const url = getGoogleCalendarUrl(task);
      expect(url).toContain('https://calendar.google.com/calendar/render?');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Entrega+Fase+4');
      expect(url).toContain('dates=20261110T200000%2F20261110T210000');
      expect(url).toContain('location=CampusFlow+-+SENA');
    });

    it('retorna string vacío si la tarea carece de fecha', () => {
      expect(getGoogleCalendarUrl({})).toBe('');
      expect(getGoogleCalendarUrl(null)).toBe('');
    });
  });

  describe('getRelativeDueDate — Cálculo de tiempo en lenguaje natural estudiantil', () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    it('retorna "Vence hoy a las HH:mm" si la fecha es hoy con hora', () => {
      const result = getRelativeDueDate(`${todayStr}T23:59:00`);
      expect(result).toBe('Vence hoy a las 23:59');
    });

    it('retorna "Vence hoy" si es hoy y no tiene hora', () => {
      const result = getRelativeDueDate(todayStr);
      expect(result).toBe('Vence hoy');
    });

    it('retorna "Vence mañana" para el día siguiente', () => {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      const result = getRelativeDueDate(tomorrowStr);
      expect(result).toBe('Vence mañana');
    });

    it('retorna "Faltan X días" para fechas futuras', () => {
      const future = new Date(today);
      future.setDate(today.getDate() + 5);
      const futureStr = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`;

      const result = getRelativeDueDate(futureStr);
      expect(result).toBe('Faltan 5 días');
    });

    it('retorna "Vencida hace X días" para fechas pasadas', () => {
      const past = new Date(today);
      past.setDate(today.getDate() - 3);
      const pastStr = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;

      const result = getRelativeDueDate(pastStr);
      expect(result).toBe('Vencida hace 3 días');
    });

    it('funciona pasando directamente un objeto de tarea', () => {
      const task = {
        deadline: `${todayStr}T18:00:00`,
        deadline_time: '18:00'
      };
      expect(getRelativeDueDate(task)).toBe('Vence hoy a las 18:00');
    });
  });
});
