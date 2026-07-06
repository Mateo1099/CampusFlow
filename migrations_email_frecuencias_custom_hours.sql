-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Intervalo numérico real para frecuencia 'personalizado' (v4)
-- ─────────────────────────────────────────────────────────────────────────
-- COMPLEMENTA migrations_email_frecuencias_independientes.sql (v3). Ese
-- script dejó documentado (punto 5 de su encabezado) que 'personalizado' se
-- comportaba igual que 'diario' porque no existía un campo numérico de
-- intervalo. Ahora sí existe: la UI de Ajustes (Profile.jsx) despliega un
-- input numérico de horas cuando se elige 'personalizado' en cualquier zona,
-- y este script conecta ese número con la función de envío.
--
-- 1. Tres columnas nuevas en profiles, una por zona, en HORAS (entero > 0):
--    red_alert_custom_hours, yellow_alert_custom_hours, green_alert_custom_hours.
--    Default 24 (una vez al día) para que el comportamiento previo de
--    'personalizado' (igual a 'diario') no cambie para nadie que no haya
--    tocado el nuevo input todavía.
--
-- 2. run_daily_deadline_range_alerts() se actualiza SOLO en la rama
--    'personalizado': ahora calcula si ya pasaron >= N horas desde el
--    último envío registrado en assignment_alert_log (N = la columna
--    *_custom_hours de la zona correspondiente). El resto de frecuencias
--    ('cada_hora', 'diario', 'interdiario') no cambia respecto a la v3.
--
-- 3. El bucket de idempotencia para 'personalizado' pasa a ser por HORA
--    natural (igual formato que 'cada_hora': 'YYYY-MM-DD"T"HH24'), porque
--    un intervalo en horas puede caer varias veces dentro del mismo día
--    natural (por ejemplo cada 6 horas). La condición de "ya pasaron >= N
--    horas desde el último envío" sigue siendo la que decide si se manda o
--    no; el bucket solo evita doble envío si el cron se reintenta dentro de
--    la misma hora.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y correr.
-- Requisito previo: migrations_email_frecuencias_independientes.sql (v3) ya
-- ejecutado (columnas red/yellow/green_alert_freq y assignment_alert_log
-- con sent_bucket deben existir).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Columnas de intervalo personalizado (en horas).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS red_alert_custom_hours integer NOT NULL DEFAULT 24
    CHECK (red_alert_custom_hours > 0),
  ADD COLUMN IF NOT EXISTS yellow_alert_custom_hours integer NOT NULL DEFAULT 24
    CHECK (yellow_alert_custom_hours > 0),
  ADD COLUMN IF NOT EXISTS green_alert_custom_hours integer NOT NULL DEFAULT 24
    CHECK (green_alert_custom_hours > 0);

-- 2. Función actualizada: misma lógica de la v3, con la rama 'personalizado'
--    ahora usando un intervalo real en horas en lugar de comportarse como
--    'diario'.
CREATE OR REPLACE FUNCTION run_daily_deadline_range_alerts()
RETURNS void AS $$
DECLARE
  v_row record;
  v_api_key text;
  v_from_email text;
  v_fallback_email text;
  v_today date;
  v_now timestamp;
  v_days_left integer;
  v_alert_type text;
  v_emoji text;
  v_color text;
  v_label text;
  v_freq text;
  v_custom_hours integer;
  v_bucket text;
  v_should_send boolean;
  v_last_sent_at timestamptz;
  v_last_sent date;
  v_target_email text;
