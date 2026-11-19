# To-do antes del merge a main (marcado por `dev-release-check`, 2026-11-06)

Estado del chequeo: LISTO CON RIESGOS. Rama `redesign/impeccable-update`.

## Contenido (primero en `staging` con `pnpm sanity:apply-staging` / `/admin`, luego `pnpm sanity:promote -- --apply`)
- [ ] Aplicar el copy actualizado de `.agents/copy-sanity.md` (Fullstack especializado en UI/UX, contacto "Mandame un avión.", copyright) en `staging` y promover a `production` antes de mergear.
- [ ] Cargar `highlights` de TheJudex (páginas indexadas, Lighthouse, qué hizo Lucas) y confirmar `featured`.
- [ ] Completar "Ahora mismo" (`about.now`) si querés sumar ítems más allá de "5to año de Licenciatura en Sistemas, UNTDF".
- [x] Poner `public/cv.pdf` (copiado desde `/home/lk/Descargas/CV.pdf`).
- [ ] Revisar el orden de los 3 primeros tags de cada proyecto en Sanity si hace falta.

## Seguridad
- [ ] `pnpm audit --prod`: 164 advisories, 2 críticos (`astro` 6.1.9 con aviso para menor que 7.2.8, y `tar`). Evaluar subir `astro` en una rama aparte y volver a correr `check:motion`; el resto cuelga de `sanity`.
- [x] CSP en `vercel.json`: `script-src` permite `'unsafe-inline'` y `'unsafe-eval'`. Revisar si se puede quitar (Astro inline scripts, Sanity Studio). **→ resuelto: `src/middleware.ts` aplica CSP con `nonce` + `'strict-dynamic'` en rutas públicas SSR y deja `/admin` compatible; `vercel.json` quita el override global de CSP.**
- [x] Agregar `public/.well-known/security.txt`. **→ hecho**

## Operación
- [ ] MANUAL: confirmar en Vercel que se puede hacer rollback al deploy anterior de main.
- [ ] MANUAL: pushear la rama, revisar el preview de Vercel (móvil y escritorio) y probar `/admin`.

## Cierre
- [ ] Correr de nuevo `dev-release-check` y `dev-verify` justo antes del merge.
- [ ] Merge a main solo con aprobación explícita de Lucas.

## Dataset `staging` en Sanity (flujo automatizado)
- [ ] Clonar producción a staging: `pnpm sanity:setup-staging` (pide login de Sanity la primera vez; no toca `production`).
- [ ] En `.env` local: `PUBLIC_SANITY_DATASET=staging` y `SANITY_WRITE_TOKEN=<token Editor de sanity.io/manage>`. (En Vercel Preview podés dejar `staging` recién cuando subas el preview final; mientras iterás alcanza con local).
- [ ] Aplicar el copy nuevo en `staging`: `pnpm sanity:apply-staging` (o ajustar algo en `/admin` local).
- [ ] Verificar diferencias antes de promover: `pnpm sanity:diff` / `pnpm sanity:promote` (dry-run).
- [ ] Pasar todo de `staging` a `production` sin cargar nada a mano: `pnpm sanity:promote -- --apply`.

## Capturas de las cards (`node scripts/screenshots.mjs`)
- [x] TheJudex y Tamara Vasak generadas en `public/screenshots/` (las cards las usan si no subís una captura en Sanity).
- [x] Lumen y SyncLife generadas en `public/screenshots/` a partir de su `mainImage` actual en Sanity (modo oscuro, provisorio hasta tener URL pública).
- [ ] Sin URL ni captura en card: PixDex (vertical 720x1600 en `mainImage`). Cargá el link en Sanity y volvé a correr `node scripts/screenshots.mjs` si querés captura horizontal.
- [ ] Tamara Vasak: la tienda muestra "Todavía no hay productos publicados"; volver a capturar cuando haya productos (`node scripts/screenshots.mjs tamara-vasak`).
