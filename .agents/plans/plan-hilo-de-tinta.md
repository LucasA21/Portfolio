# Plan: "Hilo de tinta", narrativa animada del portfolio

## Objetivo y criterio de éxito

La web cuenta una historia con el scroll: una sola línea de tinta sale del cable de la laptop del inicio, se dibuja mientras bajás, recorre Proyectos y Sobre mí, y termina convertida en el sobre que entra al buzón del contacto. Los dibujos del inicio y del contacto cobran vida con movimientos chicos y propios de cada escena. En Sobre mí, el hilo llega a la mano del personaje, que lo usa para bocetar una interfaz. Todo vivo, sin sobrecargar.

1. El hilo avanza en sincronía con el scroll (scrub) y nunca bloquea ni fija el scroll.
2. El hilo no cruza texto: pasa por detrás de las cards y por los huecos entre secciones.
3. Al llegar al final, el tramo final del hilo se transforma en un sobre que entra por la ranura del buzón.
4. El personaje del inicio parpadea, teclea y mira su pantalla; el monitor muestra líneas de código que se escriben y se borran.
5. El personaje del contacto parpadea y señala el email con un movimiento suave del brazo; el buzón reacciona al recibir el sobre.
6. Los dibujos animados conservan el trazo exacto de los SVG originales (misma silueta, mismo grosor), aprobados por el usuario quietos antes de animarlos.
7. Sin JavaScript, todo el contenido es visible (nada queda en `opacity: 0`).
8. Con `prefers-reduced-motion: reduce` no hay movimiento espacial ni loops: el hilo se ve completo y quieto, el sobre ya está en el buzón.
9. Los loops (parpadeo, tecleo, brazo) se pausan cuando su escena sale de pantalla o la pestaña está oculta.
10. Sin scroll horizontal de 360 a 1920 px; en celular el hilo se simplifica a tramos en los huecos entre secciones.
11. El JavaScript de animación agregado pesa 70 KB gzip o menos.
12. `pnpm astro check` sin errores, `pnpm build` completo, detector de impeccable en `[]` y `scripts/check-motion.mjs` en verde.

## Entorno detectado

- Stack: Astro 6.1 (`output: 'server'`, adapter Vercel), Tailwind 4.3, React 19 solo para Sanity Studio, Sanity como CMS.
- Gestor: pnpm 11 (`pnpm-workspace.yaml` con `allowBuilds`).
- Scripts reales (`package.json`): `pnpm dev`, `pnpm build`, `pnpm astro check`. No hay tests ni linter configurados.
- Línea base medida hoy: `pnpm astro check` da 0 errores, 0 warnings, 5 hints; `pnpm build` termina en "Complete!".
- Detector de diseño: `/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src`.
- Chromium del sistema en `/usr/bin/chromium` (lo usa el test con `playwright-core`).
- Convenciones: commits `feat:`/`fix:` en español sin emoji (último commit `4066bb8`); código y comentarios en inglés; sin firmas de herramienta.
- Sin `AGENTS.md` ni reglas propias del repo.

## Supuestos y decisiones

Decisiones del usuario:

- D1. Los dibujos se trabajan a partir de los SVG actuales (`public/hero-illustration.svg`, `public/contact-señalar.svg`, `public/contact-apoyado.svg`), con aprobación visual antes de animar.
- D2. Narrativa: "hilo de tinta".
- D3. Scroll normal con scrub suave: sin pin y sin Lenis.
- D4. Librería: GSAP 3.15 desde scripts de Astro, sin islas de React. Plugins: ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin y SplitText. GSAP es gratis, incluido el uso comercial (licencia estándar "no charge" de gsap.com; la única restricción es no construir una herramienta que compita con Webflow).

Supuestos del agente (con motivo):

- D5. **Redibujo en trazos por partes** (el usuario lo autorizó: "mientras se parezca está bien"). Los tres dibujos se rehacen como `<path>` con `stroke`, sin relleno de contorno, agrupados por articulación: cabeza (pelo, cara, ojos, boca), cuello, torso, brazo superior, antebrazo, mano y dedos, piernas, y objetos (laptop, monitor, escritorio, buzón).
  Motivo: permite movimiento real con codo, muñeca y cuello, y que la misma tinta dibuje al personaje al cargar.
