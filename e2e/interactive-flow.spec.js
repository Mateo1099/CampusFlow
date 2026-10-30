import { test, expect } from '@playwright/test';

// Perfil ficticio: el mismo patrón de aislamiento de settings-security.spec.js.
// Ninguna prueba de este archivo toca el Supabase real: todas las peticiones
// a e2e-mock.supabase.co se responden aquí mismo, y cualquier escritura
// (POST/PATCH/PUT/DELETE) queda bloqueada y registrada como fallo.
const MOCK_PROFILE = {
  id: '00000000-0000-4000-8000-000000000001',
  full_name: 'CampusFlow QA',
  language: 'es',
  typography: 'space-grotesk',
  font_size: 16,
  custom_wallpaper: null,
  wallpaper_id: 'cyber',
  avatar_url: null,
  xp: 0,
  level: 1,
  theme: 'dark',
  two_factor_enabled: false,
  email_notifications: false,
  red_alert_freq: 'diario',
  yellow_alert_freq: 'diario',
  green_alert_freq: 'diario',
  red_alert_custom_days: 1,
  yellow_alert_custom_days: 1,
  green_alert_custom_days: 1,
  has_completed_onboarding: true
};

const JSON_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'content-type': 'application/json'
};

// useAnalytics guarda en segundo plano un snapshot semanal (POST
// analytics_snapshots) apenas se monta cualquier página que lo use
// (Dashboard, Stats). Es un efecto interno de la app, no una acción
// disparada por el usuario, y de todas formas apunta solo al dominio
// simulado. Se excluye de la aserción de "mutaciones inesperadas" porque
// bloquearla en cada test solo probaría un detalle de implementación
// ajeno al recorrido interactivo, no una regresión real.
const isExpectedBackgroundWrite = (entry) => entry.endsWith('/rest/v1/analytics_snapshots');

