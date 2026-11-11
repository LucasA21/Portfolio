# Plan: pulido final del portfolio (bug del sobre, estela móvil, posicionamiento y `todo.md`)

Rama: `redesign/impeccable-update`. Producción (`main`) no se toca. Sin push. Commits solo con orden explícita de Lucas (Conventional Commits en español, sin emoji, sin firma de herramienta).
Antecedentes: `todo.md` (raíz), `.agents/handoff.md`, `.agents/todo-release.md`, snapshot `.impeccable/critique/2026-11-11T05-18-56Z__src-pages-index-astro.md`.

## Objetivo y criterio de éxito

1. **Bug del sobre:** al llegar al fondo y volver a subir, el sobre sale de la ranura, se vuelve a plegar en el avión (los mismos 6 fotogramas al revés) y el avión sigue su vuelo hacia arriba. Nunca se ven el sobre y el avión al mismo tiempo ni hay saltos de posición. Vale en desktop y en celular.
2. **Estela en móvil:** durante cada cruce de pantalla (menos de 1024 px) el avión deja una estela corta que lo sigue por detrás, en las dos direcciones del scroll.
3. **Posicionamiento:** el sitio se presenta como frontend especializado en UI/UX, sin mencionar backend en ningún texto que controle el código; los textos que viven en Sanity quedan listos en `.agents/copy-sanity.md` para que Lucas los pegue en `staging`.
4. Cada ítem de `todo.md` queda **hecho**, **descartado con motivo** o **derivado a Lucas** (acciones externas), sin ítems sin resolver.
5. No empeora nada: `pnpm check:motion` completo, `pnpm astro check` (0 errores), `pnpm build`, `impeccable detect --json src` en `[]`, y Lighthouse con performance 100 en móvil y desktop (hoy 100/100).
6. Nueva crítica de `/impeccable` con puntaje de 28/32 o más (hoy 23/32) y sin P1 abiertos.

## Entorno detectado

- Astro 6.1, Tailwind 4, GSAP 3.15 (ScrollTrigger, DrawSVG, MorphSVG, SplitText), Sanity embebido en `/admin`, pnpm 11. Sin `AGENTS.md`. Convención: código, identificadores y comentarios en inglés; chat, docs y commits en español.
- Verificación: `pnpm astro check` · `pnpm build` · `pnpm check:motion` (unos 3 min, sin `timeout`; 39 tests hoy; levanta su propio `astro dev` en el puerto 4400) · `/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src` (debe dar `[]`).
- Lighthouse local: build estático con config temporal (`output: 'static'`, `outDir: './.astro/lh-dist'`, `build.inlineStylesheets: 'always'`; con `outDir` en `/tmp` falla por EXDEV), servido con brotli y caché larga (el servidor de pruebas de la sesión anterior está descripto en `.agents/handoff.md`), `lighthouse@13.6.0` instalado en un directorio temporal fuera del repo, `CHROME_PATH=/usr/bin/chromium`. Borrar config y `.astro/lh-dist` al terminar. Best practices queda en 96 en local por los 404 de `/_vercel/*`; es esperado.
- Dev server: puerto 4402. Si aparecen 504 `Outdated Optimize Dep` o `delayedCall of undefined`, reiniciar con `astro dev --force`; no es un bug del sitio.
- Trampas vigentes: `pkill` en la misma línea que otro comando mata la línea (usar `kill <pid>` o `fuser -k <puerto>/tcp` en un comando aparte); `offsetTop` de `#about` no sirve en tests; en celular hay dos escenas de contacto y hay que leer la visible; no commitear `.gitignore`, `.projectmem/`, `.impeccable/` ni `.agents/briefs/`; `.agents/handoff.md` está ignorado por git.
- Skills: `dev-debug` es obligatoria antes de tocar el bug del sobre; `dev-verify` antes de dar cada fase por terminada; `impeccable` para decisiones de diseño. El resto del repo ya está documentado en `.agents/handoff.md`.

## Orquestación: Claude orquesta, `agy` hace lo fácil