- S1. **Método de fidelidad.** No se dibuja de memoria.
  - Cada SVG original se renderiza a PNG de 2000 px y se le extrae la línea central (esqueletizado con `scikit-image` en un venv de la carpeta temporal, fuera del repo).
  - Esa guía se calca pieza por pieza con curvas Bézier limpias: mismo grosor de línea (medido del original, en unidades del viewBox), extremos y uniones redondeados, y las mismas proporciones de cara, rulos y manos.
  - Las sombras sólidas del buzón y del monitor se mantienen como relleno.
  Motivo: el usuario rechazó dibujos "de palitos"; calcar sobre la guía mantiene su estilo.
- D6. **Escena nueva de Sobre mí:** reemplaza la ilustración actual (monitor con `</>`, taza y planta). El personaje, de pie frente a un atril, boceta una interfaz (ventana, bloques y un botón) con el hilo: el hilo llega a su mano, se convierte en el boceto mientras bajás, y sigue hacia el contacto desde la base del atril. Se arma reutilizando las piezas del hero y del contacto redibujados (cabeza, rulos, manos, torso), cambiando solo la pose, porque no hay original para calcar.
- S2. **Contacto en celular.** Con el redibujo, `contact-apoyado.svg` también queda articulado: parpadeo, la mano apoyada que tamborilea sobre el buzón y la llegada del sobre. Movimiento más chico que en escritorio.
- S3. **Sin efectos de cursor** (ojos que siguen al puntero, cursor custom). YAGNI, y suman carga visual.
- S4. **Una sola revelación de texto:** el título del inicio entra por líneas con SplitText y máscara al cargar. No hay revelado palabra por palabra con scroll en los párrafos.
  Motivo: carga cognitiva en un portfolio que se escanea.
- S5. **Contenido visible por defecto.** Los estados ocultos iniciales solo aplican si `<html>` tiene la clase `js-motion`, que un script inline en el `<head>` agrega. Hoy `.fade-up` arranca en `opacity: 0` desde CSS y queda oculto si falla el JS; se corrige.
- S6. **Test con `playwright-core`.** Se agrega `playwright-core` como devDependency, con un script de verificación que usa el Chromium del sistema. No entra al build de Vercel.
- S7. **De 21st.dev no se copia código.** Se usaron como referencia de patrón "Signature", "Line Draw SVG" y "SVG follow scroll" (trazo dibujado con scroll). Su lenguaje visual (SaaS, vidrio, degradados) choca con el sitio, y la cuenta free tiene 2 descargas por día.
- S8. Las olas siguen con el desplazamiento por CSS `animation-timeline` que ya existe; no se migran a GSAP.

## Fuera de alcance

- Pin de secciones, scroll suavizado (Lenis), WebGL y 3D.
- Efectos de cursor y fondos animados.
- Rediseño de cards, header o modal. Los iconos de las cards ya se dibujan solos y no cambian.
- Contenido de Sanity (texto de Sobre mí, CV real).
- Componentes de 21st.dev.

## Blast radius

- `Layout.astro`: se reemplaza el `IntersectionObserver` de `.fade-up` por GSAP y se agrega el script de motion. Afecta todas las páginas (`/`, `/404`, `/dibujos`).
- `global.css`: cambian las reglas `.fade-up`, `.fade-up-bottom`, `.draw-in` y `.line-draw`, que usan `About`, `ProjectCard`, `ContactSection`, `Hero`, `404` y `dibujos`.
- `Hero.astro` y `ContactSection.astro`: dejan de leer el SVG con `fs.readFileSync` y pasan a componentes de escena.
- Peso de JS en la página principal. Sanity Studio (`/admin`) no se toca.

## Archivos

Crear:
- `src/scripts/motion/index.ts`: entrada; registra plugins, `gsap.matchMedia()` (escritorio, celular, reduced motion), inicializa módulos y pausa loops con la pestaña oculta.
- `src/scripts/motion/reveal.ts`: entradas de secciones (`ScrollTrigger.batch`) y título del inicio con SplitText.
- `src/scripts/motion/thread.ts`: construcción del recorrido del hilo desde anclas del DOM, scrub con DrawSVG y recálculo al cambiar el tamaño.
- `src/scripts/motion/hero.ts`: loops de la escena del inicio.
- `src/scripts/motion/contact.ts`: brazo, parpadeo, morph del sobre y entrega.
- `src/components/InkThread.astro`: SVG superpuesto al `main`, con `pointer-events: none` y `aria-hidden`.
- `src/components/scenes/HeroScene.astro`: dibujo del inicio con capas (`clipPath` y pivotes), cable nuevo y líneas del monitor.
- `src/components/scenes/ContactScene.astro`: dibujo del contacto (desktop y mobile) con capas, ranura y tapa del buzón.
- `src/components/scenes/AboutScene.astro`: personaje frente al atril, con el boceto de interfaz como trazos ocultos en reposo.
- `src/scripts/motion/about.ts`: entrega del hilo a la mano, boceto con scrub y salida del hilo desde el atril.
- `scripts/check-motion.mjs`: verificación automática (ver "Tests nuevos").

