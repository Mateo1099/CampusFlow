# Guía de Verificación - Planificador Semanal V2

**Estado:** Listo para testing  
**Fecha de Implementación:** 26 de abril de 2026

## ✅ Pre-requisitos antes de probar

1. **Ejecutar migración SQL en Supabase (MUY IMPORTANTE)**
   ```sql
   ALTER TABLE planner_blocks 
     ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

   ALTER TABLE planner_blocks 
     DROP CONSTRAINT IF EXISTS planner_blocks_block_type_check;

   ALTER TABLE planner_blocks
     ADD CONSTRAINT planner_blocks_block_type_check 
     CHECK (block_type IN ('libre', 'materia', 'trabajo', 'materia_trabajo'));
   ```

2. **Recargar la aplicación** después de ejecutar SQL
3. **Abrir DevTools (F12)** para monitorear errores en consola

---

## 🧪 Checklist de Funcionalidad

### 1. Interfaz Principal - Planificador Semanal
**Esperado:** Pantalla con título "PLANIFICADOR SEMANAL" en mayúsculas

- [ ] Página se carga sin errores en consola
- [ ] Botón "NUEVA PLANIFICACIÓN" visible
- [ ] Filtros (Todas, UNAD, SENA, Personalizado) funcionan
- [ ] Conteos de filtros reflejan número de planificaciones

### 2. Crear Planificación
**Hacer:** Clic en "NUEVA PLANIFICACIÓN"

**Esperado Modal:**
- [ ] Título: "NUEVA PLANIFICACIÓN" (en mayúsculas)
- [ ] Campo "Nombre" obligatorio (*)
- [ ] Dropdown "Categoría" con 3 opciones: UNAD, SENA, Personalizado
- [ ] Campo "Objetivo Semanal" (opcional)
- [ ] Selector de color con 4 presets + color picker
- [ ] Si selecciona "Personalizado" → campo "Nombre personalizado" aparece
- [ ] Botones "CANCELAR" y "GUARDAR"

**Hacer:**
1. Llenar nombre: "Fase 4 - Grafos"
2. Categoría: "UNAD"
3. Objetivo: "Completar ejercicios de grafos"
4. Color: Seleccionar amarillo
5. Clic "GUARDAR"

**Esperado:**
- [ ] Modal se cierra
- [ ] Nueva tarjeta aparece en la lista
- [ ] Categoría muestra "UNAD" en amarillo
- [ ] Objetivo visible en tarjeta
- [ ] Progreso inicial: 0/0 bloques

### 3. Abrir Planificación
**Hacer:** Clic en la tarjeta creada

**Esperado:**
- [ ] Abre vista detallada con calendario semanal
- [ ] Encabezado muestra nombre, categoría, objetivo
- [ ] Botón "AGREGAR BLOQUE"
- [ ] Grid semanal: 7 columnas (días), 3 filas (mañana/tarde/noche)
- [ ] Alertas inteligentes aparecen (si aplica)
- [ ] Resumen visible con:
  - [ ] Avance (0% inicialmente)
  - [ ] Completados: 0
  - [ ] Pendientes: 0
  - [ ] En Proceso: 0

### 4. Crear Bloque LIBRE
**Hacer:** Clic en "AGREGAR BLOQUE" o + en celda

**Esperado Modal:**
- [ ] Título: "AGREGAR BLOQUE" (mayúsculas)
- [ ] Campo "Día" predeterminado (lunes)
- [ ] Campo "Momento" predeterminado (mañana)
- [ ] Campo "Título del bloque" (*)
- [ ] Dropdown "Tipo de bloque" con 4 opciones:
  - [ ] 🔹 Libre (sin vincular)
  - [ ] 📚 Vinculado a Materia
  - [ ] 📝 Vinculado a Trabajo
  - [ ] 📚📝 Materia + Trabajo
- [ ] Campo "Duración (min)" (opcional)
- [ ] Dropdown "Estado Inicial" (pendiente, en proceso, completado)
- [ ] Textarea "Nota" (opcional)

