# Plan: hero por fotogramas (dibujos de Krita)

Rama: `redesign/impeccable-update`. Producción no se toca. Sin push. Reemplaza al piloto por código de `plan-personaje-por-capas.md` solo para el hero; ese plan sigue vigente para Sobre mí y contacto hasta que Lucas diga otra cosa.

## 1. Inventario

El brief `.agents/briefs/dibujos-krita.md` no existe; usé `.agents/briefs/personaje-por-capas.md` y `.agents/handoff.md`. Los PNG están en `public/hero-capas/` (no hay `art/export/`). Extensión `.PNG` en mayúsculas. Todos 3000 x 3000, RGBA, fondo transparente. Subcarpetas por grupo.

| Pieza | Fotogramas | Caja con tinta (x, y, ancho x alto) |
|---|---|---|
| base | `base.PNG` | 306,612 2489x2159 |
| arm-l | `arm-l-01-typing`, `arm-l-02-typing-b` | 487,1025 649x651 / 493,1025 650x645 |
| arm-r | `arm-r-01-windup`, `arm-r-02-release` | 1152,456 533x773 / 1147,502 1023x731 |
| plane-in-hand | `plane-in-hand-01-windup` | 647,316 1292x558 |
| head | `head-01-front`, `head-02-look-up` | 838,316 542x770 / 765,372 502x722 |
| eyes | `eyes-01-open`, `-02-closed`, `-03-look-up-open`, `-04-look-up-closed` | cada uno ~200x100, cerca de (1000-1070, 580) |

Total: 12 PNG. No falta ninguno de los que listaste.

Diferencias con tu lista y con la guía:
- **`base.PNG` no lo nombraste.** Es torso, piernas, escritorio, laptop y monitor, sin cabeza ni brazos. Lo trato como capa fija de abajo.
- Referencias que sobran de la guía vieja: `grab`, `_pivots`, manos intercambiables (`open`, `grip`, `point`), `rig.json`, poses de Sobre mí y contacto. No se usan.
- Imperfecciones a limpiar (no son errores tuyos, pero se verían): una mancha blanca fuera del trazo en el hombro izquierdo de `base.PNG`; un punto suelto abajo a la izquierda en `arm-r-01-windup`; un punto blanco suelto en `plane-in-hand-01-windup`. El script descarta componentes menores a un área mínima; la mancha del hombro la reviso contigo en `/dibujos`.
- Fotograma 1 vs 2 del brazo izquierdo: el mismo brazo con la mano en dos posiciones; sirve para alternar.
- El brazo derecho en `release` tiene la mano abierta arriba a la derecha (hasta x≈2170), lejos del escritorio por la derecha; en `windup` sube y se encoge (puño arriba). El avión sale de esa mano abierta.

## 2. Herramienta de vectorizado (decisión tuya)

El entorno no tiene `potrace`, `numpy` ni `skimage`; el `trace.py` viejo (línea central) no corre y además perdía el grosor. Para conservar el grosor variable hay que trazar el **contorno relleno** del trazo, no la línea central.

Propuesta: agregar `potrace` (npm, JS puro) como `devDependency`; solo lo usa un script de build, no entra al bundle. ImageMagick ya está instalado y hace los pasos de píxeles. Alternativa sin dependencia: escribir marching squares + suavizado de Bézier a mano (unas 150 líneas, calidad menor en las puntas finas). Recomiendo `potrace`.

## 3. Pipeline: `scripts/illustrations/hero-frames/trace.mjs`

Un script versionado, con un `PIECES` que lista pieza, fotogramas y orden de z. Salida: `src/components/scenes/hero-frames.svg.astro` (o un `.svg` importado con `?raw`, igual que `dibujos.astro`).

1. Por PNG: recortar a la caja con tinta (`magick -trim` guardando el offset) para trazar rápido, y volver a coordenadas del lienzo de 3000 al escribir el path. El `viewBox` es `0 0 3000 3000` para todos.
2. Limpiar: quitar componentes de tinta menores al área mínima (puntos sueltos).
3. Tinta: `potrace` sobre el canal alfa, con `turdSize` bajo, `optTolerance` ~0.4, `alphaMax` 1; el relleno es el color de tinta `#531F1F`. Se conservan las puntas y el grosor porque se traza la silueta.
4. Relleno de formas cerradas con el color de fondo del sitio: cierre morfológico del alfa (radio ajustable por pieza, para tapar aberturas como el puño de la manga), relleno por inundación desde afuera; lo no alcanzado y sin tinta es interior. Ese interior se traza como segundo path con el color de fondo, dilatado 2 px para que quede bajo la tinta sin dejar hueco. Orden dentro de cada fotograma: relleno, luego tinta. Las formas abiertas (si alguna no cierra ni con el radio máximo) quedan sin relleno y se listan en el reporte del script.
5. Optimización: coordenadas con 1 decimal, `viewBox` común, sin transformaciones por pieza. Reporta peso por fotograma y total.
6. SVG final: `<g data-piece="arm-l">` con un `<g data-frame="01-typing">` por fotograma, todos `visibility="hidden"` salvo el de reposo. Z de abajo hacia arriba (a confirmar viendo las superposiciones en `/dibujos`): base, arm-r, plane-in-hand, arm-l, head, eyes. Si el brazo derecho debe ir sobre el torso y bajo la cabeza, el orden ya lo cubre.