**Claude (orquestador)** diseña, decide, escribe los prompts, revisa cada diff, corre las verificaciones y hace todo lo riesgoso. **`agy` con `gemini-3.8-flash-medium`** ejecuta las tareas chicas, repetitivas y bien especificadas para gastar menos tokens de Claude.

Cómo se corre `agy` (verificado en la sesión anterior):
- Un solo prompt no interactivo: `agy -p "$(cat <prompt>)" --model gemini-3.8-flash-medium --mode accept-edits --output-format text > <salida>`. El esfuerzo va en el sufijo del modelo (`-medium`); `--effort` no se combina con eso.
- `--mode plan` es solo lectura: se usa para revisiones y análisis. `accept-edits` es para tareas que editan archivos. Probar `accept-edits` con una tarea trivial (paso 0.3) antes de confiarle algo real; si pide permisos y se cuelga, usar `--dangerously-skip-permissions` solo con la lista de archivos del prompt y el control de diff de abajo.
- Correr en segundo plano (`run_in_background`) y trabajar en otra cosa; avisa al terminar.

Reglas de delegación (Claude las aplica sin excepción):
1. **Una tarea = un prompt autocontenido** en `.agents/agy/tasks/<id>.md`: objetivo, archivos que puede tocar (lista cerrada), cambio exacto, qué NO tocar, comando de verificación y "no hagas commit, no agregues dependencias, comentarios y código en inglés, textos de interfaz en español rioplatense".
2. **Línea base limpia antes de cada tanda:** `git status --short` solo con lo esperado y `git diff --stat` anotado.
3. **Control después de cada tarea:** `git diff --name-only` debe ser un subconjunto de la lista cerrada; si tocó otro archivo, `git checkout -- <archivo>` y se anota en el handoff. Claude lee el diff completo (son diffs chicos), corre la verificación de la tarea y, si falla, lo arregla él: no se reintenta más de una vez con `agy`.
4. **Tareas en paralelo solo si no comparten archivos** (máximo 3 a la vez). Las que tocan `flight.ts`, `contact.ts`, `hero.ts` o `check-motion.mjs` no se delegan nunca.
5. **No leer la salida completa de `agy`:** se lee `git diff` y las últimas 20 líneas de la salida.
6. Los archivos del orquestador (`.agents/agy/`) no se commitean.

Reparto:

| Hace Claude | Hace `agy` (Flash medio) |
|---|---|
| Bug del sobre y estela móvil (`flight.ts`, `contact.ts`) | `aria-label` de los 3 botones del lightbox y `aria-hidden` de decorativos |
| Todos los tests nuevos de `check-motion.mjs` | Textos de 13 px a 14 px, donde no cambia el layout |
| Diseño de la card, del header móvil, del cierre de la historia | Borrar `public/mano.svg` y el frame `pinned` huérfano de `InkThread.astro` |
| Decisiones de copy y verificación de hechos | Pie de página con GitHub y CV; "Ver más" que muestra todo si queda 1 |
| Layout de 2 columnas de las cards y su efecto en la ruta del avión | Script `scripts/og-image.mjs` y favicon de avión (Claude revisa el resultado a la vista) |
| Lighthouse, revisión final con `agy` en modo `plan` | Pasos mecánicos: renombrar, mover, ordenar imports |

## Supuestos y decisiones

