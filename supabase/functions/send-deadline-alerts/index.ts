import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingTask {
  id?: string;
  title: string;
  deadline?: string;
  days_left?: number;
  alert_type?: 'rojo' | 'amarillo' | 'verde' | string;
  course?: string;
  description?: string;
}

interface DeadlineAlertPayload {
  user_email: string;
  student_name?: string;
  pending_tasks: PendingTask[];
  subject?: string;
  action_url?: string;
}

interface AlertConfig {
  name: string;
  badge: string;
  color: string;
  accentGlow: string;
  bgTint: string;
  borderColor: string;
  emoji: string;
  headline: string;
}

const ALERT_CONFIGS: Record<string, AlertConfig> = {
  rojo: {
    name: 'Alerta Roja (Crítica)',
    badge: '🚨 CRÍTICA · MENOS DE 24 HORAS',
    color: '#ff3b30',
    accentGlow: 'rgba(255, 59, 48, 0.35)',
    bgTint: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    emoji: '🚨',
    headline: 'Atención Inmediata Requerida',
  },
  amarillo: {
    name: 'Alerta Amarilla (Moderada)',
    badge: '⚠️ MODERADA · 48 A 72 HORAS',
    color: '#ff9500',
    accentGlow: 'rgba(255, 149, 0, 0.35)',
    bgTint: 'rgba(255, 149, 0, 0.08)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
    emoji: '⚠️',
    headline: 'Próximas Entregas de la Semana',
  },
  verde: {
    name: 'Alerta Verde (Estable)',
    badge: '✨ ESTABLE · PLANIFICACIÓN REGULAR',
    color: '#34c759',
    accentGlow: 'rgba(52, 199, 89, 0.35)',
    bgTint: 'rgba(52, 199, 89, 0.08)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
    emoji: '✨',
    headline: 'Planificación Académica al Día',
  },
};

function normalizeAlertType(task: PendingTask): 'rojo' | 'amarillo' | 'verde' {
  if (task.alert_type) {
    const raw = task.alert_type.toLowerCase();
    if (raw.includes('roj') || raw.includes('crit')) return 'rojo';
    if (raw.includes('amarill') || raw.includes('mod')) return 'amarillo';
    if (raw.includes('verd') || raw.includes('estab')) return 'verde';
  }

  if (typeof task.days_left === 'number') {
    if (task.days_left <= 1) return 'rojo';
    if (task.days_left <= 3) return 'amarillo';
    return 'verde';
  }

  return 'verde';
}

function formatDeadlineDate(dateStr?: string): string {
  if (!dateStr) return 'Fecha por confirmar';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(date);
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(task: PendingTask): string {
  const days = task.days_left;
  if (typeof days !== 'number') {
    return 'Entrega programada';
  }
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `¡Vencido hace ${overdueDays} día${overdueDays > 1 ? 's' : ''}!`;
  }
  if (days === 0) {
    return 'Vence HOY (menos de 24 horas)';
  }
  if (days === 1) {
    return 'Vence mañana (< 24 horas restantes)';
  }
  if (days === 2) {
    return 'Faltan 2 días (≈48 horas)';
  }
  if (days === 3) {
    return 'Faltan 3 días (≈72 horas)';
  }
  return `Faltan ${days} días`;
}

