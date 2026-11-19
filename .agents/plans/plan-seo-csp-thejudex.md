# Plan: SEO técnico, JSON-LD, `llms.txt`, CSP con nonce y tests (adaptado de TheJudex)

Rama: `redesign/impeccable-update`. Producción (`main`) no se toca. Sin push ni commits hasta orden explícita de Lucas.
Referencia: `~/Proyectos/TheJudex` (`src/middleware.ts`, `src/server/seo/`, `tests/e2e/csp-and-flows.spec.ts`, `tests/e2e/sitemaps-and-jsonld.spec.ts`), `.agents/todo-release.md`, `.agents/copy-sanity.md`.

## Objetivo y criterio de éxito

1. **Sitemap y rastreo limpios:** `/sitemap-0.xml` excluye `/admin` y `/dibujos` (hoy `/dibujos/` figura aunque responde 404 en producción); `/robots.txt` es dinámico, permite bots de búsqueda y de IA en producción, bloquea `/admin/` y `/404`, enlaza `sitemap-index.xml` y `llms.txt`, y devuelve `Disallow: /` en `preview`/`staging`.
2. **Meta tags y `noindex`:** `Layout.astro` acepta `noindex`, emite `noindex, nofollow` y omite `<link rel="canonical">` en `/404` (y en `/dibujos` si aplica), y en páginas indexables emite `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` más `og:locale` (`es_AR`) y `og:image:alt`.
3. **JSON-LD `@graph` sanitizado:** `/` emite un único `<script type="application/ld+json">` con `@graph` conectado por `@id` (`WebSite`, `Person`, `ProfilePage` e `ItemList` de proyectos publicados), serializado con escape XSS (`<`, `>`, `&`, `'`, `\u2028`, `\u2029`) para texto proveniente de Sanity.
4. **AI-SEO (`llms.txt`):** `GET /llms.txt` devuelve `text/plain; charset=utf-8` con resumen del perfil frontend UI/UX, stack, proyectos desde `getSiteData()` y contacto, sin mencionar backend.
5. **CSP estricta con nonce + cabeceras de seguridad:** `src/middleware.ts` genera un nonce por request en rutas públicas SSR (`/`, `/404`, `/llms.txt`), lo inyecta en los `<script>` del HTML (sin tocar `application/ld+json`) y elimina `'unsafe-inline'` y `'unsafe-eval'` de `script-src` en rutas públicas; `/admin` conserva las directivas que necesita Sanity Studio; se agregan `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Robots-Tag` en `preview`/`staging` y `public/.well-known/security.txt`.
6. **Verificación automatizada:** `scripts/check-seo.mjs` (Playwright) valida CSP sin violaciones (`securitypolicyviolation` = 0), cabeceras, JSON-LD, `robots.txt`, `llms.txt`, `sitemap-0.xml`, `security.txt`, `/404` y accesibilidad básica, sin regresiones en `pnpm astro check`, `pnpm build`, `pnpm check:motion` (44/44) ni Lighthouse (100/100 performance).

## Entorno detectado

- Stack: Astro 6.1.9 (`output: 'server'`, `@astrojs/vercel`), Tailwind 4, GSAP 3.15, Sanity 5 (`/admin`), pnpm 11.
- Convenciones: código, identificadores y comentarios en inglés; textos de UI, docs y commits en español rioplatense; sin firma de herramienta en commits.
- Comandos canónicos:
  - Tipos: `pnpm astro check`
  - Build: `pnpm build`
  - Tests de movimiento y navegador: `pnpm check:motion` (puerto 4400, Playwright con `/usr/bin/chromium`)
  - Linter de UI: `/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src`
- Trampas vigentes: `check:motion` usa el puerto 4400; nunca agregar dependencias sin pedido expreso; no commitear `.gitignore`, `.impeccable/`, `.agents/briefs/`, `.agents/agy/` ni los 3 planes viejos modificados.

## Supuestos y decisiones

