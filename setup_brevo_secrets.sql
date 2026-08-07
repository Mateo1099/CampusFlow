-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Configuración de Secrets para Brevo
-- ─────────────────────────────────────────────────────────────────────────
-- Guarda las credenciales de Brevo en la tabla `app_secrets`, que es leída por
-- la función `run_daily_deadline_range_alerts()` para enviar las alertas.
--
-- ⚠️  IMPORTANTE — NO PEGUES LA API KEY REAL EN ESTE ARCHIVO.
--     Este archivo vive en el repositorio. Si escribes la key aquí y se comitea,
--     queda expuesta de forma permanente en el historial de git.
--     Reemplaza el placeholder solo en el editor SQL de Supabase al ejecutarlo.
--
-- ORDEN DE EJECUCIÓN:
--   1. Este archivo (crea la tabla e inserta los secrets).
--   2. migrations_email_brevo_v5.sql (crea la función de alertas).
--   3. migrations_rls_seguridad_v1.sql (BLINDA la tabla con RLS). ← imprescindible
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> pegar y correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Crear tabla de secrets si no existe
CREATE TABLE IF NOT EXISTS app_secrets (
  name text PRIMARY KEY,
  secret_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insertar o actualizar el API key de Brevo
--    ⬇️  SUSTITUYE el placeholder por tu key real ÚNICAMENTE en el editor de Supabase.
INSERT INTO app_secrets (name, secret_value)
VALUES (
  'brevo_api_key',
  'PEGA_AQUI_TU_BREVO_API_KEY'
)
ON CONFLICT (name) DO UPDATE
SET secret_value = EXCLUDED.secret_value,
    updated_at = now();

-- 3. Insertar o actualizar el nombre del remitente
INSERT INTO app_secrets (name, secret_value)
VALUES (
  'brevo_from_name',
  'CampusFlow'
)
ON CONFLICT (name) DO UPDATE
SET secret_value = EXCLUDED.secret_value,
    updated_at = now();

-- 4. Insertar o actualizar el email del remitente
INSERT INTO app_secrets (name, secret_value)
VALUES (
  'brevo_from_email',
  'PEGA_AQUI_TU_EMAIL_REMITENTE'
)
ON CONFLICT (name) DO UPDATE
SET secret_value = EXCLUDED.secret_value,
    updated_at = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────
-- CORREGIDO: la versión anterior de este archivo consultaba
-- `vault.decrypted_secrets`, pero los valores se insertan en `app_secrets`.
-- Esa consulta nunca podía devolver resultados.
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  name,
  CASE
    WHEN name = 'brevo_api_key'
      THEN 'xkeysib-...' || RIGHT(secret_value, 6)   -- ofuscado a propósito
    ELSE secret_value
  END AS valor,
  updated_at
FROM app_secrets
WHERE name IN ('brevo_api_key', 'brevo_from_name', 'brevo_from_email')
ORDER BY name;

-- Deberías ver 3 filas:
--   brevo_api_key    | xkeysib-...XXXXXX
--   brevo_from_email | tu-correo@ejemplo.com
--   brevo_from_name  | CampusFlow
