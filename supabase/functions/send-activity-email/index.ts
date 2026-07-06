// ═══════════════════════════════════════════════════════════════════════════
// CampusFlow — Edge Function: send-activity-email
// ─────────────────────────────────────────────────────────────────────────
// Runtime: Deno (Supabase Edge Functions)
// Proveedor de envío: Resend (plan gratuito) vía fetch a su API REST
//
// PROPÓSITO
// Esta función se invoca mediante un Database Webhook de Supabase configurado
// en la tabla `assignments` (evento INSERT) — es decir, cada vez que se crea
// un nuevo Trabajo. También puede reutilizarse para "Alertas" del Planificador
// si se registra un segundo webhook sobre `planner_blocks` o una tabla de
// alertas futura, ya que el body que recibe sigue el mismo formato estándar
// de Supabase Database Webhooks: { type, table, record, schema, old_record }.
//
// FLUJO
// 1. Supabase dispara el webhook con el registro recién insertado (`record`).
// 2. Esta función busca el perfil del usuario (`profiles`) dueño del registro.
// 3. Verifica `email_notifications === true` en ese perfil. Si es false,
//    no se envía nada (silencioso, sin error) — respeta la preferencia real
//    guardada desde src/pages/Profile.jsx / SettingsContext.jsx.
// 4. Si está habilitado, construye un email HTML con la estética cyber-luxe
//    de CampusFlow y lo envía a través de la API de Resend.
//
// CONFIGURACIÓN PENDIENTE (a cargo de Mateo en la consola de Supabase):
// - Variable de entorno RESEND_API_KEY (Project Settings → Edge Functions → Secrets)
// - Variable de entorno RESEND_FROM_EMAIL (remitente verificado en Resend, ej.
//   "CampusFlow <notificaciones@tudominio.com>")
// - Database Webhook: Table `assignments` → Event `INSERT` → llamar a esta función
//   (Database → Webhooks → Create a new hook, en el dashboard de Supabase)
// - SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles automáticamente
//   como variables de entorno inyectadas por el runtime de Edge Functions.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';

// ─── Tipos del payload que envía un Database Webhook de Supabase ───────────
interface DatabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    title?: string;
    user_id: string;
    course_id?: string | null;
    deadline?: string | null;
    status?: string;
    [key: string]: unknown;
  };
  old_record: Record<string, unknown> | null;
}

// ─── Clientes / configuración ──────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'CampusFlow <notificaciones@campusflow.app>';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Plantilla de email con la estética cyber-luxe de CampusFlow ──────────
function buildActivityEmailHtml(params: {
  userName: string;
  taskTitle: string;
  deadline: string | null;
}): string {
  const { userName, taskTitle, deadline } = params;
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sin fecha límite definida';

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#0a0a0f; font-family:'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f; padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="
            background: linear-gradient(155deg, rgba(15,17,26,0.96) 0%, rgba(20,24,38,0.92) 100%);
            border: 1px solid rgba(0,243,255,0.18);
            border-radius: 20px;
            overflow: hidden;
          ">
            <!-- Header con acento neón -->
            <tr>
              <td style="padding:32px 32px 20px 32px; border-bottom:1px solid rgba(0,243,255,0.12);">
                <p style="margin:0; font-size:11px; letter-spacing:3px; color:#00f3ff; text-transform:uppercase; font-weight:700;">
                  CampusFlow
                </p>
                <h1 style="margin:8px 0 0 0; font-size:20px; color:#f5f5f7; font-weight:800; letter-spacing:-0.02em;">
                  Nuevo trabajo registrado
                </h1>
              </td>
            </tr>

            <!-- Cuerpo -->
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 16px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                  Hola <strong style="color:#f5f5f7;">${escapeHtml(userName)}</strong>, se registró un nuevo trabajo en tu cuenta de CampusFlow:
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
                  background: rgba(0,243,255,0.06);
                  border: 1px solid rgba(0,243,255,0.18);
                  border-radius: 14px;
                  margin: 16px 0;
                ">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px 0; font-size:16px; font-weight:800; color:#f5f5f7;">
                        ${escapeHtml(taskTitle)}
                      </p>
                      <p style="margin:0; font-size:12px; color:#00f3ff; letter-spacing:0.05em; text-transform:uppercase; font-weight:700;">
                        Fecha límite: ${formattedDeadline}
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:20px 0 0 0; font-size:13px; color:#52525b; line-height:1.6;">
                  Puedes revisar el detalle y planificar tu tiempo de estudio directamente desde el Planificador Semanal.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
                <p style="margin:0; font-size:11px; color:#52525b;">
                  Recibiste este correo porque tienes activadas las notificaciones por email en CampusFlow.
                  Puedes desactivarlas en Ajustes → Notificaciones.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Handler principal ──────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Solo aceptamos POST (así llegan los Database Webhooks de Supabase)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload: DatabaseWebhookPayload = await req.json();

    // Solo procesamos inserciones nuevas de trabajos (assignments)
    if (payload.type !== 'INSERT' || !payload.record?.user_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Evento no relevante' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { user_id, title, deadline } = payload.record;

    // 1. Buscar el perfil del dueño del registro para verificar su preferencia real
    //    y obtener su nombre + email de contacto.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email_notifications, email')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[send-activity-email] Error consultando profiles:', profileError.message);
      return new Response(JSON.stringify({ error: 'No se pudo verificar el perfil del usuario' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Respetar la preferencia real del usuario (profiles.email_notifications).
    //    Si no existe perfil o la preferencia está desactivada, no se envía nada.
    if (!profile || profile.email_notifications !== true) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Usuario sin notificaciones por email activadas' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Obtener el email real del usuario. `profiles` normalmente no almacena
    //    el email (vive en auth.users) — se resuelve vía Admin API si no está
    //    replicado en la tabla profiles.
    let recipientEmail = profile.email as string | undefined;
    if (!recipientEmail) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (authError || !authUser?.user?.email) {
        console.error('[send-activity-email] No se pudo resolver el email del usuario:', authError?.message);
        return new Response(JSON.stringify({ error: 'No se encontró email del destinatario' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      recipientEmail = authUser.user.email;
    }

    // 4. Construir el HTML con la estética CampusFlow y enviarlo vía Resend.
    const html = buildActivityEmailHtml({
      userName: profile.full_name || 'Estudiante',
      taskTitle: title || 'Nuevo trabajo',
      deadline: deadline || null
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [recipientEmail],
        subject: `📚 Nuevo trabajo: ${title || 'Sin título'}`,
        html
      })
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error('[send-activity-email] Error de Resend:', resendResponse.status, errorBody);
      return new Response(JSON.stringify({ error: 'Fallo el envío con Resend', details: errorBody }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const resendData = await resendResponse.json();
    return new Response(JSON.stringify({ success: true, resendId: resendData?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[send-activity-email] Error inesperado:', err);
    return new Response(JSON.stringify({ error: 'Error interno procesando el webhook' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
