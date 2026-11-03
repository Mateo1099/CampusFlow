import { test, expect } from '@playwright/test';

const JSON_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'content-type': 'application/json'
};

const MOCK_PROFILE = {
  id: '00000000-0000-4000-8000-000000000001',
  full_name: 'Mateo Trujillo Estrada',
  language: 'es',
  typography: 'space-grotesk',
  font_size: 16,
  custom_wallpaper: null,
  wallpaper_id: 'cyber',
  avatar_url: null,
  xp: 1200,
  level: 4,
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

const MOCK_COURSE = {
  id: 'course-smoke-001',
  user_id: '00000000-0000-4000-8000-000000000001',
  name: 'Ingeniería de Software',
  color: '#00f3ff',
  icon: 'cpu',
  created_at: '2026-09-01T00:00:00Z'
};

/**
 * Configura mocks de red Supabase y localStorage para garantizar
 * un entorno de ejecución desacoplado, rápido y predecible.
 */
async function configureSmokeEnvironment(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('campusflow_has_completed_onboarding', 'true');
    window.localStorage.setItem('campusflow_settings', JSON.stringify({
      name: 'Mateo Trujillo Estrada',
      language: 'es',
      theme: 'dark',
      emailNotifications: false
    }));
  });

  await page.route('https://e2e-mock.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: JSON_HEADERS });
      return;
    }

    if (url.pathname === '/rest/v1/profiles') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(MOCK_PROFILE)
      });
      return;
    }

    if (url.pathname === '/rest/v1/courses') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify([MOCK_COURSE])
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([])
    });
  });
}

