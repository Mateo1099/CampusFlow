-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Alertas por Rangos e Insistencia (v2, con zona horaria fija)
-- ─────────────────────────────────────────────────────────────────────────
-- REEMPLAZA la versión anterior de "días exactos" (3/7/15) de este mismo
-- archivo. Motivo del cambio de arquitectura, no solo de números:
--
-- 1. RANGOS CONTINUOS en vez de días exactos:
--      🚨 Zona Roja     -> deadline - hoy <= 3 días (incluye vencidos y
--                          pendientes, mientras no se marquen 'entregado')
--      ⚠️ Zona Amarilla -> deadline - hoy entre 4 y 7 días
--      ✨ Zona Verde    -> deadline - hoy entre 8 y 15 días
--    A diferencia de "exactamente 3/7/15", un trabajo que hoy tiene 5 días
--    ya cae en Amarilla sin tener que esperar a que llegue a 7 en punto.
--
-- 2. INSISTENCIA DIARIA en Zona Roja: mientras el trabajo siga pendiente y
--    esté a 3 días o menos, se reenvía el correo TODOS los días (no una
--    sola vez). Esto obliga a rediseñar la tabla de control de duplicados:
--    ya no basta con "assignment_id + tipo de alerta" como llave única,
--    porque ahora SÍ queremos varios envíos del mismo tipo 'rojo' para el
--    mismo trabajo, uno por cada día natural. Se agrega `sent_date` a la
--    llave para permitir "una vez por día", pero no más de una vez por día
--    aunque el cron se reintente.
--
-- 3. profiles.alert_frequency: nueva columna ('diario' | 'interdiario') para
--    que Mateo controle desde Ajustes qué tan seguido insisten las alertas
--    Amarilla y Verde. LA ZONA ROJA IGNORA ESTA PREFERENCIA A PROPÓSITO:
--    la urgencia de "3 días o menos" debe insistir todos los días sin
--    excepción, sin importar la preferencia de frecuencia del estudiante.
--    Esta es una decisión de diseño (no estaba pedida explícitamente así) —
--    se explica en el mensaje de entrega junto con este script por si
--    Mateo prefiere que 'interdiario' también amortigüe la Zona Roja.
--
-- 4. ZONA HORARIA EXPLÍCITA: aunque ya se corrió
--    `ALTER DATABASE ... SET timezone = 'America/Bogota'`, esta función NO
--    depende de esa configuración de sesión para calcular "hoy". Se usa
--    `(now() AT TIME ZONE 'America/Bogota')::date` de forma explícita en el
--    cálculo, así el resultado es correcto incluso si alguien cambia el
--    timezone de la base de datos en el futuro, o si pg_cron ejecuta el job
--    en una sesión con un timezone de sistema distinto (comportamiento no
--    garantizado entre providers/versiones). Es una capa de seguridad
--    adicional sobre el ALTER DATABASE que ya hicieron.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y correr.
-- Requisitos previos:
--   - migrations_email_notifications.sql ya ejecutado (profiles.email_notifications, profiles.email)
--   - Secrets 'resend_api_key' y 'resend_from_email' ya creados en Vault
--     (paso 2 de migrations_email_webhook_trigger.sql)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Columna de control de frecuencia en profiles (para Ajustes, futuro/actual).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS alert_frequency text NOT NULL DEFAULT 'diario'
    CHECK (alert_frequency IN ('diario', 'interdiario'));

-- 2. Limpieza de la versión anterior (días exactos) de este mismo sistema.
SELECT cron.unschedule('daily-deadline-semaforo-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-deadline-semaforo-alerts');

DROP FUNCTION IF EXISTS run_daily_deadline_semaforo_alerts();

-- La tabla de log de la versión anterior tenía una llave única incompatible
-- con "insistencia diaria" (assignment_id + alert_type, sin fecha). Se
-- recrea con la estructura nueva. Esto limpia el historial de pruebas
-- anteriores (aceptable en esta etapa de preparación, antes de producción).
DROP TABLE IF EXISTS assignment_alert_log;

CREATE TABLE assignment_alert_log (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  alert_type    text NOT NULL CHECK (alert_type IN ('rojo', 'amarillo', 'verde')),
  sent_date     date NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, alert_type, sent_date)
);

-- Extensiones necesarias (ya deberían existir si se corrió la migración anterior).
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Función principal: recorre trabajos pendientes de todos los estudiantes,
--    clasifica por RANGO (no día exacto), aplica insistencia diaria en rojo,
--    respeta alert_frequency en amarillo/verde, y evita reenvíos el mismo día.
CREATE OR REPLACE FUNCTION run_daily_deadline_range_alerts()
RETURNS void AS $$
DECLARE
  v_row record;
  v_api_key text;
  v_from_email text;
  v_today date;
  v_days_left integer;
  v_alert_type text;
  v_emoji text;
  v_color text;
  v_label text;
  v_should_send boolean;
