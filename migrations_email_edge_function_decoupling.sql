-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Desacoplamiento de Plantillas de Email hacia Edge Function (v6)
-- ─────────────────────────────────────────────────────────────────────────
-- FASE 2: DESACOPLAMIENTO ARQUITECTÓNICO
--
-- PROBLEMA RESUELTO:
-- Anteriormente, las plantillas HTML del semáforo de alertas se encontraban
-- incrustadas como texto concatenado dentro de PostgreSQL (PL/pgSQL).
-- Esto acoplaba el diseño visual a la base de datos y aumentaba la deuda técnica.
--
-- SOLUCIÓN IMPLEMENTADA:
-- 1. La base de datos ahora se limita ÚNICAMENTE a su responsabilidad central:
--    - Consultar tareas pendientes y evaluar fechas límites.
--    - Respetar preferencias de frecuencia del estudiante (diario, interdiario, personalizado).
--    - Gestionar idempotencia mediante `assignment_alert_log`.
--    - Construir un payload JSON estructurado:
--        {
--          "user_email": "estudiante@dominio.com",
--          "student_name": "Nombre",
--          "pending_tasks": [
--            {
--              "id": "uuid",
--              "title": "Título",
--              "deadline": "2026-10-17T23:59:59Z",
--              "days_left": 1,
--              "alert_type": "rojo",
--              "course": "Cálculo"
--            }
--          ]
--        }
-- 2. El payload JSON se envía mediante `net.http_post` hacia la Supabase Edge
--    Function `send-deadline-alerts`, la cual procesa la plantilla Cyber Luxe
--    e interactúa de forma segura con la API de Resend (RESEND_API_KEY).
-- 3. Blindaje de Credenciales: No se exponen API keys ni tokens en texto plano
--    dentro de este script. Se leen desde `app_secrets` o `vault.decrypted_secrets`.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Tabla segura de configuración de secretos (si aún no existe)
CREATE TABLE IF NOT EXISTS app_secrets (
  name text PRIMARY KEY,
  secret_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en app_secrets para evitar accesos no autorizados desde cliente
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- 3. Configuración de credenciales para invocar la Edge Function
--    ⬇️ SUSTITUYE únicamente en el editor de Supabase si requieres personalizar:
INSERT INTO app_secrets (name, secret_value)
VALUES 
  ('supabase_edge_url', 'https://tknrxiksvsmygtszlytf.supabase.co/functions/v1/send-deadline-alerts'),
  ('supabase_service_role_key', 'PEGA_AQUI_TU_SUPABASE_SERVICE_ROLE_KEY')
ON CONFLICT (name) DO UPDATE
SET secret_value = EXCLUDED.secret_value,
    updated_at = now();

-- 4. Asegurar estructura de tabla de logs con llave granular (sent_bucket)
CREATE TABLE IF NOT EXISTS assignment_alert_log (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  alert_type    text NOT NULL CHECK (alert_type IN ('rojo', 'amarillo', 'verde')),
  sent_date     date NOT NULL,
  sent_bucket   text NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, alert_type, sent_bucket)
);

-- 5. FUNCIÓN DESACOPLADA: Consulta datos, agrupa tareas y delega a Edge Function
CREATE OR REPLACE FUNCTION run_daily_deadline_range_alerts()
RETURNS void AS $$
DECLARE
  v_today date;
  v_now timestamp;
  v_edge_url text;
  v_auth_key text;
  v_user record;
  v_task record;
  v_days_left integer;
  v_alert_type text;
  v_freq text;
  v_custom_days integer;
  v_bucket text;
  v_should_send boolean;
  v_last_sent date;
  v_last_sent_at timestamptz;
  v_student_tasks jsonb;
  v_tasks_to_log record;
