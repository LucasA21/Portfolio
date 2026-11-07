# Plan: personaje por capas y ajustes del vuelo

Brief: `.agents/briefs/personaje-por-capas.md`. Antecedentes: `.agents/handoff.md`, `plan-avion-de-papel.md`. Rama: `redesign/impeccable-update`. Producción (main) no se toca. Sin push.

## Objetivo y criterio de éxito

1. El avión deja de leerse como flecha: se ve en 3/4, con la cara del ala rellena, 64 a 80 px en desktop, rumbo suavizado y leve inclinación en las curvas.
2. La ruta planea: arcos amplios, como máximo una curva cerrada por sección, ningún tramo vertical de más de 80 px.
3. Las cards se encienden en secuencia, una por vez, y se apagan al alejarse el avión. El tramo horizontal pasa por los huecos.
4. Sobre mí llega al viewport con la figura base ya dibujada; solo se animan la escritura y el avión.
5. Existe un personaje generado por script (`scripts/illustrations/character/`) con estilo medido, esqueleto anidado, `rig.json` y poses; el piloto del hero se compara con el actual en `/dibujos`.
6. Si el piloto no llega a la calidad del actual: plan B (rehacer solo brazo y mano del hero y brazo de la pizarra, con partes ocultas).
7. Presupuesto: rig + IK suman 10 KB gzip o menos al JS de motion (hoy 64 KB); SVG del personaje, 40 KB o menos por escena; solo el hero va inline.
8. `pnpm astro check`, `pnpm build`, `pnpm check:motion` e `impeccable detect --json src` limpios en cada fase.

## Entorno detectado

- Astro 6.1, Tailwind 4.3, GSAP 3.15.1, Sanity (embebido en `/admin`), pnpm 11. Sin `AGENTS.md` ni reglas del repo. Commits en español, Conventional Commits, sin emoji ni firma de herramienta.
- Vuelo: `src/scripts/motion/flight.ts` (345 líneas). Ruta por `rounded()` con waypoints, `SCALE = 0.42` (~47 px), rumbo con `spin += 0.35 * delta`, cards con `near` binario por `pos.y` contra `[c.t - 10, c.b + 10]` y anillos `rect` con DrawSVG. Las cards de una misma fila comparten `y`, por eso se encienden juntas.
- Sobre mí: `about.ts`, `drawIn(scene, { skip: '[data-content]' })` se dispara con `top 85%` y dura 1.5 s; la figura aparece recién al entrar. `public/sobre-mi.webp` es la imagen visible y el esqueleto de `about.py` es solo máscara.
- Generadores: `plane.py` (21 SVG), `scenes.py`, `about.py` (necesita venv con scikit-image, scipy, numpy e ImageMagick). Escenas inline en `src/components/scenes/`.
- `/dibujos` (solo dev) ya compara avión y escenas.
- Estado git: `.gitignore` y `.projectmem/` sin commitear (no entran); `.agents/briefs/` y `.agents/todo-release.md` sin trackear (solo si Lucas lo pide).

## Decisiones y supuestos

- D1. Una sesión por fase; frenos duros después del plan, después del piloto y al cierre de cada fase siguiente.
- S1. **Fase 1 es independiente del redibujo**: solo toca `flight.ts`, `InkThread.astro`, `plane.py` (o el tamaño en el SVG), `about.ts` y `check-motion.mjs`.
- S2. **Avión en 3/4**: se ajusta en `plane.py` la variante A (más cara de ala visible y relleno `#F6F5F1`), sin tocar B y C. Si el 3/4 no sale con ajustes, se muestra en `/dibujos` antes de integrarlo.
- S3. **Ruta sin verticales**: hoy las caídas rectas salen de los waypoints `[xs[i], gap] -> [xs[i+1], gap]` y de los tramos `x` fijo en `build()`. Se reemplazan por una curva suave (Catmull-Rom o Bézier cúbica) con pendiente acotada; un chequeo en `build()` limita `|dy| / |dx|` y parte los tramos largos. El tramo que cruza las cards chicas pasa por el hueco entre columnas.
- S4. **Cards en secuencia**: el estado `near` se calcula con la distancia al centro de cada card en 2D (no solo `y`), se enciende solo la más cercana dentro de un radio y las demás se apagan. Tope de una activa a la vez.
- S5. **Sobre mí precargada**: `drawIn` de la figura base corre al cargar la página (o al acercarse, con margen amplio), no al entrar al viewport; solo `[data-content]` (esquema) y el avión quedan atados al scroll.
- S6. **Piloto**: `style.py` mide el estilo desde los SVG de `public/` y `src/components/scenes/` (tinta, grosor mínimo, típico, máximo, puntas) con el mismo venv de scikit-image del plan anterior, fuera del repo. Las cifras quedan en este plan.
- S7. **Helper de trazo**: se mira `about.py` y `plane.py` antes de escribir nada; se reutiliza la expansión de línea central a contorno relleno de `plane.py` si sirve tal cual, y se mueve a `character/` solo si hace falta compartirlo.
- S8. **Dataset `staging`** (fase 5): variable `PUBLIC_SANITY_DATASET` por entorno (dev y preview de Vercel usan `staging`; production solo en main). Crear el dataset y copiar los textos nuevos requiere acciones de Lucas en Sanity (token de escritura); el agente deja el procedimiento y los scripts, no ejecuta nada contra `production`.

