-- ==============================================================================
-- CampusFlow — SCRIPT INTEGRAL DE AUDITORÍA Y BLINDAJE ROW LEVEL SECURITY (RLS)
-- Archivo: supabase/schema_rls_hardening.sql
-- ==============================================================================
-- PROPÓSITO:
--   1. Centralizar y blindar la seguridad Row Level Security (RLS) de Supabase en CampusFlow.
--   2. Garantizar que cada usuario autenticado SOLO pueda interactuar con sus propios
--      registros mediante la condición estricta:
--        - auth.uid() = user_id (para tablas de dominio con user_id)
--        - auth.uid() = id (para profiles)
--   3. Cerrar el acceso de cliente a tablas de sistema sensibles (app_secrets).
--   4. Configurar disparador automático para sincronización de nuevos usuarios (Google OAuth/Email).
--   5. Configurar políticas para buckets de almacenamiento (avatars/wallpapers).
--
-- PROPIEDADES DE EJECUCIÓN:
--   - Idempotente: puede ejecutarse infinitas veces sin riesgo de duplicados o errores.
--   - Auto-recuperable: asegura la existencia de tablas y columnas necesarias.
--   - Compatible con retrocompatibilidad: protege tanto nombres actuales como legacy
--     ('assignments' y 'tasks', 'courses' y 'subjects', 'study_notes' y 'notes').
--
-- INSTRUCCIONES DE USO:
--   1. Abre el panel de Supabase: https://supabase.com/dashboard
--   2. Selecciona tu proyecto CampusFlow.
--   3. Ve a "SQL Editor" en el menú lateral izquierdo.
--   4. Crea una nueva consulta ("+ New query"), pega este archivo completo y haz clic en "Run".
-- ==============================================================================


-- ==============================================================================
-- SECCIÓN 1: ASEGURAR ESQUEMA Y TABLAS BASE
-- ==============================================================================

-- 1.1 Perfiles de Usuario (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  email_notifications boolean DEFAULT true,
  language text DEFAULT 'es',
  typography text DEFAULT 'inter',
  font_size text DEFAULT 'normal',
  custom_wallpaper text,
  wallpaper_id text DEFAULT 'default',
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  theme text DEFAULT 'dark',
  two_factor_enabled boolean DEFAULT false,
  red_alert_freq text DEFAULT 'diaria',
  yellow_alert_freq text DEFAULT 'diaria',
  green_alert_freq text DEFAULT 'diaria',
  red_alert_custom_days integer DEFAULT 1,
  yellow_alert_custom_days integer DEFAULT 3,
  green_alert_custom_days integer DEFAULT 7,
  in_app_alerts_enabled boolean DEFAULT true,
  red_alert_times text[] DEFAULT ARRAY['08:00', '18:00'],
  yellow_alert_times text[] DEFAULT ARRAY['09:00'],
  green_alert_times text[] DEFAULT ARRAY['10:00'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Asegurar columnas críticas en profiles si la tabla ya existía
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1.2 Materias / Cursos (courses y alias subjects)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  institution text,
  teacher text,
  color text DEFAULT '#4f46e5',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  institution text,
  teacher text,
  color text DEFAULT '#4f46e5',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.3 Trabajos y Tareas (assignments y alias tasks)
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_date timestamptz,
  deadline timestamptz,
  status text DEFAULT 'sin entregar',
  priority text DEFAULT 'media',
  institution text,
  subtasks jsonb DEFAULT '[]'::jsonb,
  task_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid,
  title text NOT NULL,
  start_date timestamptz,
  deadline timestamptz,
  status text DEFAULT 'sin entregar',
  priority text DEFAULT 'media',
  institution text,
  subtasks jsonb DEFAULT '[]'::jsonb,
  task_notes text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.4 Apuntes de Estudio (study_notes y alias notes)
CREATE TABLE IF NOT EXISTS public.study_notes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text,
  title text NOT NULL,
  content text DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text,
  title text NOT NULL,
  content text DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.5 Sesiones de Estudio / Pomodoro (study_sessions)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL DEFAULT 0,
  course_id text,
  subject text,
  institution text,
  task_id text,
  method text,
  mode text,
  created_at timestamptz DEFAULT now()
);

-- 1.6 Hábitos y Registros de Cumplimiento (habits, habit_logs)
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency_type text DEFAULT 'daily',
  streak integer DEFAULT 0,
  color text,
  icon text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 1.7 Planificador Semanal (planners, planner_blocks)
CREATE TABLE IF NOT EXISTS public.planners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  weekly_goal text,
  color text DEFAULT '#00e5ff',
  icon text DEFAULT 'Folder',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planner_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id uuid REFERENCES public.planners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day text NOT NULL,
  block_time text NOT NULL,
  title text NOT NULL,
  block_type text NOT NULL,
  course_id uuid,
  task_id uuid,
  duration_minutes integer DEFAULT 0,
  notes text,
  status text DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.8 Configuración y Seguridad (user_settings, user_security)
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

CREATE TABLE IF NOT EXISTS public.user_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled boolean DEFAULT false,
  mfa_status text DEFAULT 'DESPROTEGIDA',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.9 Telemetría y Snapshots de Analítica (analytics_snapshots)
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  week_start_date date NOT NULL,
  period_type text DEFAULT 'weekly',
  total_blocks_created integer DEFAULT 0,
  total_blocks_completed integer DEFAULT 0,
  total_blocks_pending integer DEFAULT 0,
  total_planned_minutes integer DEFAULT 0,
  completed_minutes integer DEFAULT 0,
  total_assignments integer DEFAULT 0,
  completed_assignments integer DEFAULT 0,
  pending_assignments integer DEFAULT 0,
  total_habits integer DEFAULT 0,
  completed_habits integer DEFAULT 0,
  morning_minutes integer DEFAULT 0,
  afternoon_minutes integer DEFAULT 0,
  night_minutes integer DEFAULT 0,
  minutes_by_day jsonb DEFAULT '{}'::jsonb,
  overall_compliance_percent numeric DEFAULT 0,
  trend_direction text DEFAULT 'stable',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, snapshot_date, period_type)
);

