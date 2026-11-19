# AGENTS.md — Portfolio (Lucas Araya)

Portfolio personal de Lucas Araya (`lucasaraya.com.ar`), programador fullstack con foco en frontend y UI/UX.
Stack: Astro 6 SSR (`@astrojs/vercel`), TypeScript, Tailwind CSS v4, GSAP, Sanity CMS (`/admin`) y Playwright.

## Límites Operativos
- **Nunca:** push ni commit sin orden explícita; leer o editar `.env`; agregar dependencias sin preguntar; tocar código ajeno fuera del pedido.
- **Preguntar:** borrado de documentos en Sanity `production`; cambios en producción o decisiones de producto ambiguas.
- **Siempre:** reutilizar componentes existentes; validar URLs/inputs externos; mantener accesibilidad e `prefers-reduced-motion`; correr verificación antes de cerrar.

## Comandos Esenciales
- Desarrollo: `pnpm dev`
- Tipos Astro/TS: `pnpm astro check`
- Build producción: `pnpm build`
- Chequeo SEO, CSP y `/admin`: `pnpm check:seo`
- Suite de movimiento y responsive (Playwright): `pnpm check:motion` (test puntual: `ONLY=<regex> pnpm check:motion`)
- Sanity staging/producción: `pnpm sanity:apply-staging`, `pnpm sanity:diff`, `pnpm sanity:promote -- --apply`

## Mapa del Repositorio
- `src/pages/`: páginas SSR (`index.astro`, `404.astro`, `dibujos.astro`), endpoints `robots.txt.ts` y `llms.txt.ts`.
- `src/components/`: UI de secciones (`Header`, `Hero`, `ProjectsSection`, `FeaturedProject`, `ProjectCard`, `ProjectModal`, `About`, `ContactSection`, `Footer`, `Signature`, `SocialLinks`).
- `src/components/scenes/` y `src/scripts/motion/`: escenas SVG por capas y coreografía GSAP (`flight.ts`, `hero.ts`, `about.ts`, `contact.ts`).
- `src/config/site.ts`: switch de firma (`SIGNATURE_VARIANT = 'kalam' | 'marker'`).
- `src/utils/`: integración Sanity + fallbacks (`sanity.ts`), SEO/JSON-LD (`seo.ts`), íconos (`icons.ts`).
- `src/middleware.ts`: cabeceras de seguridad y CSP con nonce en rutas públicas.
- `scripts/`: verificaciones (`check-motion.mjs`, `check-seo.mjs`), `sanity-sync.mjs`, `screenshots.mjs`, `og-image.mjs`.
- `public/`: estáticos (`cv.pdf`, `og-image.png`, `screenshots/*.webp`, `fonts/`).

## Definición de Terminado
Ver `.agents/rules/core/00-agent-workflow.md`.

## Índice de Reglas (`.agents/rules/`)
| Regla | Archivo | Ámbito |
| :--- | :--- | :--- |
| Core 00-14 | `core/*.md` | Global |
| Convenciones del proyecto | `project/00-convenciones-del-proyecto.md` | Global |
| Web / Frontend | `project/20-web.md` | `src/**/*.astro, *.tsx, *.css` |

## Mantenimiento
Menos de 150 líneas. Procedimientos largos van a `.agents/skills/` o `.agents/copy-sanity.md`. Una regla nueva solo si se repite un error.
