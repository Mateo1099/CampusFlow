-- SQL para ejecutar en el SQL Editor de Supabase
-- Estructura para el mÃ³dulo de Planificador Semanal / Proyectos

-- Tabla para planificaciones (carpetas)
CREATE TABLE IF NOT EXISTS planners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('UNAD', 'SENA', 'Personalizado')),
  weekly_goal text,
  color text DEFAULT '#00e5ff',
  icon text DEFAULT 'Folder',
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tabla para bloques de cada planificador
CREATE TABLE IF NOT EXISTS planner_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  planner_id uuid REFERENCES planners(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  block_time text NOT NULL CHECK (block_time IN ('morning', 'afternoon', 'night')),
  title text NOT NULL,
  block_type text NOT NULL CHECK (block_type IN ('libre', 'materia', 'trabajo', 'materia_trabajo')),
  course_id uuid, -- Opcional
  task_id uuid, -- Opcional
  duration_minutes integer, -- Duración estimada en minutos (opcional)
  notes text, -- Notas adicionales del bloque (opcional)
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completado')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Agregar nuevos campos si no existen (para seguridad en caso de ejecutar nuevamente)
ALTER TABLE planner_blocks 
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS notes text;

-- Extender bloque_type para soportar combinaciones
-- Este ALTER ya está en el CREATE TABLE, pero lo dejamos documentado

-- RLS policies para planners
ALTER TABLE planners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own planners" 
ON planners FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own planners" 
ON planners FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own planners" 
ON planners FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planners" 
ON planners FOR DELETE 
USING (auth.uid() = user_id);


-- RLS policies para planner_blocks
ALTER TABLE planner_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own planner_blocks" 
ON planner_blocks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own planner_blocks" 
ON planner_blocks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner_blocks" 
ON planner_blocks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner_blocks" 
ON planner_blocks FOR DELETE 
USING (auth.uid() = user_id);
