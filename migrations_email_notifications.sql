-- ═══════════════════════════════════════════════════════════════════════════
-- CampusFlow — Migración: notificaciones por email reales
-- Ejecutar en el SQL Editor de Supabase antes de activar el Database Webhook.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Columna que persiste la preferencia real del toggle "Correo Electrónico"
--    en src/pages/Profile.jsx (mapeada desde SettingsContext.jsx -> cloudMapping.email_notifications)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT false;

-- 2. (Opcional pero recomendado) Replicar el email de auth.users en profiles
--    para que la Edge Function no dependa de una llamada extra a la Admin API.
--    Si ya tienes una columna 'email' en profiles, omite esta sección.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Trigger que mantiene profiles.email sincronizado con auth.users.email
-- cada vez que se crea o actualiza un usuario.
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- 3. Backfill: sincroniza el email actual de todos los usuarios existentes.
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