BEGIN
  v_today := (now() AT TIME ZONE 'America/Bogota')::date;
  v_now   := (now() AT TIME ZONE 'America/Bogota');

  SELECT decrypted_secret INTO v_api_key
    FROM vault.decrypted_secrets WHERE name = 'resend_api_key';
  SELECT decrypted_secret INTO v_from_email
    FROM vault.decrypted_secrets WHERE name = 'resend_from_email';
  SELECT decrypted_secret INTO v_fallback_email
    FROM vault.decrypted_secrets WHERE name = 'resend_test_fallback_email';

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
      p.red_alert_custom_hours    AS red_alert_custom_hours,
      p.yellow_alert_custom_hours AS yellow_alert_custom_hours,
      p.green_alert_custom_hours  AS green_alert_custom_hours
    FROM assignments a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.status <> 'entregado'
      AND a.deadline IS NOT NULL
      AND p.email_notifications IS TRUE
      AND (DATE(a.deadline) - v_today) <= 15
  LOOP
    v_days_left := v_row.days_left;

    v_target_email := COALESCE(v_row.email, v_fallback_email);
    IF v_target_email IS NULL THEN
      CONTINUE;
    END IF;

    IF v_days_left <= 3 THEN
      v_alert_type := 'rojo';
      v_emoji := '🚨'; v_color := '#ff3b30';
      v_label := CASE WHEN v_days_left < 0 THEN 'Alerta Roja: ¡trabajo vencido y pendiente!'
                       ELSE 'Alerta Roja: ¡3 días o menos para la entrega!' END;
      v_freq := v_row.red_alert_freq;
      v_custom_hours := v_row.red_alert_custom_hours;

    ELSIF v_days_left BETWEEN 4 AND 7 THEN
      v_alert_type := 'amarillo';
      v_emoji := '⚠️'; v_color := '#ff9500';
      v_label := 'Alerta Amarilla: entrega dentro de la semana';
      v_freq := v_row.yellow_alert_freq;
      v_custom_hours := v_row.yellow_alert_custom_hours;

    ELSIF v_days_left BETWEEN 8 AND 15 THEN
      v_alert_type := 'verde';
      v_emoji := '✨'; v_color := '#34c759';
      v_label := 'Alerta Verde: entrega próxima (más de una semana)';
      v_freq := v_row.green_alert_freq;
      v_custom_hours := v_row.green_alert_custom_hours;

    ELSE
      CONTINUE;
    END IF;

    v_should_send := true;

    IF v_freq = 'cada_hora' THEN
      v_bucket := to_char(v_now, 'YYYY-MM-DD"T"HH24');

    ELSIF v_freq = 'interdiario' THEN
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
      SELECT MAX(sent_date) INTO v_last_sent
        FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id AND alert_type = v_alert_type;
      v_should_send := (v_last_sent IS NULL OR (v_today - v_last_sent) >= 2);

    ELSIF v_freq = 'personalizado' THEN
      -- Bucket por hora natural (ver punto 3 del encabezado); la condición
      -- real de envío es "ya pasaron >= N horas desde el último envío".
      v_bucket := to_char(v_now, 'YYYY-MM-DD"T"HH24');
      SELECT MAX(sent_at) INTO v_last_sent_at
        FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id AND alert_type = v_alert_type;
      v_should_send := (v_last_sent_at IS NULL OR (now() - v_last_sent_at) >= (COALESCE(v_custom_hours, 24) || ' hours')::interval);

    ELSE
      -- 'diario' (default): una vez por día natural.
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
    END IF;

    IF NOT v_should_send THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id
         AND alert_type = v_alert_type
         AND sent_bucket = v_bucket
    ) THEN
      CONTINUE;
    END IF;

    PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_api_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', v_from_email,
        'to', jsonb_build_array(v_target_email),
        'subject', v_emoji || ' ' || v_label || ': ' || COALESCE(v_row.title, 'Trabajo pendiente'),
        'html',
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

-- No hace falta reprogramar pg_cron: el job 'hourly-deadline-range-alerts'
-- de la v3 ya corre cada hora, que es la granularidad mínima necesaria para
-- que 'personalizado' e 'cada_hora' funcionen correctamente.

-- ═══════════════════════════════════════════════════════════════════════════
-- PASOS MANUALES PENDIENTES (dashboard de Supabase, sin terminal):
-- 1. Ejecutar este script completo en el SQL Editor (después de la v3).
-- 2. Verificar las nuevas columnas:
--      SELECT id, full_name, red_alert_freq, red_alert_custom_hours,
--             yellow_alert_freq, yellow_alert_custom_hours,
--             green_alert_freq, green_alert_custom_hours
--        FROM profiles;
-- 3. Prueba: en Ajustes, elige "Personalizado" en Alerta Roja e ingresa un
--    número de horas (por ejemplo 6). Guarda y confirma en la tabla que
--    red_alert_freq = 'personalizado' y red_alert_custom_hours = 6.
-- 4. Prueba manual de envío:
--      SELECT run_daily_deadline_range_alerts();
-- ═══════════════════════════════════════════════════════════════════════════