## Riesgos

- R1. **El personaje por código queda peor que el actual.** Mitigado por el piloto obligatorio y el plan B.
- R2. **Presupuesto de JS**: rig, IK y poses podrían pasar de 10 KB. Se mide al final de la fase 4; si no entra, se cargan por escena con `import()`.
- R3. **Cambiar `build()` rompe casos de `check-motion`** (avion-orientacion, cards-elevacion, estela-acotada, vuelo-progreso). Se adaptan, no se borran.
- R4. **`offsetTop` de `#about` no sirve en tests** y en celular hay dos escenas de contacto: se usa `getBoundingClientRect` y la escena visible.
- R5. **Dataset `staging` no es automatizable sin credenciales**: queda como procedimiento para Lucas.

## Fuera de alcance

- Pin de secciones, Lenis, WebGL, React para animar, cambios a `main`, push a remoto.
- Borrar `scenes.py` y `about.py` (siguen hasta que Lucas apruebe).
- Cargar datos reales en Sanity (están en `.agents/todo-release.md`).

## Blast radius

- Fase 1: `src/scripts/motion/flight.ts`, `about.ts`, `util.ts` si hace falta, `src/components/InkThread.astro`, `scripts/illustrations/plane.py`, `src/components/planes/a-*.svg` (regenerados), `scripts/check-motion.mjs`, `About.astro` si cambia el orden de carga.
- Fase 2: archivos nuevos en `scripts/illustrations/character/` y una sección nueva en `src/pages/dibujos.astro` (solo dev). Cero impacto en producción.
- Fase 3: `character/` completo, `src/components/scenes/*`, `public/` (SVG nuevos).
- Fase 4: `src/scripts/motion/` (`rig.ts` nuevo, `hero.ts`, `about.ts`, `contact.ts`, `flight.ts`), `check-motion.mjs`.
- Fase 5: `.env.sample`, `astro.config.mjs`, `sanity.config.tsx`, `scripts/screenshots.mjs`, `Layout`/cards, `.agents/todo-release.md`.

## Fases

### Fase 1: ajustes del vuelo, cards y Sobre mí (brief 5.1 a 5.4)

- [x] 1.1. Regenerar la variante A del avión en 3/4 con la cara del ala visible y rellena; mostrar en `/dibujos` a tamaño de uso (64 a 80 px) -> verificar: captura de `/dibujos` a 1440 px, el avión no se lee como cursor.
- [x] 1.2. `flight.ts`: escala a 64-80 px (`SCALE` y `flightScale()` móvil), inclinación leve en curvas por curvatura de la ruta, rumbo con lerp más suave (hoy 0.35) -> verificar: caso `avion-orientacion` ajustado.
- [x] 1.3. `flight.ts`: ruta sin tramos verticales mayores a 80 px, una sola curva cerrada por sección, tramo horizontal por el hueco entre cards -> verificar: caso nuevo `ruta-sin-verticales` (muestrea la ruta y falla si hay 80 px verticales seguidos).
- [x] 1.4. `flight.ts`: cards en secuencia, una activa por vez, que se apagan al alejarse -> verificar: caso `cards-una-por-vez` (nunca hay más de una con `plane-pass`; las cuatro pasan por turnos).
- [x] 1.5. `about.ts`: figura base dibujada antes de entrar al viewport; solo escritura y avión animados -> verificar: caso nuevo `about-base-visible` (al llegar al viewport no hay trazos de la figura base sin dibujar).
- [x] 1.6. Cierre: `dev-verify` (`pnpm astro check`, `pnpm build`, `pnpm check:motion` sin `timeout`, detector `[]`), JS de motion medido en gzip.
- [ ] 1.7. Commit en español (`feat: ...` o `fix: ...`) solo si Lucas lo pide. Actualizar `handoff.md`.

