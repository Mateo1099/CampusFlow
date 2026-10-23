import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const JSON_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'content-type': 'application/json'
};

const MOCK_PROFILE = {
  id: '00000000-0000-4000-8000-000000000001',
  full_name: 'CampusFlow QA Lead',
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
  id: 'course-arch-101',
  user_id: '00000000-0000-4000-8000-000000000001',
  name: 'Arquitectura de Software',
  color: '#00f3ff',
  icon: 'cpu',
  created_at: '2026-09-01T00:00:00Z'
};

test.describe('Verificación Visual Automatizada E2E — Desglose de Ejercicios y Enlace de Entrega', () => {
  const evidenceDir = path.resolve(process.cwd(), 'test-evidence');

  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test('Flujo completo de extremo a extremo con capturas de evidencia visual', async ({ page }) => {
    // 1. Estado reactivo en memoria para simular persistencia en backend Supabase
    let mockAssignment = {
      id: 'task-arch-001',
      user_id: '00000000-0000-4000-8000-000000000001',
      course_id: 'course-arch-101',
      title: 'Entrega Final de Arquitectura',
      status: 'sin entregar',
      deadline: '2026-10-30T23:59:00',
      created_at: '2026-10-20T10:00:00Z',
      subtasks: [],
      task_notes: '',
      courses: {
        name: 'Arquitectura de Software',
        color: '#00f3ff'
      }
    };

    // Configurar localStorage para evitar onboarding
    await page.addInitScript(() => {
      window.localStorage.setItem('campusflow_has_completed_onboarding', 'true');
    });

    // Interceptar llamadas de red a Supabase
    await page.route('https://e2e-mock.supabase.co/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: JSON_HEADERS });
        return;
      }

      if (url.pathname === '/rest/v1/profiles') {
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(MOCK_PROFILE) });
        return;
      }

      if (url.pathname === '/rest/v1/courses') {
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([MOCK_COURSE]) });
        return;
      }

      if (url.pathname === '/rest/v1/assignments') {
        if (method === 'GET' || method === 'HEAD') {
          await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([mockAssignment]) });
          return;
        }

        if (method === 'PATCH') {
          const patchBody = JSON.parse(request.postData() || '{}');
          mockAssignment = {
            ...mockAssignment,
            ...patchBody,
            courses: {
              name: 'Arquitectura de Software',
              color: '#00f3ff'
            }
          };
          await route.fulfill({
            status: 200,
            headers: JSON_HEADERS,
            body: JSON.stringify([mockAssignment])
          });
          return;
        }
      }

      // Cualquier otra colección devuelve array vacío
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
    });

    // ─── PASO 1: NAVEGACIÓN A TRABAJOS Y APERTURA DEL DRAWER ───
    await page.goto('/trabajos');
    await expect(page).toHaveURL(/\/(trabajos|tasks)$/);

    const taskTitle = page.getByText('Entrega Final de Arquitectura');
    await expect(taskTitle).toBeVisible({ timeout: 10_000 });

    // Clic en la tarjeta para desplegar el TaskDetailDrawer
    await taskTitle.click();

    const drawerOverlay = page.locator('.task-detail-overlay');
    await expect(drawerOverlay).toBeVisible({ timeout: 5000 });

    const drawerHeading = page.locator('#task-detail-title');
    await expect(drawerHeading).toContainText('Entrega Final de Arquitectura');

    // Esperar a que la animación de entrada Framer Motion termine
    await page.waitForTimeout(400);

    const screenshot1Path = path.join(evidenceDir, 'drawer-abierto.png');
    await page.screenshot({ path: screenshot1Path });
    console.log(`[EVIDENCIA 1] Captura guardada: ${screenshot1Path}`);

    // ─── PASO 2: INSERTAR 2 EJERCICIOS, RESOLVER UNO Y REGISTRAR ENLACE DE ENTREGA ───
    const subtaskInput = page.getByPlaceholder(/Escribe un ejercicio/i);
    await expect(subtaskInput).toBeVisible();

    // Insertar Ejercicio 1
    await subtaskInput.fill('Ejercicio 1: Modelado');
    await subtaskInput.press('Enter');
    await expect(page.getByText('Ejercicio 1: Modelado')).toBeVisible();

    // Insertar Ejercicio 2
    await subtaskInput.fill('Ejercicio 2: API');
    await subtaskInput.press('Enter');
    await expect(page.getByText('Ejercicio 2: API')).toBeVisible();

    // Marcar Ejercicio 1 como completado
    const item1Text = page.getByText('Ejercicio 1: Modelado');
    await item1Text.click();

    // Verificar indicador de progreso en barra (50%)
    await expect(page.getByText(/1 de 2 resueltos/i)).toBeVisible();

    // Registrar Enlace del trabajo / entrega (sin pestañas)
    const deliveryInput = page.getByPlaceholder(/URL de Google Drive|enlace del trabajo/i);
    await expect(deliveryInput).toBeVisible();
    await deliveryInput.fill('https://github.com/campusflow/architecture-final-project');

    // Forzar guardado inmediato
    const saveDeliveryBtn = page.getByRole('button', { name: 'Guardar', exact: true });
    await saveDeliveryBtn.click();
    await expect(page.getByText(/Guardado ✓|Sincronizado/i)).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(400);
    const screenshot2Path = path.join(evidenceDir, 'ejercicios-y-notas.png');
    await page.screenshot({ path: screenshot2Path });
    console.log(`[EVIDENCIA 2] Captura guardada: ${screenshot2Path}`);

    // ─── PASO 3: RECARGAR LA PÁGINA (F5), VERIFICAR PERSISTENCIA Y NAVEGACIÓN CRUZADA A APUNTES ───
    // Cerrar panel antes de recargar
    await page.getByLabel('Cerrar panel').click();
    await expect(drawerOverlay).not.toBeVisible();

    // Recargar página
    await page.reload();
    await expect(page.getByText('Entrega Final de Arquitectura')).toBeVisible({ timeout: 10_000 });

    // Comprobar micro-chip de subtareas 1/2 en la tarjeta
    await expect(page.getByText('1/2')).toBeVisible();

    // Reabrir el drawer para inspeccionar datos recuperados
    await page.getByText('Entrega Final de Arquitectura').click();
    await expect(drawerOverlay).toBeVisible();

    // Validar que ambos ejercicios están presentes y Ejercicio 1 sigue resuelto
    await expect(page.getByText('Ejercicio 1: Modelado')).toBeVisible();
    await expect(page.getByText('Ejercicio 2: API')).toBeVisible();
    await expect(page.getByText(/1 de 2 resueltos/i)).toBeVisible();

    // Validar que el enlace de entrega persistió
    await expect(deliveryInput).toHaveValue('https://github.com/campusflow/architecture-final-project');

    // Probar el botón de contexto académico "📖 Ver apuntes de Arquitectura de Software" con navegación cruzada
    const notesContextBtn = page.getByRole('button', { name: /Ver apuntes de Arquitectura/i });
    await expect(notesContextBtn).toBeVisible();
    await notesContextBtn.click();

    // Verifica navegación al Módulo Oficial de Apuntes con filtro automático por materia
    await expect(page).toHaveURL(/\/apuntes\?subjectId=course-arch-101/);
    await expect(page.getByRole('heading', { name: 'Cuaderno de Apuntes', level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Filtrado por: Arquitectura de Software/i)).toBeVisible();

    await page.waitForTimeout(400);
    const screenshot3Path = path.join(evidenceDir, 'persistencia-recarga.png');
    await page.screenshot({ path: screenshot3Path });
    console.log(`[EVIDENCIA 3] Captura guardada: ${screenshot3Path}`);

    // ─── PASO 4: INTEGRACIÓN CON POMODORO Y VALIDACIÓN DE RELOJ ACTIVO ───
    await page.goto('/pomodoro');
    await expect(page).toHaveURL(/\/pomodoro$/);

    // Seleccionar la tarea como objetivo en el selector
    const targetDropdownBtn = page.locator('button:has-text("🎯 Sin objetivo")');
    await expect(targetDropdownBtn).toBeVisible({ timeout: 5000 });
    await targetDropdownBtn.click();

    const taskOption = page.locator('div.animate-fade-in button:has-text("Entrega Final de Arquitectura")');
    await expect(taskOption).toBeVisible();
    await taskOption.click();

    // Botón flotante "📝 Desglose de Tarea" debe aparecer
    const floatingBtn = page.getByRole('button', { name: '📝 Desglose de Tarea', exact: true });
    await expect(floatingBtn).toBeVisible({ timeout: 5000 });
    await expect(floatingBtn).toContainText('1/2');

    // Iniciar temporizador
    const clockButton = page.getByTitle('Click para editar tiempo');
    await expect(clockButton).toBeVisible();
    const initialTime = (await clockButton.innerText()).trim();

    const playButton = page.getByRole('button', { name: 'Iniciar', exact: true });
    await playButton.click();
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();

    // Abrir drawer desde el botón flotante durante el Pomodoro activo
    await floatingBtn.click();
    await expect(drawerOverlay).toBeVisible();

    // Validar que el reloj sigue corriendo activamente en segundo plano
    await expect.poll(async () => (await clockButton.innerText()).trim(), {
      timeout: 8000,
      intervals: [500]
    }).not.toBe(initialTime);

    // Esperar asentamiento visual y capturar evidencia
    await page.waitForTimeout(400);
    const screenshot4Path = path.join(evidenceDir, 'pomodoro-enfoque-drawer.png');
    await page.screenshot({ path: screenshot4Path });
    console.log(`[EVIDENCIA 4] Captura guardada: ${screenshot4Path}`);
  });
});
