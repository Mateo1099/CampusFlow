-- Script para añadir columnas de arreglos de horas a la tabla profiles
-- Manteniendo la retrocompatibilidad con las frecuencias anteriores.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS red_alert_times text[] DEFAULT '{"08:00"}',
ADD COLUMN IF NOT EXISTS yellow_alert_times text[] DEFAULT '{"08:00"}',
ADD COLUMN IF NOT EXISTS green_alert_times text[] DEFAULT '{"08:00"}';

-- Puedes verificar si se crearon correctamente ejecutando un SELECT:
-- SELECT red_alert_times, yellow_alert_times, green_alert_times FROM profiles LIMIT 1;
