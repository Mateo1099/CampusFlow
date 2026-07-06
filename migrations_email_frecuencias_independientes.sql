-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Frecuencias independientes por zona de alerta (v3)
-- ─────────────────────────────────────────────────────────────────────────
-- REEMPLAZA la columna única `profiles.alert_frequency` (creada en
-- migrations_email_semaforo_alertas.sql) por TRES columnas independientes,
-- una por cada zona del semáforo. Motivo: la versión anterior aplicaba la
-- misma preferencia a Amarilla y Verde, e ignoraba a propósito la Roja.
-- Ahora Mateo puede decidir, por separado, qué tan seguido insiste cada
-- color desde Ajustes.
--
-- CAMBIOS DE ARQUITECTURA (no solo de columnas):
--
-- 1. Se agregan profiles.red_alert_freq, yellow_alert_freq, green_alert_freq
--    con los valores: 'cada_hora' | 'diario' | 'interdiario' | 'personalizado'.
--    La Zona Roja YA NO ignora la preferencia de frecuencia (a diferencia de
--    la v2): ahora también respeta red_alert_freq. Este es un cambio de
--    comportamiento respecto a la versión anterior, pedido explícitamente
--    ("que lea de forma independiente estas tres frecuencias por separado
--    al evaluar cada tarea").
--
-- 2. 'cada_hora' requiere que el cron corra cada hora, no una vez al día.
--    Por eso el job se reprograma de '0 11 * * *' (diario, 6am Bogotá) a
--    '0 * * * *' (cada hora en punto). Esto NO significa que todos los
--    estudiantes reciban correos cada hora: solo quienes elijan 'cada_hora'
--    en una zona específica recibirán insistencia horaria para esa zona;
--    'diario'/'interdiario'/'personalizado' siguen limitados por la
--    deduplicación de abajo, sin importar que el cron corra más seguido.
--    TRADEOFF a tener en cuenta: la función ahora se ejecuta 24x más veces
--    al día. Con el volumen actual de trabajos esto es intrascendente para
--    Supabase/pg_cron, pero es una decisión de diseño que vale la pena que
--    Mateo confirme si en el futuro el volumen de estudiantes crece mucho.
--
-- 3. assignment_alert_log se recrea con una llave más granular:
--    (assignment_id, alert_type, sent_bucket). `sent_bucket` es la fecha
--    ('YYYY-MM-DD') para diario/interdiario/personalizado, o fecha+hora
--    ('YYYY-MM-DD"T"HH24') para cada_hora. Esto permite varios envíos por
--    día SOLO cuando la zona está en 'cada_hora', sin romper la
--    deduplicación de una vez al día para las demás frecuencias.
--
-- 4. 'interdiario' deja de calcularse con la paridad de "días restantes"
--    (v_days_left % 2, heurística de la v2) y pasa a calcularse con el
--    último envío real registrado en assignment_alert_log: si el último
--    envío fue hace 2 días o más (o nunca se envió), se reenvía hoy. Es más
--    robusto: no depende de que el estudiante haya visto el trabajo un día
--    exacto, y sobrevive a que el cron falle un día puntual.
--
-- 5. 'personalizado': el request no incluye un campo numérico de intervalo
--    (por ejemplo "cada N días/horas"). DECISIÓN DE DISEÑO NO PEDIDA
--    EXPLÍCITAMENTE: mientras no exista ese campo adicional, 'personalizado'
--    se comporta igual que 'diario' (una vez al día). Si Mateo quiere un
--    intervalo numérico real para 'personalizado', se puede agregar una
--    columna `*_custom_hours` por zona en una migración futura sin romper
--    nada de lo de aquí.
--
-- 6. FALLBACK DE EMAIL PARA PRUEBAS: la función ya no descarta silenciosamente
--    los trabajos de un perfil sin `profiles.email`. Si el email del
--    estudiante está vacío, se usa un email de respaldo guardado en Vault
--    (secret 'resend_test_fallback_email') SOLO para que las pruebas puedan
--    seguir viendo el correo llegar. Si tampoco existe ese secret, el
--    trabajo se sigue omitiendo (no hay a quién enviarle).
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y correr.
-- Requisito previo: migrations_email_semaforo_alertas.sql ya ejecutado.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Nuevas columnas de frecuencia independiente por zona.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS red_alert_freq text NOT NULL DEFAULT 'diario'
    CHECK (red_alert_freq IN ('cada_hora', 'diario', 'interdiario', 'personalizado')),
  ADD COLUMN IF NOT EXISTS yellow_alert_freq text NOT NULL DEFAULT 'diario'
    CHECK (yellow_alert_freq IN ('cada_hora', 'diario', 'interdiario', 'personalizado')),
  ADD COLUMN IF NOT EXISTS green_alert_freq text NOT NULL DEFAULT 'diario'
    CHECK (green_alert_freq IN ('cada_hora', 'diario', 'interdiario', 'personalizado'));

-- Backfill: si alguien ya tenía la columna vieja `alert_frequency` con
-- 'interdiario' configurado manualmente, se respeta esa preferencia para
-- Amarilla y Verde (la Roja en la v2 siempre era forzada a diario, así que
-- no hay nada que migrar para red_alert_freq).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'alert_frequency') THEN
    UPDATE profiles SET yellow_alert_freq = alert_frequency, green_alert_freq = alert_frequency
     WHERE alert_frequency = 'interdiario';
  END IF;
