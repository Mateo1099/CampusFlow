-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Migración a Brevo (v5) + cambio de horas a días
-- ─────────────────────────────────────────────────────────────────────────
-- REEMPLAZA la integración de Gmail/Mailgun por Brevo (300 emails/día gratis).
-- Además, cambia el modelo de intervalo personalizado:
--   - De: *_custom_hours (1-720, en horas)
--   - A: *_custom_days (1-30, en días, más intuitivo)
--
-- CAMBIOS:
-- 1. Nuevas columnas: red_alert_custom_days, yellow_alert_custom_days,
--    green_alert_custom_days (valores 1-30, default 1 = "cada día").
--    Se migran automáticamente desde *_custom_hours si existen.
--
-- 2. run_daily_deadline_range_alerts() ahora usa Brevo HTTP API con
--    net.http_post() (que SÍ existe en Supabase), y lee *_custom_days.
--
-- 3. Los secrets en Vault:
--    - brevo_api_key (API key de Brevo)
--    - brevo_from_name (nombre del remitente: "CampusFlow")
--    - brevo_from_email (email del remitente: trujillomateo01@gmail.com)
--
-- 4. El selector de frecuencias en Profile.jsx pierde 'cada_hora' (incompatible
--    con tope de 1 correo/día), quedando: diario, interdiario, personalizado.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MIGRACIÓN DE HORAS A DÍAS
--    Si las columnas *_custom_hours ya existen, las migramos y luego las
--    eliminamos. Si no existen, simplemente creamos las nuevas en días.

-- 1A. Crear nuevas columnas de días (con defaults conservadores).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS red_alert_custom_days integer NOT NULL DEFAULT 1
    CHECK (red_alert_custom_days >= 1 AND red_alert_custom_days <= 30),
  ADD COLUMN IF NOT EXISTS yellow_alert_custom_days integer NOT NULL DEFAULT 1
    CHECK (yellow_alert_custom_days >= 1 AND yellow_alert_custom_days <= 30),
  ADD COLUMN IF NOT EXISTS green_alert_custom_days integer NOT NULL DEFAULT 1
    CHECK (green_alert_custom_days >= 1 AND green_alert_custom_days <= 30);

-- 1B. Migrar datos de *_custom_hours a *_custom_days (si existen).
--     Conversión: horas → días, redondeando hacia arriba (CEIL).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'red_alert_custom_hours') THEN
    UPDATE profiles 
    SET red_alert_custom_days = LEAST(30, GREATEST(1, CEIL(COALESCE(red_alert_custom_hours, 24)::numeric / 24)))
    WHERE red_alert_custom_hours IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'yellow_alert_custom_hours') THEN
    UPDATE profiles 
    SET yellow_alert_custom_days = LEAST(30, GREATEST(1, CEIL(COALESCE(yellow_alert_custom_hours, 24)::numeric / 24)))
    WHERE yellow_alert_custom_hours IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'green_alert_custom_hours') THEN
    UPDATE profiles 
    SET green_alert_custom_days = LEAST(30, GREATEST(1, CEIL(COALESCE(green_alert_custom_hours, 24)::numeric / 24)))
    WHERE green_alert_custom_hours IS NOT NULL;
  END IF;
END $$;

-- 1C. Eliminar las columnas antiguas de horas (cleanup).
ALTER TABLE profiles
  DROP COLUMN IF EXISTS red_alert_custom_hours,
  DROP COLUMN IF EXISTS yellow_alert_custom_hours,
  DROP COLUMN IF EXISTS green_alert_custom_hours;

-- 2. FUNCIÓN ACTUALIZADA: Brevo + lectura de *_custom_days

CREATE OR REPLACE FUNCTION run_daily_deadline_range_alerts()
RETURNS void AS $$
DECLARE
  v_row record;
  v_brevo_api_key text;
  v_brevo_from_name text;
  v_brevo_from_email text;
  v_today date;
  v_now timestamp;
  v_days_left integer;
  v_alert_type text;
  v_emoji text;
  v_color text;
  v_label text;
  v_freq text;
  v_custom_days integer;
  v_bucket text;
  v_should_send boolean;
  v_last_sent_at timestamptz;
  v_last_sent date;
  v_target_email text;