- **D1 (Lucas):** contar que su especialidad es frontend, sin mencionar backend; "fullstack especializado en UI/UX" queda como plan B. Se interpreta así: el H1 actual ("Frontend Developer especializado en UI/UX.") **se mantiene** (ya dice frontend); se quitan las menciones de backend de Sobre mí, de la descripción de TheJudex y de sus tags, y se reescribe el copy genérico. Omitir no es negar: el texto no afirma "solo frontend" ni nada falso; si preguntan en una entrevista, TheJudex es un proyecto completo.
- **D2 (Lucas):** en móvil el avión debe tener estela; hay que arreglar el bug del sobre al subir.
- **D3 (Lucas):** no habrá más dibujos tuyos en Krita; los 12 PNG de `art/hero-capas/` son el set final. Lucas autoriza a Claude a dibujar cosas nuevas por su cuenta en SVG, como el avión y su desdoble.
- **D4 (Claude, dentro de D3):** se dibujan por código solo **objetos** (props), reutilizando el trazo de los aviones existentes. No se redibuja al personaje (cabeza, brazos, manos): hacerlo por código se rechazó dos veces por trazo rígido y manos robóticas, y no hay arte nuevo para reemplazarlo. Por eso quedan descartados la cabeza girada en Sobre mí, el saludo en contacto y pasar Sobre mí y contacto a fotogramas.
- **S1:** el copy final de contacto y de Sobre mí (propuestas abajo, paso 4.1) es editable; vive en Sanity y en los valores por defecto de `src/utils/sanity.ts`. Lucas lo ajusta en `staging`.
- **S2:** desktop pasa a **2 columnas** para las 4 cards chicas (hoy 4 en fila de 215 px con textos de 13 px y capturas de 150 px de alto). Es una sola clase (`lg:grid-cols-2`) y se revierte si no gusta. El motor de la ruta del avión ya agrupa por filas.
- **S3:** el avión sigue iluminando cards una por una (a Lucas le gustó); solo se diferencia el anillo del avión del hover para que no se confundan (borde dibujado vs. levantar).
- **S4:** `/impeccable init` (PRODUCT.md) y `document` (DESIGN.md) necesitan entrevista con Lucas: quedan como paso final interactivo, separado.
- **S5:** el reveal del H1 (SplitText) no se toca: la fuente va precargada y Lighthouse da FCP y LCP de 1,0 s en móvil sin retraso del título.
- **S6:** nada se escribe en Sanity: el dataset es compartido con producción hasta crear `staging`.

## Fuera de alcance

- **Pendientes de `.agents/todo-release.md`** (textos de Sanity, `cv.pdf`, capturas que faltan, seguridad, dataset `staging`, push): no se repiten acá.
- **Descartado por D4:** reacciones del personaje (cabeza girada en Sobre mí, saludo en contacto) y escenas de Sobre mí y contacto por fotogramas; requieren redibujar al personaje.
- Limpiar el piloto por código de `/dibujos` y `src/components/character/`: decisión de Lucas; no se toca.
- Actualizar `impeccable` a la v4.8.2: solo si Lucas lo pide.

## Blast radius

`flight.ts` (vuelo, entrega, cruces móviles), `contact.ts` (entrega), `ContactScene.astro` y `InkThread.astro` (sobre y estela), `ProjectCard.astro`, `FeaturedProject.astro`, `ProjectsSection.astro`, `ProjectModal.astro`, `Header.astro`, `Footer.astro`, `About.astro`, `index.astro`, `sanity.ts`, `Layout.astro`, `global.css`. Los tests de ruta y cards (`ruta-sin-verticales-*`, `cards-elevacion`, `hilo-entre-cards-*`, `avion-orientacion`) dependen del layout de las cards: el paso 5.2 los corre antes y después.

## Causa raíz del bug del sobre (confirmada con una reproducción, 1440x900)

Al subir desde el fondo, `deliver(false)` de `contact.ts` hace dos cosas **a la vez y sin coordinar**: `post.reverse()` (el sobre sube desde la ranura, 0,7 s, y baja la bandera) y `hooks.reset()` (suelta `st.lock`, y `render()` pone el dibujo del avión en su punto de la ruta). Medición por pasos de 90 px de scroll: en el paso 1 el avión ya aparece volando lejos del buzón; entre los pasos 3 y 5 el sobre sube solo desde la ranura (`transform` de 300 a 0 px); recién en el paso 6 `data-delivered` pasa a `false`. Nadie reproduce al revés los 6 fotogramas del desdoble (`fold-2`, `fold-1`, `sheet`, `unfold-2`, `unfold-1`, `plane`), por eso se ve un sobre que sube en lugar de un avión que se arma. En celular `reset` solo apaga el avión: el sobre sube y no pasa nada más.