> Enmiendas (fase 1): (a) El 3/4 salió de dar sombra al ala lejana y a la quilla (`#E6E1D4`) y abrir el ala cercana; solo variante A, B y C intactas. (b) Cards: con márgenes de 120 px o más (desde ~1264 px de ancho) el avión baja por los márgenes en curvas S y cruza pegado a la fila siguiente, así se encienden una por vez; con menos ancho sigue por las separaciones (20 px), donde los tramos verticales quedan como antes. (c) Los tramos rectos de las rutas ocultas de las escenas (costado de la mesa, caballete) se rompen con curvas S en `flight.ts` (`unvertical`), sin regenerar las escenas. (d) El avión se espeja al ir hacia la izquierda y su rumbo se muestra entre 25 grados arriba y 45 abajo, con inclinación en curvas; `data-heading` expone el rumbo real. (e) Sobre mí: la figura base se dibuja al cargar. (f) Casos nuevos: `ruta-sin-verticales-1440/1920`, `avion-tamano`, `about-base-visible`; `cards-elevacion` exige una sola card encendida a la vez y las 4 chicas en turno.

Entrega: qué cambió, qué quedó pendiente, qué mirar en el navegador (scroll completo en desktop, `/dibujos`).

### Fase 2: estilo medido y piloto del personaje del hero (checkpoint)

- [x] 2.1. `character/style.py`: medir tinta, grosor (mín, típico, máx) y puntas de los SVG actuales; constantes y tabla en este plan -> verificar: cifras anotadas y color `#531F1F` confirmado.
- [x] 2.2. `character/` genera solo el personaje del hero con líneas centrales + perfil de grosor -> contorno relleno; path oculto `data-draw` por línea central; relleno `#F6F5F1`; grupos anidados con `data-pivot` -> verificar: corre con `python3 -I`, escribe SVG y `rig.json`.
- [x] 2.3. Tres poses: `typing`, `throw-windup`, `throw-release` (`poses.py`, ángulos de articulación) -> verificar: tres SVG por pose.
- [x] 2.4. `/dibujos`: sección "Personaje (piloto)" con el hero actual y las tres poses al mismo tamaño, más una ampliación al 300 % -> verificar: capturas a 1440 px.
- [ ] 2.5. **PUNTO DE CONTROL: detener la ejecución, mostrar las capturas y esperar a que Lucas compare con el actual y apruebe. Si no llega, plan B.**

> Medición (2.1, hero actual a 1015 de ancho, ancho de trazo = 2 x radio en la línea central): fino ~5.0, típico ~6.0, p75 ~6.8, p95 ~7.0, máximo ~14 (bordes pesados y rellenos). Tinta `#531F1F`. Las puntas afinan hasta casi cero. Medido con ImageMagick y Python estándar (sin instalar scikit-image: `pip install` fue denegado).
> Piloto v1 (descartado por Lucas: "horrible, no se parece nada"): redibujo por código desde líneas centrales; el trazo quedó rígido y puntiagudo, sin parecido con el original.
> Piloto v2 (actual, 2.2 a 2.4): el rig se arma con el ARTE ORIGINAL recortado en piezas (cabeza, torso, brazo en dos tramos, mano, laptop), cada una con silueta de piel debajo para tapar lo que cruza, y solo se dibujan por script las partes que el original no tenía (flanco del torso, borde interno del brazo, rótula del codo, manos `grip` y `open`). `typing` es idéntica al hero actual. Archivos: `scripts/illustrations/character/` (`style.py`, `stroke.py`, `poses.py`, `hero.py`) y `src/components/character/hero-<pose>.svg` (~26 KB crudo, ~10 KB gzip) más `rig.json`. Esto es una enmienda al brief (sección 2): se conserva el trazo original en vez de regenerarlo, como pide la lección del proyecto sobre el calco.
> Piloto v2, segunda vuelta (feedback de Lucas: líneas sin pintar o mal puestas, mano robótica): el tramo de mesa que el brazo tapaba se redibuja cuando el brazo se va, los recortes del brazo ya no se llevan la línea de la mesa, la mano abierta y el puño pasan a ser un contorno único orgánico (no cápsulas separadas) y el puño se agranda; la rótula del codo solo aparece con más de 30 grados de flexión.
> Piloto v2, tercera vuelta (revisión detalle por detalle): `typing` quedó idéntica al original píxel a píxel (diferencia menor a 30 px a 4060 de ancho). Causas corregidas: huecos del cuerpo con `evenodd` que devolvían la tinta donde dos piezas se solapaban (ahora máscaras), línea de la mesa que se iba con el brazo (se redibuja), pivote del codo fuera del centro de la manga y pivote del hombro fuera del trazo, costura del cuello, borde izquierdo de la laptop con restos de dedos (se limpia cuando la mano se va), siluetas de piel que tapaban trazos vecinos, manos `grip` y `open` rehechas con el lenguaje del original (manopla con trazos de dedos). Las poses mantienen el codo en su flexión de reposo: la manga original es una pieza en L y así sus líneas no se cortan; doblar el codo o girar la cabeza se resuelve en la fase 3.
> Pendiente del piloto: brazo trasero y ojos cerrados (fase 3), costuras finas al doblar mucho el codo.