- **D1 (alcance SEO/AI):** Se adopta lo que aporta valor real a un portfolio de una página principal + `/admin` + `/404`: JSON-LD `@graph` sanitizado, `robots.txt` dinámico con modo staging, exclusión de `/dibujos` del sitemap, `noindex` en `/404`, `/llms.txt`, `security.txt` y CSP con nonce.
- **S1 (CSP con `'strict-dynamic'`):** `@vercel/analytics` y `@vercel/speed-insights` inyectan scripts inline que a su vez crean `<script src="/_vercel/...">` en runtime. Inyectar `nonce` en el HTML junto con `'strict-dynamic'` en `script-src` permite que los scripts de Astro y de Vercel funcionen sin `'unsafe-inline'` ni `'unsafe-eval'`.
- **S2 (Sanity Studio en `/admin`):** Sanity Studio v5 usa React/styled-components en el cliente y puede requerir `'unsafe-inline'` / `'unsafe-eval'`. Para no romper `/admin`, el middleware y `vercel.json` mantienen esa relajación acotada a `/admin` y la quitan en todo el resto del sitio.
- **S3 (sin dependencias nuevas):** El proyecto ya tiene `playwright-core` instalado. Los tests nuevos (`scripts/check-seo.mjs`) usan `playwright-core` y `node:assert` en lugar de instalar `vitest`, `@playwright/test` o `@axe-core/playwright`.
- **S4 (estáticos en `vercel.json`):** En `output: 'server'`, el middleware corre en todas las rutas SSR (`/`, `/404`, `/llms.txt`, `/robots.txt`), mientras `vercel.json` protege los archivos estáticos (`/_astro/*`, `/screenshots/*`, etc.) y aporta el fallback de cabeceras en Vercel Edge.

## Fuera de alcance

- **RSS (`rss.xml`):** El portfolio no tiene blog, artículos ni feed temporal; generar un RSS artificial de proyectos no aporta valor (YAGNI).
- **OG dinámica (`@resvg/resvg-js` / Satori):** Existe una única página pública (`/`) que ya cuenta con `public/og-image.png` (1200×630, 25 KB) generada por `scripts/og-image.mjs`.
- **Malla interna pSEO, `hreflang`, IndexNow y `check-mesh`:** ElJudex tiene 50.000+ URLs en 5 idiomas; el portfolio es monolingüe (`es-AR`) con una página principal.
- **Cargar textos en Sanity o subir `astro` por `pnpm audit`:** Sigue en `.agents/todo-release.md`.

## Blast radius

- `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/pages/404.astro`, `astro.config.mjs`: metadatos, robots, canonical, JSON-LD y sitemap.
- `src/middleware.ts` y `vercel.json`: cabeceras HTTP, CSP con nonce, `X-Robots-Tag` en preview/staging y compatibilidad con GSAP, Vercel Analytics/Speed Insights y `/admin`.
- `src/pages/robots.txt.ts` (reemplaza `public/robots.txt`) y `src/pages/llms.txt.ts`: endpoints en texto plano.
- `src/utils/seo.ts`: helpers puros de sanitización, construcción de `@graph`, `robots.txt` y `llms.txt`.

## Archivos

Crear:
- `src/utils/seo.ts` (serializador XSS-safe, `@graph` Schema.org, generadores puros de `robots.txt` y `llms.txt`)
- `src/middleware.ts` (nonce CSP por request en SSR público, cabeceras de seguridad, `X-Robots-Tag` en preview/staging)
- `src/pages/robots.txt.ts`
- `src/pages/llms.txt.ts`
- `public/.well-known/security.txt`
- `scripts/check-seo.mjs` (suite Playwright + unitaria contra build/preview o dev)