Diseño del arreglo (máquina de estados, en este orden):
`entregado` → `sobre sale de la ranura` (`post.timeScale(2).reverse()`, unos 0,8 s) → `el sobre se pliega en avión` (fotogramas al revés, cada 0,11 s, en la posición y escala del sobre) → `catch-up` (el avión se mezcla de la pose del buzón a su posición de scroll en 0,4 s, igual que `st.intro` en el despegue) → `vuelo normal`. En celular, después del plegado el avión **sale planeando por el borde derecho** (espejo de la llegada) y los cruces retoman. Mientras dura la secuencia, `st.lock` sigue en `true`. Si el scroll vuelve a bajar a mitad de la secuencia, `hooks.unfold` mata la secuencia y repite la entrega desde la pose actual.

## Archivos

Crear: `.agents/copy-sanity.md`, `scripts/og-image.mjs`, `public/favicon.svg` (reemplazo), `.agents/agy/run-task.sh`, `.agents/agy/tasks/*.md` (no se commitean).
Modificar: `src/scripts/motion/flight.ts`, `src/scripts/motion/contact.ts`, `src/components/InkThread.astro`, `src/components/scenes/ContactScene.astro` (solo si hace falta una clase), `src/components/ProjectCard.astro`, `src/components/FeaturedProject.astro`, `src/components/ProjectsSection.astro`, `src/components/ProjectModal.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/About.astro`, `src/components/ContactSection.astro`, `src/components/WaveSeparator.astro`, `src/components/scenes/HeroFrames.astro`, `src/pages/index.astro`, `src/utils/sanity.ts`, `src/layouts/Layout.astro`, `src/styles/global.css`, `scripts/check-motion.mjs`, `public/og-image.png`, `todo.md`, `.agents/handoff.md`.
Eliminar: `public/mano.svg`, `public/favicon.ico` (si el SVG alcanza; se confirma en el paso 6.3), `src/components/planes/a-plane-pinned.svg`.

## Pasos

Marca de dueño: **[C]** Claude, **[A]** `agy`. Después de cada fase: `dev-verify` y actualizar el handoff.

### Fase 0: línea base y herramientas
- [x] 0.1 [C] `git status --short`, `git log --oneline -3`, `pnpm astro check`, `pnpm check:motion` (anotar el conteo: 39 ok) y `impeccable detect --json src` → verificar: todo verde y `[]`; anotar en el handoff.
- [x] 0.2 [C] Crear `.agents/agy/run-task.sh` (recibe el id, ejecuta `agy -p "$(cat .agents/agy/tasks/<id>.md)" --model gemini-3.8-flash-medium --mode accept-edits --output-format text > .agents/agy/out/<id>.txt`) y agregar `.agents/agy/` a `.git/info/exclude` → verificar: `git status --short` no lo lista.
- [x] 0.3 [A] Tarea de prueba `t0`: "agregá un comentario en inglés de una línea al principio de `scripts/screenshots.mjs`" → verificar: `git diff --name-only` muestra solo ese archivo, no hubo pedido de permisos; revertir con `git checkout -- scripts/screenshots.mjs`. Si falla, probar con `--dangerously-skip-permissions` y anotar el resultado.

### Fase 1: el bug del sobre (Claude, `dev-debug` primero)
- [x] 1.1 [C] Invocar `dev-debug`. Escribir en `scripts/check-motion.mjs` los tests `entrega-reversa` (desktop 1440x900) y `entrega-reversa-mobile` (390x844) que **fallan hoy**: tras llegar al fondo y subir en pasos de 90 px, muestrear cada 50 ms (a) que el sobre (`[data-envelope]` visible) y el avión (`[data-plane]` con opacidad 1) nunca estén visibles a la vez, (b) que los fotogramas del avión aparezcan en este orden: `fold-2`, `fold-1`, `sheet`, `unfold-2`, `unfold-1`, `plane`, (c) que la distancia entre posiciones consecutivas del avión sea de 120 px o menos (sin teletransporte) y (d) que al final `data-delivered` sea `false` y el avión esté volando (desktop) o fuera de pantalla (móvil) → verificar: `pnpm check:motion` falla solo en esos 2 tests (reproduce el bug).
  > Enmienda: el umbral de salto pasó de 120 a 200 px por muestra de 50 ms y solo se mide en el traspaso (pliegue + catch-up o planeo): el vuelo normal por scroll rápido ya supera 120 px por muestra en el tramo de aterrizaje. El catch-up dura `clamp(distancia/800, 0.4, 1.4)` s en vez de 0,4 s fijo, para que no cruce la página de golpe. Se agregó `ONLY=<regex>` a `check-motion.mjs` para correr tests sueltos.