Modificar:
- `package.json` y `pnpm-lock.yaml`: agregar `gsap` (dependencia), `playwright-core` (devDependency) y el script `check:motion`.
- `src/layouts/Layout.astro`: script inline `js-motion`, quitar el `IntersectionObserver` y cargar `src/scripts/motion/index.ts`.
- `src/styles/global.css`: estados iniciales bajo `.js-motion` y quitar el `draw-in` de CSS del hero (lo reemplaza GSAP).
- `src/components/Hero.astro`: usar `HeroScene` y marcar `data-split` en el `h1`.
- `src/components/ContactSection.astro`: usar `ContactScene`.
- `src/pages/index.astro`: montar `InkThread` y agregar anclas `data-thread-anchor`.
- `src/components/About.astro`: reemplazar el SVG inline actual por `AboutScene` y marcar las anclas del hilo (mano y base del atril).
- `src/components/ProjectsSection.astro`: ancla del hilo detrás de la grilla.
- `src/pages/dibujos.astro`: mostrar `HeroScene` y `ContactScene` quietas y con capas resaltadas, para la aprobación del paso 5.

Eliminar: ninguno en este plan. Los SVG de `public/` quedan como guía y respaldo. Una vez aprobado el redibujo, se pueden borrar en un paso aparte; `og-image.png` no depende de ellos.

## Pasos

- [x] 1. Línea base: correr la verificación actual y anotar los resultados en este plan → verificar: `pnpm astro check` (0 errores) y `pnpm build` ("Complete!").
  > Resultado: 0 errores, 0 warnings, 5 hints; build "Complete!".
- [x] 2. `package.json`: `pnpm add gsap@3.15.1` y `pnpm add -D playwright-core`; agregar el script `"check:motion": "node scripts/check-motion.mjs"` → verificar: `pnpm list gsap playwright-core` muestra ambas versiones y `pnpm build` completa.
- [x] 3. `src/layouts/Layout.astro` y `src/styles/global.css`: script inline en `<head>` que agrega `js-motion` a `<html>` siempre que haya JS (también con reduced motion, donde GSAP lleva todo directo al estado final); mover los estados iniciales de `.fade-up` y `.fade-up-bottom` bajo `.js-motion`; quitar el `IntersectionObserver` inline e importar `src/scripts/motion/index.ts` → verificar: con el JS desactivado en Playwright, todos los `.fade-up` tienen `opacity` 1.
- [x] 4. `src/scripts/motion/index.ts` y `reveal.ts`: registrar plugins; `gsap.matchMedia()` con tres contextos (`(min-width: 768px) and (prefers-reduced-motion: no-preference)`, `(max-width: 767px) and (prefers-reduced-motion: no-preference)`, `(prefers-reduced-motion: reduce)`); `ScrollTrigger.batch('.fade-up')` que agrega `is-visible` (conserva el trazo de iconos de CSS); SplitText por líneas con máscara en `h1[data-split]` (0.7 s, `expo.out`); `visibilitychange` pausa `gsap.globalTimeline` → verificar: `pnpm dev`, la página se ve igual que hoy y las cards aparecen al scrollear; `pnpm astro check` sin errores.
- [x] 5a. Guía de calco (fuera del repo, en la carpeta temporal): crear un venv con `scikit-image` y `numpy`, renderizar los tres SVG de `public/` a PNG de 2000 px con `magick`, esqueletizar, y exportar la línea central como SVG de guía. Medir el grosor de línea del original (distancia media entre bordes) → verificar: los tres SVG de guía abren y muestran el esqueleto completo sobre el dibujo.
- [x] 5b. `src/components/scenes/HeroScene.astro` y `ContactScene.astro` (variantes `desktop` y `mobile`): redibujar en trazos sobre la guía.
  - Grupos con `id` y `transform-origin` en cada articulación: cuello, hombros, codos y muñecas.
  - Hero: sumar el cable de la laptop (desde la laptop hasta la pata del escritorio) y 5 líneas de código en el monitor, ocultas en reposo.
  - Contacto: sumar la tapa de la ranura como pieza propia.
  - Usar las escenas en `Hero.astro` y `ContactSection.astro`. En `/dibujos`, mostrarlas quietas, superpuestas al original al 30 %, y en una vista con cada articulación en su ángulo máximo.
  → verificar: el script de comparación (en la carpeta temporal) dilata ambos trazos 2 px y mide la superposición; debe dar 85 % o más del trazo original cubierto por el nuevo en cada dibujo. Capturas de `/dibujos` y `/` en 1440 y 390 px.