BEGIN
  -- "Hoy" calculado explícitamente en zona horaria de Colombia, sin depender
  -- del timezone de sesión del job de pg_cron.
  v_today := (now() AT TIME ZONE 'America/Bogota')::date;

  SELECT decrypted_secret INTO v_api_key
    FROM vault.decrypted_secrets WHERE name = 'resend_api_key';
  SELECT decrypted_secret INTO v_from_email
    FROM vault.decrypted_secrets WHERE name = 'resend_from_email';

  FOR v_row IN
    SELECT
      a.id            AS assignment_id,
      a.title         AS title,
      a.deadline      AS deadline,
      (DATE(a.deadline) - v_today) AS days_left,
      p.full_name     AS full_name,
      p.email         AS email,
      p.alert_frequency AS alert_frequency
    FROM assignments a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.status <> 'entregado'
      AND a.deadline IS NOT NULL
      AND p.email_notifications IS TRUE
      AND p.email IS NOT NULL
      AND (DATE(a.deadline) - v_today) <= 15
  LOOP
    v_days_left := v_row.days_left;
    v_should_send := true;

    -- Clasificación por RANGO continuo (no día exacto).
    IF v_days_left <= 3 THEN
      -- Zona Roja: insiste TODOS los días, sin importar alert_frequency.
      v_alert_type := 'rojo';
      v_emoji := '🚨'; v_color := '#ff3b30';
      v_label := CASE WHEN v_days_left < 0 THEN 'Alerta Roja: ¡trabajo vencido y pendiente!'
                       ELSE 'Alerta Roja: ¡3 días o menos para la entrega!' END;
      -- v_should_send se mantiene en true: la urgencia ignora alert_frequency a propósito.

    ELSIF v_days_left BETWEEN 4 AND 7 THEN
      v_alert_type := 'amarillo';
      v_emoji := '⚠️'; v_color := '#ff9500';
      v_label := 'Alerta Amarilla: entrega dentro de la semana';
      -- 'interdiario' -> solo la mitad de los días de la zona (paridad de días restantes).
      IF v_row.alert_frequency = 'interdiario' AND (v_days_left % 2) <> 0 THEN
        v_should_send := false;
      END IF;

    ELSIF v_days_left BETWEEN 8 AND 15 THEN
      v_alert_type := 'verde';
      v_emoji := '✨'; v_color := '#34c759';
      v_label := 'Alerta Verde: entrega próxima (más de una semana)';
      IF v_row.alert_frequency = 'interdiario' AND (v_days_left % 2) <> 0 THEN
        v_should_send := false;
      END IF;

    ELSE
      CONTINUE; -- fuera de rango (> 15 días), no aplica ninguna alerta todavía
    END IF;

    IF NOT v_should_send THEN
      CONTINUE;
    END IF;

    -- Idempotencia: ya se envió esta alerta HOY para este trabajo -> no repetir.
    IF EXISTS (
      SELECT 1 FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id
         AND alert_type = v_alert_type
         AND sent_date = v_today
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
        'to', jsonb_build_array(v_row.email),
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

    INSERT INTO assignment_alert_log (assignment_id, alert_type, sent_date)
    VALUES (v_row.assignment_id, v_alert_type, v_today);

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Programación diaria con pg_cron.
--    pg_cron en Supabase agenda en UTC. America/Bogota es UTC-5 fijo (sin
--    horario de verano), así que 11:00 UTC = 06:00 hora Bogotá. La fecha
--    "de hoy" que usa la función NO depende de esta hora de ejecución del
--    cron (se calcula explícitamente con AT TIME ZONE dentro de la función),
--    esta hora solo decide A QUÉ HORA del día llega el correo.
SELECT cron.unschedule('daily-deadline-range-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-deadline-range-alerts');

SELECT cron.schedule(
  'daily-deadline-range-alerts',
  '0 11 * * *',
  $$ SELECT run_daily_deadline_range_alerts(); $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASOS MANUALES PENDIENTES (dashboard de Supabase, sin terminal):
-- 1. Ejecutar este script completo en el SQL Editor (reemplaza la versión
--    de "días exactos" y limpia el log anterior, ver comentarios arriba).
-- 2. Verificar que el nuevo job quedó programado:
--      SELECT * FROM cron.job WHERE jobname = 'daily-deadline-range-alerts';
-- 3. Prueba manual inmediata: crear un trabajo con deadline = hoy + 2 (Zona
--    Roja) y correr:
--      SELECT run_daily_deadline_range_alerts();
--    Repetir la misma llamada el mismo día -> NO debe reenviar (idempotencia).
--    Cambiar la fecha del sistema o esperar al día siguiente -> SÍ debe
--    reenviar mientras el trabajo siga pendiente (insistencia diaria).
-- 4. Revisar historial de envíos:
--      SELECT * FROM assignment_alert_log ORDER BY sent_at DESC;
-- 5. Verificar la nueva columna de frecuencia:
--      SELECT id, full_name, alert_frequency FROM profiles;
--    Por defecto todos quedan en 'diario'. Cuando se construya el control
--    en la UI de Ajustes, solo hace falta que actualice esta columna.
-- ═══════════════════════════════════════════════════════════════════════════