- [x] 1.2 [C] `src/scripts/motion/contact.ts`: `deliver(false)` pasa a `post.timeScale(2).reverse()` y, en `onReverseComplete`, fija `data-delivered="false"` y llama `hooks.refold()` (reemplaza a `hooks.reset`); `deliver(true)` restablece `post.timeScale(1)`. Mantener `hooks.unfold` para la entrega. → verificar: `pnpm astro check`.
- [x] 1.3 [C] `src/scripts/motion/flight.ts`: implementar `hooks.refold`: `st.lock` queda en `true`; mostrar el avión en `fold-2` en la pose del sobre (`mail.x`, `mail.y`, escala `envScale()`), recorrer los fotogramas al revés cada 0,11 s mientras la escala y la rotación vuelven a las del vuelo; desktop: catch-up de 0,4 s hacia la posición del scroll (variable `st.blend` de 0 a 1 usada en `render()`), luego `st.lock = false`; móvil: planeo hacia el borde derecho (espejo de la llegada, 0,9 s) y `opacity` 0. Un solo `refolding` timeline que `hooks.unfold` mata si el scroll vuelve a bajar. → verificar: `pnpm astro check` y los 2 tests nuevos pasan.
- [x] 1.4 [C] Revisar con capturas (desktop y 390 px) la secuencia completa en 12 cuadros y confirmar que el sobre no tapa el brazo ni la cúpula → verificar: contacto visual y `pnpm check:motion` completo en verde (los tests `reversa`, `entrega` y `desdoble-una-vez` siguen pasando).
- [x] 1.5 [C] `record_fix` en `projectmem` con la causa y el test.

### Fase 2: estela del avión en móvil (Claude)
- [x] 2.1 [C] `src/components/InkThread.astro`: agregar 3 `path` con `data-trail="m"` (anchos 1,1 / 1,8 / 2,6 y opacidades 0,25 / 0,55 / 0,95, igual que los de desktop), vacíos al inicio.
- [x] 2.2 [C] `flight.ts`, en `renderSmall`: guardar un historial de posiciones (una nueva cada 4 px de recorrido, máximo unos 120 px de largo en total), reiniciarlo al cambiar de cruce o al ocultar el avión, y escribir los 3 tramos en los `path`; la estela sigue la dirección real del movimiento, así que funciona igual al subir. Sin cruce activo, `d=""`. Con reduced motion no hay estela (esa rama ya retorna antes).
- [x] 2.3 [C] `scripts/check-motion.mjs`: el test `mobile-sin-estela` hoy exige que ningún `[data-trail]` tenga `d`; cambiarlo a `[data-trail="a"], [data-trail="b"]` (las rutas largas siguen sin existir en móvil) y agregar `mobile-estela`: durante un cruce `[data-trail="m"]` tiene `d` no vacío, su largo es de 160 px o menos, su extremo queda a 30 px o menos del avión, y sin cruce está vacío; también al subir → verificar: `pnpm check:motion` verde, capturas de un cruce a 390 y 820 px.