test.describe('Recorrido interactivo largo por CampusFlow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('campusflow_has_completed_onboarding', 'true');
    });

    const attemptedMutations = [];
    // Se cuelga en `page` para poder leerlo desde el propio test tras cada paso.
    page.attemptedMutations = attemptedMutations;
    page.getUnexpectedMutations = () => attemptedMutations.filter((entry) => !isExpectedBackgroundWrite(entry));

    await page.route('https://e2e-mock.supabase.co/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: JSON_HEADERS });
        return;
      }

      if (!['GET', 'HEAD'].includes(method)) {
        attemptedMutations.push(`${method} ${url.pathname}`);
        await route.fulfill({
          status: 405,
          headers: JSON_HEADERS,
          body: JSON.stringify({ message: 'Las escrituras están bloqueadas en este E2E.' })
        });
        return;
      }

      if (url.pathname === '/rest/v1/profiles') {
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(MOCK_PROFILE) });
        return;
      }

      // Cualquier otra lectura (tasks, courses, planners, habits, analytics
      // snapshots) responde con una lista vacía: es suficiente para que cada
      // página renderice su estado real vacío, sin depender de datos reales.
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
    });
  });

  test('Pomodoro: temporizador inicia y pausa correctamente', async ({ page }) => {
    await page.goto('/');

    // 1. Navegar a Pomodoro desde el Sidebar. En la app en español el ítem
    // del menú se llama "Estudio" (translations.es.pomodoro), no "Pomodoro".
    await page.getByRole('link', { name: 'Estudio', exact: true }).click();
    await expect(page).toHaveURL(/\/pomodoro$/);

    // 2. Verificar que el reloj/temporizador esté presente.
    const clockButton = page.getByTitle('Click para editar tiempo');
    await expect(clockButton).toBeVisible();
    const timeBeforeStart = (await clockButton.innerText()).trim();
    expect(timeBeforeStart).toMatch(/^\d{2}:\d{2}$/);

    // 3. Clic en Play / Iniciar. `exact: true` es obligatorio: "Reiniciar"
    // contiene "Iniciar" como subcadena y el matcher por defecto no es exacto.
    const playButton = page.getByRole('button', { name: 'Iniciar', exact: true });
    await expect(playButton).toBeVisible();
    await playButton.click();

    // El botón cambia a "Pausar" en cuanto el temporizador queda activo.
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();

    // 4. Esperar y comprobar que el contador de tiempo avanza (cambia de
    // estado). Se usa expect.poll en vez de un timeout fijo para verificar
    // el cambio real en pantalla, dejando pasar como mínimo unos segundos.
    await expect.poll(async () => (await clockButton.innerText()).trim(), {
      timeout: 6000,
      intervals: [500]
    }).not.toBe(timeBeforeStart);

    // 5. Clic en Pausa / Detener.
    const pauseButton = page.getByRole('button', { name: 'Pausar', exact: true });
    await pauseButton.click();
    await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();

    expect(page.getUnexpectedMutations()).toEqual([]);
  });

  test('Planificador Semanal: abrir "+ Nueva Planificación" y usar los filtros', async ({ page }) => {
    await page.goto('/');

    // 1. Navegar al Planificador desde el Sidebar.
    await page.getByRole('link', { name: /(PLANIFICADOR|Calendario)/i }).click();
    await expect(page).toHaveURL(/\/planner$/);

    // Cambiar a la pestaña de Bloques y Rutinas si la vista inicial es Calendario
    const plannerTabBtn = page.getByRole('button', { name: /Bloques y Rutinas/i });
    await plannerTabBtn.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await plannerTabBtn.isVisible()) {
      await plannerTabBtn.click();
    }

    await expect(page.getByRole('heading', { name: 'PLANIFICADOR SEMANAL', level: 1 })).toBeVisible({ timeout: 15000 });

    // 2. Clic en "+ NUEVA PLANIFICACIÓN" o "CREAR PLANIFICACIÓN"
    await page.getByRole('button', { name: /(NUEVA|CREAR) PLANIFICACIÓN/i }).click();

    // 3. Verificar que abre la interfaz/modal para crear una planificación.
    // El modal usa el mismo texto "NUEVA PLANIFICACIÓN" pero como <h2>, así
    // que se distingue del <h1> de la página por su nivel de encabezado.
    const modalTitle = page.getByRole('heading', { name: 'NUEVA PLANIFICACIÓN', level: 2 });
    await expect(modalTitle).toBeVisible();
    await expect(page.getByPlaceholder('Ej. Semana 1 - Componente Práctico...')).toBeVisible();

    // 4. Cerrar el modal con "CANCELAR" (sin enviar el formulario: así nunca
    // se dispara una escritura real hacia Supabase).
    await page.getByRole('button', { name: 'CANCELAR' }).click();
    await expect(modalTitle).not.toBeVisible();

    // 5. Interactuar con los filtros de categoría (Todas/UNAD/SENA/Personalizado).
    const unadFilter = page.getByRole('button', { name: 'UNAD', exact: true });
    await unadFilter.click();
    await expect(unadFilter).toHaveCSS('border-color', /.+/);

    const todasFilter = page.getByRole('button', { name: 'Todas', exact: true });
    await todasFilter.click();

    expect(page.getUnexpectedMutations()).toEqual([]);
  });

  test('Navegación completa por el Sidebar: Dashboard, Materias, Apuntes, Trabajos, Planificador, Analítica y Ajustes', async ({ page }) => {
    await page.goto('/');

    // Dashboard
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Bienvenido a CampusFlow', level: 1 })).toBeVisible();

    // Materias
    await page.getByRole('link', { name: 'Materias', exact: true }).click();
    await expect(page).toHaveURL(/\/agenda$/);
    await expect(page.getByRole('heading', { name: 'MATERIAS', level: 1 })).toBeVisible();

    // Apuntes
    await page.getByRole('link', { name: 'Apuntes', exact: true }).click();
    await expect(page).toHaveURL(/\/apuntes$/);
    await expect(page.getByRole('heading', { name: 'Cuaderno de Apuntes', level: 1 })).toBeVisible({ timeout: 15000 });

    // Trabajos
    await page.getByRole('link', { name: 'Trabajos', exact: true }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole('heading', { name: 'TRABAJOS', level: 1 })).toBeVisible();

    // Planificador / Calendario
    await page.getByRole('link', { name: /(PLANIFICADOR|Calendario)/i }).click();
    await expect(page).toHaveURL(/\/planner$/);
    await expect(page.getByRole('heading', { name: /(PLANIFICADOR SEMANAL|CALENDARIO ACADÉMICO)/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // Analítica
    await page.getByRole('link', { name: 'Analítica', exact: true }).click();
    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByRole('heading', { name: /Anal[íi]tica PRO/i, level: 1 })).toBeVisible();

    // Ajustes (el enlace del sidebar hacia /profile no expone un nombre
    // accesible fijo porque muestra el nombre del usuario; se localiza por
    // su destino real en vez de por texto).
    await page.locator('a[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('.settings-triptych .settings-card')).toHaveCount(3);

    expect(page.getUnexpectedMutations()).toEqual([]);
  });
});
