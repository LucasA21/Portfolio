# Plan: "Avión de papel", el sitio como mensaje que viaja

Reemplaza el concepto del hilo de `plan-hilo-de-tinta.md`. Brief: `.agents/briefs/avion-de-papel.md`. Rama: `redesign/impeccable-update`. Producción (main) no se toca.

## Objetivo y criterio de éxito

Un avión de papel sale de la laptop del hero, pasa por cada card de Proyectos, aterriza pinchado en la pizarra de Sobre mí, despega y, en Contacto, baja al buzón, se desdobla en hoja, se pliega en el sobre que ya existe, entra por la ranura y sube la banderita. La línea es su estela: un tramo corto que se desvanece, con el recorrido completo como punteado tenue.

1. El avión parece dibujado por la misma mano que las escenas: misma tinta, grosor variable, puntas afinadas, imperfección leve.
2. La estela no se acumula: el tramo visible mide 8 a 12 % del path; el resto es un punteado a opacidad 0.25 a 0.35.
3. El avión nunca tapa texto ni cruza por encima de una card; cada card sube 4 px y se dibuja el borde al pasar, y vuelve a su estado al alejarse.
4. El desdoble dura 0.6 a 0.9 s, se dispara una sola vez al llegar al buzón (no atado al scroll) y termina con la bandera arriba.
5. Contenido, layout y schema de Sanity del brief (sección 4) implementados; los datos que faltan van como campos vacíos con placeholder visible solo en dev.
6. Desde 1024 px: recorrido completo. Debajo: sin estela larga, cada escena anima lo suyo.
7. `prefers-reduced-motion: reduce`: sin vuelo ni estela; avión pinchado en la pizarra, sobre dentro del buzón, bandera arriba.
8. Sin JS todo el contenido es visible. Sin scroll horizontal de 360 a 1920 px.
9. JS de motion nuevo: el total sigue en 70 KB gzip o menos (ver riesgo R1).
10. `pnpm astro check`, `pnpm build`, `pnpm check:motion` e `impeccable detect --json src` limpios.

## Entorno detectado

- Astro 6.1 (`output: 'server'`, Vercel), Tailwind 4.3, GSAP 3.15.1 ya instalado (incluye `MotionPathPlugin`; ya se registran ScrollTrigger, DrawSVG, MorphSVG, SplitText), Sanity como CMS, pnpm 11.
- Scripts: `pnpm dev`, `pnpm build`, `pnpm astro check`, `pnpm check:motion` (17 casos en `scripts/check-motion.mjs`).
- Escenas actuales: `hero-illustration.svg` y `contact-*.svg` son contornos rellenos (potrace, `fill="#531F1F"`, `stroke="none"`); Sobre mí es `public/sobre-mi.webp` con esqueleto calcado para el dibujado. Fondo del sitio `#F6F5F1`, acento `#531F1F`.
- Hilo actual: `src/scripts/motion/thread.ts` (169 líneas) arma el recorrido desde rutas ocultas dentro de las escenas (`data-thread-path`: `hero`, `about-in`, `about-out`, `contact`) y gutters de las cards; `contact.ts` ya tiene el sobre (`data-envelope`, `data-envelope-outline`, `data-envelope-flap`), la tapa de ranura (`slotLid`) y `setDelivered`.
- `/dibujos` ya existe (solo dev) con las escenas y los íconos; se le suma la sección del avión.
- Convenciones: commits en español sin emoji, sin firma de herramienta; código y comentarios en inglés. No hay `AGENTS.md` ni reglas del repo.
- Estado git: `.gitignore` modificado por projectmem y `.projectmem/` sin trackear: no commitear. `.agents/briefs/` está sin trackear: incluirlo solo si Lucas lo pide.

## Decisiones y supuestos

Del brief (no se discuten): D1 concepto avión + estela; D2 el agente diseña el avión en SVG; D3 contorno como formas rellenas; D4 checkpoint de 3 variantes en `/dibujos`; D5 fases 1 a 4, una sesión por fase.

