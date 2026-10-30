/**
 * calendarUtils.js — Utilidades de fechas, instituciones y mapeo para el módulo de Calendario
 * CampusFlow Cyber Luxe Design System
 */

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAY_NAMES_ES = [
  { full: 'Lunes', short: 'Lun', initial: 'L' },
  { full: 'Martes', short: 'Mar', initial: 'M' },
  { full: 'Miércoles', short: 'Mié', initial: 'X' },
  { full: 'Jueves', short: 'Jue', initial: 'J' },
  { full: 'Viernes', short: 'Vie', initial: 'V' },
  { full: 'Sábado', short: 'Sáb', initial: 'S' },
  { full: 'Domingo', short: 'Dom', initial: 'D' },
];

export const INSTITUTION_THEMES = {
  UNAD: {
    name: 'UNAD',
    color: '#ffcc00',
    bg: 'rgba(255, 204, 0, 0.12)',
    border: 'rgba(255, 204, 0, 0.45)',
    glow: 'rgba(255, 204, 0, 0.35)',
    badgeBg: 'rgba(255, 204, 0, 0.22)',
    text: '#ffcc00'
  },
  SENA: {
    name: 'SENA',
    color: '#00ff88',
    bg: 'rgba(0, 255, 136, 0.12)',
    border: 'rgba(0, 255, 136, 0.45)',
    glow: 'rgba(0, 255, 136, 0.35)',
    badgeBg: 'rgba(0, 255, 136, 0.22)',
    text: '#00ff88'
  },
  Personalizado: {
    name: 'Personalizado',
    color: '#bc13fe',
    bg: 'rgba(188, 19, 254, 0.12)',
    border: 'rgba(188, 19, 254, 0.45)',
    glow: 'rgba(188, 19, 254, 0.35)',
    badgeBg: 'rgba(188, 19, 254, 0.22)',
    text: '#d946ef'
  }
};

/**
 * Normaliza cualquier valor de fecha a formato 'YYYY-MM-DD'
 */
export function normalizeDateStr(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    const parts = trimmed.split(/[T ]/);
    if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
      return parts[0];
    }
  }
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Obtiene la fecha 'YYYY-MM-DD' asignada a una tarea/entrega
 */
export function getTaskDate(task) {
  if (!task) return null;
  return (
    normalizeDateStr(task.deadline) ||
    normalizeDateStr(task.due_date) ||
    normalizeDateStr(task.dueDate) ||
    normalizeDateStr(task.start_date) ||
    normalizeDateStr(task.startDate) ||
    normalizeDateStr(task.created_at) ||
    null
  );
}

/**
 * Extrae la hora 'HH:mm' si está presente en la tarea
 */
export function getTaskTime(task) {
  if (!task) return null;
  if (task.deadline_time && /^\d{1,2}:\d{2}$/.test(task.deadline_time)) {
    return task.deadline_time.padStart(5, '0');
  }
  const dateStr = task.deadline || task.due_date || task.dueDate;
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const timePart = dateStr.split('T')[1]?.substring(0, 5);
    if (timePart && /^\d{2}:\d{2}$/.test(timePart) && timePart !== '00:00') {
      return timePart;
    }
  }
  return null;
}

/**
 * Determina la institución asociada a una tarea (UNAD, SENA, o Personalizado)
 */
export function getTaskInstitution(task, courses = []) {
  if (!task) return 'Personalizado';
  const course = courses.find(c => c.id === task.course_id) || task.courses;
  const rawInst = (course?.institution || task.institution || '').trim().toUpperCase();

  if (rawInst === 'UNAD' || rawInst.includes('UNAD')) return 'UNAD';
  if (rawInst === 'SENA' || rawInst.includes('SENA')) return 'SENA';
  return 'Personalizado';
}

/**
 * Obtiene el tema visual de institución (color, borde, brillo)
 */
export function getInstitutionTheme(institutionName) {
  const norm = (institutionName || '').toUpperCase();
  if (norm === 'UNAD') return INSTITUTION_THEMES.UNAD;
  if (norm === 'SENA') return INSTITUTION_THEMES.SENA;
  return INSTITUTION_THEMES.Personalizado;
}

/**
 * Valida si una tarea cumple con el filtro institucional seleccionado
 */
export function matchesInstitutionFilter(task, courses, filter) {
  if (!filter || filter === 'TODAS' || filter === 'Todas') return true;
  const inst = getTaskInstitution(task, courses);
  const target = filter.toUpperCase();

  if (target === 'UNAD') return inst === 'UNAD';
  if (target === 'SENA') return inst === 'SENA';
  if (target === 'PERSONALIZADO') return inst === 'Personalizado';
  return true;
}

/**
 * Calcula la prioridad/urgencia de una entrega
 */