- [x] 5c. `src/components/scenes/AboutScene.astro`: armar la escena con las piezas aprobadas del 5b (cabeza, rulos, manos y torso del hero) en una pose de pie: brazo derecho levantado con lápiz hacia el atril, peso en una pierna. Sumar el atril con su base y el boceto de interfaz (marco de ventana, tres puntos, dos bloques, tres líneas de texto y un botón) como trazos ocultos en reposo. Usarla en `About.astro` en lugar del SVG inline actual → verificar: capturas de `/` (sección Sobre mí) y de `/dibujos` en 1440 y 390 px, con el boceto completo visible en la vista de `/dibujos`.
  > Enmienda (5a-5c): la guía no se calcó a mano sino que se vectorizó automáticamente (esqueleto, simplificación RDP y curvas Catmull-Rom a Bézier) y después se agrupó por articulación; las sombras gruesas del buzón se rehicieron como relleno con el ancho medido. Los ojos se rehicieron como elipses en el centro medido de cada ojo original. Cobertura del trazo original: hero 100 %, contacto escritorio 99.3 %, contacto celular 97.6 % (criterio: 85 %).
  > Enmienda (5b): las líneas de código del monitor quedan visibles en reposo (sin JS y con reduced motion se ven completas); la animación las borra y reescribe.
  > Enmienda (5c): Sobre mí usa el cuerpo de pie del contacto de escritorio (no el del hero, que está sentado), con el brazo derecho redibujado apoyado en un taburete alto, porque la pose de piernas cruzadas necesita un apoyo. Lápiz y boceto agregados a mano.
  > Enmienda (revisión 1 del usuario): uniones con curvas continuas en lugar de esquinas del esqueleto (sin cortes de golpe, monitor redondeado). Manos, ranura y sombra del buzón usan el trazo original recortado (`clipPath`), porque el calco perdía su detalle. Sobre mí pasó a una pose nueva: el personaje del hero, espejado, sentado en un taburete alto, señalando el atril con la mano del contacto; el hilo sale de su índice (sin lápiz). Cobertura: hero 99.2 %, contacto escritorio 99.3 %, contacto celular 99.4 %.
  > Enmienda (revisión 2 del usuario): el calco por línea central se descarta para hero y contacto; las escenas usan el SVG original completo (fidelidad exacta) y las piezas móviles son copias recortadas con `clipPath`, con el hueco del cuerpo 1.5 unidades más chico para que no quede una línea de unión. Los calcos quedan solo como máscara (`<mask>`) para el dibujado con tinta. Sobre mí, por decisión del usuario, es una escena sin personaje: atril con pizarra (sombra sólida lateral y línea interior como el monitor), boceto de interfaz y taza con vapor, con trazos rellenos de puntas afinadas y un temblor leve de mano. El contacto en celular vuelve a usar el dibujo "apoyado".
  > Estado: aprobado por el usuario para pasar a la animación. Los fotogramas dibujados por el usuario (Krita) reemplazarán los recortes más adelante.
  **PUNTO DE CONTROL: detener la ejecución, mostrar las capturas de las tres escenas (hero y contacto con original y superposición, y Sobre mí con el boceto completo) y esperar la aprobación del usuario antes del paso 6. Si pide ajustes, iterar 5b o 5c.**
- [x] 6. `src/scripts/motion/hero.ts`, solo en contexto con movimiento.
  - Entrada única al cargar (1.4 s): DrawSVG dibuja el escritorio, el monitor y la laptop, después el personaje desde la cabeza, y al final el cable. Reemplaza el `draw-in` por `clip-path` actual.
  - Loop, con estas piezas:
    - Parpadeo: `scaleY` de 1 a 0.1 en los ojos, 120 ms, cada 3.5 a 6 s al azar.
    - Tecleo: antebrazos y muñecas alternados (codo ±2°, muñeca ±4°), ráfagas de 1.2 s con pausas.
    - Cabeza: asentimiento de 2° hacia la laptop en las pausas del tecleo; mira el monitor (giro de 3°) cuando aparece una línea de código.
    - Monitor: 5 líneas de código dibujadas con DrawSVG al ritmo del tecleo, que se borran y reescriben cada ciclo.
  - Pausa: `ScrollTrigger` con `onToggle` pausa el timeline fuera de pantalla; la escena expone `data-motion="running|paused"`.
  → verificar: `pnpm check:motion` (casos hero-loop y hero-pausa en verde).
