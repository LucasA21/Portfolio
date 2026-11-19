# Copy y sincronización de Sanity (`staging` → `production`)

Posicionamiento definido por Lucas: **Fullstack Developer especializado en UI/UX** (mantiene perfil fullstack con foco fuerte en frontend, diseño de interfaz y rendimiento).
Los mismos textos por defecto viven en `src/utils/sanity.ts` y `src/layouts/Layout.astro`.

## Cómo trabajar sin cargar nada a mano en producción

1. En `sanity.io/manage` → tu proyecto (`mi-portfolio`) → **API → Tokens → Add API token** (permiso **Editor**), copiá el token.
2. En `.env` local agregá:
   - `PUBLIC_SANITY_DATASET=staging`
   - `SANITY_WRITE_TOKEN=<el token Editor>`
3. Inicializá `staging` clonando `production` (y si tu token no crea datasets, crealo antes en **Datasets → Add dataset → `staging` (Public)**): `pnpm sanity:setup-staging`.
4. Aplicá el copy nuevo, capturas claras, proyectos nuevos y borrado de PixDex en `staging`: `pnpm sanity:apply-staging`.
5. Probá en local (`pnpm dev`), revisá `/admin` si querés ajustar algo, y compará contra producción con `pnpm sanity:diff`.
6. Cuando todo convenza, promovelo a `production` sin cargar nada a mano: `pnpm sanity:promote -- --apply`.

## Site Settings incluidos en `pnpm sanity:apply-staging`

| Campo | Texto |
|---|---|
| `hero.greeting` | ¡Hola! Soy Lucas, |
| `hero.title` | Fullstack Developer |
| `hero.subtitle` | especializado en UI/UX. |
| `hero.lead` | Programador fullstack con foco en frontend y UI/UX (Astro, React y TypeScript). Me importa que cada producto se entienda a primera vista y cargue rápido. |
| `about.text` | Desarrollo aplicaciones web fullstack, pero donde más disfruto meter mano es en el frontend y la interfaz: jerarquía clara, ritmo visual y animaciones que acompañen el uso sin estorbar. |
| `seo.description` | Programador fullstack con foco en frontend y UI/UX. Interfaces claras, rápidas y productos web completos en Astro, React y TypeScript. |
| `contact.tagline` | Mandame un avión. |
| `contact.description` | Si tenés un proyecto en mente o estás buscando sumar gente a tu equipo, escribime y lo charlamos. |
| `contact.ctaLabel` | Copiar mail |
| `footer.copyright` | Lucas Araya. Dibujado y programado a mano. |

## Proyectos (se mantienen fullstack destacando UI/UX)

- **TheJudex, Lumen, SyncLife, Tamara Vasak, PixDex:** conservan su stack fullstack completo; en `TheJudex` conviene completar en `/admin` (sobre `staging`) las métricas reales en `highlights` (ej.: `0 KB` JS en catálogo, `5` idiomas, `+50.000` URLs o Lighthouse `100`).
- **Mail propio (opcional):** `hola@lucasaraya.com.ar` en `contact.email` cuando esté configurado el reenvío.
