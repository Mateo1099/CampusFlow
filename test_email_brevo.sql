-- Función RPC para enviar correos de prueba usando Brevo y pg_net
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run

CREATE OR REPLACE FUNCTION test_email_brevo(
  p_email text,
  p_name text,
  p_subject text,
  p_message text
) RETURNS json AS $$
DECLARE
  v_brevo_api_key text;
  v_payload json;
  v_request_id bigint;
  v_response record;
BEGIN
  -- Obtener API Key
  SELECT secret_value INTO v_brevo_api_key
    FROM app_secrets WHERE name = 'brevo_api_key';

  IF v_brevo_api_key IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'API Key de Brevo no configurada en app_secrets');
  END IF;

  -- Construir payload JSON para Brevo
  v_payload := json_build_object(
    'sender', json_build_object(
      'name', 'CampusFlow',
      'email', 'trujillomateo01@gmail.com'
    ),
    'to', json_build_array(
      json_build_object(
        'email', p_email,
        'name', COALESCE(p_name, 'Estudiante')
      )
    ),
    'subject', COALESCE(p_subject, 'Prueba de Integración CampusFlow'),
    'htmlContent', '<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background-color:#0a0a0f;font-family:Arial,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;"><tr><td align="center"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(155deg, rgba(15,17,26,0.96) 0%, rgba(20,24,38,0.92) 100%);border:1px solid rgba(0, 243, 255, 0.4);border-radius:20px;overflow:hidden;"><tr><td style="padding:32px 32px 20px 32px;border-bottom:1px solid rgba(0, 243, 255, 0.3);"><p style="margin:0;font-size:11px;letter-spacing:3px;color:#00f3ff;text-transform:uppercase;font-weight:700;">CampusFlow · Test</p><h1 style="margin:8px 0 0 0;font-size:20px;color:#f5f5f7;font-weight:800;">🚀 ¡Conexión Exitosa (SQL)!</h1></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 16px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">Hola <strong style="color:#f5f5f7;">' || COALESCE(p_name, 'Estudiante') || '</strong>,</p><p style="margin:0 0 16px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">' || COALESCE(p_message, 'Prueba desde RPC de PostgreSQL.') || '</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0, 243, 255, 0.05);border:1px solid rgba(0, 243, 255, 0.3);border-radius:14px;margin:16px 0;"><tr><td style="padding:18px 20px;"><p style="margin:0;font-size:12px;color:#00f3ff;letter-spacing:0.05em;text-transform:uppercase;font-weight:700;text-align:center;">El flujo PostgreSQL + Brevo funciona correctamente.</p></td></tr></table></td></tr><tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="margin:0;font-size:11px;color:#52525b;">Generado desde Supabase RPC (pg_net).</p></td></tr></table></td></tr></table></body></html>'
  );

  -- Realizar la petición HTTP POST
  SELECT net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object(
          'api-key', v_brevo_api_key,
          'Content-Type', 'application/json',
          'Accept', 'application/json'
      ),
      body := v_payload::jsonb
  ) INTO v_request_id;

  -- pg_net es asíncrono, por lo que retornamos success indicando que se encoló la petición
  RETURN json_build_object(
    'success', true,
    'message', 'Petición de correo enviada a la cola de pg_net',
    'request_id', v_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