**Hacer:**
1. Día: "Lunes"
2. Momento: "Mañana"
3. Título: "Ejercicio 1"
4. Tipo: "Libre"
5. Duración: "60"
6. Nota: "Resolver problema básico de grafos"
7. Estado: "Pendiente"
8. Clic "GUARDAR"

**Esperado:**
- [ ] Bloque aparece en Lunes/Mañana
- [ ] Muestra "Ejercicio 1" como título
- [ ] Muestra "⏱️ 60m" (duración)
- [ ] Muestra "🔹" (libre, sin iconos de materia/trabajo)
- [ ] Nota visible en hover o panel del bloque
- [ ] Estado en select: "Pendiente"
- [ ] Progreso actualizado: 1 bloque total, 0 completados

### 5. Crear Bloque VINCULADO A MATERIA
**Hacer:** "AGREGAR BLOQUE"

**Setup:**
1. Día: "Martes"
2. Momento: "Tarde"
3. Título: "Implementar DFS"
4. Tipo: **"📚 Vinculado a Materia"**

**Esperado:**
- [ ] Campo "Materia" aparece bajo el dropdown Tipo
- [ ] Dropdown muestra lista de materias
- [ ] Puedo seleccionar materia

**Hacer:**
1. Seleccionar una materia (cualquiera)
2. Duración: "90"
3. Clic "GUARDAR"

**Esperado:**
- [ ] Bloque en Martes/Tarde
- [ ] Título: "Implementar DFS"
- [ ] Icono 📚 visible
- [ ] Sin icono 📝
- [ ] Duración: "⏱️ 90m"

### 6. Crear Bloque VINCULADO A TRABAJO
**Hacer:** "AGREGAR BLOQUE"

**Setup:**
1. Día: "Miércoles"
2. Momento: "Noche"
3. Título: "Diagramas de flujo"
4. Tipo: **"📝 Vinculado a Trabajo"**

**Esperado:**
- [ ] Campo "Trabajo / Tarea" aparece
- [ ] Dropdown muestra lista de trabajos
- [ ] Mensaje informativo: "ℹ️ El estado del bloque es independiente del trabajo real"

**Hacer:**
1. Seleccionar un trabajo
2. Clic "GUARDAR"

**Esperado:**
- [ ] Bloque aparece en Miércoles/Noche
- [ ] Icono 📝 visible
- [ ] Sin icono 📚

### 7. Crear Bloque MATERIA + TRABAJO
**Hacer:** "AGREGAR BLOQUE"

**Setup:**
1. Día: "Jueves"
2. Momento: "Tarde"
3. Título: "Revisión final"
4. Tipo: **"📚📝 Materia + Trabajo"**

**Esperado:**
- [ ] Campo "Materia" aparece
- [ ] Campo "Trabajo / Tarea" aparece (debajo o al lado)

**Hacer:**
1. Materia: Seleccionar
2. Trabajo: Seleccionar
3. Clic "GUARDAR"

**Esperado:**
- [ ] Bloque muestra ambos iconos: 📚📝
- [ ] Pertenece correctamente a ambos

### 8. Cambiar Estado de Bloque (NO afecta Trabajo Real)
**Hacer:** En un bloque vinculado a trabajo, cambiar estado a "Completado"

**Esperado:**
- [ ] Select en el bloque cambia a "Completado"
- [ ] Bloque se oscurece ligeramente (opacidad)
- [ ] Estado inicial: "✓" (completado)
- [ ] Resumen actualizado: 1 completado, 3 pendientes
- [ ] ⚠️ **IMPORTANTE:** Ir a Trabajos/TaskBoard → verificar que estado del trabajo SIGUE "sin entregar"

### 9. Resumen Inteligente Actualizado
**Esperado después de crear ~5 bloques:**

