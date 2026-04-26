-- MIGRACIÓN SEGURA PARA PLANIFICADOR SEMANAL V2
-- Ejecutar en el SQL Editor de Supabase
-- Fecha: 26 de abril de 2026

-- ===== PASO 1: AGREGAR CAMPOS NUEVOS A planner_blocks =====
-- Estos campos son OPCIONALES y seguros de agregar

ALTER TABLE planner_blocks 
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- ===== PASO 2: ACTUALIZAR CONSTRAINT DE block_type =====
-- IMPORTANTE: Esto necesita recrear el constraint
-- Primero, quitamos el constraint antiguo
ALTER TABLE planner_blocks 
  DROP CONSTRAINT IF EXISTS planner_blocks_block_type_check;

-- Luego, agregamos el nuevo constraint con el tipo 'materia_trabajo'
ALTER TABLE planner_blocks
  ADD CONSTRAINT planner_blocks_block_type_check 
  CHECK (block_type IN ('libre', 'materia', 'trabajo', 'materia_trabajo'));

-- ===== PASO 3: VERIFICAR INTEGRIDAD =====
-- Estos SELECTs confirman que todo está bien
-- SELECT COUNT(*) FROM planner_blocks;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'planner_blocks';

-- ===== NOTA IMPORTANTE =====
-- No hay DROP TABLE ni DELETE de datos
-- Toda la lógica es ADITIVA y no destructiva
-- Los datos existentes se preservan
-- Las nuevas columnas aceptan NULL para registros antiguos