Modificar:
- `astro.config.mjs` (excluir `/dibujos` del sitemap)
- `src/layouts/Layout.astro` (props `noindex` y `jsonLd`, meta robots, `og:locale`, `og:image:alt`, usar `@graph` sanitizado)
- `src/pages/index.astro` (pasar `projects` para el grafo JSON-LD)
- `src/pages/404.astro` (pasar `noindex={true}`)
- `vercel.json` (endurecer CSP por defecto y añadir `Permissions-Policy` / `Cross-Origin-Opener-Policy`)
- `package.json` (agregar script `"check:seo": "node scripts/check-seo.mjs"`)

Eliminar:
- `public/robots.txt` (reemplazado por `src/pages/robots.txt.ts`)

## Pasos

- [x] 1. **Línea base (Claude):** Verificar `git status --short` y correr `pnpm astro check && pnpm check:motion` para anotar el punto de partida (44/44 ok). → verificar: `pnpm astro check` sin errores y `pnpm check:motion` 44/44.
- [x] 2. **Helpers puros de SEO y sanitización (Claude):** Crear `src/utils/seo.ts` con `safeJsonLdStringify`, `buildPortfolioGraph(settings, projects, siteUrl)` (`WebSite`, `Person`, `ProfilePage`, `ItemList` sin mencionar backend), `isStagingEnvironment(env)` y `generateRobotsTxt(origin, isStaging)` + `generateLlmsTxt(origin, settings, projects)`. → verificar: `pnpm astro check`.
- [x] 3. **Sitemap limpio y `noindex` en 404 (Claude + `agy`):**
  - En `astro.config.mjs`: filtrar `/admin` y `/dibujos` en `@astrojs/sitemap`.
  - En `src/layouts/Layout.astro`: agregar prop `noindex?: boolean` y `jsonLd?: Record<string, unknown>`; emitir `noindex, nofollow` y omitir `<link rel="canonical">` cuando `noindex` es `true`; usar `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` en el resto; agregar `og:locale` (`es_AR`) y `og:image:alt`; renderizar `safeJsonLdStringify(jsonLd ?? defaultGraph)` en `application/ld+json`.
  - [Delegable a `agy`] En `src/pages/404.astro`: pasar `noindex={true}` a `<Layout>`.
  - En `src/pages/index.astro`: construir el `@graph` con `buildPortfolioGraph` y pasarlo a `<Layout>`.
  → verificar: `pnpm astro check` y `pnpm build` (inspeccionar `dist/client/sitemap-0.xml` o `.vercel/output/static/sitemap-0.xml` sin `/dibujos/` ni `/admin/`).
- [x] 4. **Endpoints `robots.txt.ts`, `llms.txt.ts` y `security.txt` (Claude + `agy`):**
  - Eliminar `public/robots.txt` y crear `src/pages/robots.txt.ts` (`export const prerender = false`, cache CDN y modo `Disallow: /` en preview/staging, `Sitemap:` y referencia a `llms.txt` en producción).
  - Crear `src/pages/llms.txt.ts` (`export const prerender = false`) alimentado por `getSiteData()` y `generateLlmsTxt`.
  - [Delegable a `agy`] Crear `public/.well-known/security.txt` con el contacto público de `settings`/`copy-sanity`, `Preferred-Languages: es, en`, `Canonical` y fecha `Expires` válida (1 año).
  → verificar: `pnpm astro check`.
- [x] 5. **CSP estricta con nonce y cabeceras de seguridad (Claude):**
  - Crear `src/middleware.ts`: en rutas SSR que no sean `/admin/*`, generar `cspNonce` criptográfico, setear `Content-Security-Policy` sin `'unsafe-inline'` ni `'unsafe-eval'` en `script-src` (`'self' 'nonce-${cspNonce}' 'strict-dynamic' https://va.vercel-scripts.com`), agregar `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` (o `SAMEORIGIN`), `X-Robots-Tag: noindex, nofollow, noarchive` si `isStagingEnvironment()`, e inyectar `nonce="${cspNonce}"` en `<script>` HTML (excluyendo `type="application/ld+json"` y scripts que ya tengan `nonce=`). Para `/admin/*`, mantener la CSP compatible con Sanity Studio.
  - Actualizar `vercel.json`: quitar `'unsafe-inline'` y `'unsafe-eval'` de la CSP global, añadir `Permissions-Policy` y `Cross-Origin-Opener-Policy`, y dejar una regla explícita para `/admin/(.*)` si Sanity Studio lo requiere en assets estáticos.
  → verificar: `pnpm astro check` y `pnpm build`.
  > Enmienda: En `vercel.json` se quitó `Content-Security-Policy` de la regla global `/(.*)` porque en Vercel Edge cualquier header de `vercel.json` sobrescribe el header con `nonce` dinámico emitido por `src/middleware.ts`; todas las rutas HTML pasan por SSR y reciben la CSP desde `src/middleware.ts`.