- [ ] Avance: % correcto (completados / total)
- [ ] "Completados" cuenta correcta
- [ ] "Pendientes" cuenta correcta
- [ ] "En Proceso" cuenta correcta
- [ ] "Día más ocupado" muestra día con más bloques
- [ ] "Duración total" muestra suma correcta en horas/minutos
- [ ] Alertas desaparecen según cambios (ej: cuando hay bloques)

### 10. Filtros Funcionan
**Hacer:** Ir atrás (botón atrás) → Clic en diferentes filtros

**Esperado:**
- [ ] "Todas": muestra todas las planificaciones
- [ ] "UNAD": solo muestra UNAD
- [ ] "SENA": solo muestra SENA
- [ ] "Personalizado": solo muestra Personalizado
- [ ] Conteos actualizan según filtro

### 11. Persistencia de Datos
**Hacer:** F5 (recargar página)

**Esperado:**
- [ ] Planificaciones siguen visibles
- [ ] Bloques persisten
- [ ] Estados se mantienen
- [ ] Notas se mantienen
- [ ] Duraciones se mantienen

### 12. Integridad de Otros Módulos
**Hacer:** Navegar a otros módulos desde sidebar

- [ ] **Dashboard:** Se abre sin errores, sin cambios visuales inesperados
- [ ] **TaskBoard (Trabajos):** Sigue funcionando, no hay cambios en estados de trabajos
- [ ] **Materias (Agenda):** Sin cambios
- [ ] **Pomodoro:** Sin cambios
- [ ] **Profile:** Sin cambios

### 13. Consola sin Errores
**Hacer:** F12 → Consola

**Esperado:**
- [ ] No hay errores rojos (ERROR)
- [ ] Puede haber warnings (amarillo) normales
- [ ] Sin "undefined" inesperados
- [ ] Sin "Cannot read property" de planners/blocks

---

## 🐛 Casos de Prueba Específicos

### Caso A: Cambiar estado de bloque NO modifica trabajo real
1. Crear bloque vinculado a trabajo
2. Cambiar bloque a "Completado"
3. Ir a TaskBoard
4. Verificar trabajo sigue "sin entregar"
5. **✅ PASÓ:** Trabajo no cambió
6. **❌ FALLÓ:** Trabajo cambió (reportar bug)

### Caso B: Duración se calcula correctamente
1. Crear 3 bloques con 60m, 90m, 30m
2. Total = 180m = 3h 0m
3. Resumen debe mostrar "3h 0m"
4. **✅ PASÓ:** Matemática correcta
5. **❌ FALLÓ:** Número incorrecto (reportar bug)

### Caso C: Notas se guardan y recuperan
1. Crear bloque con nota: "Revisar ejemplo 1"
2. Recargar página (F5)
3. Abrir planificador, ver bloque
4. Nota debe estar en hover/tooltip
5. **✅ PASÓ:** Nota visible
6. **❌ FALLÓ:** Nota desaparece (reportar bug)

### Caso D: Bloque materia_trabajo muestra ambos iconos
1. Crear bloque con ambas conexiones
2. Debe mostrar 📚 Y 📝
3. **✅ PASÓ:** Ambos iconos
4. **❌ FALLÓ:** Falta alguno (reportar bug)

---

## 📋 Reporte de Bugs

Si encuentras un error, incluye:

```
TÍTULO: [Breve descripción]
PASO REPRODUCE:
1. ...
2. ...
3. ...

ESPERADO: 
[Qué debería pasar]

ACTUAL:
[Qué pasó]

CONSOLA:
[Error si existe]

NAVEGADOR: Chrome/Firefox/Safari
```

---

## ✨ Notas Finales

- **No modificar SQL** sin supervisión
- **Guardar consola** (F12 > Console > clic derecho > Save as) si hay errores
- **Probar en incógnito** si hay dudas sobre caché
- **Limpiar localStorage** si hay comportamiento extraño:
  ```javascript
  localStorage.clear();
  ```

---

**¿Todo pasó? ¡Listo para producción!** 🚀
