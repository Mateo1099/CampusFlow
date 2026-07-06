# Estado del Feature: Alertas por Correo (Semáforo Rojo/Amarillo/Verde)

> Última actualización: 6 de julio de 2026. Este documento existe porque el PC usado para esta sesión es prestado — léelo antes de seguir trabajando en otro equipo.

## Dónde está el código

- **Branch actual (NO fusionada a main):** `fix/alertas-ui-y-guardado-silencioso`
- Push confirmado en GitHub: commit `042cf1e` en `origin/fix/alertas-ui-y-guardado-silencioso`
- `main` sigue en el commit `29c901b` ("Feat: Rediseño Premium del panel de alertas"), que ya tenía las migraciones SQL v2/v3/v4.
- **Pendiente:** decidir si abrir un Pull Request para fusionar `fix/alertas-ui-y-guardado-silencioso` a `main`. No se ha abierto todavía.

## Qué se implementó (en orden cronológico)

### 1. Colores dinámicos en el correo (YA FUNCIONABA, se verificó)
Archivo: `migrations_email_semaforo_alertas.sql`
- 🚨 Roja (≤3 días): `#ff3b30`
- ⚠️ Amarilla (4-7 días): `#ff9500`
- ✨ Verde (8-15 días): `#34c759`
Coincide con las variables CSS `--accent-danger/orange/lime` de `src/index.css`.

### 2. Frecuencias de alerta independientes por zona
Tres migraciones SQL nuevas, en este orden de ejecución:
1. `migrations_email_semaforo_alertas.sql` (v2) — ya ejecutada en Supabase, confirmada.
2. `migrations_email_frecuencias_independientes.sql` (v3) — agrega `red_alert_freq`, `yellow_alert_freq`, `green_alert_freq` a `profiles`. **Confirmada ejecutada** (columnas existen, verificado con SQL).
3. `migrations_email_frecuencias_custom_hours.sql` (v4) — agrega `red_alert_custom_hours`, `yellow_alert_custom_hours`, `green_alert_custom_hours`. **Confirmada ejecutada** (columnas existen, verificado con SQL).

Valores posibles de cada frecuencia: `cada_hora`, `diario`, `interdiario`, `personalizado`.

El cron de Supabase (`pg_cron`) se reprogramó de 1 vez al día a **1 vez por hora** (`0 * * * *`), necesario para que `cada_hora` y `personalizado` (con menos de 24h) funcionen. Esto es una decisión de infraestructura que Mateo aceptó pero no confirmó explícitamente una alternativa (se ofreció limitar `personalizado` a mínimo 24h para evitar el cron horario, no se decidió nada aún).

### 3. Frontend: Profile.jsx + SettingsContext.jsx
- Nuevo componente `AlertFrequencyRow`: un `<select>` nativo por zona (reemplazó un diseño de acordeón con chips que se veía "cortado y horrible" — feedback directo de Mateo).
- Panel de frecuencia ahora es una **fila de ancho completo**, separada de la barra de identidad (antes vivía apretada dentro de la columna de Notificaciones de 380px, causaba el corte visual).
- Título simplificado a: **"¿Cada cuánto te recordamos cada trabajo?"** (antes decía "Insistencia por Zona de Urgencia", jerga que Mateo no entendía).
- Input numérico de horas aparece solo si se elige "Personalizado", con traductor visual "≈X días".
- Toast de confirmación al guardar el número exacto de horas (antes solo confirmaba la palabra "Personalizado" sin el número).

### 4. BUG CRÍTICO encontrado y arreglado: guardado silencioso
**Causa raíz:** `SettingsContext.updateSettings()` actualiza la pantalla al instante (optimistic update) ANTES de confirmar con Supabase. Si el guardado en la nube fallaba (RLS, red, permisos), el código solo hacía `console.error(...)` invisible. La pantalla se quedaba mostrando "activado" para siempre aunque la base de datos nunca cambió.
**Evidencia:** el toggle "Correo Electrónico" se veía verde en la app, pero `SELECT email_notifications FROM profiles` devolvía `false`.
**Arreglo aplicado:** ahora si el guardado falla, se revierte el estado local al valor real y se dispara un evento (`campusflow:settings-save-error`) que Profile.jsx escucha para mostrar un toast rojo de error.
**PENDIENTE DE VERIFICAR POR MATEO:** activar/desactivar el toggle de correo en la app real y confirmar si aparece el toast de error. Si aparece, hay que revisar las políticas RLS de la tabla `profiles` en Supabase (no se ha hecho todavía).

### 5. Bugs visuales de la sesión anterior, ya arreglados
- Toast que aparecía "duplicado, izquierda y luego derecha": causado por la animación CSS `popIn` que sobrescribía el `transform: translate(-50%,-50%)` de centrado. Arreglado incluyendo el translate en los 3 keyframes.
- Animación tosca del panel de frecuencias: causada por animar `height: 'auto'` con `framer-motion` (JS), que fuerza reflow. Se cambió a `grid-template-rows: 0fr → 1fr` (CSS puro, más fluido). Nota: con el rediseño a `<select>` nativo, esta técnica ya no es tan relevante porque el select no necesita animación de apertura propia.

## Pendientes reales (qué falta hacer, en orden de prioridad)

1. **Verificar en Supabase que el toggle de correo ahora SÍ guarda correctamente** (ver punto 4 arriba). Sin esto, ninguna alerta se va a enviar nunca, sin importar cuánto se pula el diseño.
2. **Repetir la prueba de envío** una vez el toggle esté en `true`:
   ```sql
   SELECT run_daily_deadline_range_alerts();
   SELECT * FROM assignment_alert_log ORDER BY sent_at DESC;
   ```
   Debe aparecer una fila para el trabajo "Prueba 1" (zona roja, ya tenía 1 día restante en la última verificación).
3. **Revisar visualmente el nuevo panel de selects** en `npm run dev` — confirmar con Mateo si el rediseño con `<select>` nativo resolvió el problema de "se ve cortado".
4. **Decidir sobre el PR:** ¿fusionar `fix/alertas-ui-y-guardado-silencioso` a `main`? No se ha creado el Pull Request todavía.
5. **Decisión pendiente sobre el cron horario:** ¿dejarlo cada hora (actual) o limitar "Personalizado" a mínimo 24h para volver al cron diario? No decidido.
6. **Fallback de email de pruebas** (`resend_test_fallback_email` en Vault): está documentado como opcional/comentado en `migrations_email_frecuencias_independientes.sql`, no se ha creado ese secret. Solo es necesario si algún perfil de prueba no tiene `email` lleno.

## Archivos SQL relevantes (todos en la raíz del proyecto)
- `migrations_email_notifications.sql` — base: columna `email_notifications`, `email` en profiles.
- `migrations_email_webhook_trigger.sql` — configuración de Resend en Vault.
- `migrations_email_semaforo_alertas.sql` — v2: rangos de color + función original.
- `migrations_email_frecuencias_independientes.sql` — v3: freq por zona.
- `migrations_email_frecuencias_custom_hours.sql` — v4: horas personalizadas.
- `diagnostico_alertas.sql` — 4 consultas de diagnóstico para depurar por qué la función no envía (usadas y útiles, guardar).

## Archivos de código modificados
- `src/pages/Profile.jsx`
- `src/context/SettingsContext.jsx`