### Fase 3: accesibilidad y limpieza chica (delegable a `agy`, archivos disjuntos)
Tareas 3.1 a 3.4 en paralelo (cada una con su prompt); Claude revisa cada diff.
- [x] 3.1 [A] `src/components/ProjectModal.astro` y `ProjectsSection.astro`: envolver la imagen del modal en un `<button type="button" aria-label="Ampliar imagen del proyecto">` que abre el lightbox (mismo handler que hoy, sin romper el swipe), y agregar `aria-label` a `#close-lightbox` ("Cerrar vista ampliada"), `#lightbox-prev` ("Imagen anterior") y `#lightbox-next` ("Imagen siguiente") → verificar: `pnpm astro check`; con Playwright, abrir el modal con Enter, Tab hasta el botón de ampliar y Enter abre `#project-lightbox` (`open`), Esc lo cierra y el foco vuelve al botón.
- [x] 3.2 [A] `WaveSeparator.astro`: `aria-hidden="true"` en el SVG; íconos decorativos dentro de links con texto (flechas de "Proyectos" y "Ver más") con `aria-hidden="true"` → verificar: `pnpm astro check` y la medición `svg sin aria-hidden` lista solo SVG con `role="img"`.
- [x] 3.3 [A] `ProjectCard.astro` (tags), `FeaturedProject.astro` ("Destacado · en producción") y `About.astro` ("Ahora mismo"): `text-[13px]` a `text-sm` (14 px) → verificar: la medición de textos menores a 14 px da 0 y no hay desborde a 320, 390 y 1024 px.
- [x] 3.4 [A] Borrar `public/mano.svg` (confirmar antes con `grep -rn "mano.svg" src public scripts` que nada lo usa) y el frame huérfano `pinned` de `InkThread.astro` junto con `src/components/planes/a-plane-pinned.svg` (lo dejó el cambio que quitó el pin; las variantes B y C se conservan) → verificar: `pnpm astro check`, `pnpm build` y `pnpm check:motion` sin cambios.
- [x] 3.5 [A] `ProjectsSection.astro`: en la lógica de "Ver más", si quedan 1 o ninguna card ocultas, mostrar todas (en móvil hoy oculta una sola card detrás de un toque) → verificar: a 390 px con 5 proyectos no aparece el botón y se ven 4 cards; con más proyectos sigue funcionando.
- [x] 3.6 [C] `HeroFrames.astro`: `aria-label` del dibujo del hero que cuenta la acción ("Lucas en su escritorio; al bajar tira un avión de papel que recorre la página") → verificar: `pnpm astro check`.

### Fase 4: posicionamiento y copy (Claude; nada se escribe en Sanity)
- [x] 4.1 [C] Crear `.agents/copy-sanity.md` con los textos listos para pegar en `/admin` (en `staging`), uno por campo, y aplicar los mismos como valores por defecto en `src/utils/sanity.ts` y `src/layouts/Layout.astro`:
  - **H1** (se mantiene): "Frontend Developer especializado en UI/UX."
  - **Lead:** "Frontend desde Ushuaia, con Astro, React y TypeScript. Me importa que se entienda a primera vista y que cargue rápido." (se mantiene)
  - **Sobre mí:** "Soy Lucas, frontend developer. Cuido la jerarquía, el ritmo y los detalles de movimiento: que cada pantalla se entienda a primera vista y se sienta viva." (sin la frase del backend)
  - **TheJudex, descripción:** "Directorio B2B de software con miles de páginas indexables y un catálogo que carga sin JavaScript de cliente." (solo hechos que ya estaban en el copy; sin PostgreSQL, IA ni "SSR").
  - **TheJudex, tags en orden:** Astro, TypeScript, Tailwind (el card muestra solo los 3 primeros; PostgreSQL queda al final o se saca).
  - **TheJudex, métricas** (`highlights`): solo con números reales que Lucas confirme (hoy son placeholders `[ej: …]`).
  - **Meta description:** "Frontend developer especializado en UI/UX. Interfaces claras, rápidas y con detalle, dibujadas y programadas desde Ushuaia."
  - **Contacto:** tagline "Mandame un avión." y descripción "¿Tenés un proyecto o una búsqueda? Escribime y te respondo." (reemplaza "Hagamos equipo" y "Estoy con disponibilidad…").
  → verificar: `grep -rniE "backend|postgres|full ?stack" src --include="*.astro" --include="*.ts"` no devuelve textos de interfaz; `pnpm astro check`.
- [x] 4.2 [C] Anotar en `.agents/todo-release.md` que el copy de `.agents/copy-sanity.md` hay que cargarlo en `staging` y en `production` al mergear (el sitio en vivo todavía muestra el copy viejo hasta entonces).

