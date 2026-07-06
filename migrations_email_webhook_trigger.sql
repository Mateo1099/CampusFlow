-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Trigger de notificación por email (alternativa a Edge Function)
-- ─────────────────────────────────────────────────────────────────────────
-- CONTEXTO: la Edge Function `send-activity-email` no pudo desplegarse por
-- limitaciones de la CLI en el entorno de desarrollo. Esta migración logra el
-- mismo resultado usando un trigger de PostgreSQL + la extensión `pg_net`
-- (disponible en el plan gratuito de Supabase), que SÍ puede ejecutar lógica
-- condicional antes de llamar a Resend — a diferencia de un Database Webhook
-- "directo" configurado desde el dashboard, que no puede filtrar por
-- profiles.email_notifications.
--
-- IMPORTANTE — corrige 2 problemas del webhook configurado manualmente:
-- 1. Este trigger se dispara sobre la tabla REAL de trabajos: `assignments`
--    (CampusFlow no tiene tabla `tasks` — ver ESTÁNDARES_CAMPUSFLOW.md).
-- 2. Este trigger SÍ respeta profiles.email_notifications antes de enviar,
--    a diferencia de un webhook directo que envía siempre sin condición.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Habilitar pg_net (una sola vez por proyecto; es gratuito y ya viene
--    disponible en Supabase, solo hay que activarlo).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Guardar las credenciales de Resend de forma segura con Supabase Vault,
--    en lugar de escribir la API key en texto plano dentro de la función SQL.
--    (Reemplaza los valores placeholder por los reales UNA sola vez).
--    Si Mateo ya guardó RESEND_API_KEY como secret de Edge Functions, este
--    paso es independiente: Vault es el almacén seguro para uso desde SQL.
select vault.create_secret('re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'resend_api_key');
select vault.create_secret('CampusFlow <notificaciones@campusflow.app>', 'resend_from_email');

-- 3. Función que se ejecuta en cada INSERT sobre `assignments`.
--    Consulta el perfil del dueño del trabajo, verifica su preferencia real
--    de notificaciones, y solo si está activada, llama a Resend vía pg_net.
CREATE OR REPLACE FUNCTION notify_new_assignment_by_email()
RETURNS trigger AS $$
DECLARE
  v_full_name text;
  v_email text;
  v_wants_email boolean;
  v_api_key text;
  v_from_email text;
  v_deadline_text text;
BEGIN
  -- Buscar preferencia, nombre y email del dueño del trabajo recién creado
  SELECT p.full_name, p.email, p.email_notifications
    INTO v_full_name, v_email, v_wants_email
    FROM profiles p
   WHERE p.id = NEW.user_id;

  -- Si el usuario no tiene la preferencia activada, no hacemos nada más.
  IF v_wants_email IS NOT TRUE OR v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Leer credenciales seguras desde Vault
  SELECT decrypted_secret INTO v_api_key
    FROM vault.decrypted_secrets WHERE name = 'resend_api_key';
  SELECT decrypted_secret INTO v_from_email
    FROM vault.decrypted_secrets WHERE name = 'resend_from_email';

  v_deadline_text := COALESCE(to_char(NEW.deadline, 'DD "de" TMMonth "de" YYYY'), 'Sin fecha límite definida');

  -- Llamada asíncrona (no bloqueante) a la API de Resend
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from_email,
      'to', jsonb_build_array(v_email),
      'subject', '📚 Nuevo trabajo: ' || COALESCE(NEW.title, 'Sin título'),
      'html',
        '<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background-color:#0a0a0f;font-family:Arial,sans-serif;">' ||
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;"><tr><td align="center">' ||
        '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(155deg, rgba(15,17,26,0.96) 0%, rgba(20,24,38,0.92) 100%);border:1px solid rgba(0,243,255,0.18);border-radius:20px;overflow:hidden;">' ||
        '<tr><td style="padding:32px 32px 20px 32px;border-bottom:1px solid rgba(0,243,255,0.12);">' ||
        '<p style="margin:0;font-size:11px;letter-spacing:3px;color:#00f3ff;text-transform:uppercase;font-weight:700;">CampusFlow</p>' ||
        '<h1 style="margin:8px 0 0 0;font-size:20px;color:#f5f5f7;font-weight:800;">Nuevo trabajo registrado</h1></td></tr>' ||
        '<tr><td style="padding:28px 32px;">' ||
        '<p style="margin:0 0 16px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">Hola <strong style="color:#f5f5f7;">' || COALESCE(v_full_name, 'Estudiante') || '</strong>, se registró un nuevo trabajo en tu cuenta:</p>' ||
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,243,255,0.06);border:1px solid rgba(0,243,255,0.18);border-radius:14px;margin:16px 0;"><tr><td style="padding:18px 20px;">' ||
        '<p style="margin:0 0 6px 0;font-size:16px;font-weight:800;color:#f5f5f7;">' || COALESCE(NEW.title, 'Nuevo trabajo') || '</p>' ||
        '<p style="margin:0;font-size:12px;color:#00f3ff;letter-spacing:0.05em;text-transform:uppercase;font-weight:700;">Fecha límite: ' || v_deadline_text || '</p>' ||
        '</td></tr></table></td></tr>' ||
        '<tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">' ||
        '<p style="margin:0;font-size:11px;color:#52525b;">Puedes desactivar estas notificaciones en Ajustes → Notificaciones.</p>' ||
        '</td></tr></table></td></tr></table></body></html>'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger que conecta la función a la tabla real `assignments`.
DROP TRIGGER IF EXISTS trg_notify_new_assignment_email ON assignments;
CREATE TRIGGER trg_notify_new_assignment_email
  AFTER INSERT ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_assignment_by_email();

-- ═══════════════════════════════════════════════════════════════════════════
-- PASOS MANUALES PENDIENTES (dashboard de Supabase, sin terminal):
-- 1. Ejecutar primero migrations_email_notifications.sql si aún no se corrió
--    (crea profiles.email_notifications y profiles.email).
-- 2. Reemplazar los valores placeholder del paso 2 de este script con la
--    RESEND_API_KEY real y el remitente verificado, y ejecutar ese bloque
--    UNA sola vez (no lo repitan o duplicará el secret en Vault).
-- 3. Ejecutar el resto del script completo en el SQL Editor.
-- 4. IMPORTANTE: eliminar el Database Webhook manual creado sobre la tabla
--    'tasks' en Database → Webhooks — no funciona (tabla incorrecta) y su
--    presencia puede confundir a futuro. Este trigger SQL lo reemplaza.
-- 5. Probar: crear un Trabajo nuevo desde la UI con el toggle de email
--    activado en Ajustes, y confirmar que llega el correo.
-- ═══════════════════════════════════════════════════════════════════════════