- [x] 7. `src/components/InkThread.astro` y `src/scripts/motion/thread.ts`:
  - SVG absoluto del alto del `main`, con `z-index` por encima de los fondos y por debajo de las cards.
  - El recorrido se arma con las anclas `data-thread-anchor`: punta del cable del hero, hueco de la ola superior, detrás de la grilla de proyectos, hueco de la ola inferior, punta del lápiz en Sobre mí, base del atril (tramo nuevo), hueco de la ola del contacto y ranura del buzón. Entre el lápiz y la base del atril el hilo es el boceto del paso 7b. Los puntos se unen con curvas suaves (Catmull-Rom a Bézier) y desvíos laterales hacia columnas sin texto.
  - DrawSVG con `scrub: 0.6` sobre el scroll de toda la página; recálculo con `ScrollTrigger.refresh` y `ResizeObserver` con debounce.
  - En celular, tramos separados solo en los huecos entre secciones.
  - Con reduced motion, el trazo se ve completo y quieto.
  → verificar: `pnpm check:motion` (casos hilo-progreso, hilo-sin-texto y overflow en verde).
- [x] 7b. `src/scripts/motion/about.ts`, sincronizado con el progreso del hilo dentro de la sección Sobre mí:
  - El hilo llega a la punta del lápiz; el personaje gira apenas la cabeza hacia el atril.
  - El boceto se dibuja con scrub, en orden: marco, puntos, bloques, líneas, botón. La mano sigue el trazo con giros chicos de hombro, codo y muñeca entre cuatro poses clave.
  - Al terminar el boceto, el hilo sale de la base del atril hacia el contacto.
  - Loop suave en reposo: parpadeo y un leve balanceo del peso.
  - En celular: el boceto se dibuja al entrar la sección (sin scrub) y el hilo no pasa por la mano.
  - Con reduced motion: boceto completo y quieto.
  → verificar: `pnpm check:motion` (caso about-boceto en verde).
- [x] 8. `src/scripts/motion/contact.ts`:
  - Al llegar al último 8 % del progreso del hilo, MorphSVG transforma el tramo final en el sobre (400 ms), que entra por la ranura recortado por el borde.
  - La tapa de la ranura gira y vuelve; la escena pasa a `data-delivered="true"`. Al volver a subir se revierte en orden inverso.
  - El brazo que señala apunta al email: hombro ±3° y codo ±5°, con un "toque" del índice cada 2.4 s (`sine.inOut`). El personaje parpadea igual que en el hero y gira la cabeza hacia el sobre cuando llega.
  - En celular (dibujo apoyado): parpadeo, la mano sobre el buzón tamborilea cada pocos segundos y la entrega del sobre.
  - Con reduced motion, el sobre se ve quieto, ya dentro del buzón.
  → verificar: `pnpm check:motion` (casos entrega, reversa y contacto-mobile en verde).