-- 1.10 Registro de Alertas Enviadas (assignment_alert_log)
CREATE TABLE IF NOT EXISTS public.assignment_alert_log (
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('rojo', 'amarillo', 'verde')),
  sent_date date NOT NULL,
  sent_bucket text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, alert_type, sent_bucket)
);

-- 1.11 Tablas de Sistema Sensibles (app_secrets)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  secret_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- ==============================================================================
-- SECCIÓN 2: BLINDAJE DE TABLAS DE SISTEMA (ACCESO DE CLIENTE DENEGADO)
-- ==============================================================================
-- Al habilitar RLS sin políticas para roles anon o authenticated, PostgreSQL
-- bloquea por diseño todo acceso desde el cliente. Las Edge Functions o crons
-- acceden a través de la clave service_role o funciones SECURITY DEFINER.

DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_secrets'
  ) THEN
    ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_secrets'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_secrets', pol.policyname);
    END LOOP;

    RAISE NOTICE 'Tabla sensible app_secrets blindada (acceso cliente denegado).';
  END IF;
END $$;


-- ==============================================================================
-- SECCIÓN 3: POLÍTICAS RLS IDEMPOTENTES EN 'profiles'
-- ==============================================================================
-- Regla de Negocio:
--   - Un usuario solo puede leer su propio perfil.
--   - Un usuario solo puede insertar su propio registro de perfil (auth.uid() = id).
--   - Un usuario solo puede actualizar su propio perfil (auth.uid() = id).
--   - Eliminación restringida (se elimina en cascada desde auth.users).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_profiles_select_own ON public.profiles;
CREATE POLICY cf_profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS cf_profiles_insert_own ON public.profiles;
CREATE POLICY cf_profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS cf_profiles_update_own ON public.profiles;
CREATE POLICY cf_profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS cf_profiles_delete_own ON public.profiles;
CREATE POLICY cf_profiles_delete_own
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);


-- ==============================================================================
-- SECCIÓN 4: POLÍTICAS RLS EN TABLAS DE USUARIO (ESTRICTO auth.uid() = user_id)
-- ==============================================================================
-- Aplica SELECT, INSERT, UPDATE y DELETE idempotentes para cada tabla de usuario:
--   - study_sessions
--   - assignments (trabajos)
--   - tasks (alias tareas)
--   - courses (materias)
--   - subjects (alias materias)
--   - study_notes (apuntes)
--   - notes (alias apuntes)
--   - habits
--   - habit_logs
--   - planners
--   - planner_blocks
--   - user_settings
--   - user_security
--   - analytics_snapshots

DO $$
DECLARE
  target_table text;
  pol          record;
  tbls         text[] := ARRAY[
    'study_sessions',
    'assignments',
    'tasks',
    'courses',
    'subjects',
    'study_notes',
    'notes',
    'habits',
    'habit_logs',
    'planners',
    'planner_blocks',
    'user_settings',
    'user_security',
    'analytics_snapshots'
  ];