Del agente:

- S1. **Medir antes de dibujar.** Se renderizan los SVG de `public/` a PNG y se mide con transformada de distancia el grosor típico, mínimo y máximo del trazo, más la forma de las puntas (venv de `scikit-image` en el scratchpad, fuera del repo, como en el plan anterior). Las cifras quedan anotadas en este plan.
- S2. **Generador en Python**, no a mano en el editor: `scripts/illustrations/plane.py`. Parte de una línea central por pieza y la expande a polígono relleno con ancho variable (grueso en pliegues, fino en puntas), con una semilla fija para el desplazamiento leve de vértices. Se reutiliza el helper de trazos rellenos con puntas afinadas de `about.py` si sirve tal cual; se mira antes de escribir nada. Motivo: las 3 variantes salen de parámetros, y se regenera cuando Lucas ajuste algo.
- S3. **Desdoble como stop-motion por defecto.** Con formas rellenas, el morph de MorphSVG suele deformar mal. En la fase 1 se dibujan 4 fotogramas por variante (`plane`, ala abierta, `sheet` con pliegues, sobre plegándose) y se prueba además el morph en `/dibujos`; la fase 3 usa lo que se vea mejor. El sobre final es el existente: no se redibuja.
- S4. **Las 3 variantes difieren en carácter, no solo en proporción:**
  - A "dardo limpio": silueta clásica, pliegues finos, la más sobria.
  - B "a mano suelta": mismo dardo con más variación de grosor y vértices más movidos, para que se parezca más al trazo de las escenas.
  - C "angular chico": cuerpo más corto con el ala lateral visible, lee mejor a 40 px.
- S5. **Estela con `MotionPathPlugin` + DrawSVG** como propone el brief. El punteado completo es otro path con `stroke-dasharray: 1 9` y `stroke-linecap: round`. Se reutiliza la construcción de waypoints de `thread.ts` y se reemplazan los segmentos por un único `flightPath` con curvas alrededor de las cards (cuya lógica de gutters se conserva como base).
- S6. **Sobre mí:** la tiza y el esquema que se escribe con el scroll se mantienen; el vuelo hace una pausa (tramo casi quieto del path) mientras se escribe. El avión queda pinchado y después despega. El "sobre de la pizarra" del hilo anterior se quita, porque ahora el sobre aparece solo en el buzón.
- S7. **Avión chico saliendo de "Hablemos" y "Copiar mail"** (opcional en el brief): fuera de alcance salvo que Lucas lo pida. YAGNI, y suma carga visual a un botón.
- S8. **Kalam** para la segunda voz manuscrita, self-hosted con `@fontsource/kalam`, solo pesos 400 (y 700 si hace falta), en 2 a 4 notas. Se compara en la fase 2 con la alternativa solo si Kalam se ve mal junto a Halant.

## Riesgos

- R1. **Presupuesto de JS.** Hoy el bundle de motion pesa 62.3 KB gzip; `MotionPathPlugin` suma unos 4 a 6 KB. Debería entrar bajo 70 KB, pero se mide en la fase 3. Si no entra: calcular posición y rotación del avión con `getPointAtLength` en vez del plugin (son pocas líneas) y no cargarlo.
- R2. **El morph relleno se ve feo.** Mitigado con S3.
- R3. **Reescribir `thread.ts` rompe casos de `check-motion.mjs`** (hilo-progreso, hilo-sin-texto, entrega, reversa, about-boceto). Se adaptan en la fase 3, no se borran: cada comportamiento que sigue vigente conserva su caso.
- R4. **Desfase con los `fade-up`** (llevan transform): se sigue midiendo con `offsetTop`, como ya hace `thread.ts`.

## Fuera de alcance

- Pin de secciones, Lenis, WebGL, efectos de cursor.
- Cambiar las escenas dibujadas (hero, contacto, Sobre mí) o el sobre del buzón.
- Cargar datos reales en Sanity (métricas, "Ahora mismo", `cv.pdf`): quedan como placeholder y se listan al final de cada fase.
- Push a remoto y merge a main.