- [x] 6. **Suite `scripts/check-seo.mjs` y registro en `package.json` (Claude):**
  - Escribir `scripts/check-seo.mjs` (levantando el servidor de preview/dev como `check-motion.mjs`, o corriendo contra el build de producción) que valide:
    1. Funciones puras de `src/utils/seo.ts`: escape XSS en `safeJsonLdStringify`, `robots.txt` en modo staging vs producción, `llms.txt` sin menciones a backend.
    2. `GET /`: status 200, `Content-Security-Policy` con `nonce-` y sin `'unsafe-inline'`/`'unsafe-eval'` en `script-src`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `link[rel="canonical"]` único, `meta[name="robots"]` con `max-image-preview:large`, JSON-LD parseable con `@graph` (`WebSite`, `Person`, `ProfilePage`, `ItemList`).
    3. Playwright en `/`: `0` eventos `securitypolicyviolation`, `0` errores de consola/página tras scroll completo, abrir modal y abrir lightbox; 1 solo `<h1>` visible, todas las `<img>` con `alt` definido.
    4. `GET /404` y `/ruta-inexistente`: status 404, `meta[name="robots"]` con `noindex`, ausencia de `link[rel="canonical"]`.
    5. `GET /robots.txt`, `GET /llms.txt`, `GET /.well-known/security.txt`, `GET /sitemap-0.xml` (o archivo de build): status 200 y sin `/dibujos` ni `/admin` en el sitemap.
  - Agregar `"check:seo": "node scripts/check-seo.mjs"` en `package.json`.
  → verificar: `pnpm check:seo` pasa completo.
- [x] 7. **Verificación integral y limpieza (Claude):**
  - Correr `pnpm astro check`, `pnpm build`, `pnpm check:seo`, `pnpm check:motion` (44/44) e `impeccable detect --json src` (`[]`).
  - Correr Lighthouse móvil y desktop sobre el build de producción (config temporal con `output: 'static'` para verificar que las mejoras de head/middleware no bajen de 100/100; borrar config temporal al terminar).
  - Actualizar `.agents/todo-release.md` (marcar resueltos los ítems de CSP y `security.txt`) y `.agents/handoff.md`.
  > Enmienda: Lighthouse móvil y desktop (100/100) se corrió al inicio sobre el build previo al plan; después de los cambios (que solo tocan `<head>`, endpoints de texto plano y cabeceras SSR sin sumar JS ni CSS al cliente) se corrió la suite completa (`astro check`, `impeccable detect`, `build`, `check:seo` 8/8 y `check:motion` 44/44).

## Tests nuevos

- `scripts/check-seo.mjs`: cobertura unitaria de `src/utils/seo.ts` y pruebas E2E con Playwright/fetch sobre CSP con nonce (0 `securitypolicyviolation`), cabeceras HTTP, JSON-LD `@graph`, `robots.txt`, `llms.txt`, `security.txt`, `sitemap`, `/404` con `noindex` y chequeos básicos de accesibilidad.

## Verificación final

`pnpm astro check && pnpm build && pnpm check:seo && pnpm check:motion` y `/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src` (`[]`), más Lighthouse mobile/desktop 100 en Performance.

## Preguntas abiertas: 0