- [x] 9. `scripts/check-motion.mjs`: implementar todos los casos de "Tests nuevos". El script levanta `pnpm dev --port 4400`, espera la respuesta 200, corre los casos con `playwright-core` y `/usr/bin/chromium`, cierra el servidor y sale con código distinto de 0 si algo falla → verificar: `pnpm check:motion` sale con 0.
  > Enmienda (6-9): como las escenas usan el dibujo original relleno, el dibujado con tinta anima con DrawSVG los trazos de la máscara (el calco), no el dibujo. El tecleo rota las manos recortadas (±4°) y la cabeza mira el monitor en cada línea; las líneas de código entran con `scaleX` porque son trazos rellenos.
  > Enmienda (7): el hilo de toda la página corre solo desde 1024 px (por debajo no hay lugar a los costados del contenido). En pantallas más chicas, el boceto de Sobre mí se dibuja al entrar la sección y el sobre llega al buzón al verse el contacto. El recorrido baja por el costado derecho cuando hay margen y por detrás de la última columna de cards cuando no.
  > Enmienda (7b): Sobre mí no tiene personaje (decisión del usuario): el hilo llega a la esquina de la pizarra, el boceto se dibuja con scrub entre ese punto y la pata del atril, y el hilo sigue desde ahí. Sin poses de mano.
  > Enmienda (9): los casos del hilo sin texto corren en 1024, 1440 y 1920 px y miden el texto real (rangos), no la caja del bloque. En desarrollo, `window.__gsap` y `window.__ScrollTrigger` quedan expuestos para depurar.
  > Enmienda (fuera del plan): los generadores de escenas quedaron en `scripts/illustrations/` (Python: calco, escenas y Sobre mí), para regenerarlas cuando lleguen los fotogramas dibujados en Krita.
  > Enmienda (revisión 3 del usuario): (a) Sobre mí usa el dibujo nuevo del usuario (`scripts/illustrations/source/sobre-mi.png`, publicado como `public/sobre-mi.webp`): se calcó su esqueleto para el dibujado con tinta y la mano con la tiza es una copia recortada que se mueve mientras el scroll "escribe" el esquema de la pizarra (el orden del esquema se definió a mano); (b) se quitaron las líneas de código del monitor, porque el monitor está de espaldas; (c) el hilo ahora interactúa con cada dibujo: sale del puerto de la laptop, recorre el frente del escritorio y cuelga del borde; baja entre las cards pasando solo por las separaciones (en serpentina, sin tocarlas); entra por la tiza y se vuelve el esquema de la pizarra; sale del sobre dibujado en la pizarra, baja y llega al buzón, donde su último tramo dibuja el sobre que entra por la ranura. Las posiciones se calculan con el layout (sin transformaciones) para no desfasarse con los fade-in.
- [x] 10. Presupuesto y pulido: medir el JS de motion con `gzip -c` sobre los chunks de `.vercel/output/static/_astro/` que importan GSAP (70 KB o menos); revisar capturas de 360, 390, 768, 1024, 1440 y 1920 px; correr el detector de impeccable → verificar: suma gzip de 70 KB o menos y `impeccable detect --json src` da `[]`.
  > Resultado: 62.3 KB gzip (un solo chunk con GSAP y plugins) más 149 KB de la ilustración (webp), detector `[]`, sin scroll horizontal de 360 a 1920 px, 17 casos de `pnpm check:motion` en verde.

## Tests nuevos

Todos en `scripts/check-motion.mjs`. Cada caso es un `assert` que falla con mensaje:

| Caso | Comportamiento verificado |
|---|---|
| sin-js | Con `javaScriptEnabled: false`, todo `.fade-up` y el `h1` tienen `opacity` 1. |
| reduced-motion | Con `reducedMotion: 'reduce'`: el hilo se ve completo, `data-delivered="true"`, cero tweens activos en loop (`gsap.globalTimeline.getChildren()` filtrado por `repeat === -1` y activo). |
| hilo-progreso | Al scrollear a 0 %, 50 % y 100 %, la longitud dibujada del hilo crece de forma monótona y llega a 1 o más al final. |
| hilo-sin-texto | En 1440 px, ningún punto muestreado del hilo visible cae dentro del rectángulo de un `h1`, `h2`, `h3` o `p`. |
| hero-loop | En el hero, `data-motion="running"` y el `transform` de los ojos cambia en una ventana de 7 s. |
| hero-pausa | Al scrollear hasta el contacto, el hero pasa a `data-motion="paused"`. |
| entrega | Al final de la página, `data-delivered="true"` en la escena de contacto. |
| reversa | Al volver arriba del contacto, `data-delivered="false"`. |
| hero-intro | Al cargar, el trazo del personaje se dibuja de 0 a completo y la escena termina con `data-intro="done"` en 2 s o menos. |
| about-boceto | En 1440 px, el boceto está sin dibujar al entrar a Sobre mí, completo al salir, y la mano cambia de pose entre esos dos puntos. En 390 px, el boceto queda completo tras entrar a la sección. |
| contacto-mobile | En 390 px, la escena mobile tiene parpadeo y tamborileo activos y entrega. |
| overflow | `scrollWidth - innerWidth` es 0 en 360, 390, 768, 1024, 1280, 1440 y 1920 px. |

## Verificación final

```fish
pnpm astro check
pnpm build
pnpm check:motion
/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src
```

Los cuatro sin errores, el detector en `[]`, y el presupuesto de JS del paso 10 cumplido.

## Preguntas abiertas: 0
