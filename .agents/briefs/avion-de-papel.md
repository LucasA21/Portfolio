# Brief: el avión de papel y el rediseño del portfolio

Rama: `redesign/impeccable-update`. Producción (main) no se toca.
Antecedentes: `.agents/plans/plan-hilo-de-tinta.md` y el handoff anterior. Este brief **reemplaza el concepto del hilo**: la línea deja de ser un cable y pasa a ser la estela de un avión de papel.

## 1. La idea

El sitio entero es un mensaje que viaja hacia quien lo visita, y termina cuando esa persona responde. El avión es el protagonista y la línea es su estela.

| Sección | Qué pasa |
|---|---|
| Hero | Lucas aprieta "enviar" en la laptop; un avión sale de la pantalla y arranca a volar. |
| Proyectos | El avión pasa por cada card; al pasar, la card sube 4 px y se le dibuja el borde. Nunca la tapa ni la cruza por encima del texto. |
| Sobre mí | El avión aterriza en la pizarra y queda pinchado (con una chinche) como parte del esquema; después despega. |
| Contacto | El avión baja al buzón, se desdobla en una hoja, se pliega en el sobre (el que ya existe en la escena), entra al buzón y sube la banderita. |

Regla clave: **la estela no se acumula**. Detrás del avión queda un tramo visible corto (aprox. 8–12 % del path) que se desvanece; el recorrido completo queda solo como un punteado muy tenue (opacidad 0.25–0.35, `stroke-dasharray` tipo `1 9`, extremos redondeados). Lo que se lee es un objeto que se mueve con intención, no una línea infinita.

## 2. El avión lo diseñás vos (el agente)


### Estilo
- Tiene que parecer dibujado con la misma mano que las escenas de `public/` y `src/components/scenes/`. Antes de dibujar, medí en esos SVG el color de tinta, el grosor típico y mínimo/máximo del trazo y la forma de los extremos.
- Las ilustraciones tienen **grosor variable** (se descartó redibujar con trazo uniforme). Por eso el contorno del avión va como **formas rellenas** (outline expandido con leve variación de ancho, más grueso en los pliegues y más fino en las puntas), no como `stroke` uniforme. Las líneas internas de pliegue pueden ser más finas.
- Imperfección leve: vértices apenas desplazados y curvas mínimas en lados que serían rectos. Nada de geometría perfecta tipo ícono.
- Relleno de las caras: el fondo claro del sitio (para que tape la estela que pasa detrás); tinta solo en contornos y pliegues.
- Tamaño en pantalla: 40–56 px de largo en desktop.

### Piezas a dibujar
1. `plane`: avión clásico tipo dardo visto en 3/4, con la quilla y una línea de pliegue central. El path del vuelo orienta la punta (auto-rotate).
2. `plane-pinned`: el mismo avión apoyado, con una chinche de línea.
3. `sheet`: la hoja desplegada, con las marcas de pliegue en diagonal.
4. El sobre final es **el que ya está en la escena de contacto**; no lo redibujes, morfeá hacia él.

### Transición avión → sobre
- GSAP 3.13+ incluye todos los plugins gratis: usá `MorphSVGPlugin` para `plane → sheet → envelope`. Si el morph se ve feo con formas rellenas, alternativa: secuencia de 3–4 fotogramas intermedios dibujados y cross-fade rápido (stop-motion), que combina bien con el estilo a mano.
- Duración total del desdoble: 0.6–0.9 s, disparado cuando el avión llega al buzón (no atado 1:1 al scroll), con `ease` suave. Después: el sobre entra en la ranura y la bandera rota a vertical con un pequeño rebote.

### Checkpoint de diseño (obligatorio)
Poné **3 variantes del avión** (y su desdoble) en `/dibujos` (solo dev), lado a lado con un recorte de la escena del hero y del buzón para comparar el trazo. **Frená y esperá que Lucas elija una** antes de integrar nada.

## 3. Animación: cómo se integra

Restricciones que se mantienen del trabajo anterior:
- GSAP + ScrollTrigger en `src/scripts/motion/`. Sin pin, sin Lenis, sin React para animar.
- `clamp(top 75%)` cuando una sección puede quedar al final; medir con `offsetTop` (los `fade-up` llevan transform).
- Desde 1024 px: recorrido completo. Debajo de 1024 px: sin estela larga; cada escena anima lo suyo (el avión sale de la laptop y se va de cuadro; en contacto entra, se desdobla y entra al buzón).
- `prefers-reduced-motion: reduce`: sin vuelo ni estela; estados finales estáticos (avión pinchado en la pizarra, sobre adentro del buzón, bandera arriba).