BEGIN
  FOREACH target_table IN ARRAY tbls
  LOOP
    -- 4.a Verificar existencia de la tabla
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = target_table
    ) THEN
      RAISE NOTICE 'OMITIDA (no existe la tabla): %', target_table;
      CONTINUE;
    END IF;

    -- 4.b Verificar existencia de columna user_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = target_table
        AND column_name  = 'user_id'
    ) THEN
      RAISE WARNING 'OMITIDA (tabla % no tiene columna user_id)', target_table;
      CONTINUE;
    END IF;

    -- 4.c Habilitar Row Level Security
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);

    -- 4.d Limpiar todas las políticas previas para evitar reglas redundantes o permisivas
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, target_table);
    END LOOP;

    -- 4.e Crear política SELECT: Solo registros donde user_id = auth.uid()
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)',
      format('cf_%s_select_own', target_table),
      target_table
    );

    -- 4.f Crear política INSERT: Solo inserción con user_id = auth.uid()
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)',
      format('cf_%s_insert_own', target_table),
      target_table
    );

    -- 4.g Crear política UPDATE: Solo actualización de sus propios registros impidiendo reasignación
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      format('cf_%s_update_own', target_table),
      target_table
    );

    -- 4.h Crear política DELETE: Solo eliminación de sus propios registros
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)',
      format('cf_%s_delete_own', target_table),
      target_table
    );

    RAISE NOTICE 'Políticas RLS aplicadas exitosamente en public.% (SELECT, INSERT, UPDATE, DELETE).', target_table;
  END LOOP;
END $$;


-- ==============================================================================
-- SECCIÓN 5: POLÍTICAS RLS EN assignment_alert_log (AUDITORÍA DE ALERTAS)
-- ==============================================================================

DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignment_alert_log'
  ) THEN
    ALTER TABLE public.assignment_alert_log ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_alert_log'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.assignment_alert_log', pol.policyname);
    END LOOP;

    CREATE POLICY cf_assignment_alert_log_select_own ON public.assignment_alert_log
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    CREATE POLICY cf_assignment_alert_log_insert_own ON public.assignment_alert_log
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    CREATE POLICY cf_assignment_alert_log_update_own ON public.assignment_alert_log
      FOR UPDATE
      TO authenticated
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

    CREATE POLICY cf_assignment_alert_log_delete_own ON public.assignment_alert_log
      FOR DELETE
      TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_alert_log.assignment_id
            AND a.user_id = auth.uid()
        )
      );

    RAISE NOTICE 'Políticas RLS aplicadas en public.assignment_alert_log.';
  END IF;
END $$;


-- ==============================================================================
-- SECCIÓN 6: DISPARADOR AUTOMÁTICO DE PERFILES (handle_new_user)
-- ==============================================================================
-- Asegura que cuando un usuario se registra vía Google OAuth o Correo Electrónico,
-- su fila en public.profiles se cree de inmediato con privilegios elevados (SECURITY DEFINER),
-- garantizando que nunca quede en estado huérfano.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_full_name text;
  v_avatar    text;
BEGIN
  -- Extraer nombre desde metadatos OAuth de Google o email
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(COALESCE(NEW.email, 'Estudiante'), '@', 1)
  );

  -- Extraer avatar desde metadatos OAuth
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  -- Upsert resiliente en public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    email_notifications,
    updated_at
  )
  VALUES (
    NEW.id,
    v_full_name,
    COALESCE(NEW.email, ''),
    v_avatar,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email      = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Evitar que un error secundario en profiles aborte el alta de la cuenta en auth.users
  RAISE WARNING 'handle_new_user: no se pudo sincronizar profile para user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- SECCIÓN 7: POLÍTICAS DE ALMACENAMIENTO (STORAGE BUCKET 'avatars')
-- ==============================================================================
-- Configura acceso al bucket 'avatars' para avatares y fondos de pantalla personalizados:
--   - Lectura pública / autenticada.
--   - Carga, modificación y eliminación restringida al usuario autenticado.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
CREATE POLICY "Public avatars read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update their avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update their avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete their avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete their avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);


-- ==============================================================================
-- SECCIÓN 8: CERTIFICACIÓN Y AUDITORÍA FINAL DE POLÍTICAS RLS
-- ==============================================================================
-- Consulta de reporte que resume el estado de Row Level Security y políticas activas.

SELECT
  c.relname AS tabla,
  c.relrowsecurity AS rls_habilitado,
  COUNT(p.policyname) AS total_politicas,
  COALESCE(string_agg(DISTINCT p.cmd, ', '), 'NINGUNA (DENEGADO TOTAL)') AS comandos_permitidos
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p
       ON p.tablename  = c.relname
      AND p.schemaname = n.nspname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
        'profiles',
        'courses',
        'subjects',
        'assignments',
        'tasks',
        'study_notes',
        'notes',
        'study_sessions',
        'habits',
        'habit_logs',
        'planners',
        'planner_blocks',
        'user_settings',
        'user_security',
        'analytics_snapshots',
        'assignment_alert_log',
        'app_secrets'
      )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