Presupuesto propuesto: 80 KB sin comprimir y 25 KB gzip para todo el hero (el brief anterior daba 40 KB, pero eran 3 poses; ahora son 12 fotogramas). Si pasa, subo `turdSize` y bajo la precisión antes de recortar detalle. Va inline en el hero (es lo primero que se ve).

## 4. Animación por fotogramas: `src/scripts/motion/hero.ts`

Sin GSAP interpolando transformaciones: un reproductor de fotogramas que cambia `visibility`. Una sola función `showFrame(piece, name)` y un reloj fijo de 10 fps (`gsap.ticker` con `lagSmoothing` normal, o `setInterval` equivalente). Se borra el código viejo de `drawIn`, `pivot` y `hands/head` del hero. El `drawIn` del hero (mascara de revelado) se reemplaza por un fundido corto del conjunto al cargar, porque ya no hay líneas centrales; el hilo de tinta (`InkThread`) y la ruta no dependen de esto.

**Idle** (en pantalla, pausado fuera con `whileVisible`):
- arm-l alterna `01-typing` y `02-typing-b`. Para que no parezca metrónomo, cada fotograma se mantiene 1 o 2 ticks al azar, con una pausa de 8 a 12 ticks cada tanto (el nod de la versión actual, hoy sin cabeza que mover).
- arm-r fijo en `02-release`. head `01-front`, eyes `01-open`.
- Parpadeo: cada 3 a 6 s (intervalo al azar), `eyes-02-closed` durante 1 tick (100 ms; 2 ticks si se siente corto), vuelve a `01-open`.

**Al empezar el scroll** (se dispara una vez, con el primer `scrollY > 8` o el primer `wheel`/`touchmove`; un solo gatillo, sin ScrollTrigger porque no hay tramo asociado):
1. Tick 0: arm-l queda en el último fotograma; el idle de tipeo se detiene.
2. Llegada del avión a la mano (propuesta, porque no hay `grab`): del centro de la pantalla de la laptop sale un avión pequeño (el mismo avión del vuelo, escala 0.35) y en 3 ticks sube hacia la posición del avión en `plane-in-hand-01` por una curva corta, con rotación creciente. Es la misma lógica de pasos de 100 ms, sin tween suave, para que parezca stop-motion como el resto. Alternativa: que el avión ya esté asomando sobre la pantalla en reposo; la descarto porque cambia la imagen del hero en quietud y en reduced motion.
3. Tick 3: arm-r pasa a `01-windup` y aparece `plane-in-hand-01-windup`; el avión chico se oculta (relevo exacto entre el avión que llega y el dibujado, con coordenadas medidas del PNG).
4. Se mantiene el windup 4 ticks (400 ms).
5. Tick 7: arm-r vuelve a `02-release`; `plane-in-hand` se oculta; se llama a `launch()` con el punto de la mano abierta: el avión del vuelo arranca en la punta de los dedos de `02-release` (se mide en el PNG y se guarda como constante en `hero-frames` junto al SVG).
6. Mientras el avión sube, head pasa a `02-look-up` y eyes a `03-look-up-open` (con el parpadeo de `04-look-up-closed`). Tras ~1.2 s, el avión sale del cuadro del hero: head y eyes vuelven a `01-front` / `01-open`. La mirada hace un seguimiento por pasos, no continuo; si se ve poco natural, se agrega un fotograma intermedio (no hay dibujo para eso, se pediría uno).
7. Vuelve el idle: arm-l tipea y arm-r queda en release.

Cambio en `flight.ts`: hoy `takeoff()` corre al terminar el intro y sale del inicio de `routes.a` (laptop) con un destello. Pasa a: `launch(origin)` desde el scroll, con `origin` en coordenadas de página de la mano, y el inicio de la ruta `a` se recalcula desde ese punto hacia el mismo recorrido actual (misma curva a partir de unos 120 px desde la mano para no cambiar las verificaciones de ruta). El destello se quita (ya hay mano). Hasta que arranca el scroll el avión no existe en el hero. Nota: ya se retira el vuelo automático "al cargar"; el hero queda quieto en lo que respecta al avión hasta que Lucas scrollee. Confirmar que es lo que quieres (ver preguntas).

