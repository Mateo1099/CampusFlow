import { test, expect } from '@playwright/test';

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
  green_alert_custom_days: 1
};

const JSON_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'content-type': 'application/json'
};

test('Ajustes abre Seguridad y recupera el scroll al cerrar', async ({ page }) => {
  const attemptedMutations = [];
  const runtimeErrors = [];

  page.on('pageerror', error => runtimeErrors.push(error.message));

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
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(MOCK_PROFILE)
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([])
    });
  });

  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile$/);

  const cards = page.locator('.settings-triptych .settings-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Tema Visual');
  await expect(cards.nth(1)).toContainText('Fondos de Pantalla');
  await expect(cards.nth(2)).toContainText(/Seguridad/i);

  const scrollContainer = page.locator('.main-content');
  await expect(scrollContainer).toBeVisible();
  await expect.poll(async () => scrollContainer.evaluate(element => getComputedStyle(element).overflowY))
    .not.toBe('hidden');

  const securityCard = page.getByRole('button', { name: 'Abrir configuración de seguridad' });
  await securityCard.scrollIntoViewIfNeeded();
  await securityCard.click();

  const dialog = page.getByRole('dialog', { name: 'Seguridad' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('INACTIVA', { exact: true })).toBeVisible();
  await expect(dialog.getByText('DESACTIVADA', { exact: true })).toBeVisible();

  const closeButton = dialog.getByRole('button', { name: 'Cerrar configuración de seguridad' });
  await expect(closeButton).toBeVisible();
  await expect.poll(async () => scrollContainer.evaluate(element => element.style.overflow))
    .toBe('hidden');

  await closeButton.click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(async () => scrollContainer.evaluate(element => element.style.overflow))
    .not.toBe('hidden');

  const scrollState = await scrollContainer.evaluate(element => {
    element.scrollTop = element.scrollHeight;
    return {
      scrollTop: element.scrollTop,
      maxScrollTop: element.scrollHeight - element.clientHeight
    };
  });

  expect(scrollState.maxScrollTop).toBeGreaterThan(0);
  expect(scrollState.scrollTop).toBeGreaterThan(0);
  expect(attemptedMutations).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