Entrega: dónde mirar (`/dibujos`, sección "Personaje por capas: piloto del hero"), qué cifras se midieron, decisión pedida (seguir o plan B).

### Fase 3: resto del personaje, poses y escenas

- [ ] 3.1. Piezas completas con partes ocultas: torso, piernas, cabeza (cara, pelo), brazos (upper > fore > hand), manos `open`, `grip`, `point`, `type`.
- [ ] 3.2. Poses restantes: `reach-board`, `write`, `pin`, `lean`, `point`, `wave`.
- [ ] 3.3. Escenas rehechas con el mismo método: escritorio con laptop y monitor, pizarra, buzón; reemplazan a `src/components/scenes/` (los scripts viejos se conservan).
- [ ] 3.4. `rig.json` final con pivotes y límites; SVG optimizados (40 KB o menos por escena; hero inline, resto diferido).
  -> verificar fase: `astro check`, build, `/dibujos` con todas las poses, detector `[]`.

### Fase 4: animaciones del hero, Sobre mí y contacto + idle

- [ ] 4.1. `src/scripts/motion/rig.ts`: `setPose(rig, pose, { duration, ease })` e IK de dos segmentos (~20 líneas).
- [ ] 4.2. Idle: parpadeo cada 3 a 6 s con intervalo aleatorio (~120 ms), respiración `scaleY` 1 -> 1.01 en 4 s; pausa con `IntersectionObserver`.
- [ ] 4.3. Hero: `typing`, toma del avión (`grip`), `throw-windup`, `throw-release`; el avión sale de la mano; vuelve a `typing`.
- [ ] 4.4. Sobre mí: la tiza sigue el trazo con `getPointAtLength` + IK; llega el avión, `pin`, chinche, despega y relanza.
- [ ] 4.5. Contacto: `lean` + `point`; abre la tapa, el avión se desdobla y entra, cierra y sube la bandera con la mano; `wave` una vez por sesión al tocar "Copiar mail".
- [ ] 4.6. `check-motion.mjs`: avión sale de la mano, rumbo nunca vertical más de 80 px, cards una por vez, punta de tiza a menos de 2 px, parpadeo pausado fuera del viewport, reduced motion sin animación, debajo de 1024 px cada escena sola.
  -> verificar: `pnpm check:motion` completo, JS de motion medido (rig + IK 10 KB o menos).

> Decisión de Lucas: los dibujos del personaje y las escenas los hace él en Krita, separados por capas, y se animan después con ese material. Se quitó `rig.ts`, `check-rig.mjs` y la sección "Rig vivo" de `/dibujos`. Siguen hechos: fase 1, `scripts/screenshots.mjs` (con fallback en `getProjects`), `.env.sample` y los pasos de `staging`. Pendiente: fase 3, 4 (con el arte de Lucas) y `dev-release-check` final.

### Fase 5: staging, capturas, mobile, reduced motion y release

- [x] 5.1. Dataset `staging`: `PUBLIC_SANITY_DATASET` por entorno, procedimiento y comandos para Lucas; nada se ejecuta contra `production`.
- [x] 5.2. `scripts/screenshots.mjs` con Playwright desde los sitios publicados (thejudex.com y los que tengan URL), 1440x900, `deviceScaleFactor: 2`, WebP; las que no tengan URL quedan listadas como pendientes.
- [ ] 5.3. Mobile y reduced motion: capturas a 360, 390, 768, 1024, 1440 y 1920 px, sin scroll horizontal.
- [x] 5.4. Placeholders `[ej: ...]` listados en `.agents/todo-release.md`.
- [ ] 5.5. `dev-release-check` y `dev-verify`.

## Preguntas abiertas: 0

Supuestos que asumo salvo que digas otra cosa: S1 (fase 1 sin depender del redibujo), S2 (3/4 en la variante A), S4 (una sola card activa a la vez), S8 (`staging` queda como procedimiento, sin credenciales).

## Verificación final (cada fase, en lo que aplique)

```fish
pnpm astro check
pnpm build
pnpm check:motion   # unos 3 min, sin timeout
/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src   # debe dar []
```

Después de la fase 1 y la 4: medir el JS de motion con `gzip -c` sobre los chunks de `.vercel/output/static/_astro/`.
