<div align="center">
  <img src="./public/icons/logo-512.png" alt="CampusFlow Logo" width="120" />
  <h1>⚡ CAMPUSFLOW ⚡</h1>
  <p><strong>Gestor Académico Inteligente con estética Cyber Luxe & Gamificación</strong></p>

  [![React](https://img.shields.io/badge/React-18-00f3ff?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5-bc13fe?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-10b981?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-ff4d4d?style=for-the-badge&logo=pwa&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
</div>

---

## 🌌 Descripción
**CampusFlow** es una aplicación web progresiva (PWA) diseñada para revolucionar la forma en que los estudiantes universitarios organizan su vida académica. Combina un diseño de interfaz premium (*Cyber Luxe, Glassmorphism, Neón*) con herramientas de productividad y mecánicas de gamificación.

## ✨ Características Principales
- 🎯 **Gestión de Trabajos y Materias**: Tablero Drag & Drop con filtros por institución, prioridades automáticas y códigos de color.
- 📅 **Planificador Semanal ↔ Pomodoro**: Crea bloques de estudio con un clic y envíalos directamente a la sala de estudio de enfoque profundo (Pomodoro / Ultradiano) con sonidos ambientales (Lofi, Ondas Alfa, Ruido Blanco) incorporados.
- 🎮 **Gamificación (XP y Niveles)**: Sube de nivel completando tareas, manteniendo rachas diarias de acceso y gestionando tus entregas.
- 📱 **PWA & Modo Offline**: Instalable de forma nativa en escritorio y dispositivos móviles. Acceso instantáneo a la interfaz sin conexión con persistencia de caché (Workbox).
- 🔔 **Notificaciones Inteligentes**: Sistema interactivo y sutil con alertas visuales y sonoras (Web Audio API).

## 🚀 Guía de Inicio Rápido

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/campusflow.git
   cd campusflow
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno**
   Crea un archivo `.env` en la raíz y configura tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

## 📚 Documentación Técnica
Para una visión profunda de la arquitectura y cómo preparar este proyecto para su lanzamiento a producción, consulta:

- 🏗️ [**Arquitectura Técnica**](docs/ARCHITECTURE.md) - Estructura de Contexts, Tech Stack y diseño sistémico.
- 🚀 [**Checklist de Despliegue**](docs/DEPLOYMENT.md) - Políticas RLS de Supabase, validaciones Workbox y configuración de variables de producción.

---
<div align="center">
  <p>Construido con precisión y rendimiento. ✦</p>
</div>
