import { defineConfig } from 'vitest/config';

// Config dedicada para Vitest (separada de vite.config.js) para que su
// descubrimiento de pruebas NUNCA choque con los specs de Playwright en
// `e2e/`, que usan un runner y una API distintos (`@playwright/test`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      'playwright-report/**',
      'test-results/**'
    ]
  }
});