## Blast radius

- Fase 1: solo archivos nuevos y `dibujos.astro` (solo dev). Cero impacto en producción.
- Fase 2: `Hero.astro`, `ProjectsSection.astro`, `ProjectCard.astro`, `About.astro`, `ContactSection.astro`, `Footer.astro`, `global.css`, `Layout.astro` (fuente), `src/sanity/schemas/project.ts` y `siteSettings.ts`. El schema nuevo hay que desplegarlo en Sanity para que los campos aparezcan en el Studio.
- Fase 3: `thread.ts` (se reescribe), `InkThread.astro`, `contact.ts`, `about.ts`, `hero.ts`, `index.ts`, `scripts/check-motion.mjs`.
- Fase 4: ajustes transversales y reportes.

## Fases

### Fase 1: diseño del avión y del desdoble (hecha: Lucas eligió la variante A; B y C se conservan en `src/components/planes/` para probar después)

- [x] 1.1. Medición del trazo: renderizar `public/hero-illustration.svg` y `public/contact-señalar.svg` a PNG de 2000 px, medir grosor típico, mínimo y máximo (en unidades del viewBox y en px a tamaño de pantalla) y forma de las puntas; anotar cifras en este plan → verificar: tabla de medidas en este archivo y el color de tinta confirmado (`#531F1F`).
- [x] 1.2. Leer `scripts/illustrations/about.py` y `trace.py` y decidir qué helper de trazo relleno se reutiliza → verificar: nota de una línea en el plan con la función elegida (o el motivo de escribir una nueva).
- [x] 1.3. `scripts/illustrations/plane.py`: genera el SVG de las piezas para las variantes A, B y C.
  - `plane`: dardo en 3/4 con quilla y línea de pliegue central, contorno relleno con grosor variable, líneas internas más finas, relleno de las caras `#F6F5F1`, punta hacia +x para poder usar autoRotate.
  - `plane-pinned`: el mismo avión apoyado, con chinche de línea.
  - `sheet`: hoja desplegada con marcas de pliegue en diagonal.
  - Fotogramas intermedios `unfold-1` y `unfold-2` (de avión a hoja) y `fold-1` y `fold-2` (de hoja a sobre).
  → verificar: el script corre con `python3 -I` y escribe los SVG en `src/components/planes/` (un archivo por variante y pieza); cada SVG abre sin errores y mide 40 a 56 px de largo útil al tamaño de uso.
- [x] 1.4. `src/pages/dibujos.astro`: sección "Avión de papel" (solo dev, ya hay guard `import.meta.env.DEV`).
  - Tres columnas A, B y C, cada una con `plane`, `plane-pinned`, `sheet` y la secuencia de desdoble, a tamaño de uso y ampliado.
  - Al lado de cada una, un recorte de la escena del hero (zona de la laptop) y del buzón (zona de la ranura y la banderita) para comparar el trazo; los recortes salen del SVG existente con `viewBox`, no son imágenes nuevas.
  - Prueba del morph `plane → sheet → envelope` con MorphSVG, con un botón para reproducirlo y otro para el stop-motion, para ver cuál queda mejor.
  → verificar: `pnpm dev` y capturas de `/dibujos` en 1440 y 390 px con Playwright (`/usr/bin/chromium`); revisar a ojo que el grosor de las 3 variantes cae dentro del rango medido en 1.1.
- [x] 1.5. `pnpm astro check` sin errores nuevos y detector de impeccable en `[]`.
- [x] 1.6. **PUNTO DE CONTROL: detener la ejecución, mostrar las capturas y esperar que Lucas elija una variante (o pida ajustes, y se itera 1.3 y 1.4). No se integra nada al sitio en esta fase.**

Entrega de la fase: resumen corto con qué cambió, qué quedó con placeholder (nada) y qué mirar en el navegador (`/dibujos`, sección del avión).