export function getTaskPriority(task) {
  const status = (task?.status || '').toLowerCase();
  if (status === 'entregado' || status === 'submitted' || status === 'done') {
    return { label: 'ENTREGADO', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' };
  }

  const dateStr = getTaskDate(task);
  if (!dateStr) return { label: 'EN TIEMPO', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.3)' };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(`${dateStr}T00:00:00`);
  if (isNaN(deadline.getTime())) {
    return { label: 'EN TIEMPO', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.3)' };
  }

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'VENCIDA', color: '#ff4d4d', glow: 'rgba(255, 77, 77, 0.45)' };
  if (diffDays === 0) return { label: 'ENTREGA HOY', color: '#ff0055', glow: 'rgba(255, 0, 85, 0.45)' };
  if (diffDays <= 3) return { label: 'URGENTE', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' };
  if (diffDays <= 7) return { label: 'PRÓXIMO', color: '#ffcc00', glow: 'rgba(255, 204, 0, 0.35)' };
  return { label: 'EN TIEMPO', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.3)' };
}

/**
 * Genera la cuadrícula de días para el mes seleccionado (semanas de Lunes a Domingo)
 */
export function getMonthMatrix(year, month) {
  const todayStr = normalizeDateStr(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // En JS: Domingo = 0, Lunes = 1, ..., Sábado = 6.
  // En semana que inicia en Lunes: Lunes = 0, Martes = 1, ..., Domingo = 6.
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  // Días previos (del mes anterior)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = totalDaysInPrevMonth - i;
    const d = new Date(year, month - 1, dayNum);
    const dateStr = normalizeDateStr(d);
    days.push({
      date: d,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
      isToday: dateStr === todayStr
    });
  }

  // Días del mes actual
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = normalizeDateStr(dateObj);
    days.push({
      date: dateObj,
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: dateStr === todayStr
    });
  }

  // Días siguientes para completar la última semana (múltiplo de 7)
  const remainingSlots = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remainingSlots; d++) {
    const dateObj = new Date(year, month + 1, d);
    const dateStr = normalizeDateStr(dateObj);
    days.push({
      date: dateObj,
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
      isToday: dateStr === todayStr
    });
  }

  return days;
}

/**
 * Genera los 7 días de la semana (Lunes a Domingo) que contiene la fecha dada
 */
export function getWeekDays(referenceDate) {
  const todayStr = normalizeDateStr(new Date());
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const dayOfWeek = (ref.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dayOfWeek);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = normalizeDateStr(d);

    week.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      dayName: DAY_NAMES_ES[i].full,
      dayShort: DAY_NAMES_ES[i].short,
      isToday: dateStr === todayStr
    });
  }

  return week;
}

/**
 * Agrupa una lista de tareas por fecha 'YYYY-MM-DD'
 */
export function groupTasksByDate(tasks = [], courses = [], institutionFilter = 'TODAS') {
  const grouped = {};

  tasks.forEach(task => {
    if (!matchesInstitutionFilter(task, courses, institutionFilter)) {
      return;
    }
    const dateStr = getTaskDate(task);
    if (!dateStr) return;

    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }
    grouped[dateStr].push(task);
  });

  // Ordenar cada grupo por hora si está disponible
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => {
      const timeA = getTaskTime(a) || '99:99';
      const timeB = getTaskTime(b) || '99:99';
      return timeA.localeCompare(timeB);
    });
  });

  return grouped;
}

/**
 * Formatea un rango de fechas para la cabecera semanal
 */
