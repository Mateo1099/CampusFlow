-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — AUDITORÍA Y BLINDAJE ESTRICTO DE POLÍTICAS RLS (Row Level Security)
-- Archivo: migrations_rls_audit_hardening.sql
-- Fase 3: Checklist de Producción y Hardening de Seguridad
-- ─────────────────────────────────────────────────────────────────────────
-- OBJETIVO:
--   1. Certificar que TODAS las tablas de usuario de CampusFlow:
--      (profiles, assignments, courses, user_settings, assignment_alert_log,
--       user_security, habits, habit_logs, planners, planner_blocks,
--       analytics_snapshots)
--      tengan Row Level Security (RLS) habilitado de forma mandatoria.
--   2. Garantizar que las operaciones SELECT, INSERT, UPDATE y DELETE apliquen
--      la condición estricta:
--        - auth.uid() = user_id (para tablas con user_id)
--        - id = auth.uid() (para profiles)
--        - o validación de propiedad asociada sobre assignments (para assignment_alert_log)
--      impidiendo de forma matemática que cualquier usuario consulte, modifique
--      o destruya datos de otro estudiante.
--   3. Cerrar el acceso público/cliente a tablas de sistema (app_secrets),
--      manteniendo operativos los procesos batch/cron mediante SECURITY DEFINER.
--   4. Eliminar políticas permisivas heredadas ("Allow all", "true", etc.).
--
-- PROPIEDADES:
--   · Idempotente: se puede ejecutar N veces con total seguridad.
--   · Tolerante a esquemas incrementales: crea tablas o columnas faltantes si
--     aún no existen y no aborta ejecuciones en bases de datos con esquemas previos.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 1: ASEGURAR EXISTENCIA DE TABLAS Y COLUMNAS CLAVE
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1 Tabla user_settings (preferencias persistentes de usuario)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme text DEFAULT 'dark',
  language text DEFAULT 'es',
  font text DEFAULT 'inter',
  wallpaper text DEFAULT 'default',
  custom_wallpaper text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2 Tabla assignment_alert_log (registro de deduplicación de alertas de tareas)
CREATE TABLE IF NOT EXISTS public.assignment_alert_log (
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('rojo', 'amarillo', 'verde')),
  sent_date date NOT NULL,
  sent_bucket text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, alert_type, sent_bucket)
);

-- Asegurar columna user_id en assignment_alert_log para simplificar indexación y RLS
ALTER TABLE public.assignment_alert_log
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill de user_id en assignment_alert_log basándose en la tarea padre
UPDATE public.assignment_alert_log l
SET user_id = a.user_id
FROM public.assignments a
WHERE l.assignment_id = a.id
  AND l.user_id IS NULL;

-- Trigger para auto-poblar user_id en assignment_alert_log si se omite en el INSERT
CREATE OR REPLACE FUNCTION public.trg_populate_alert_log_user_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT a.user_id INTO NEW.user_id
    FROM public.assignments a
    WHERE a.id = NEW.assignment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_alert_log_user_id ON public.assignment_alert_log;
CREATE TRIGGER trg_set_alert_log_user_id
  BEFORE INSERT ON public.assignment_alert_log
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_populate_alert_log_user_id();

-- 1.3 Tabla analytics_snapshots (si el módulo de analíticas está instalado)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_snapshots'
  ) THEN
    ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 2: TABLAS DE SISTEMA (DENEGACIÓN TOTAL DE ACCESO AL CLIENTE)
-- ═══════════════════════════════════════════════════════════════════════════
-- Tablas que almacenan credenciales o llaves de servicio (app_secrets).
-- Al habilitar RLS sin políticas permisivas, PostgreSQL deniega por defecto
-- todas las consultas desde la API pública de Supabase (anon / authenticated).
-- Únicamente funciones SECURITY DEFINER o la service_role pueden acceder.

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_secrets']
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- Eliminar cualquier política residual o permisiva creada con anterioridad
      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      RAISE NOTICE 'TABLA DE SISTEMA BLINDADA (Acceso cliente denegado): %', t;
    END IF;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 3: TABLAS DE USUARIO — APLICACIÓN ESTRICTA DE RLS (SELECT/INSERT/UPDATE/DELETE)
-- ═══════════════════════════════════════════════════════════════════════════
-- Se limpian políticas previas y se recrean de forma homogénea garantizando:
-- 1. Condición estricta auth.uid() = owner_col
-- 2. Cláusula WITH CHECK en INSERT y UPDATE para impedir la suplantación de identidad