Propuesta técnica (ajustala si encontrás algo mejor y justificalo en el plan):
- Reutilizá el path del hilo actual como `flightPath`, reajustado para que haga una curva alrededor de cada card en lugar de pasar entre ellas en línea recta.
- `MotionPathPlugin` con `autoRotate` para el avión, con `scrub` corto (0.5–1) para que tenga algo de inercia.
- Estela: un segundo path igual a `flightPath` con `DrawSVGPlugin`, animando inicio y fin juntos (`drawSVG: "${p - 0.1} ${p}"`) para que el tramo visible siga al avión; un gradiente o máscara que lo desvanezca en la cola.
- Pasadas por las cards: un ScrollTrigger por card (o un callback por progreso del path) que haga `y: -4` y dibuje el borde con DrawSVG sobre un `rect` SVG superpuesto. Que vuelva al estado normal cuando el avión se aleja.
- Pizarra: el vuelo hace una pausa (un tramo del path casi quieto) mientras se escribe el esquema que ya existe; la chinche aparece con un pequeño "pop".
- Hero: el gesto de "enviar" puede ser un destello en la pantalla del monitor o la laptop justo antes de que salga el avión. El monitor sigue sin líneas de código.
- Mientras el usuario escribe o hace clic en "Hablemos" o "Copiar mail", opcional: un avión chico sale del botón. Solo si no recarga.

Tests: extendé `scripts/check-motion.mjs` con casos para: orientación del avión en el path, estela con largo acotado (no se acumula), elevación y vuelta de cada card, desdoble disparado una sola vez, estados con reduced motion y el comportamiento debajo de 1024 px. `pnpm astro check`, `pnpm build` y `impeccable detect --json src` tienen que dar limpio.

## 4. Cambios de contenido y layout

Los datos que no estén en el repo o en Sanity **no se inventan**: van como campos vacíos en Sanity con un placeholder visible en dev (`[N]`, `[captura]`) y se anotan en el resumen final para que Lucas los cargue.

### Hero
- Pill de estado: "Disponible para [trabajo / proyectos]", con un punto verde; editable desde Sanity.
- Línea manuscrita arriba del título: "hola, soy Lk".
- H1: "Diseño interfaces y las llevo a producción."
- Bajada: "Frontend desde Ushuaia, con Astro, React y TypeScript. Me importa que se entienda a primera vista y que cargue rápido."
- Botones: "Ver proyectos" (primario) y "Mandame un mensaje" (secundario, ancla a contacto). **El CV sale del hero.**

### Proyectos
- Título "Proyectos" con una nota manuscrita al costado: "uno en producción, los demás para aprender".
- **TheJudex destacado**: card ancha con la captura real a la izquierda y, a la derecha, la etiqueta "Destacado · en producción", el título, una línea de descripción, 3 datos (páginas indexadas, Lighthouse, qué hizo Lucas) y los links "Ver el sitio" y "Cómo lo hice".
- Resto (Lumen, Tamara Vasak, SyncLife, PixDex): grilla de cards compactas con **captura real** arriba en lugar del ícono, título, una línea y el stack en texto chico.
- Sanity: agregá `featured` (boolean), `screenshot` (image con `alt` obligatorio) y `highlights` (array de `{ value, label }`, máximo 3) al schema de proyecto. Los íconos de `Doodle.astro` quedan como respaldo si no hay captura.
- Se mantiene "Ver más proyectos".

### Sobre mí
- Texto más corto: "Soy Lucas, frontend developer. Cuido la jerarquía, el ritmo y los detalles de movimiento, y me animo con el backend cuando el proyecto lo pide."
- Bloque "Ahora mismo" (lista corta desde Sanity): primer ítem "5to año de Licenciatura en Sistemas, UNTDF"; el resto lo carga Lucas.
- "Descargar CV" queda solo acá (secundario).

### Contacto
- Título: "El mensaje llegó. Ahora te toca a vos."
- Bajada: "Si tenés un proyecto o una búsqueda, escribime y te respondo."
- Mail grande con subrayado de tinta, botón "Copiar mail" (con feedback "Copiado" accesible vía `aria-live`) y link a LinkedIn.
- Footer: "© 2026 Lucas Araya. Dibujado y programado en Ushuaia." (cambiar el valor en Sanity o dejar el default en el código; quitar "All rights reserved").

### Tipografía y legibilidad
- Segunda voz manuscrita: **Kalam** (o una alternativa mejor si la justificás), self-hosted vía `@fontsource`, usada en 2–4 notas en toda la página, en el color de acento cálido (aprox. `#b44a3f`). No más.
- Texto de cuerpo: 15–18 px según contexto; el gris actual del cuerpo está bajo, subilo hasta contraste 4.5:1 o más sobre el fondo.
- Botones y links táctiles: mínimo 44 px de alto.

## 5. Cómo trabajar

- Primero leé este brief, el handoff y el plan anterior, armá un plan en `.agents/plans/plan-avion-de-papel.md` y **detenete hasta que Lucas lo apruebe**.
- Orden sugerido por fases (una sesión por fase para cuidar el uso):
  1. Diseño del avión y del desdoble + `/dibujos` → checkpoint de elección.
  2. Contenido, layout y schema de Sanity.
  3. Vuelo, estela, cards, pizarra y buzón + tests.
  4. Pulido, mobile y reduced motion, `dev-release-check`.
- Commits con Conventional Commits en español, sin emoji, uno por cambio lógico. No pushees sin que Lucas lo pida.
- Trampas vigentes del handoff: `allowBuilds` de pnpm, no commitear `.gitignore` ni `.projectmem/`, no leer `.env`.
- Al terminar cada fase: resumen corto con lo que cambió, lo que quedó con placeholder y qué tiene que mirar Lucas en el navegador.