END $$;

-- 2. Columna vieja superada: se elimina para evitar dos fuentes de verdad
--    sobre la misma preferencia (limpieza aceptable en esta etapa, antes de
--    producción, igual que se hizo con assignment_alert_log en la v2).
ALTER TABLE profiles DROP COLUMN IF EXISTS alert_frequency;

-- 3. (Opcional) Secret de respaldo para pruebas cuando profiles.email está
--    vacío. Reemplaza el valor placeholder por un correo real UNA sola vez.
--    Si Mateo no quiere fallback de pruebas, puede omitir esta sección: la
--    función simplemente seguirá omitiendo perfiles sin email.
-- select vault.create_secret('correo_de_pruebas@dominio.com', 'resend_test_fallback_email');

-- 4. Recreación de la tabla de log con llave más granular (bucket).
--    Ver punto 3 y 4 del encabezado. Se limpia el historial de pruebas
--    anteriores (mismo criterio ya aplicado en la v2 de este sistema).
SELECT cron.unschedule('daily-deadline-range-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-deadline-range-alerts');

DROP TABLE IF EXISTS assignment_alert_log;

CREATE TABLE assignment_alert_log (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  alert_type    text NOT NULL CHECK (alert_type IN ('rojo', 'amarillo', 'verde')),
  sent_date     date NOT NULL,
  sent_bucket   text NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, alert_type, sent_bucket)
);