### Fase 2: contenido, layout y schema de Sanity

> Enmiendas (fase 2): (a) "Mandame un mensaje" pasó a secundario con borde y "Ver proyectos" es el primario, como pide el brief. (b) Sin captura, la card muestra `[captura]` en dev y el ícono de `Doodle` en producción; igual con los 3 datos de TheJudex (ocultos en producción si faltan). (c) Si ningún proyecto tiene `featured`, se destaca "TheJudex" por título hasta que se marque en Sanity. (d) La grilla compacta pasó a 4 columnas desde 1024 px (límite del "Ver más": 8, 4 o 3). (e) Header: links de redes y de navegación llevados a 44 px de alto. (f) `check-motion.mjs`: el caso about-boceto en 390 px ahora centra la escena (con el texto más alto la escena queda bajo la línea de disparo si solo se scrollea a `#about`). (g) El bloque "Ahora mismo" y el pill de disponibilidad vienen de Sanity (`about.now`, `hero.availability`). (h) Se agregó `@fontsource/kalam` (sin Kalam 700) y el color `#a8433a` para el acento cálido (contraste 4.5:1 sobre ambos fondos; `#b44a3f` del brief no llegaba).

- [x] 2.1. Schema de proyecto: `featured` (boolean), `screenshot` (image con `alt` obligatorio), `highlights` (array de `{ value, label }`, máximo 3). Íconos de `Doodle.astro` como respaldo sin captura → verificar: `pnpm astro check`, build.
- [x] 2.2. `siteSettings`: pill de estado ("Disponible para [trabajo / proyectos]") y lista "Ahora mismo" (primer ítem "5to año de Licenciatura en Sistemas, UNTDF"); footer con el default del código si falta el valor.
- [x] 2.3. Hero: pill con punto verde, línea manuscrita "hola, soy Lk", H1 y bajada nuevos, botones "Ver proyectos" y "Mandame un mensaje" (el CV sale) → verificar: captura en 1440 y 390 px.
- [x] 2.4. Proyectos: título con nota manuscrita; TheJudex destacado (card ancha con captura, etiqueta "Destacado · en producción", 3 datos, "Ver el sitio" y "Cómo lo hice"); grilla compacta con captura real para el resto; se mantiene "Ver más proyectos". Placeholders `[N]`, `[captura]`, `[rol]` visibles solo en dev.
- [x] 2.5. Sobre mí: texto corto, bloque "Ahora mismo", "Descargar CV" solo acá.
- [x] 2.6. Contacto: título, bajada, mail grande con subrayado de tinta, "Copiar mail" con "Copiado" en `aria-live`, link a LinkedIn; footer "© 2026 Lucas Araya. Dibujado y programado en Ushuaia."
- [x] 2.7. Tipografía: `@fontsource/kalam` self-hosted, color `#b44a3f`, en 2 a 4 notas; cuerpo 15 a 18 px con contraste 4.5:1 o más; botones y links táctiles de 44 px de alto como mínimo.
  → verificar fase: `pnpm astro check`, `pnpm build`, `pnpm check:motion` sin romper los casos vigentes, detector `[]`. Lista de placeholders para que Lucas cargue en Sanity.

### Fase 3: vuelo, estela, cards, pizarra y buzón, más tests

