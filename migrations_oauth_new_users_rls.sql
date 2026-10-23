-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — BLINDAJE RLS Y CREACIÓN EN CASCADA PARA USUARIOS NUEVOS OAUTH
-- ─────────────────────────────────────────────────────────────────────────
-- OBJETIVO:
--   Garantizar que los nuevos usuarios que ingresen a través de Google OAuth
--   (o correo electrónico) tengan su fila en `public.profiles` creada y accesible
--   de forma atómica e inmediata, sin ser bloqueados por políticas RLS restrictivas.
--
-- CÓMO APLICAR:
--   Copiar este script y ejecutarlo en:
--   Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Asegurar columnas esenciales en `public.profiles`
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Habilitar RLS en `public.profiles`
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS idempotentes y permisivas para el propietario autenticado
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

-- 4. Función SECURITY DEFINER para creación automática en cascada
-- Se ejecuta con privilegios de superusuario/postgres, omitiendo RLS por completo
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
  INSERT INTO public.profiles (id, full_name, email, avatar_url, email_notifications, updated_at)
  VALUES (
    NEW.id,
    v_full_name,
    COALESCE(NEW.email, ''),
    v_avatar,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Evitar que una falla secundaria en profiles aborte el registro de la cuenta en auth.users
  RAISE WARNING 'handle_new_user: no se pudo sincronizar profile para user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vincular trigger a auth.users para cada registro nuevo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill para usuarios existentes que no tengan fila en profiles
INSERT INTO public.profiles (id, full_name, email, email_notifications)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, 'Estudiante'), '@', 1)),
  COALESCE(u.email, ''),
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