**Reduced motion:** sin intro ni parpadeo ni reproductor. Pose de reposo, quieta: base, arm-l `01-typing`, arm-r `02-release`, head `01-front`, eyes `01-open`, sin avión. El avión del recorrido sigue la política actual (sin estela, `data-motion="paused"`).

**Debajo de 1024 px:** el hero anima solo (idle y la secuencia del lanzamiento). Como el scroll no aplica igual en móvil y el avión no recorre la página ahí (`wide` ya existe en flight.ts), la secuencia se dispara sola ~1.2 s después de que el hero entra en pantalla, una vez; el avión sale del cuadro (`opacity` a 0) como hoy para `!wide`. Entre 768 y 1024 se confirma con medición cuál es el comportamiento real actual del vuelo antes de tocar nada (el brief habla de 1024, el índice de motion usa 768).

## 5. `/dibujos` antes de reemplazar

Sección nueva "Hero por fotogramas" arriba de la del piloto. Izquierda hero actual, derecha el SVG nuevo, mismo tamaño. Debajo: tira con todos los fotogramas por pieza (para ver relleno, puntas y manchas), la cabeza al 300 % para comparar trazo, y botones (con un `<script>` mínimo) para reproducir idle, lanzamiento y reposo. Se saca la sección del piloto por código cuando apruebes. `HeroScene.astro` y `public/hero-illustration.svg` no se tocan hasta tu aprobación.

## 6. Tests en `scripts/check-motion.mjs`

Los viejos `hero-intro` (usa `mask [data-reveal]`), `hero-loop` (transform del `eyeL`) y `hero-pausa` dependen del hero actual y se reescriben junto con el reemplazo. Casos nuevos:
- `hero-fotogramas`: hay un solo fotograma visible por pieza y nunca más de uno.
- `hero-tipeo`: arm-l alterna entre sus dos fotogramas (a ~10 fps, entre 4 y 12 cambios por segundo) en reposo.
- `hero-parpadeo`: en 20 s hay parpadeos con intervalos entre 3 y 6 s (tolerancia 0.2 s) y variados (no todos iguales); `eyes-02-closed` visible 1 a 2 ticks.
- `hero-lanzamiento`: sin scroll no hay avión ni cambio de brazo; al primer scroll, orden exacto release, windup, release; `plane-in-hand` visible solo en windup; el avión del vuelo arranca a menos de 8 px de la punta de los dedos del release.
- `hero-mirada`: head en `02-look-up` durante el vuelo y vuelve a `01-front`.
- `hero-pausa`: fuera del viewport el reloj y el parpadeo se detienen.
- `hero-reduced`: con `prefers-reduced-motion: reduce`, pose de reposo, ningún fotograma cambia en 3 s, sin avión.
- `hero-mobile-<ancho>` a 390 y 820 px: la secuencia corre sola una vez.
- Se mantienen `overflow`, `avion-orientacion`, `ruta-sin-verticales-*`, `cards-elevacion` (el cambio de origen del vuelo no debe romperlas).

## 7. Orden de trabajo y verificación

1. Aprobación de este plan.
2. `trace.mjs` + `/dibujos`: **checkpoint visual**. Se frena y se muestra antes de animar.
3. `hero.ts` (reproductor, idle, lanzamiento) y `launch(origin)` en `flight.ts`.
4. Reduced motion y menos de 1024 px.
5. Reemplazo en `HeroScene.astro`, tests, `pnpm astro check`, `pnpm build`, `pnpm check:motion` (unos 3 min, sin `timeout`), `impeccable detect --json src` en `[]`, y `dev-verify`.
6. Actualizar `handoff.md`. Commit solo si lo pides.

Riesgos: el relleno automático en formas con aberturas; el peso total; la alineación de la mano al relevo avión-llega / avión-dibujado (por eso se mide sobre el PNG); y que 2 fotogramas de mirada alcancen para el seguimiento.

## 8. Preguntas para aprobar

1. `potrace` como devDependency: sí o no (alternativa propia, peor en puntas).
2. Hoy el avión sale solo al cargar la página. El plan lo cambia: sale únicamente al empezar el scroll. En móvil sale solo ~1.2 s después de ver el hero. ¿OK?
3. Presupuesto de 80 KB / 25 KB gzip para los 12 fotogramas: ¿OK?
4. ¿La mancha blanca del hombro de `base.PNG` es intencional (pelo, luz) o se borra?
