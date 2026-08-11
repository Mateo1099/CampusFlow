import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS (preflight options)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, subject, message } = await req.json()

    if (!email) {
      throw new Error('Email destination is required')
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY environment variable is not configured')
    }

    const payload = {
      sender: {
        name: "CampusFlow",
        email: "trujillomateo01@gmail.com"
      },
      to: [
        {
          email: email,
          name: name || "Estudiante"
        }
      ],
      subject: subject || "Prueba de Integración CampusFlow",
      htmlContent: `
        <!DOCTYPE html>
        <html lang="es">
        <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(155deg, rgba(15,17,26,0.96) 0%, rgba(20,24,38,0.92) 100%);border:1px solid rgba(0, 243, 255, 0.4);border-radius:20px;overflow:hidden;">
                  <tr>
                    <td style="padding:32px 32px 20px 32px;border-bottom:1px solid rgba(0, 243, 255, 0.3);">
                      <p style="margin:0;font-size:11px;letter-spacing:3px;color:#00f3ff;text-transform:uppercase;font-weight:700;">CampusFlow · Test</p>
                      <h1 style="margin:8px 0 0 0;font-size:20px;color:#f5f5f7;font-weight:800;">🚀 ¡Conexión Exitosa!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;">
                      <p style="margin:0 0 16px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">Hola <strong style="color:#f5f5f7;">${name || 'Estudiante'}</strong>,</p>
                      <p style="margin:0 0 16px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">${message || 'Esta es una prueba de integración del sistema de correos transaccionales de CampusFlow.'}</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0, 243, 255, 0.05);border:1px solid rgba(0, 243, 255, 0.3);border-radius:14px;margin:16px 0;">
                        <tr>
                          <td style="padding:18px 20px;">
                            <p style="margin:0;font-size:12px;color:#00f3ff;letter-spacing:0.05em;text-transform:uppercase;font-weight:700;text-align:center;">El flujo Deno + Brevo funciona correctamente.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                      <p style="margin:0;font-size:11px;color:#52525b;">Generado desde Supabase Edge Functions.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error de Brevo: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Email error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
