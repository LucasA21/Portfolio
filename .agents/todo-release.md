# To-do antes del merge a main (marcado por `dev-release-check`, 2026-11-06)

Estado del chequeo: LISTO CON RIESGOS. Rama `redesign/impeccable-update`.

## Contenido (lo carga Lucas en `/admin` o en `public/`)
- [ ] Reemplazar en Sanity los textos viejos que pisan los nuevos: hero (título, subtítulo, saludo), tagline y descripción de contacto.
- [ ] Cargar `highlights` de TheJudex (páginas indexadas, Lighthouse, qué hizo Lucas) y marcarlo `featured`.
- [ ] Subir capturas reales (`screenshot` con `alt`) de TheJudex, Lumen, Tamara Vasak, SyncLife y PixDex.
- [ ] Completar "Ahora mismo" (`about.now`) más allá de "5to año de Licenciatura en Sistemas, UNTDF".
- [ ] Poner `public/cv.pdf` (hoy el botón "Descargar CV" apunta a un archivo que no existe).
- [ ] Ordenar los tags de cada proyecto en Sanity: la card muestra solo los 3 primeros.

## Seguridad
- [ ] `pnpm audit --prod`: 164 advisories, 2 críticos (`astro` 6.1.9 con aviso para menor que 7.2.8, y `tar`). Evaluar subir `astro` en una rama aparte y volver a correr `check:motion`; el resto cuelga de `sanity`.
- [ ] CSP en `vercel.json`: `script-src` permite `'unsafe-inline'` y `'unsafe-eval'`. Revisar si se puede quitar (Astro inline scripts, Sanity Studio).
- [ ] Agregar `public/.well-known/security.txt`.

## Operación
- [ ] MANUAL: confirmar en Vercel que se puede hacer rollback al deploy anterior de main.
- [ ] MANUAL: pushear la rama, revisar el preview de Vercel (móvil y escritorio) y probar `/admin`.

## Cierre
- [ ] Correr de nuevo `dev-release-check` y `dev-verify` justo antes del merge.
- [ ] Merge a main solo con aprobación explícita de Lucas.

## Dataset `staging` en Sanity (hacelo vos, necesita tu sesión de Sanity)
- [ ] Copiar producción a staging: `pnpm dlx sanity@latest dataset copy production staging` (te pide login; no toca `production`).
- [ ] En `.env` local: `PUBLIC_SANITY_DATASET=staging`. En Vercel, variable `PUBLIC_SANITY_DATASET`: `staging` para el entorno Preview y `production` solo para Production.
- [ ] Cargar los textos nuevos (hero, contacto, `now`, métricas, capturas) en `staging` desde `/admin` con el dataset en staging.
- [ ] Al mergear: copiar solo lo aprobado a producción (`dataset export staging` y `dataset import` o cargarlo a mano en `/admin` con `production`).

## Capturas de las cards (`node scripts/screenshots.mjs`)
- [x] TheJudex y Tamara Vasak generadas en `public/screenshots/` (las cards las usan si no subís una captura en Sanity).
- [ ] Sin URL, quedan con `[captura]`: SyncLife, Lumen, PixDex. Cargá el link en Sanity y volvé a correr el script.
- [ ] Tamara Vasak: la tienda muestra "Todavía no hay productos publicados"; volver a capturar cuando haya productos (`node scripts/screenshots.mjs tamara-vasak`).
