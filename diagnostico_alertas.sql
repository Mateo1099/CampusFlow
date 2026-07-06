-- ═══════════════════════════════════════════════════════════════════════════
-- Diagnóstico: por qué run_daily_deadline_range_alerts() no generó filas
-- ─────────────────────────────────────────────────────────────────────────
-- Corre estas 4 consultas UNA POR UNA en el SQL Editor y revisa el resultado
-- de cada una. Te van a decir exactamente cuál condición del WHERE está
-- descartando tu trabajo de prueba.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ¿Existe al menos un trabajo (assignment) con deadline futura y sin entregar?
SELECT id, title, status, deadline, user_id,
       (DATE(deadline) - (now() AT TIME ZONE 'America/Bogota')::date) AS dias_restantes
FROM assignments
ORDER BY deadline DESC
LIMIT 10;

-- 2. ¿El perfil dueño de ese trabajo tiene email_notifications = true y email lleno?
SELECT id, full_name, email, email_notifications,
       red_alert_freq, yellow_alert_freq, green_alert_freq
FROM profiles
LIMIT 10;

-- 3. Simula exactamente el WHERE de la función, para ver qué SÍ pasa el filtro.
SELECT
  a.id, a.title, a.status, a.deadline,
  (DATE(a.deadline) - (now() AT TIME ZONE 'America/Bogota')::date) AS dias_restantes,
  p.email, p.email_notifications
FROM assignments a
JOIN profiles p ON p.id = a.user_id
WHERE a.status <> 'entregado'
  AND a.deadline IS NOT NULL
  AND p.email_notifications IS TRUE
  AND (DATE(a.deadline) - (now() AT TIME ZONE 'America/Bogota')::date) <= 15;

-- 4. Si la consulta 3 no devuelve nada, compara con esta (SIN el filtro de
--    email_notifications) para aislar si el problema es ESE campo específico.
SELECT
  a.id, a.title, a.status, a.deadline,
  (DATE(a.deadline) - (now() AT TIME ZONE 'America/Bogota')::date) AS dias_restantes,
  p.email, p.email_notifications
FROM assignments a
JOIN profiles p ON p.id = a.user_id
WHERE a.status <> 'entregado'
  AND a.deadline IS NOT NULL
  AND (DATE(a.deadline) - (now() AT TIME ZONE 'America/Bogota')::date) <= 15;
