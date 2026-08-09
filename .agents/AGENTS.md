# Reglas del Proyecto CampusFlow

Estas reglas se aplican de forma global a todos los agentes que trabajen en este workspace:

1. **Validación Automática de Sintaxis y Tipos:**
   Al realizar cualquier modificación en el código, es OBLIGATORIO validar la sintaxis y los tipos ejecutando las herramientas del proyecto (por ejemplo, `npx eslint .` y `npx tsc --noEmit`). No consideres un cambio finalizado hasta que el código pase el linter y no haya errores de tipado.

2. **Pruebas y QA (Unitarias y E2E):**
   Antes de dar por completada una tarea, debes ejecutar las pruebas del proyecto para asegurar la regresión y el buen funcionamiento:
   - Utiliza **Vitest** para las pruebas unitarias (por ejemplo, mediante `npx vitest run`).
   - Utiliza **Playwright** para las pruebas end-to-end (E2E) (por ejemplo, mediante `npx playwright test`).
   Si alguna prueba falla, es tu responsabilidad diagnosticar y corregir el error antes de finalizar tu intervención.