-- 5. Función principal (v3): clasifica por rango (igual que la v2, colores
--    sin cambios: #ff3b30 / #ff9500 / #34c759), pero ahora lee
--    red_alert_freq / yellow_alert_freq / green_alert_freq de forma
--    independiente para decidir si insiste hoy, y usa fallback de email.
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
  v_bucket text;
  v_should_send boolean;
  v_last_sent date;
  v_target_email text;
BEGIN
  -- "Hoy"/"ahora" calculados explícitamente en zona horaria de Colombia,
  -- sin depender del timezone de sesión del job de pg_cron.
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
      p.green_alert_freq  AS green_alert_freq
    FROM assignments a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.status <> 'entregado'
      AND a.deadline IS NOT NULL
      AND p.email_notifications IS TRUE
      AND (DATE(a.deadline) - v_today) <= 15
  LOOP
    v_days_left := v_row.days_left;

    -- Email real del estudiante, con fallback de pruebas si está vacío.
    v_target_email := COALESCE(v_row.email, v_fallback_email);
    IF v_target_email IS NULL THEN
      CONTINUE; -- ni email real ni fallback configurado: no hay a quién enviar
    END IF;

    -- Clasificación por RANGO continuo (idéntica a la v2; colores sin cambio).
    IF v_days_left <= 3 THEN
      v_alert_type := 'rojo';
      v_emoji := '🚨'; v_color := '#ff3b30';
      v_label := CASE WHEN v_days_left < 0 THEN 'Alerta Roja: ¡trabajo vencido y pendiente!'
                       ELSE 'Alerta Roja: ¡3 días o menos para la entrega!' END;
      v_freq := v_row.red_alert_freq;

    ELSIF v_days_left BETWEEN 4 AND 7 THEN
      v_alert_type := 'amarillo';
      v_emoji := '⚠️'; v_color := '#ff9500';
      v_label := 'Alerta Amarilla: entrega dentro de la semana';
      v_freq := v_row.yellow_alert_freq;

    ELSIF v_days_left BETWEEN 8 AND 15 THEN
      v_alert_type := 'verde';
      v_emoji := '✨'; v_color := '#34c759';
      v_label := 'Alerta Verde: entrega próxima (más de una semana)';
      v_freq := v_row.green_alert_freq;

    ELSE
      CONTINUE; -- fuera de rango (> 15 días), no aplica ninguna alerta todavía
    END IF;

    -- Cálculo de bucket + si corresponde enviar HOY, según la frecuencia
    -- elegida para esta zona en particular.
    v_should_send := true;

    IF v_freq = 'cada_hora' THEN
      -- Un bucket distinto por cada hora natural -> insiste cada hora.
      v_bucket := to_char(v_now, 'YYYY-MM-DD"T"HH24');

    ELSIF v_freq = 'interdiario' THEN
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
      SELECT MAX(sent_date) INTO v_last_sent
        FROM assignment_alert_log
       WHERE assignment_id = v_row.assignment_id AND alert_type = v_alert_type;
      v_should_send := (v_last_sent IS NULL OR (v_today - v_last_sent) >= 2);

    ELSE
      -- 'diario' y 'personalizado' (sin intervalo propio aún, ver punto 5
      -- del encabezado) se comportan igual: una vez por día natural.
      v_bucket := to_char(v_today, 'YYYY-MM-DD');
    END IF;

    IF NOT v_should_send THEN
      CONTINUE;
    END IF;

    -- Idempotencia: ya se envió esta alerta en este bucket -> no repetir.
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

-- 6. Reprogramación horaria con pg_cron (ver punto 2 del encabezado).
SELECT cron.unschedule('hourly-deadline-range-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-deadline-range-alerts');

SELECT cron.schedule(
  'hourly-deadline-range-alerts',
  '0 * * * *',
  $$ SELECT run_daily_deadline_range_alerts(); $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASOS MANUALES PENDIENTES (dashboard de Supabase, sin terminal):
-- 1. (Opcional) Descomentar y editar el bloque del paso 3 con un correo real
--    de pruebas ANTES de correr el resto del script, si quieres que la
--    función tenga fallback para perfiles sin `email`. Si Mateo ya confirmó
--    con el SELECT de 'Prueba 1' que el email SÍ llega bien desde
--    profiles.email, este paso se puede omitir sin problema.
-- 2. Ejecutar el resto del script completo en el SQL Editor.
-- 3. Verificar que el nuevo job quedó programado cada hora:
--      SELECT * FROM cron.job WHERE jobname = 'hourly-deadline-range-alerts';
-- 4. Verificar las nuevas columnas de frecuencia:
--      SELECT id, full_name, red_alert_freq, yellow_alert_freq, green_alert_freq FROM profiles;
--    Por defecto todos quedan en 'diario'. El control ya está conectado en
--    Ajustes → Perfil (dropdowns de Alerta Roja/Amarilla/Verde).
-- 5. Prueba manual inmediata (no hay que esperar al cron):
--      SELECT run_daily_deadline_range_alerts();
-- 6. Revisar historial de envíos (ahora con columna sent_bucket):
--      SELECT * FROM assignment_alert_log ORDER BY sent_at DESC;
-- ═══════════════════════════════════════════════════════════════════════════
