import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase queda completamente simulado: ninguna prueba de esta suite abre
// una conexión real ni depende de que el proyecto de Supabase esté
// disponible. Aísla por completo la lógica de negocio del backend.
vi.mock('../lib/supabaseClient.js', () => ({
  supabase: { from: vi.fn() }
}));

import { supabase } from '../lib/supabaseClient.js';
import { plannerService } from '../lib/plannerService.js';
import { tasksService } from '../lib/tasksService.js';

const VALID_USER_ID = '11111111-1111-4111-8111-111111111111';

// Reproduce la interfaz encadenable de supabase-js (select/insert/update/eq/
// not/order/single) y su comportamiento "thenable": cuando el código de
// producción hace `await` directamente sobre la consulta sin llamar a
// `.single()`, `then()` resuelve con el resultado simulado.
function createQueryMock(result) {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected)
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('plannerService — cálculo de horas del Planificador', () => {
  it('createPlannerBlock normaliza duration_minutes inválida a 0', async () => {
    const query = createQueryMock({ data: { id: 'block-1' }, error: null });
    supabase.from.mockReturnValue(query);

    await plannerService.createPlannerBlock('planner-1', {
      day: 'lunes',
      title: 'Estudiar cálculo',
      block_time: 'morning',
      block_type: 'materia',
      duration_minutes: 'no-es-un-numero'
    }, VALID_USER_ID);

    const insertedPayload = query.insert.mock.calls[0][0][0];
    expect(insertedPayload.duration_minutes).toBe(0);
    expect(insertedPayload.day).toBe('lunes');
    expect(insertedPayload.title).toBe('Estudiar cálculo');
  });

  it('createPlannerBlock rechaza un block_time fuera del catálogo permitido', async () => {
    const query = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    await expect(plannerService.createPlannerBlock('planner-1', {
      day: 'lunes',
      title: 'Bloque inválido',
      block_time: 'midnight',
      duration_minutes: 30
    }, VALID_USER_ID)).rejects.toThrow(/block_time invalido/);
  });

  it('createPlannerBlock exige un user_id con formato UUID', async () => {
    await expect(plannerService.createPlannerBlock('planner-1', {
      day: 'lunes',
      title: 'Bloque sin UUID válido',
      block_time: 'afternoon',
      duration_minutes: 45
    }, 'usuario-no-uuid')).rejects.toThrow(/user_id invalido/);
  });

  it('getTotalPlannedMinutes suma los minutos planificados de todos los bloques', async () => {
    const query = createQueryMock({
      data: [{ duration_minutes: 30 }, { duration_minutes: 45 }, { duration_minutes: 25 }],
      error: null
    });
    supabase.from.mockReturnValue(query);

    const total = await plannerService.getTotalPlannedMinutes({ userId: VALID_USER_ID });

    expect(total).toBe(100);
  });

  it('getTotalPlannedMinutes retorna 0 sin consultar Supabase cuando falta userId', async () => {
    const total = await plannerService.getTotalPlannedMinutes({});

    expect(total).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('getPlannedMinutesByDay agrupa los minutos por día correctamente', async () => {
    const query = createQueryMock({
      data: [
        { day: 'lunes', duration_minutes: 60 },
        { day: 'lunes', duration_minutes: 30 },
        { day: 'martes', duration_minutes: 45 }
      ],
      error: null
    });
    supabase.from.mockReturnValue(query);

    const byDay = await plannerService.getPlannedMinutesByDay({ userId: VALID_USER_ID });

    expect(byDay).toEqual({ lunes: 90, martes: 45 });
  });
});

// NOTA: los cuatro estados pedidos (sin entregar / en proceso / revisión /
// entregado) pertenecen a los Trabajos (tabla `assignments`, tasksService),
// no a los bloques del Planificador (que usan pendiente/en_proceso/
// completado en planner_blocks). Se validan aquí, en tasksService, para
// probar el comportamiento real en vez de simular uno inexistente.
describe('tasksService — estados de un trabajo (sin entregar, en proceso, revisión, entregado)', () => {
  it('createTask asigna "sin entregar" como estado inicial, en minúsculas', async () => {
    const query = createQueryMock({ data: [{ id: 'task-1', status: 'sin entregar' }], error: null });
    supabase.from.mockReturnValue(query);

    const created = await tasksService.createTask(VALID_USER_ID, { title: 'Ensayo de historia' });

    const insertedPayload = query.insert.mock.calls[0][0][0];
    expect(insertedPayload.status).toBe('sin entregar');
    expect(created.status).toBe('sin entregar');
  });

  it.each([
    ['todo', 'sin entregar'],
    ['pendiente', 'sin entregar'],
    ['sin entregar', 'sin entregar'],
    ['en proceso', 'en proceso'],
    ['revisión', 'revisión'],
    ['entregado', 'entregado'],
    ['submitted', 'entregado'],
    ['done', 'entregado']
  ])('updateTask normaliza el estado "%s" a "%s"', async (inputStatus, expectedStatus) => {
    const query = createQueryMock({ data: [{ id: 'task-1', status: expectedStatus }], error: null });
    supabase.from.mockReturnValue(query);

    await tasksService.updateTask('task-1', { status: inputStatus });

    const updatePayload = query.update.mock.calls[0][0];
    expect(updatePayload.status).toBe(expectedStatus);
  });

  it('updateTask normaliza estados sin importar mayúsculas/minúsculas', async () => {
    const query = createQueryMock({ data: [{ id: 'task-1', status: 'en proceso' }], error: null });
    supabase.from.mockReturnValue(query);

    await tasksService.updateTask('task-1', { status: 'EN PROCESO' });

    const updatePayload = query.update.mock.calls[0][0];
    expect(updatePayload.status).toBe('en proceso');
  });
});
