# Copy listo para pegar en Sanity (`/admin`, dataset `staging`)

Posicionamiento: frontend especializado en UI/UX, sin mencionar backend. Plan B si Lucas lo prefiere: "fullstack especializado en UI/UX". Omitir no es negar: ningún texto afirma "solo frontend".
Los mismos textos están como valores por defecto en `src/utils/sanity.ts`, `src/layouts/Layout.astro` y `src/sanity/seed.ts`; Sanity los pisa, así que hay que cargarlos allá. Nada de esto se escribió en Sanity desde el código (el dataset es compartido con producción).

## Site Settings

| Campo | Texto |
|---|---|
| `hero.greeting` | ¡Hola! Soy Lucas, |
| `hero.title` (H1, se mantiene) | Frontend Developer |
| `hero.subtitle` (H1, se mantiene) | especializado en UI/UX. |
| `hero.lead` (se mantiene) | Frontend desde Ushuaia, con Astro, React y TypeScript. Me importa que se entienda a primera vista y que cargue rápido. |
| `about.text` | Soy Lucas, frontend developer. Cuido la jerarquía, el ritmo y los detalles de movimiento: que cada pantalla se entienda a primera vista y se sienta viva. |
| `seo.description` | Frontend developer especializado en UI/UX. Interfaces claras, rápidas y con detalle, dibujadas y programadas desde Ushuaia. |
| `contact.tagline` | Mandame un avión. |
| `contact.description` | ¿Tenés un proyecto o una búsqueda? Escribime y te respondo. |

## Proyecto TheJudex (destacado)

- `description`: Directorio B2B de software con miles de páginas indexables y un catálogo que carga sin JavaScript de cliente.
- `tags`, en este orden (la card muestra los 3 primeros): Astro, TypeScript, Tailwind. Sacar PostgreSQL de la lista visible o dejarlo al final.
- `highlights` (métricas): solo con números que Lucas confirme. Hechos que ya estaban en el copy y se pueden usar sin inventar: 0 KB de JavaScript de cliente en el catálogo, 5 idiomas (en, es, pt, de, fr), escala de 1.000 a más de 50.000 URLs, WCAG 2.2 AA.
- `content` (cuerpo del modal): hoy cuenta pipeline en Python, PostgreSQL 16, Drizzle, Gemini y VPS. Para el posicionamiento, reescribirlo desde la interfaz con hechos que ya estaban:
  - El problema: directorios de software lentos y repetitivos; quería uno que escalara de 1.000 a más de 50.000 URLs con contenido único por ficha.
  - Qué hice: frontend en Astro 5 con 0 KB de JavaScript de cliente en el catálogo; 5 idiomas desde el día uno; SEO técnico (sitemaps, `llms.txt`, RSS, imágenes OG dinámicas, datos estructurados); accesibilidad WCAG 2.2 AA.
  - Calidad: un chequeo automático que bloquea cualquier página de catálogo con JavaScript de cliente.

## Pendiente de decidir (fuera del alcance del plan)

- SyncLife dice "Full-stack con Next.js 16, Quarkus/Kotlin y gRPC" y Lumen/PixDex mencionan Supabase y Gemini. Si el posicionamiento va sin backend, conviene reescribirlos igual que TheJudex.
- Mail propio (`hola@lucasaraya.com.ar` con reenvío gratuito) en `contact.email`.

Al mergear a `main`: cargar lo mismo en `production`; el sitio en vivo muestra el copy viejo hasta entonces.
