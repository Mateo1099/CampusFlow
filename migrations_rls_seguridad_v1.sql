-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — FASE 1 DE SEGURIDAD: Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────
-- PROBLEMA QUE RESUELVE:
--   La clave `sb_publishable_...` de Supabase es PÚBLICA por diseño (viaja en
--   el bundle JavaScript que cualquiera puede leer desde el navegador). Lo
--   único que impide que un usuario lea los datos de otro es RLS.
--   Hoy solo `planners` y `planner_blocks` tienen RLS. Todo lo demás está
--   abierto, incluida `app_secrets`, que guarda la API key de Brevo en texto
--   plano y por tanto es legible por cualquier visitante de la app.
--
-- QUÉ HACE ESTE SCRIPT:
--   1. Cierra por completo el acceso del cliente a las tablas de sistema.
--   2. Restringe cada tabla de usuario a su propio dueño.
--   3. Deja la función de alertas con privilegios para seguir operando.
--
-- COLUMNAS DE PROPIETARIO (verificadas contra el código fuente):
--   assignments, courses, habits, habit_logs, user_security -> user_id
--   profiles                                                -> id
--
-- SEGURO DE EJECUTAR:
--   · Es idempotente: se puede correr varias veces sin efectos secundarios.
--   · Si una tabla no existe, la omite con un aviso en vez de abortar.
--   · Cada bloque es atómico e independiente, de modo que el blindaje de
--     `app_secrets` (lo más urgente) se aplica aunque algo más falle.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> pegar y correr.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1 — TABLAS DE SISTEMA: denegar TODO acceso desde el cliente
-- ═══════════════════════════════════════════════════════════════════════════
-- Al habilitar RLS SIN crear políticas, PostgreSQL deniega por defecto toda
-- operación de los roles `anon` y `authenticated`. La función interna de
-- alertas sigue accediendo porque corre con SECURITY DEFINER (Parte 3).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_secrets', 'assignment_alert_log']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      RAISE NOTICE 'OMITIDA (no existe): %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'BLINDADA (acceso de cliente denegado): %', t;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2 — TABLAS DE USUARIO: cada quien ve y modifica solo lo suyo
-- ═══════════════════════════════════════════════════════════════════════════
-- Se generan 4 políticas por tabla (SELECT / INSERT / UPDATE / DELETE).
-- Excepción: `profiles` no recibe política DELETE a propósito — el perfil se
-- borra en cascada al eliminar la cuenta en auth.users, nunca desde la app.

DO $$
DECLARE
  r          record;
  v_policy   text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('profiles',      'id'),
      ('user_security', 'user_id'),
      ('assignments',   'user_id'),
      ('courses',       'user_id'),
      ('habits',        'user_id'),
      ('habit_logs',    'user_id')
    ) AS x(tbl, owner_col)
  LOOP
    -- 2.a La tabla debe existir
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = r.tbl
    ) THEN
      RAISE NOTICE 'OMITIDA (no existe la tabla): %', r.tbl;
      CONTINUE;
    END IF;

    -- 2.b La columna de dueño debe existir. Si no, abortamos: aplicar RLS con
    --     una columna equivocada dejaría la tabla inaccesible para la app.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = r.tbl
        AND column_name  = r.owner_col
    ) THEN
      RAISE EXCEPTION
        'ABORTADO: la tabla "%" no tiene la columna "%". Revisa el esquema antes de aplicar RLS.',
        r.tbl, r.owner_col;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);

    -- SELECT
    v_policy := format('cf_%s_select_own', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = %I)',
      v_policy, r.tbl, r.owner_col
    );

    -- INSERT
    v_policy := format('cf_%s_insert_own', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = %I)',
      v_policy, r.tbl, r.owner_col
    );

    -- UPDATE
    v_policy := format('cf_%s_update_own', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = %I) WITH CHECK (auth.uid() = %I)',
      v_policy, r.tbl, r.owner_col, r.owner_col
    );

    -- DELETE (todas menos profiles)
    IF r.tbl <> 'profiles' THEN
      v_policy := format('cf_%s_delete_own', r.tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, r.tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = %I)',
        v_policy, r.tbl, r.owner_col
      );
    END IF;

    RAISE NOTICE 'RLS aplicado a % (dueño: %)', r.tbl, r.owner_col;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 3 — Garantizar que el cron de alertas siga funcionando
-- ═══════════════════════════════════════════════════════════════════════════
-- La función de alertas lee `app_secrets` (API key de Brevo) y cruza `profiles`
-- con `assignments`. Con RLS activo necesita los privilegios de su dueño para
-- no ser bloqueada: eso es SECURITY DEFINER.
-- Además se fija un search_path explícito, práctica recomendada por PostgreSQL
-- para funciones con privilegios elevados (evita redirección a tablas falsas).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'run_daily_deadline_range_alerts'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.run_daily_deadline_range_alerts() SECURITY DEFINER';
    EXECUTE 'ALTER FUNCTION public.run_daily_deadline_range_alerts() SET search_path = public, extensions';
    RAISE NOTICE 'Función de alertas configurada con SECURITY DEFINER';
  ELSE
    RAISE NOTICE 'OMITIDA: run_daily_deadline_range_alerts() no existe todavía. Ejecuta migrations_email_brevo_v5.sql y vuelve a correr este bloque.';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 4 — VERIFICACIÓN (ejecutar DESPUÉS del script)
-- ═══════════════════════════════════════════════════════════════════════════
-- Todas las tablas deben mostrar rls_activo = true.
-- `app_secrets` y `assignment_alert_log` con 0 políticas es lo CORRECTO:
-- significa "denegado para el cliente".

SELECT
  c.relname            AS tabla,
  c.relrowsecurity     AS rls_activo,
  COUNT(p.policyname)  AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p
       ON p.tablename  = c.relname
      AND p.schemaname = n.nspname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
        'app_secrets', 'assignment_alert_log',
        'profiles', 'user_security',
        'assignments', 'courses',
        'habits', 'habit_logs',
        'planners', 'planner_blocks'
      )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity, c.relname;

-- RESULTADO ESPERADO (todas con rls_activo = true):
--   app_secrets           | true | 0   <- correcto: denegado al cliente
--   assignment_alert_log  | true | 0   <- correcto: denegado al cliente
--   assignments           | true | 4
--   courses               | true | 4
--   habit_logs            | true | 4
--   habits                | true | 4
--   planner_blocks        | true | 4   <- ya existían
--   planners              | true | 4   <- ya existían
--   profiles              | true | 3   <- sin DELETE, a propósito
--   user_security         | true | 4


-- ═══════════════════════════════════════════════════════════════════════════
-- PRUEBA DE FUEGO: confirmar que la key de Brevo ya NO es legible
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta consulta, ejecutada desde la app con la clave publicable, debe devolver
-- 0 filas. Desde el SQL Editor SÍ verás datos (eres el dueño, RLS no te aplica),
-- así que la comprobación real se hace en la consola del navegador:
--
--   const { data, error } = await supabase.from('app_secrets').select('*');
--   console.log({ data, error });
--
-- ANTES del script: data = [{ brevo_api_key... }]  ← VULNERABLE
-- DESPUÉS:          data = []                      ← BLINDADO