### Fase 5: layout, cards y cierre de la historia (Claude)
- [x] 5.1 [C] Baseline: correr `pnpm check:motion` y guardar capturas de desktop (1440 y 1024) de la sección Proyectos antes de tocar el layout.
- [x] 5.2 [C] `ProjectsSection.astro`/`ProjectCard.astro`: cards chicas en 2 columnas desde `lg`, descripción con `line-clamp-3`, captura con `aspect-[16/10]` más grande; agregar "Ver caso" visible al pie de la card (texto de acento, `aria-hidden`, porque el botón que cubre la card ya tiene nombre) → verificar: `ruta-sin-verticales-*`, `cards-elevacion`, `hilo-entre-cards-*` y `avion-orientacion` en verde; capturas a 1440, 1024, 820 y 390 px sin desborde.
- [x] 5.3 [C] `FeaturedProject.astro`: "Ver el sitio" pasa a botón (peso de acción principal), "Cómo lo hice" queda como enlace secundario → verificar: captura y contraste del botón de 4,5:1 o más.
- [x] 5.4 [C] `Header.astro`: debajo de `md`, el header muestra una fila con "Sobre mí", "Proyectos", "Contacto" (texto de 14 px, targets de 44 px) y debajo la fila de redes; el contenedor deja de ser `rounded-full` para no recortar → verificar: capturas a 320, 390 y 820 px y `overflow` en verde.
- [x] 5.5 [A] `Footer.astro` e `index.astro`: reemplazar los 3 links repetidos del header por GitHub y "Descargar CV" (pasar `socialLinks` y `cvUrl` al `Footer`) → verificar: `pnpm astro check` y que el pie no repita el header.
- [x] 5.6 [C] Cierre de la historia: al terminar la entrega (`data-delivered="true"`), `contact.ts` agrega la clase `is-delivered` a `#contact`; en `global.css` el mail dibuja un subrayado de tinta (de `scaleX(0)` a `1`, 0,6 s) y "Copiar mail" hace un solo pulso suave; con reduced motion el subrayado ya está dibujado y no hay pulso → verificar: test `contacto-cierre` (la clase aparece tras la entrega y desaparece al subir) y captura.
- [x] 5.7 [C] Diferenciar el anillo del avión del hover: el hover solo levanta la card (sin borde); el avión dibuja el anillo de tinta; `global.css` → verificar: sin regresión en `cards-elevacion`.
- [x] 5.8 [C] Sobre mí en desktop: alinear el bloque de texto al centro vertical del pizarrón (`About.astro`) y probar el paso del avión a 1024 y 1100 px (margen izquierdo más angosto) → verificar: capturas y `avion-sin-pin` en verde; ajustar `edge` en `flight.ts` si roza el dibujo.
  > Enmienda: sin cambios. La grilla ya usa `items-center` (el texto queda centrado contra el pizarrón) y las capturas a 1440, 1100 y 1024 px muestran al avión pasando por el margen sin rozar el dibujo.
- [x] 5.9 [C] Contraste de `uno en producción, los demás para aprender` (4,55:1): dejar un comentario en `global.css` junto al token de acento ("no aclarar: pasa por 0,05") → verificar: medición de contraste sin fallas.

### Fase 6: rendimiento y archivos
- [x] 6.1 [A] `scripts/og-image.mjs`: con Playwright (ya instalado), renderizar el hero (`HeroFrames`) sobre el fondo de papel `#F6F5F1` a 1200x630 con el nombre y el rol, exportar `public/og-image.png` → verificar: Claude mira la imagen; pesa menos de 150 KB.
- [x] 6.2 [C] Favicon: dibujo simple del avión (tomar el trazo de `src/components/planes/a-plane.svg`, 32x32, un solo color) en `public/favicon.svg` de menos de 2 KB → verificar: `wc -c public/favicon.svg` y captura a 32 px en la pestaña.
- [x] 6.3 [C] Si el SVG alcanza en los navegadores modernos, eliminar `public/favicon.ico` y su `<link>`; si no, regenerarlo a 32x32 con ImageMagick (`magick`) por debajo de 5 KB → verificar: `pnpm build` y Lighthouse sin avisos de favicon.
- [x] 6.4 [C] Evaluar el import dinámico de `flight` y las escenas de abajo (`index.ts`): implementarlo solo si Lighthouse móvil mejora el TBT o el FCP en 3 corridas; si no mejora, dejar el código como está y anotar "descartado: sin ganancia medible" → verificar: `pnpm check:motion` completo y Lighthouse.
  > Enmienda: descartado sin variante medida. La base ya está en el piso (performance 100, TBT 10 ms, CLS 0, FCP 1,0 s en móvil), no hay margen que un import dinámico pueda mejorar y sumaría un riesgo al orden de inicialización de las escenas.