function buildHtmlTemplate({
  studentName,
  pendingTasks,
  overallAlert,
  actionUrl,
}: {
  studentName: string;
  pendingTasks: PendingTask[];
  overallAlert: AlertConfig;
  actionUrl: string;
}): string {
  const taskCount = pendingTasks.length;
  const isSingle = taskCount === 1;

  // Generar tarjetas de tareas en HTML bulletproof compatible con clientes de correo
  const tasksHtml = pendingTasks
    .map((task) => {
      const taskType = normalizeAlertType(task);
      const config = ALERT_CONFIGS[taskType];
      const relativeTime = formatRelativeTime(task);
      const deadlineDate = formatDeadlineDate(task.deadline);
      const courseLabel = task.course ? task.course.toUpperCase() : 'ASIGNATURA';

      return `
        <!-- Task Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;background:${config.bgTint};border:1px solid ${config.borderColor};border-left:4px solid ${config.color};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:6px;">
                    <span style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${config.color};text-transform:uppercase;">
                      ${courseLabel}
                    </span>
                  </td>
                  <td align="right" style="padding-bottom:6px;">
                    <span style="display:inline-block;padding:3px 8px;font-size:10px;font-weight:700;letter-spacing:0.5px;color:${config.color};background:${config.color}20;border:1px solid ${config.color}40;border-radius:6px;text-transform:uppercase;">
                      ${relativeTime}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-bottom:8px;">
                    <h3 style="margin:0;font-size:16px;font-weight:700;color:#f5f5f7;line-height:1.4;">
                      ${task.title || 'Trabajo pendiente'}
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                      📅 <strong style="color:#e4e4e7;">Fecha Límite:</strong> ${deadlineDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>CampusFlow · Alerta de Entregas</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #0a0a0f;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- PREHEADER TRICK -->
  <div style="display:none;font-size:1px;color:#0a0a0f;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${overallAlert.badge} · ${isSingle ? pendingTasks[0].title : `${taskCount} entregas pendientes`} en CampusFlow.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0f;padding:36px 12px;">
    <tr>
      <td align="center">
        <!-- CONTENEDOR PRINCIPAL CYBER LUXE -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:560px;width:100%;background:linear-gradient(160deg, #10121d 0%, #151928 100%);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.6);">
          
          <!-- BRAND TOP BAR -->
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid rgba(255,255,255,0.06);" class="mobile-padding">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-family:'Space Grotesk','Inter',sans-serif;font-size:13px;letter-spacing:4px;color:#00f3ff;text-transform:uppercase;font-weight:800;display:inline-block;">
                      CAMPUS<span style="color:#bc13fe;">FLOW</span>
                    </span>
                    <span style="display:block;font-size:10px;letter-spacing:1px;color:#71717a;text-transform:uppercase;margin-top:2px;">
                      Academic Flow · Deadline Alert System
                    </span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:0.8px;color:${overallAlert.color};background:${overallAlert.bgTint};border:1px solid ${overallAlert.borderColor};border-radius:20px;">
                      ${overallAlert.emoji} ${overallAlert.badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HEADER / BANNER DE URGENCIA -->
          <tr>
            <td style="padding:32px 36px 16px 36px;" class="mobile-padding">
              <h1 style="margin:0 0 10px 0;font-size:22px;font-weight:800;color:#f5f5f7;line-height:1.3;letter-spacing:-0.5px;">
                ${overallAlert.headline}
              </h1>
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">
                Hola <strong style="color:#f5f5f7;">${studentName}</strong>, el sistema de semáforo ha sincronizado tu estado académico. 
                Tienes <strong style="color:${overallAlert.color};">${taskCount} trabajo${taskCount > 1 ? 's' : ''} pendiente${taskCount > 1 ? 's' : ''}</strong> que requiere${taskCount > 1 ? 'n' : ''} tu atención:
              </p>
            </td>
          </tr>

          <!-- LISTA DE TAREAS PENDIENTES -->
          <tr>
            <td style="padding:12px 36px 24px 36px;" class="mobile-padding">
              ${tasksHtml}
            </td>
          </tr>

          <!-- BOTÓN DE ACCIÓN PRINCIPAL (CTA) -->
          <tr>
            <td align="center" style="padding:12px 36px 36px 36px;" class="mobile-padding">
              <!-- Bulletproof Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(135deg, #00f3ff 0%, #0099ff 100%);box-shadow:0 10px 25px rgba(0,243,255,0.25);">
                    <a href="${actionUrl}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:'Inter',sans-serif;font-size:14px;font-weight:800;color:#050510;text-decoration:none;letter-spacing:0.8px;text-transform:uppercase;border-radius:12px;">
                      ⚡ Abrir CampusFlow
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:12px;color:#71717a;">
                Visualiza tus avances, cronogramas y gestiona entregas desde tu dashboard.
              </p>
            </td>
          </tr>

          <!-- FOOTER MINIMALISTA TECH -->
          <tr>
            <td style="padding:24px 36px;background:rgba(0,0,0,0.35);border-top:1px solid rgba(255,255,255,0.06);text-align:center;" class="mobile-padding">
              <p style="margin:0 0 8px 0;font-size:11px;color:#71717a;line-height:1.5;">
                Recibes este correo porque tienes activadas las notificaciones en tu perfil de estudiante.
              </p>
              <p style="margin:0;font-size:11px;color:#52525b;line-height:1.5;">
                Puedes pausarlas o ajustar su frecuencia en 
                <a href="${actionUrl}/profile" target="_blank" style="color:#00f3ff;text-decoration:none;font-weight:600;">
                  Ajustes → Notificaciones
                </a>.
              </p>
              <p style="margin:14px 0 0 0;font-size:10px;color:#3f3f46;letter-spacing:1px;text-transform:uppercase;">
                CampusFlow · Cloud & Productivity Engine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req: Request) => {
  // Manejo de CORS (preflight options)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: Partial<DeadlineAlertPayload> = await req.json().catch(() => ({}));

    // Soporte flexible para payload: si viene un solo trabajo plano o array en pending_tasks
    let tasks: PendingTask[] = [];
    if (Array.isArray(body.pending_tasks)) {
      tasks = body.pending_tasks;
    } else if (body && ('title' in body || 'deadline' in body)) {
      const singleTask = body as unknown as PendingTask;
      tasks = [singleTask];
    }

    const userEmail = body.user_email || (body as Record<string, string>)?.email;
    if (!userEmail || typeof userEmail !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El campo "user_email" es requerido y debe ser un correo válido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Se requiere al menos un elemento en "pending_tasks".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const studentName = body.student_name || 'Estudiante';
    const actionUrl = body.action_url || Deno.env.get('APP_URL') || 'https://campusflow.app';

    // Determinar la severidad global (el color del correo toma la urgencia más alta)
    const taskUrgencyRank = { rojo: 3, amarillo: 2, verde: 1 };
    let highestSeverity: 'rojo' | 'amarillo' | 'verde' = 'verde';

    for (const t of tasks) {
      const type = normalizeAlertType(t);
      if (taskUrgencyRank[type] > taskUrgencyRank[highestSeverity]) {
        highestSeverity = type;
      }
    }

    const overallAlert = ALERT_CONFIGS[highestSeverity];

    // Construir asunto dinámico
    let subject = body.subject;
    if (!subject) {
      if (tasks.length === 1) {
        const firstTask = tasks[0];
        if (highestSeverity === 'rojo') {
          subject = `${overallAlert.emoji} Alerta Crítica CampusFlow: "${firstTask.title || 'Entrega'}" vence en menos de 24h`;
        } else if (highestSeverity === 'amarillo') {
          subject = `${overallAlert.emoji} Alerta Moderada CampusFlow: "${firstTask.title || 'Entrega'}" vence esta semana`;
        } else {
          subject = `${overallAlert.emoji} Planificación CampusFlow: "${firstTask.title || 'Entrega'}" en tu calendario`;
        }
      } else {
        if (highestSeverity === 'rojo') {
          subject = `${overallAlert.emoji} Alerta Crítica CampusFlow: Tienes ${tasks.length} entregas urgentes`;
        } else if (highestSeverity === 'amarillo') {
          subject = `${overallAlert.emoji} Alerta Moderada CampusFlow: Tienes ${tasks.length} entregas esta semana`;
        } else {
          subject = `${overallAlert.emoji} Planificación CampusFlow: ${tasks.length} entregas programadas`;
        }
      }
    }

    // Renderizar HTML Cyber Luxe
    const htmlContent = buildHtmlTemplate({
      studentName,
      pendingTasks: tasks,
      overallAlert,
      actionUrl,
    });

    // Validar clave de Resend en variables de entorno de la Edge Function
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-deadline-alerts] RESEND_API_KEY no está configurada');
      return new Response(
        JSON.stringify({
          error: 'Variable de entorno RESEND_API_KEY no configurada en Supabase Edge Functions.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') || 'CampusFlow <notificaciones@campusflow.app>';

    // Envío seguro a través de la API REST oficial de Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [userEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('[send-deadline-alerts] Error de Resend API:', resendData);
      return new Response(
        JSON.stringify({
          error: 'Error al enviar correo mediante Resend API',
          status: resendResponse.status,
          details: resendData,
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
        recipient: userEmail,
        taskCount: tasks.length,
        severity: highestSeverity,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[send-deadline-alerts] Error interno:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
