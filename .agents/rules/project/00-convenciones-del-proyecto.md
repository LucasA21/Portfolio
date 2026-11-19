---
trigger: always_on
description: Convenciones detectadas en Portfolio (stack, ramas, commits, Sanity staging y verificación).
---

# 00. Convenciones del Proyecto (Portfolio)

1. **Gestor y runtime:** usar `pnpm` (Node `>= 22.12.0`). No generar `package-lock.json`.
2. **Estilo de commits:** mensajes en español siguiendo Conventional Commits (`feat:`, `fix:`, etc.) sin emojis ni líneas de atribución (`Co-Authored-By` / herramienta).
3. **Ramas y deploy:** trabajar en ramas de feature (`redesign/...`); no tocar `main` ni promover Sanity `staging` a `production` sin confirmación.
4. **Idioma:** texto visible del sitio y docs en español rioplatense; nombres de símbolos y comentarios de código en inglés.
5. **Sanity CMS:** usar `PUBLIC_SANITY_DATASET=staging` en `.env` local; no editar contenido directo en `production`. Sincronizar cambios mediante `scripts/sanity-sync.mjs`.
6. **Imágenes de proyectos:** respetar modo claro coherente con `#F6F5F1`; capturas locales en `public/screenshots/*.webp` con copias `-600` y `-1200` y registro en `public/screenshots/index.json`.
7. **Verificación obligatoria tras cambios:** `pnpm astro check`, `pnpm build`, `pnpm check:seo` y `pnpm check:motion`.