- [x] 6.5 [C] Pruebas de zoom: agregar 320x256 (400 %) y 720x450 (200 % de 1440) a la lista del test `overflow` y un test que, a 720 px, confirme que las rutas se recalculan al cambiar de tamaño (el avión sigue sobre `[data-flight-route]`) → verificar: tests en verde.
  > Enmienda: 720 px está debajo de 1024 px y no tiene rutas largas; el recálculo de rutas se prueba en `ruta-recalculo` (1440 a 1100 px).

### Fase 7: verificación final y cierre
- [ ] 7.1 [C] `/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src` → `[]`; `pnpm astro check` → 0 errores; `pnpm build` → ok; `pnpm check:motion` completo (se espera 39 más los tests nuevos, todos ok; si falla un test de navegación del tipo "Execution context was destroyed", repetir una vez antes de investigar).
- [ ] 7.2 [C] Lighthouse móvil y desktop con el build estático temporal → verificar: performance 100 en ambos (bajar de 100 es un bloqueo); luego borrar la config temporal y `.astro/lh-dist` y cerrar los servidores.
- [ ] 7.3 [A+C] Nueva crítica: dos corridas de `agy` en modo `plan` (A diseño con capturas y código; B calidad con la evidencia), orquestadas como la de 2026-11-11 (el orquestador genera las mediciones y verifica cada hallazgo) → verificar: puntaje de 28/32 o más y sin P1; si queda algo, entra al `todo.md`.
- [ ] 7.4 [C] Actualizar `todo.md` (marcar hecho, descartado con motivo o derivado a Lucas), `.agents/handoff.md` y registrar decisiones en `projectmem`. Proponer los mensajes de commit por fase (no commitear sin orden).
- [ ] 7.5 [C] Preguntar a Lucas si quiere correr `/impeccable init` y `document` (S4) en una sesión aparte.

## Tests nuevos (comportamiento y archivo)

Todos en `scripts/check-motion.mjs`:
- `entrega-reversa` y `entrega-reversa-mobile`: sobre y avión nunca juntos, orden de los 6 fotogramas, sin saltos de más de 120 px, estado final correcto.
- `mobile-estela` y `mobile-sin-estela` (actualizado): estela de los cruces, sin rutas largas.
- `contacto-cierre`: clase `is-delivered` tras la entrega.
- `overflow` ampliado (320 y 720 px) y recálculo de ruta tras redimensionar.
- Comprobaciones con Playwright de un solo uso (no quedan como test): teclado del lightbox, medición de textos menores a 14 px, `aria-hidden` de decorativos.

## Verificación final

`pnpm astro check && pnpm build && pnpm check:motion` y `/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src` (debe dar `[]`), más Lighthouse (paso 7.2).

## Derivado a Lucas (no lo puede hacer un agente)

- **Sanity:** cargar los textos de `.agents/copy-sanity.md` en `staging` y luego en `production` al mergear; links de Lumen, SyncLife y PixDex para generar las capturas; ordenar los tags de TheJudex; confirmar las métricas reales.
- **Otros:** `public/cv.pdf`; mail con dominio propio (`hola@lucasaraya.com.ar` con reenvío gratuito) y cambiarlo en Sanity; seguridad y dataset `staging` de `.agents/todo-release.md`.

## Preguntas abiertas: 0
