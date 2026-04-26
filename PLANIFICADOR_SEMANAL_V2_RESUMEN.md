# Evolución Planificador Semanal - Resumen Técnico

**Fecha:** 26 de abril de 2026  
**Estado:** Implementación completada

## Cambios realizados

### 1. Esquema de Base de Datos (Supabase)
**Archivo:** `supabase_schema_planners.sql` y `migrations_planner_v2.sql`

#### Nuevos campos en `planner_blocks`:
- `duration_minutes` (INTEGER, OPCIONAL): Duración estimada del bloque en minutos
- `notes` (TEXT, OPCIONAL): Notas adicionales sobre el bloque

#### Mejora en `block_type`:
- Nuevo valor: `'materia_trabajo'` para permitir vincular tanto materia como trabajo
- Valores soportados: `'libre'`, `'materia'`, `'trabajo'`, `'materia_trabajo'`

**Migración SQL segura:**
- No hay DROP TABLE
- No hay DELETE de datos
- ALTER TABLE con ADD COLUMN IF NOT EXISTS
- Campos nuevos son OPTIONAL (NULL por defecto)
- Datos existentes se preservan

### 2. Interfaz de Usuario - WeeklyPlanner.jsx

#### BlockModal mejorado:
- ✅ Título del bloque
- ✅ Día (lunes a domingo)
- ✅ Momento (mañana, tarde, noche) con emojis
- ✅ Tipo flexible: libre, materia, trabajo, materia+trabajo
- ✅ Selector de materia (condicional, obligatorio si aplica)
- ✅ Selector de trabajo (condicional, obligatorio si aplica)
- ✅ Duración en minutos (opcional)
- ✅ Estado inicial (pendiente, en proceso, completado)
- ✅ Notas (textarea opcional)
- ✅ Estilos glassmorphism mejorados

#### PlannerDetail mejorado:
- ✅ Alertas inteligentes visuales:
  - Sin objetivo semanal
  - Sin bloques
  - Día demasiado cargado
  - Todos los bloques pendientes
  
- ✅ Resumen inteligente expandido:
  - Avance en %
  - Bloques completados
  - Bloques pendientes
  - Bloques en proceso
  - Día más ocupado con conteo
  - Duración total estimada (en horas y minutos)
  
- ✅ Visualización de bloques mejorada:
  - Indicadores de estado (✓, ⚡, ⏳)
  - Duración visible (⏱️ Xm)
  - Iconos de vincularción (📚 materia, 📝 trabajo)
  - Notas visibles (💬 preview)
  - Mejor hover state

#### PlannersList sin cambios destructivos:
- ✅ Filtros por categoría funcionan igual
- ✅ Tarjetas de planificación mantienen diseño
- ✅ Colores de categoría: UNAD (amarillo), SENA (verde), Personalizado (morado)
- ✅ Progreso de planificación (completados/total)

### 3. Lógica de Negocio

#### Regla clave: No se pisan estados reales de trabajos
- El estado de un bloque es INDEPENDIENTE del estado real en `assignments`
- Completar un bloque NO cambia el estado del trabajo en el sistema
- El progreso de planificación es SOLO de bloques
- Confirmación en UI: "ℹ️ El estado del bloque es independiente del trabajo real"

#### Nombres libres de bloques
- El nombre del bloque NO debe ser igual al nombre del trabajo
- Ejemplo correcto:
  - Trabajo: "Fase 4 - Grafos"
  - Bloque: "Ejercicio 1"
  - El usuario ve "Ejercicio 1" pero el bloque referencia "Fase 4"

#### Conexión opcional con materias/trabajos
- Bloque tipo "libre": sin vincularción
- Bloque tipo "materia": requiere seleccionar materia
- Bloque tipo "trabajo": requiere seleccionar trabajo
- Bloque tipo "materia_trabajo": permite ambos simultáneamente

### 4. Verificaciones de Integridad

#### ✅ No se rompió nada
- Dashboard.jsx: No usa planners, sin cambios
- TaskBoard.jsx: No usa planners, sin cambios
- Agenda.jsx: No usa planners, sin cambios
- Sidebar.jsx: No modificado
- AuthContext: No modificado
- MFA: No tocado

#### ✅ Rutas intactas
- /planner → WeeklyPlanner (existente, mejorado)
- No nuevas rutas innecesarias
- No cambios en routing

#### ✅ Contextos intactos
- usePlanners hook: mantiene interfaz actual + nuevos campos opcionales
- TaskContext: no se modificó
- SettingsContext: no se modificó

## Pasos para activar

### 1. Ejecutar migración SQL (PRIMERO)
```sql
-- En Supabase SQL Editor, ejecutar:
ALTER TABLE planner_blocks 
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

ALTER TABLE planner_blocks 
  DROP CONSTRAINT IF EXISTS planner_blocks_block_type_check;

ALTER TABLE planner_blocks
  ADD CONSTRAINT planner_blocks_block_type_check 
  CHECK (block_type IN ('libre', 'materia', 'trabajo', 'materia_trabajo'));
```

### 2. Recargar aplicación
- El frontend automáticamente soportará los nuevos campos
- Los campos existentes seguirán funcionando
- Migración es retro-compatible

### 3. Probar funcionalidad
Ver sección "Testing Checklist" abajo

## Testing Checklist

- [ ] Planificador abre sin errores en consola
- [ ] Crear planificación con nombre, categoría, objetivo
- [ ] Crear bloque libre (sin materia/trabajo)
- [ ] Crear bloque vinculado a materia
- [ ] Crear bloque vinculado a trabajo
- [ ] Crear bloque vinculado a materia + trabajo
- [ ] Agregar duración a un bloque
- [ ] Agregar notas a un bloque
- [ ] Cambiar estado de bloque (no afecta trabajo real)
- [ ] Ver alertas inteligentes aparecer
- [ ] Resumen muestra duración total correcta
- [ ] Filtros funcionan
- [ ] Datos persisten al recargar
- [ ] Dashboard sin errores
- [ ] TaskBoard sin errores
- [ ] Materias sin errores
- [ ] No hay errores en consola

## Campos adicionales para futuro (NO IMPLEMENTADOS YO)

Si en el futuro se necesita:
- Vincular bloque con materia/trabajo específico sin seleccionar
- Generar reportes de productividad
- Integración de calendario externo
- Notificaciones de bloques

Se pueden agregar sin romper nada porque los campos actuales son opcionales.

## Arquitectura

```
WeeklyPlanner (página principal)
├── PlannersList (vista de tarjetas)
│   └── Modal: PlannerModal (crear planificación)
└── PlannerDetail (vista de calendario semanal)
    └── Modal: BlockModal (crear/editar bloques)

Datos:
├── usePlanners hook
│   └── plannersService
│       └── Supabase (planners + planner_blocks)
└── Contextos:
    ├── useAuth
    ├── useCourses
    └── useTasksContext
```

## Notas de Implementación

1. **Migración no destructiva**: Todos los cambios pueden revertirse si es necesario
2. **Compatibilidad**: Frontend maneja gracefully campos NULL
3. **UX Premium**: Mantiene glassmorphism, cyber-luxe, oscuro premium
4. **Independencia**: Planificador no interfiere con Trabajos/Materias reales
5. **Escalabilidad**: Estructura permite agregar más campos sin refactoring

---

**Importante:** Ejecutar migración SQL ANTES de usar la nueva interfaz.
Los bloques creados con la versión anterior funcionarán con los nuevos campos en NULL.