BEGIN
  v_today := (now() AT TIME ZONE 'America/Bogota')::date;
  v_now   := (now() AT TIME ZONE 'America/Bogota');

  -- Cargar secrets de Brevo desde app_secrets
  SELECT secret_value INTO v_brevo_api_key
    FROM app_secrets WHERE name = 'brevo_api_key';
  SELECT secret_value INTO v_brevo_from_name
    FROM app_secrets WHERE name = 'brevo_from_name';
  SELECT secret_value INTO v_brevo_from_email
    FROM app_secrets WHERE name = 'brevo_from_email';

  -- Verificar que los secrets existen
  IF v_brevo_api_key IS NULL OR v_brevo_from_name IS NULL OR v_brevo_from_email IS NULL THEN
    RAISE WARNING 'Brevo secrets no configurados correctamente en app_secrets';
    RETURN;
  END IF;

  FOR v_row IN
    SELECT
      a.id            AS assignment_id,
      a.title         AS title,
      a.deadline      AS deadline,
      (DATE(a.deadline) - v_today) AS days_left,
      p.full_name     AS full_name,
      p.email         AS email,
      p.red_alert_freq    AS red_alert_freq,
      p.yellow_alert_freq AS yellow_alert_freq,
      p.green_alert_freq  AS green_alert_freq,
      p.red_alert_custom_days    AS red_alert_custom_days,
      p.yellow_alert_custom_days AS yellow_alert_custom_days,
      p.green_alert_custom_days  AS green_alert_custom_days
    FROM assignments a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.status <> 'entregado'
      AND a.deadline IS NOT NULL
      AND p.email_notifications IS TRUE
      AND (DATE(a.deadline) - v_today) <= 15
  LOOP
    v_days_left := v_row.days_left;

    v_target_email := v_row.email;
    IF v_target_email IS NULL THEN
      CONTINUE;
    END IF;

    -- Clasificación por rango de días (igual que antes)
    IF v_days_left <= 3 THEN
      v_alert_type := 'rojo';
      v_emoji := '🚨'; v_color := '#ff3b30';
      v_label := CASE WHEN v_days_left < 0 THEN 'Alerta Roja: ¡trabajo vencido y pendiente!'
                       ELSE 'Alerta Roja: ¡3 días o menos para la entrega!' END;
      v_freq := v_row.red_alert_freq;
      v_custom_days := v_row.red_alert_custom_days;

    ELSIF v_days_left BETWEEN 4 AND 7 THEN
      v_alert_type := 'amarillo';
      v_emoji := '⚠️'; v_color := '#ff9500';
      v_label := 'Alerta Amarilla: entrega dentro de la semana';
      v_freq := v_row.yellow_alert_freq;
      v_custom_days := v_row.yellow_alert_custom_days;

    ELSIF v_days_left BETWEEN 8 AND 15 THEN
      v_alert_type := 'verde';
      v_emoji := '✨'; v_color := '#34c759';
      v_label := 'Alerta Verde: entrega próxima (más de una semana)';
      v_freq := v_row.green_alert_freq;
      v_custom_days := v_row.green_alert_custom_days;

    ELSE
      CONTINUE;
    END IF;

    v_should_send := true;

    -- Lógica de frecuencia (cambio: 'cada_hora' se removió, ahora solo diario/interdiario/personalizado)
    IF v_freq = 'interdiario' THEN
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
      SELECT MAX(sent_date) INTO v_last_sent
        FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id AND alert_type = v_alert_type;
      v_should_send := (v_last_sent IS NULL OR (v_today - v_last_sent) >= 2);

    ELSIF v_freq = 'personalizado' THEN
      -- Intervalo en DÍAS convertido a horas para comparación interna
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
      SELECT MAX(sent_at) INTO v_last_sent_at
        FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id AND alert_type = v_alert_type;
      v_should_send := (v_last_sent_at IS NULL OR (now() - v_last_sent_at) >= (COALESCE(v_custom_days, 1) || ' days')::interval);

    ELSE
      -- 'diario' (default): una vez por día natural.
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
    END IF;

    IF NOT v_should_send THEN
      CONTINUE;
    END IF;

    -- Idempotencia: no reenviar en el mismo bucket
    IF EXISTS (
      SELECT 1 FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id
         AND alert_type = v_alert_type
         AND sent_bucket = v_bucket
    ) THEN
      CONTINUE;
    END IF;

    -- ENVÍO VÍA BREVO HTTP API
    PERFORM net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object(
        'api-key', v_brevo_api_key,
        'Content-Type', 'application/json',
        'accept', 'application/json'
      ),
      body := jsonb_build_object(
        'sender', jsonb_build_object(
          'name', v_brevo_from_name,
          'email', v_brevo_from_email
        ),
        'to', jsonb_build_array(
          jsonb_build_object('email', v_target_email)
        ),
        'subject', v_emoji || ' ' || v_label || ': ' || COALESCE(v_row.title, 'Trabajo pendiente'),
        'htmlContent',
                '<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background-color:#0a0a0f;font-family:Arial,sans-serif;">' ||
                '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;"><tr><td align="center">' ||
                '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(155deg, rgba(15,17,26,0.96) 0%, rgba(20,24,38,0.92) 100%);border:1px solid ' || v_color || '40;border-radius:20px;overflow:hidden;">' ||
                '<tr><td style="padding:32px 32px 20px 32px;border-bottom:1px solid ' || v_color || '30;">' ||
                '<p style="margin:0;font-size:11px;letter-spacing:3px;color:' || v_color || ';text-transform:uppercase;font-weight:700;">CampusFlow · Alertas de Entrega</p>' ||
                '<h1 style="margin:8px 0 0 0;font-size:20px;color:#f5f5f7;font-weight:800;">' || v_emoji || ' ' || v_label || '</h1></td></tr>' ||
                '<tr><td style="padding:28px 32px;">' ||
                '<p style="margin:0 0 16px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">Hola <strong style="color:#f5f5f7;">' || COALESCE(v_row.full_name, 'Estudiante') || '</strong>, tienes un trabajo pendiente:</p>' ||
                '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' || v_color || '14;border:1px solid ' || v_color || '30;border-radius:14px;margin:16px 0;"><tr><td style="padding:18px 20px;">' ||
                '<p style="margin:0 0 6px 0;font-size:16px;font-weight:800;color:#f5f5f7;">' || COALESCE(v_row.title, 'Trabajo pendiente') || '</p>' ||
                '<p style="margin:0;font-size:12px;color:' || v_color || ';letter-spacing:0.05em;text-transform:uppercase;font-weight:700;">' ||
                  CASE WHEN v_days_left < 0 THEN 'Vencido hace ' || abs(v_days_left) || ' día(s)'
                       ELSE 'Faltan ' || v_days_left || ' día(s)' END ||
                  ' · Fecha límite: ' || to_char(v_row.deadline, 'DD "de" TMMonth "de" YYYY') || '</p>' ||
                '</td></tr></table></td></tr>' ||
                '<tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">' ||
                '<p style="margin:0;font-size:11px;color:#52525b;">Puedes desactivar estas notificaciones o cambiar su frecuencia en Ajustes → Notificaciones.</p>' ||
                '</td></tr></table></td></tr></table></body></html>'
      )
    );

    INSERT INTO assignment_alert_log (assignment_id, alert_type, sent_date, sent_bucket)
    VALUES (v_row.assignment_id, v_alert_type, v_today, v_bucket);

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASOS MANUALES PENDIENTES (dashboard de Supabase, sin terminal):
-- 1. Verificar que los datos migraron correctamente:
--      SELECT id, full_name, red_alert_freq, red_alert_custom_days,
--             yellow_alert_freq, yellow_alert_custom_days,
--             green_alert_freq, green_alert_custom_days
--        FROM profiles LIMIT 5;
--    Los *_custom_days deben tener valores entre 1 y 30 (migrados de horas).
--
-- 2. Limpiar el log antiguo de intentos fallidos (opcional pero recomendado):
--      DELETE FROM assignment_alert_log;
--
-- 3. Prueba manual de envío:
--      SELECT run_daily_deadline_range_alerts();
--
-- 4. Revisar el log:
--      SELECT * FROM assignment_alert_log ORDER BY sent_at DESC LIMIT 5;
--    Si aparecen filas nuevas, el envío se procesó. Revisa tu email.
-- ═══════════════════════════════════════════════════════════════════════════