DO $$
DECLARE
  r record;
  v_sel text;
  v_ins text;
  v_upd text;
  v_del text;
  pol record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('profiles',             'id'),
      ('assignments',          'user_id'),
      ('courses',              'user_id'),
      ('user_settings',        'user_id'),
      ('user_security',        'user_id'),
      ('habits',               'user_id'),
      ('habit_logs',           'user_id'),
      ('planners',             'user_id'),
      ('planner_blocks',       'user_id'),
      ('analytics_snapshots',  'user_id')
    ) AS x(tbl, owner_col)
  LOOP
    -- 3.a Verificar si la tabla existe en public
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = r.tbl
    ) THEN
      RAISE NOTICE 'OMITIDA (no existe): %', r.tbl;
      CONTINUE;
    END IF;

    -- 3.b Verificar que la columna de propietario exista
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = r.tbl
        AND column_name  = r.owner_col
    ) THEN
      RAISE WARNING 'OMITIDA (tabla % no tiene columna %)', r.tbl, r.owner_col;
      CONTINUE;
    END IF;

    -- 3.c Habilitar RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);

    -- 3.d Limpiar todas las políticas previas para evitar políticas redundantes o permisivas
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = r.tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, r.tbl);
    END LOOP;

    -- Nombres normalizados de políticas
    v_sel := format('cf_%s_select_own', r.tbl);
    v_ins := format('cf_%s_insert_own', r.tbl);
    v_upd := format('cf_%s_update_own', r.tbl);
    v_del := format('cf_%s_delete_own', r.tbl);

    -- 1. SELECT: Solo filas cuyo propietario coincida con el usuario autenticado
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = %I)',
      v_sel, r.tbl, r.owner_col
    );

    -- 2. INSERT: El usuario solo puede insertar registros con su propio ID
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = %I)',
      v_ins, r.tbl, r.owner_col
    );

    -- 3. UPDATE: El usuario solo puede modificar sus filas y no puede reasignar el owner_id
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = %I) WITH CHECK (auth.uid() = %I)',
      v_upd, r.tbl, r.owner_col, r.owner_col
    );

    -- 4. DELETE: El usuario solo puede eliminar sus propias filas
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = %I)',
      v_del, r.tbl, r.owner_col
    );

    RAISE NOTICE 'POLÍTICAS RLS HARDENED (SELECT, INSERT, UPDATE, DELETE) EN: % (columna: %)', r.tbl, r.owner_col;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 4: TABLA assignment_alert_log — SEGURIDAD HÍBRIDA MULTI-TENANT
-- ═══════════════════════════════════════════════════════════════════════════
-- assignment_alert_log vincula assignment_id con user_id (directo o via JOIN).
-- Se aplican políticas explícitas para impedir que un estudiante consulte
-- el historial de alertas de otro estudiante.

DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignment_alert_log'
  ) THEN
    -- Habilitar RLS
    ALTER TABLE public.assignment_alert_log ENABLE ROW LEVEL SECURITY;

    -- Limpiar políticas anteriores
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_alert_log'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.assignment_alert_log', pol.policyname);
    END LOOP;

    -- 1. SELECT: El usuario solo puede ver alertas de sus propias tareas
    CREATE POLICY cf_assignment_alert_log_select_own ON public.assignment_alert_log
      FOR SELECT
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    -- 2. INSERT: Solo se pueden insertar logs asociados a tareas del propio usuario
    CREATE POLICY cf_assignment_alert_log_insert_own ON public.assignment_alert_log
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    -- 3. UPDATE: Restringido a las tareas del usuario autenticado
    CREATE POLICY cf_assignment_alert_log_update_own ON public.assignment_alert_log
      FOR UPDATE
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    -- 4. DELETE: Restringido a las tareas del usuario autenticado
    CREATE POLICY cf_assignment_alert_log_delete_own ON public.assignment_alert_log
      FOR DELETE
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    RAISE NOTICE 'POLÍTICAS RLS HARDENED EN: assignment_alert_log';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 5: FUNCIÓN DE ALERTAS CON SECURITY DEFINER Y SEARCH_PATH SEGURO
-- ═══════════════════════════════════════════════════════════════════════════
-- Asegura que el cron de alertas (pg_cron) y la invocación desacoplada tengan
-- privilegios elevados para consultar tareas y registrar logs sin depender
-- de un contexto interactivo de sesión de usuario, mitigando hijacking de search_path.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'run_daily_deadline_range_alerts'
  ) THEN
    ALTER FUNCTION public.run_daily_deadline_range_alerts() SECURITY DEFINER;
    ALTER FUNCTION public.run_daily_deadline_range_alerts() SET search_path = public, extensions;
    RAISE NOTICE 'Función run_daily_deadline_range_alerts configurada con SECURITY DEFINER';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'test_send_deadline_alerts_edge'
  ) THEN
    ALTER FUNCTION public.test_send_deadline_alerts_edge(text) SECURITY DEFINER;
    ALTER FUNCTION public.test_send_deadline_alerts_edge(text) SET search_path = public, extensions;
    RAISE NOTICE 'Función test_send_deadline_alerts_edge configurada con SECURITY DEFINER';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 6: CERTIFICACIÓN Y AUDITORÍA DE POLÍTICAS ACTIVAS
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecuta esta consulta para certificar el estado de blindaje de la base de datos.
-- RESULTADO ESPERADO:
-- - rls_activo = TRUE en el 100% de las tablas auditadas.
-- - politicas = 4 en todas las tablas de usuario (SELECT, INSERT, UPDATE, DELETE).
-- - politicas = 0 en app_secrets (acceso denegado por defecto al cliente).

SELECT
  c.relname AS tabla,
  c.relrowsecurity AS rls_activo,
  COUNT(p.policyname) AS total_politicas,
  array_to_string(array_agg(DISTINCT p.cmd), ', ') AS operaciones_permitidas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p
       ON p.tablename  = c.relname
      AND p.schemaname = n.nspname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
        'profiles',
        'assignments',
        'courses',
        'user_settings',
        'assignment_alert_log',
        'user_security',
        'habits',
        'habit_logs',
        'planners',
        'planner_blocks',
        'analytics_snapshots',
        'app_secrets'
      )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