test.describe('CampusFlow — Suite de Smoke Test en Navegador Real', () => {

  test('Prueba A: Reescrituras SPA y Prevención de 404 en rutas profundas con recarga forzada', async ({ page }) => {
    await configureSmokeEnvironment(page);

    const runtimeErrors = [];
    page.on('pageerror', (err) => {
      runtimeErrors.push(err.message);
    });

    const deepRoutes = ['/calendar', '/estudio', '/apuntes', '/ajustes'];

    for (const route of deepRoutes) {
      console.log(`[SMOKE-TEST] Navegando directamente a ruta profunda: ${route}`);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      // 1. Aseverar que la respuesta no sea 404 ni error de servidor
      expect(response?.status(), `El status de respuesta HTTP no debe ser 404 para ${route}`).toBeLessThan(400);

      // 2. Ejecutar recarga forzada en navegador real
      console.log(`[SMOKE-TEST] Ejecutando recarga forzada para: ${route}`);
      const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
      expect(reloadResponse?.status(), `El status de recarga HTTP no debe ser 404 para ${route}`).toBeLessThan(400);

      // 3. Aseverar que no se monte la vista 404 (NotFound)
      const notFoundElement = page.locator('.not-found-page');
      await expect(notFoundElement).not.toBeVisible();

      // 4. Aseverar que el contenedor principal o skeleton se monte correctamente
      const mainContent = page.locator('.main-content, .weekly-planner-container, .notes-page, .profile-page, .pomodoro-container');
      await expect(mainContent.first()).toBeVisible({ timeout: 15_000 });

      // 5. Aseverar que no exista pantalla en blanco
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length, `El contenido de la página para ${route} no debe estar vacío`).toBeGreaterThan(0);
    }

    // 6. Sin excepciones no controladas de ejecución
    expect(runtimeErrors, 'No deben ocurrir excepciones no controladas en consola durante navegación o recarga').toEqual([]);
  });

  test('Prueba B: Resiliencia Offline y Banner Reactivo', async ({ page }) => {
    await configureSmokeEnvironment(page);

    // 1. Navega a la aplicación y espera a que el layout esté listo
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.main-content')).toBeVisible({ timeout: 15_000 });

    const offlineBanner = page.locator('div[role="status"]').last();

    // Inicialmente con red activa, el banner no debe estar visible
    await expect(offlineBanner).not.toBeVisible();

    // 2. Simula la pérdida total de red mediante setOffline(true)
    console.log('[SMOKE-TEST] Simulando pérdida total de red (offline = true)');
    await page.context().setOffline(true);

    // 3. Asevera que OfflineBanner se haga visible con el texto "Modo sin conexión"
    await expect(offlineBanner).toBeVisible({ timeout: 6_000 });
    await expect(offlineBanner).toContainText('Modo sin conexión');

    // 4. Restablece la conectividad con setOffline(false)
    console.log('[SMOKE-TEST] Restableciendo conectividad (offline = false)');
    await page.context().setOffline(false);

    // 5. Asevera que el banner cambie al estado de reconexión ("Conexión restablecida")
    const reconnectBanner = page.locator('div[role="status"]').last();
    await expect(reconnectBanner).toContainText('Conexión restablecida', { timeout: 6_000 });

    // 6. Asevera que se oculte tras el tiempo estipulado (3 segundos configurados)
    await expect(page.locator('div[role="status"]')).toHaveCount(0, { timeout: 7_000 });
  });

  test('Prueba C: Geometría y Cero Solapamiento en Ajustes', async ({ page }) => {
    await configureSmokeEnvironment(page);

    // 1. Navega a '/ajustes'
    console.log('[SMOKE-TEST] Navegando a /ajustes para auditoría geométrica');
    await page.goto('/ajustes', { waitUntil: 'domcontentloaded' });

    // Esperar a que la página de ajustes / perfil se encuentre montada
    await expect(page.locator('.profile-page')).toBeVisible({ timeout: 15_000 });

    // 2. Obtener contenedor del nombre de usuario ("Mateo Trujillo Estrada")
    const userNameHeading = page.getByRole('heading', { name: /Mateo Trujillo Estrada/i });
    await expect(userNameHeading).toBeVisible({ timeout: 10_000 });
    const userNameContainer = userNameHeading.locator('..');

    // 3. Obtener la tarjeta de "NOTIFICACIONES" / "CORREO ELECTRÓNICO"
    const notifCard = page.locator('div').filter({ has: page.getByText('Notificaciones', { exact: false }) }).filter({ hasText: 'Correo Electrónico' }).last();
    await expect(notifCard).toBeVisible({ timeout: 10_000 });

    // 4. Obtener cuadros delimitadores (boundingBox)
    const nameBox = await userNameContainer.boundingBox();
    const notifBox = await notifCard.boundingBox();

    expect(nameBox, 'Bounding box del contenedor del nombre debe existir').not.toBeNull();
    expect(notifBox, 'Bounding box de la tarjeta de notificaciones debe existir').not.toBeNull();

    const nameRightLimit = nameBox.x + nameBox.width;
    const notifLeftLimit = notifBox.x;
    const gapHorizontal = notifLeftLimit - nameRightLimit;

    console.log(`[GEOMETRÍA AJUSTES] Nombre Contenedor: x=${nameBox.x.toFixed(2)}, width=${nameBox.width.toFixed(2)}, límite derecho=${nameRightLimit.toFixed(2)}`);
    console.log(`[GEOMETRÍA AJUSTES] Tarjeta Notificaciones: x=${notifBox.x.toFixed(2)}, width=${notifBox.width.toFixed(2)}, límite izquierdo=${notifLeftLimit.toFixed(2)}`);
    console.log(`[GEOMETRÍA AJUSTES] Margen de holgura horizontal: ${gapHorizontal.toFixed(2)}px`);

    // 5. Verificar matemáticamente que no exista colisión de coordenadas
    // (el límite derecho del nombre no debe interceptar el límite izquierdo de la tarjeta)
    expect(nameRightLimit).toBeLessThanOrEqual(notifLeftLimit);

    // 6. Verificación exhaustiva 2D de colisión AABB
    const has2DCollision = (
      nameBox.x < notifBox.x + notifBox.width &&
      nameBox.x + nameBox.width > notifBox.x &&
      nameBox.y < notifBox.y + notifBox.height &&
      nameBox.y + nameBox.height > notifBox.y
    );
    expect(has2DCollision, 'No debe existir colisión o solapamiento 2D entre el nombre y la tarjeta de notificaciones').toBe(false);
  });

  test('Prueba D: Métricas de Carga y Core Web Vitals en Navegador', async ({ page }) => {
    await configureSmokeEnvironment(page);

    console.log('[SMOKE-TEST] Evaluando Métricas de Rendimiento y Core Web Vitals');
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('.main-content')).toBeVisible({ timeout: 15_000 });

    // Evaluar métricas de navegación mediante Performance API
    const metrics = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType('navigation');
      const paintEntries = performance.getEntriesByType('paint') || [];
      const fpEntry = paintEntries.find(p => p.name === 'first-paint');
      const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');

      return {
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
        loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
        firstPaint: fpEntry ? Math.round(fpEntry.startTime) : (fcpEntry ? Math.round(fcpEntry.startTime) : 0),
        firstContentfulPaint: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
        transferSize: nav ? nav.transferSize : 0
      };
    });

    console.log('\n======================================================');
    console.log('📊 REPORTE DE RENDIMIENTO EN NAVEGADOR REAL (E2E)');
    console.log('======================================================');
    console.log(`- DOMContentLoaded:       ${metrics.domContentLoaded} ms`);
    console.log(`- Load Time (Total):      ${metrics.loadTime} ms`);
    console.log(`- First Paint (FP):       ${metrics.firstPaint} ms`);
    console.log(`- First Contentful (FCP): ${metrics.firstContentfulPaint} ms`);
    console.log('======================================================\n');

    expect(metrics.domContentLoaded).toBeGreaterThan(0);
    expect(metrics.loadTime).toBeGreaterThanOrEqual(metrics.domContentLoaded);
    expect(metrics.firstPaint).toBeGreaterThanOrEqual(0);
  });

});