BEGIN
  -- Zona horaria garantizada para Colombia (UTC-5)
  v_today := (now() AT TIME ZONE 'America/Bogota')::date;
  v_now   := (now() AT TIME ZONE 'America/Bogota');

  -- Cargar URL y token de autorización para invocar la Edge Function
  -- Prioridad 1: app_secrets
  SELECT secret_value INTO v_edge_url FROM app_secrets WHERE name = 'supabase_edge_url';
  SELECT secret_value INTO v_auth_key FROM app_secrets WHERE name = 'supabase_service_role_key';

  -- Prioridad 2: Fallback a Vault si no están en app_secrets
  IF v_edge_url IS NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_edge_url FROM vault.decrypted_secrets WHERE name = 'supabase_edge_url';
    EXCEPTION WHEN OTHERS THEN
      v_edge_url := NULL;
    END;
  END IF;

  IF v_auth_key IS NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_auth_key FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';
    EXCEPTION WHEN OTHERS THEN
      v_auth_key := NULL;
    END;
  END IF;

  -- Fallback de URL si no está configurada explícitamente
  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    v_edge_url := 'https://tknrxiksvsmygtszlytf.supabase.co/functions/v1/send-deadline-alerts';
  END IF;

  -- Iterar por cada estudiante que tenga las notificaciones por correo activadas
  FOR v_user IN
    SELECT
      p.id AS user_id,
      p.full_name,
      p.email,
      COALESCE(p.red_alert_freq, 'diario') AS red_alert_freq,
      COALESCE(p.yellow_alert_freq, 'diario') AS yellow_alert_freq,
      COALESCE(p.green_alert_freq, 'diario') AS green_alert_freq,
      COALESCE(p.red_alert_custom_days, 1) AS red_alert_custom_days,
      COALESCE(p.yellow_alert_custom_days, 1) AS yellow_alert_custom_days,
      COALESCE(p.green_alert_custom_days, 1) AS green_alert_custom_days
    FROM profiles p
    WHERE p.email_notifications IS TRUE
      AND p.email IS NOT NULL
      AND trim(p.email) <> ''
  LOOP

    v_student_tasks := '[]'::jsonb;

    -- Evaluar tareas pendientes del estudiante dentro del umbral de alerta (<= 15 días)
    FOR v_task IN
      SELECT
        a.id AS assignment_id,
        a.title,
        a.deadline,
        (DATE(a.deadline) - v_today) AS days_left,
        c.name AS course_name
      FROM assignments a
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE a.user_id = v_user.user_id
        AND a.status <> 'entregado'
        AND a.deadline IS NOT NULL
        AND (DATE(a.deadline) - v_today) <= 15
      ORDER BY a.deadline ASC
    LOOP
      v_days_left := v_task.days_left;

      -- Clasificación por rango del semáforo:
      -- 🚨 Zona Roja: <= 3 días (o vencidas)
      -- ⚠️ Zona Amarilla: 4 a 7 días
      -- ✨ Zona Verde: 8 a 15 días
      IF v_days_left <= 3 THEN
        v_alert_type := 'rojo';
        v_freq := v_user.red_alert_freq;
        v_custom_days := v_user.red_alert_custom_days;

      ELSIF v_days_left BETWEEN 4 AND 7 THEN
        v_alert_type := 'amarillo';
        v_freq := v_user.yellow_alert_freq;
        v_custom_days := v_user.yellow_alert_custom_days;

      ELSIF v_days_left BETWEEN 8 AND 15 THEN
        v_alert_type := 'verde';
        v_freq := v_user.green_alert_freq;
        v_custom_days := v_user.green_alert_custom_days;

      ELSE
        CONTINUE;
      END IF;

      -- Evaluación de frecuencia e insistencia
      v_should_send := true;

      IF v_freq = 'interdiario' THEN
        v_bucket := to_char(v_today, 'YYYY-MM-DD');
        SELECT MAX(sent_date) INTO v_last_sent
          FROM assignment_alert_log
         WHERE assignment_id = v_task.assignment_id AND alert_type = v_alert_type;
        v_should_send := (v_last_sent IS NULL OR (v_today - v_last_sent) >= 2);

      ELSIF v_freq = 'personalizado' THEN
        v_bucket := to_char(v_today, 'YYYY-MM-DD');
        SELECT MAX(sent_at) INTO v_last_sent_at
          FROM assignment_alert_log
         WHERE assignment_id = v_task.assignment_id AND alert_type = v_alert_type;
        v_should_send := (v_last_sent_at IS NULL OR (now() - v_last_sent_at) >= (COALESCE(v_custom_days, 1) || ' days')::interval);

      ELSE
        -- 'diario': una vez por día calendario
        v_bucket := to_char(v_today, 'YYYY-MM-DD');
      END IF;

      IF NOT v_should_send THEN
        CONTINUE;
      END IF;

      -- Idempotencia: Verificar si ya se envió para este trabajo en este bucket
      IF EXISTS (
        SELECT 1 FROM assignment_alert_log
         WHERE assignment_id = v_task.assignment_id
           AND alert_type = v_alert_type
           AND sent_bucket = v_bucket
      ) THEN
        CONTINUE;
      END IF;

      -- Tarea calificada para incluir en el digest JSON del estudiante
      v_student_tasks := v_student_tasks || jsonb_build_object(
        'id', v_task.assignment_id,
        'title', COALESCE(v_task.title, 'Trabajo sin título'),
        'deadline', v_task.deadline,
        'days_left', v_days_left,
        'alert_type', v_alert_type,
        'course', COALESCE(v_task.course_name, 'General')
      );

      -- Registrar inmediatamente en el log de alertas para deduplicación
      INSERT INTO assignment_alert_log (assignment_id, alert_type, sent_date, sent_bucket)
      VALUES (v_task.assignment_id, v_alert_type, v_today, v_bucket)
      ON CONFLICT (assignment_id, alert_type, sent_bucket) DO NOTHING;

    END LOOP;

    -- Si el estudiante tiene tareas que reportar, invocar la Edge Function desacoplada
    IF jsonb_array_length(v_student_tasks) > 0 THEN
      PERFORM net.http_post(
        url := v_edge_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_auth_key, '')
        ),
        body := jsonb_build_object(
          'user_email', v_user.email,
          'student_name', COALESCE(v_user.full_name, 'Estudiante'),
          'pending_tasks', v_student_tasks
        )
      );
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función RPC de prueba inmediata para validar el desacoplamiento
CREATE OR REPLACE FUNCTION test_send_deadline_alerts_edge(p_email text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_target_email text;
  v_edge_url text;
  v_auth_key text;
  v_sample_payload jsonb;
  v_request_id bigint;
BEGIN
  SELECT secret_value INTO v_edge_url FROM app_secrets WHERE name = 'supabase_edge_url';
  SELECT secret_value INTO v_auth_key FROM app_secrets WHERE name = 'supabase_service_role_key';

  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    v_edge_url := 'https://tknrxiksvsmygtszlytf.supabase.co/functions/v1/send-deadline-alerts';
  END IF;

  v_target_email := COALESCE(p_email, 'trujillomateo01@gmail.com');

  v_sample_payload := jsonb_build_object(
    'user_email', v_target_email,
    'student_name', 'Mateo Trujillo',
    'pending_tasks', jsonb_build_array(
      jsonb_build_object(
        'title', 'Taller de Álgebra Lineal y Vectores',
        'deadline', (now() + interval '12 hours')::text,
        'days_left', 0,
        'alert_type', 'rojo',
        'course', 'Matemáticas'
      ),
      jsonb_build_object(
        'title', 'Informe de Laboratorio de Física',
        'deadline', (now() + interval '48 hours')::text,
        'days_left', 2,
        'alert_type', 'amarillo',
        'course', 'Física II'
      ),
      jsonb_build_object(
        'title', 'Ensayo Argumentativo de Humanidades',
        'deadline', (now() + interval '9 days')::text,
        'days_left', 9,
        'alert_type', 'verde',
        'course', 'Humanidades'
      )
    )
  );

  SELECT net.http_post(
    url := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_auth_key, '')
    ),
    body := v_sample_payload
  ) INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'edge_url', v_edge_url,
    'recipient', v_target_email,
    'http_request_id', v_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Programación periódica en pg_cron (cada hora para soporte de granularidad)
SELECT cron.unschedule('hourly-deadline-range-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-deadline-range-alerts');

SELECT cron.schedule(
  'hourly-deadline-range-alerts',
  '0 * * * *',
  $$ SELECT run_daily_deadline_range_alerts(); $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES DE VERIFICACIÓN POST-MIGRACIÓN:
-- 1. Ejecutar este script en Supabase Dashboard → SQL Editor.
-- 2. Asegúrate de configurar la variable de entorno RESEND_API_KEY en Supabase:
--    Dashboard → Project Settings → Edge Functions → Secrets → RESEND_API_KEY
-- 3. Probar envío inmediato con la función RPC de prueba:
--    SELECT test_send_deadline_alerts_edge('tu-correo@ejemplo.com');
-- 4. Verificar ejecuciones de pg_net:
--    SELECT * FROM net._http_response ORDER BY id DESC LIMIT 5;
-- ═══════════════════════════════════════════════════════════════════════════