export function formatWeekRange(weekDays) {
  if (!weekDays || weekDays.length < 7) return '';
  const first = weekDays[0].date;
  const last = weekDays[6].date;

  const monthFirst = MONTH_NAMES_ES[first.getMonth()];
  const monthLast = MONTH_NAMES_ES[last.getMonth()];

  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} - ${last.getDate()} de ${monthFirst}, ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${monthFirst.substring(0, 3)} - ${last.getDate()} ${monthLast.substring(0, 3)}, ${last.getFullYear()}`;
}

/**
 * Formateo legible de fecha completa (ej. 'Viernes, 30 de Octubre de 2026')
 */
export function formatLongDate(dateValue) {
  const dateStr = normalizeDateStr(dateValue);
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES_ES[(date.getDay() + 6) % 7].full;
  const monthName = MONTH_NAMES_ES[date.getMonth()];
  return `${dayName}, ${d} de ${monthName} de ${y}`;
}

/**
 * Calcula el tiempo restante o vencido en lenguaje natural estudiantil:
 * - "Vence hoy a las HH:mm" (o "Vence hoy")
 * - "Vence mañana"
 * - "Faltan X días"
 * - "Vencida hace X días"
 */
export function getRelativeDueDate(dateInput, timeInput = null) {
  if (!dateInput) return '';

  let dateStr = null;
  let timeStr = timeInput;

  if (typeof dateInput === 'object' && !(dateInput instanceof Date)) {
    dateStr = getTaskDate(dateInput);
    timeStr = getTaskTime(dateInput) || timeInput;
  } else {
    dateStr = normalizeDateStr(dateInput);
    if (!timeStr && typeof dateInput === 'string' && dateInput.includes('T')) {
      const part = dateInput.split('T')[1]?.substring(0, 5);
      if (part && /^\d{2}:\d{2}$/.test(part) && part !== '00:00') {
        timeStr = part;
      }
    }
  }

  if (!dateStr) return '';

  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(y, m - 1, d);

  if (isNaN(targetDate.getTime())) return '';

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return timeStr ? `Vence hoy a las ${timeStr}` : 'Vence hoy';
  }
  if (diffDays === 1) {
    return 'Vence mañana';
  }
  if (diffDays > 1) {
    return `Faltan ${diffDays} días`;
  }
  if (diffDays === -1) {
    return 'Vencida hace 1 día';
  }
  return `Vencida hace ${Math.abs(diffDays)} días`;
}

/**
 * Genera el enlace directo para añadir la entrega en Google Calendar
 */
export function getGoogleCalendarUrl(event) {
  if (!event) return '';
  const title = event.title || 'Entrega Académica CampusFlow';
  const dateStr = getTaskDate(event);
  const timeStr = getTaskTime(event) || '23:59';

  if (!dateStr) return '';

  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '23:59').split(':').map(Number);
  const hours = Number.isFinite(hh) ? hh : 23;
  const minutes = Number.isFinite(mm) ? mm : 59;
  const startDate = new Date(y, m - 1, d, hours, minutes, 0);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora de duración

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;

  const datesParam = `${fmt(startDate)}/${fmt(endDate)}`;
  const inst = event.institution || getTaskInstitution(event);
  const courseName = event.courses?.name || event.course_name || '';
  const notes = event.task_notes || event.delivery_url || '';

  const detailsList = [
    `Institución: ${inst}`,
    courseName ? `Materia: ${courseName}` : '',
    `Estado: ${event.status || 'sin entregar'}`,
    notes ? `Detalles: ${notes}` : '',
    'Sincronizado desde CampusFlow'
  ].filter(Boolean);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: datesParam,
    details: detailsList.join('\n'),
    location: `CampusFlow - ${inst}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera un archivo estándar RFC 5545 (.ics) con la lista de entregas / eventos
 */
export function generateICalFile(events = []) {
  const eventList = Array.isArray(events) ? events : [events];

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const escapeICal = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  };

  const vevents = eventList
    .map((evt, index) => {
      if (!evt) return null;
      const title = evt.title || `Entrega #${index + 1}`;
      const dateStr = getTaskDate(evt);
      if (!dateStr) return null;

      const timeStr = getTaskTime(evt) || '23:59';
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm] = timeStr.split(':').map(Number);
      const hours = Number.isFinite(hh) ? hh : 23;
      const minutes = Number.isFinite(mm) ? mm : 59;

      const startDate = new Date(y, m - 1, d, hours, minutes, 0);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const fmt = (dt) =>
        `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;

      const startStr = fmt(startDate);
      const endStr = fmt(endDate);

      const uid = evt.id
        ? `${evt.id}@campusflow.app`
        : `campusflow-${Date.now()}-${index}@campusflow.app`;
      const inst = evt.institution || getTaskInstitution(evt);
      const courseName = evt.courses?.name || evt.course_name || '';
      const priority = getTaskPriority(evt)?.label || 'Normal';
      const status = evt.status || 'sin entregar';

      const descLines = [
        `Institución: ${inst}`,
        courseName ? `Materia: ${courseName}` : '',
        `Estado: ${status}`,
        `Prioridad: ${priority}`,
        evt.task_notes ? `Notas: ${evt.task_notes}` : '',
        evt.delivery_url ? `Enlace de entrega: ${evt.delivery_url}` : '',
        'Gestionado desde CampusFlow'
      ].filter(Boolean);

      const escapedDesc = escapeICal(descLines.join('\n'));

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${escapeICal(title)}`,
        `DESCRIPTION:${escapedDesc}`,
        `CATEGORIES:${escapeICal(inst)}`,
        `STATUS:${status === 'entregado' ? 'COMPLETED' : 'CONFIRMED'}`,
        'LOCATION:CampusFlow',
        'END:VEVENT'
      ].join('\r\n');
    })
    .filter(Boolean);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusFlow//CampusFlow Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:CampusFlow Entregas',
    'X-WR-TIMEZONE:America/Bogota',
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Descarga el archivo estándar .ics en el navegador
 */
export function downloadICalFile(events, filename = 'campusflow-calendario.ics') {
  const icalContent = generateICalFile(events);
  if (typeof window === 'undefined') return icalContent;

  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  link.setAttribute('download', safeName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return icalContent;
}
