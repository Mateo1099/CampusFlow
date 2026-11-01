-- ==============================================================================
-- CAMPUSFLOW - SCRIPT DE OPTIMIZACIÓN DE ÍNDICES B-TREE PARA SUPABASE / POSTGRESQL
-- ==============================================================================
--
-- Este script es completamente idempotente (CREATE INDEX IF NOT EXISTS).
-- Su objetivo es eliminar escaneos secuenciales (Seq Scans), blindar las consultas
-- multi-usuario de alta frecuencia y acelerar los tiempos de respuesta para cumplir
-- con los estándares Core Web Vitals (INP < 200ms, LCP instantáneo vía caché).
--
-- Tablas cubiertas:
-- 1. assignments (Entregas y tareas académicas)
-- 2. study_sessions (Sesiones de estudio y pomodoros acumulados)
-- 3. courses (Materias y asignaturas)
-- 4. study_notes (Apuntes de clase)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ÍNDICES PRIMARIOS OBLIGATORIOS (Checklist Maestra)
-- ------------------------------------------------------------------------------

-- Índice B-Tree para filtrado por usuario en entregas (tareas)
-- Optimiza: getTasks(userId), RLS policies y uniones con courses
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);

-- Índice B-Tree para filtrado por estado de entrega
-- Optimiza: dashboard metrics, task board columns (sin entregar, en proceso, entregado)
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Índice B-Tree para filtrado por usuario en sesiones de estudio
-- Optimiza: getStudySessions(userId), cálculo de minutos acumulados y analíticas
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);

-- Índice B-Tree para filtrado por usuario en materias
-- Optimiza: getCourses(userId), selectores de materia e instituciones
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);

-- Índice B-Tree para filtrado por usuario en apuntes de estudio
-- Optimiza: getNotes(userId), búsqueda y auto-guardado en Notes.jsx
CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);


-- ------------------------------------------------------------------------------
-- 2. ÍNDICES COMPUESTOS Y DE ALTO RENDIMIENTO (Recomendados)
-- ------------------------------------------------------------------------------

-- Índice compuesto para consultas frecuentes de tareas por usuario y estado
-- Acelera significativamente el cálculo de analítica (tareas entregadas vs pendientes)
CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status);

-- Índice para ordenamiento cronológico de fechas de entrega
-- Optimiza: calendario mensual/semanal, alertas de vencimiento (deadline alert system)
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments(deadline);

-- Índice compuesto para sesiones de estudio ordenadas por fecha más reciente
-- Optimiza: listado histórico de pomodoros y sincronización reactiva
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created ON study_sessions(user_id, created_at DESC);

-- Índice compuesto para apuntes de estudio ordenados por fecha de actualización
-- Optimiza: bento grid de Notes ordenado por última edición
CREATE INDEX IF NOT EXISTS idx_study_notes_user_updated ON study_notes(user_id, updated_at DESC);

-- Índice por materia en apuntes para filtrado rápido por asignatura
CREATE INDEX IF NOT EXISTS idx_study_notes_course_id ON study_notes(course_id);

-- ==============================================================================
-- FIN DEL SCRIPT DE OPTIMIZACIÓN
-- ==============================================================================