> Enmiendas (fase 3): (a) Sin `MotionPathPlugin`: la posición y el rumbo del avión salen de `getPointAtLength` sobre la ruta (riesgo R1; total de JS de motion 64.3 KB gzip). (b) `thread.ts` se reemplazó por `flight.ts`; la ruta de las cards (separaciones, sin tocarlas) y las rutas ocultas dentro de las escenas se conservaron. (c) Estela: 3 tramos con opacidad 0.25, 0.55 y 0.95 (10 % de la ruta) en lugar de un degradado; el recorrido completo es el punteado a 0.3. (d) La pizarra: el avión planea sobre el pizarrón mientras se escribe el esquema y queda pinchado sobre el sobre dibujado; hay 140 px de scroll de pausa antes de despegar. (e) La bandera del buzón no existía en el dibujo: se agregó en `scenes.py` (poste y banderín, baja por defecto y sube al entregar). (f) Desdoble por stop-motion (variante A, 5 fotogramas, 0.75 s) disparado por la llegada, no por el scroll; el sobre existente aparece al terminar. (g) Debajo de 1024 px: sin ruta ni estela; el avión sale de la laptop y se va de cuadro, y en contacto baja al buzón, se desdobla y entra. (h) Con reduced motion: avión pinchado, sin puntos, bandera arriba. (i) Los casos de `check-motion` del hilo se reemplazaron por: vuelo-progreso, avion-orientacion, estela-acotada, cards-elevacion, avion-pinchado, desdoble-una-vez y mobile-sin-estela (23 casos en total).

- [x] 3.1. Reescribir `thread.ts` como `flight.ts`: `flightPath` desde la laptop, curva alrededor de cada card, pausa en la pizarra, bajada al buzón; avión con `MotionPathPlugin` y `autoRotate`, `scrub` 0.5 a 1; estela con DrawSVG `"${p - 0.1} ${p}"` y máscara que desvanece la cola; punteado completo tenue.
- [x] 3.2. Cards: un ScrollTrigger por card (o callback por progreso) con `y: -4` y borde dibujado con DrawSVG sobre un `rect` superpuesto; vuelve al estado normal al alejarse.
- [x] 3.3. Hero: destello de "enviar" en la laptop antes de que salga el avión. Pizarra: pausa, pop de la chinche, despegue.
- [x] 3.4. Buzón: desdoble disparado una sola vez al llegar (0.6 a 0.9 s), sobre a la ranura, bandera que rota a vertical con rebote; reversa al volver a subir.
- [x] 3.5. Debajo de 1024 px y con reduced motion según criterios 6 y 7.
- [x] 3.6. `scripts/check-motion.mjs`: casos nuevos para orientación del avión en el path, largo de estela acotado, elevación y vuelta de cada card, desdoble disparado una sola vez, reduced motion y menos de 1024 px; adaptar los casos del hilo (R3).
  → verificar: `pnpm astro check`, `pnpm build`, `pnpm check:motion` en verde, JS de motion medido con `gzip -c` sobre los chunks de `.vercel/output/static/_astro/` (R1), detector `[]`.

### Fase 4: pulido

- [x] 4.1. Capturas a 360, 390, 768, 1024, 1440 y 1920 px; sin scroll horizontal; reduced motion.
- [x] 4.2. `dev-release-check` y `dev-verify` antes de proponer el merge.

## Preguntas abiertas: 0

Supuestos que asumo salvo que digas otra cosa: S3 (stop-motion por defecto, morph como prueba), S7 (sin avión chico en los botones), y que las 3 variantes del S4 sirven como abanico.

## Verificación final (cada fase, en lo que aplique)

```fish
pnpm astro check
pnpm build
pnpm check:motion
/home/lk/.claude/skills/impeccable/scripts/impeccable detect --json src
```

## Resultado de la fase 4

- Capturas a 360, 390, 768, 1024, 1440 y 1920 px y con reduced motion: sin scroll horizontal, sin errores de consola, sin estela residual, fuentes Halant y Kalam cargadas.
- Enmiendas: el botón del mail dice siempre "Copiar mail" (antes tomaba el texto de Sanity, "HABLEMOS", y copiaba el mail); el mail baja a `clamp(1rem, 5vw, 40px)` para no cortarse a 360 px; los 3 datos de TheJudex muestran ejemplos entre corchetes solo en dev.
- `dev-release-check`: LISTO CON RIESGOS (detalle en el reporte final de la sesión). Pendiente de Lucas: textos de Sanity (el hero, el título y el botón de contacto siguen con los valores viejos del dataset), `public/cv.pdf`, capturas de proyectos y datos de TheJudex.
