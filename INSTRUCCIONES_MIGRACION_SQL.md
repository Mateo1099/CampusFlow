# Pasos para Ejecutar la Migración SQL

**⚠️ CRÍTICO:** Ejecutar ANTES de usar WeeklyPlanner V2

---

## Paso 1: Ir a Supabase Dashboard

1. Abrir: https://supabase.com
2. Ingresar con tu cuenta
3. Seleccionar el proyecto CampusFlow
4. En el sidebar izquierdo, ir a **SQL Editor**

---

## Paso 2: Crear Nueva Query

1. Clic en **"New Query"** (botón azul)
2. Se abre un editor vacío

---

## Paso 3: Copiar y Ejecutar SQL

Copiar **EXACTAMENTE** este código:

```sql
-- MIGRACIÓN SEGURA PARA PLANIFICADOR SEMANAL V2
-- Agregar columnas nuevas (no destructivo)

ALTER TABLE planner_blocks 
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- Actualizar constraint de block_type
ALTER TABLE planner_blocks 
  DROP CONSTRAINT IF EXISTS planner_blocks_block_type_check;

ALTER TABLE planner_blocks
  ADD CONSTRAINT planner_blocks_block_type_check 
  CHECK (block_type IN ('libre', 'materia', 'trabajo', 'materia_trabajo'));
```

**PASOS:**
1. Seleccionar TODO el código (Ctrl+A)
2. Reemplazar por el código de arriba (Ctrl+V)
3. Clic en botón **"Run"** (verde, arriba a la derecha)
4. Esperar mensaje de éxito

---

## Paso 4: Verificar Éxito

**Esperado:**
- ✅ Mensaje: "Query executed successfully"
- ✅ Sin mensajes de error rojo
- ✅ Resultado: "0 rows affected" (si es la primera ejecución)

**Si da error:**
- Copiar el error exacto
- Reportar con captura de pantalla

---

## Paso 5: Verificar en Estructura de Tabla

1. Ir a **Database** (sidebar izquierdo)
2. Expandir **Tables**
3. Clic en **planner_blocks**
4. En la pestaña **Structure**, verificar:
   - ✅ Columna `duration_minutes` existe (type: int8)
   - ✅ Columna `notes` existe (type: text)
   - ✅ Columna `block_type` constraint permite 4 valores

---

## Paso 6: Recargar Aplicación

1. Ir a http://localhost:5174/
2. Hacer F5 (reload completo)
3. Abrir DevTools (F12)
4. Verificar no hay errores en Console

---

## Opción Alternativa (Si Supabase Falla)

Si prefieres hacerlo desde la CLI:

```bash
# 1. Desde terminal del proyecto
npx supabase db push
```

O manualmente:

```bash
# Conectar a Supabase directamente
psql postgres://user:password@host:port/dbname < migrations_planner_v2.sql
```

---

## ❌ Troubleshooting

### "ERROR: column already exists"
- Normal si ejecutaste dos veces
- Seguro: `ADD COLUMN IF NOT EXISTS` lo evita
- Puedes ejecutar de nuevo sin problema

### "ERROR: constraint does not exist"
- Normal si es primera vez
- El `DROP CONSTRAINT IF NOT EXISTS` lo maneja

### "ERROR: permission denied"
- Verifica usuario Supabase tiene permisos
- Usa la cuenta de admin del proyecto

### No ve cambios en la app
- Recargar: F5 (no Ctrl+Shift+R, que limpia cache)
- Abrir en modo incógnito (Ctrl+Shift+N)
- Limpiar localStorage:
  ```javascript
  // En DevTools Console
  localStorage.clear();
  location.reload();
  ```

---

## ✅ Confirmación Final

Después de migración, en Supabase **SQL Editor** ejecutar:

```sql
-- Verificar columnas existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'planner_blocks'
ORDER BY ordinal_position;
```

**Esperado en resultados:**
- `duration_minutes` | `integer`
- `notes` | `text`
- Plus todas las columnas anteriores

---

**¿Migración completada?** ✅ Pasar a GUIA_VERIFICACION_PLANNER_V2.md
