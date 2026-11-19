---
trigger:
  - "**/*.astro"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.css"
paths:
  - "**/*.astro"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.css"
description: Frontend: accesibilidad, rendimiento, estados de UI e i18n.
---

# 20. Web / Frontend

> **Por qué:** La accesibilidad y el rendimiento se rompen en silencio; son baratos de hacer bien al inicio.

1. Usa HTML semántico y teclado operable. Cada imagen lleva `alt`; cada campo, `label`.
   - No: `<div onclick>` como botón.
   - Sí: `<button>`.
2. Cubre los cuatro estados de toda vista con datos: cargando, vacío, error y éxito.
3. Envía el mínimo JavaScript al cliente; prefiere HTML y CSS. Carga imágenes con tamaño explícito y `loading="lazy"` fuera del primer pantallazo.
4. Si el proyecto tiene i18n, no escribas texto visible sin clave.
5. Usa los tokens de diseño existentes (colores, espacios); no agregues valores sueltos.
6. Cubre con prueba e2e los flujos críticos (registro, pago, formularios).
7. En Playwright local, usa la GPU: `--use-gl=angle --use-angle=gl --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy` en `launchOptions.args`, solo si existe `/dev/dri` y no hay `CI`. Sin esos flags Chromium headless renderiza por CPU (SwiftShader). Comprueba con `WEBGL_debug_renderer_info` que el renderizador no diga SwiftShader.
8. En e2e usa `reducedMotion: 'reduce'` por defecto, sesión sembrada con `storageState` en vez de iniciar sesión por pantalla, `page.clock` en vez de esperas fijas y localizadores por rol.

## Guardián
Linter de accesibilidad, Lighthouse y pruebas e2e.

<!-- adapt -->
- Auditoría UI y accesibilidad: `impeccable detect --json src` y `pnpm check:seo` (`axe` en E2E). E2E motion y responsive: `pnpm check:motion`.
<!-- /adapt -->
