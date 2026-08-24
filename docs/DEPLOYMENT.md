# Checklist de Despliegue - CampusFlow

Sigue esta guía paso a paso antes de lanzar CampusFlow a un entorno de Producción (Vercel, Netlify o Firebase Hosting).

## 1. Variables de Entorno (Environment Variables)
Asegúrate de que el entorno de despliegue tenga configuradas estrictamente las siguientes variables:
- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Clave anónima pública de Supabase.

> [!WARNING]  
> Nunca incluyas la clave `service_role` en las variables expuestas a Vite.

## 2. Configuración de Base de Datos (Supabase)
- [ ] **Políticas RLS (Row Level Security)**: Todas las tablas (`tasks`, `courses`, `planner_blocks`, `user_security`, `user_settings`) deben tener el RLS habilitado y políticas estrictas que validen `auth.uid() = user_id`.
- [ ] **Índices**: Verificar índices en columnas frecuentemente consultadas (`user_id`, `status`, `deadline`).
- [ ] **MFA**: Confirmar que Supabase Auth tenga habilitada la inscripción de factores TOTP en su panel.

## 3. Pruebas y Construcción (Build)
- [ ] Ejecutar `npm run lint` para validar que no haya advertencias (Warnings == Errors en pipelines estrictos).
- [ ] Ejecutar `npm run test:unit` para validar la integridad de las funciones modulares.
- [ ] Ejecutar `npm run build`. Validar que los chunks estén optimizados y no excedan los límites recomendados.
- [ ] Verificar que `sw.js` (Service Worker) y `workbox-*.js` se generen en la carpeta `dist/`.

## 4. PWA (Progressive Web App)
- [ ] Validar que `manifest.webmanifest` (o el manifiesto dinámico de Vite) incluya los logos `192x192` y `512x512` correctamente enrutados.
- [ ] Comprobar color de fondo (`background_color`) y tema (`theme_color`) configurados.

## 5. Auditoría de Seguridad Post-Deploy
- [ ] Navegar a una ruta protegida sin sesión y verificar la redirección a `/login`.
- [ ] Verificar que la sesión no caduque prematuramente ni deje tokens expuestos en el lado del cliente (fuera del control seguro de Supabase SDK).

## 6. Monitoreo
- [ ] Configurar umbrales de uso de base de datos en Supabase.
- [ ] Revisar logs del Service Worker (DevTools -> Application -> Service Workers) para asegurar registro exitoso y actualizaciones (`update`).
