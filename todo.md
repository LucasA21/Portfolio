# To-do: mejoras del portfolio y de la animación

> **Plan de resolución:** `.agents/plans/plan-pulido-final.md` (cubre todo este archivo, el bug del sobre y la estela móvil). Cada ítem queda hecho, descartado con motivo o derivado a Lucas.

## Para después (no entra en el commit del pulido final)
- [ ] **Revisar el proyecto TheJudex** (carpeta `~/Proyectos/TheJudex`, en producción y con buenas prácticas avanzadas) para copiarle al portfolio lo que le falte, sobre todo SEO: datos estructurados, `llms.txt`, sitemaps, RSS, imágenes OG dinámicas, cabeceras de seguridad y CSP, accesibilidad y tests. Hacerlo con `dev-audit` o `dev-onboard` y llevar lo útil a un plan nuevo.

## Pedidos de Lucas (2026-11-11)
- [x] **P1 (bug)** Al llegar al fondo y volver a subir, sube un sobre en lugar del dibujo del avión: `deliver(false)` (`contact.ts`) sube el sobre y suelta el avión al mismo tiempo, sin plegar el sobre de nuevo en avión. (`harden`) **→ hecho: `hooks.refold`, tests `entrega-reversa*`**
- [x] **P2** En móvil el avión no tiene estela detrás. (`animate`) **→ hecho: estela `data-trail="m"`, test `mobile-estela`**
- [x] **P1** Posicionamiento: contar que la especialidad es frontend (UI/UX), sin mencionar backend; plan B "fullstack especializado en UI/UX". El H1 actual ya dice frontend: se quitan las menciones de backend de Sobre mí y de TheJudex. (`clarify`) **→ hecho en código; falta cargar `.agents/copy-sanity.md` en Sanity (Lucas)**

Revisión rápida del 2026-11-09 con los criterios de `/impeccable` (modo Experience: es un portfolio, la obra manda desde la primera pantalla y la interfaz se corre del medio).
Lo que bloquea el merge (contenido de Sanity, `cv.pdf`, seguridad, dataset `staging`) ya está en `.agents/todo-release.md`; acá no se repite.

Prioridad: **P1** antes del release, **P2** en la próxima pasada, **P3** si sobra tiempo.
Entre paréntesis, el comando de `/impeccable` que lo cubre.

## Lo que ya funciona (no tocar)
- El dibujo a mano es la identidad: el personaje, el avión y el sobre cuentan una historia que nadie más tiene. Ningún otro portfolio podría usar esta página sin cambios.
- La paleta (tinta `#531F1F`, papel `#F6F5F1`, acento `#a8433a`) y la Kalam como nota manuscrita son coherentes en todo el sitio.
- Rendimiento: Lighthouse 100 en móvil y desktop; reduced motion respetado; 39 tests de motion.

## Segunda revisión (2026-11-11, dos revisores en `agy` con Gemini 3.8 Flash, verificados en el navegador)
Puntaje 23/32 (Bueno, 72 %). Snapshot en `.impeccable/critique/`. Los ítems nuevos están marcados con **(nuevo)** y el resto de esta lista se mantiene.
- [x] **P1 (nuevo)** El lightbox del modal no se abre con teclado: `#modal-image-container` en `src/components/ProjectModal.astro` es un `div` con `click` (listener en `ProjectsSection.astro:163`) sin `tabindex`, `role` ni `keydown` (WCAG 2.1.1, nivel A). Pasarlo a un `button` con `aria-label="Ampliar imagen"`. (`harden`) **→ hecho**
- [x] **P1 (nuevo)** `#close-lightbox`, `#lightbox-prev` y `#lightbox-next` no tienen `aria-label` (WCAG 4.1.2, nivel A): se anuncian como botones vacíos. Agregar "Cerrar vista ampliada", "Imagen anterior" e "Imagen siguiente". (`harden`) **→ hecho**
- [x] **P1 (nuevo)** El mensaje de posicionamiento se contradice: el H1 dice frontend y UI/UX, Sobre mí dice "me animo con el backend cuando el proyecto lo pide", y TheJudex (el destacado) se cuenta con SEO programático, PostgreSQL e IA, casi todo backend. Reescribir el H1 y contar TheJudex desde las decisiones de interfaz y de rendimiento (el 100 de Lighthouse, el catálogo sin JavaScript de cliente). (`clarify`) **→ hecho en código; TheJudex, SyncLife y Lumen siguen con backend en Sanity (Lucas, ver `.agents/copy-sanity.md`)**
- [x] **P2 (nuevo)** Las cards chicas se abren con un `button` invisible a pantalla completa (`ProjectCard.astro:72`); en celular nada lo indica. Sumar un "Ver caso" visible al pie. (`clarify`) **→ hecho: "Ver caso"**
- [x] **P2 (nuevo)** Mientras faltan capturas, Lumen, SyncLife y PixDex muestran íconos dibujados al lado de capturas reales, y en celular la grilla queda como una fila de cajas grises (el valle de la página). Cargar los links en Sanity y correr `node scripts/screenshots.mjs`; hasta entonces, darle al ícono el mismo marco que a las capturas. (`layout`) **→ derivado a Lucas: links en Sanity y `node scripts/screenshots.mjs`**
- [x] **P3 (nuevo)** El texto `uno en producción, los demás para aprender` (acento `#a8433a` sobre el fondo de la sección) tiene 4,55:1: pasa por muy poco. No aclarar ese tono. (`typeset`) **→ hecho: comentario junto al token en `global.css`**
- [x] **P3 (nuevo)** Los 4 separadores de ola (`WaveSeparator`, clase `wave-drift`) son decorativos y no tienen `aria-hidden="true"`. (`harden`) **→ hecho**
- [x] **P3 (nuevo)** El pie repite los mismos 3 links del header; reemplazar por GitHub y CV, que sí suman. (`distill`) **→ hecho: GitHub y CV**
- [x] **P3 (nuevo)** Probar con tus ojos: el avión enciende cards mientras se lee Proyectos. Si distrae, atar el anillo a velocidad de scroll alta o dejarlo solo en el hueco. (`animate`) **→ derivado a Lucas: probar en el navegador**

Descartado por revisión (no hacer nada): botones del hero móvil (sí se ven en la primera pantalla), "flecha huérfana" en las cards (es el avión), scroll brusco (probado, no rompe), foco del modal (funciona y vuelve a la card), skip link (se ve en `top: 16px`), "Ver menos" con `scrollIntoView` (patrón normal), desborde a 320 px (no hay).

## Contenido y copy
- [x] **P1** El H1 "Frontend Developer especializado en UI/UX." es intercambiable con cualquier portfolio y contradice al dibujo, que sí es único. Proponer 2 o 3 alternativas que digan qué hacés y para quién (ej.: "Hago interfaces que se entienden a primera vista y cargan rápido"), y dejar "Frontend Developer" como etiqueta chica arriba. (`clarify`) **→ descartado: decisión de Lucas, el H1 se mantiene**
- [x] **P1** La meta description ("apasionado por crear interfaces modernas, minimalistas y de alto rendimiento") es genérica y no coincide con el copy nuevo. Reescribirla con el mismo tono del hero. (`clarify`) **→ hecho**
- [x] **P2** El mail del sitio es `@hotmail.com` y tenés el dominio `lucasaraya.com.ar`: un `hola@lucasaraya.com.ar` (reenvío gratis con ImprovMX o Cloudflare Email Routing) da más confianza en la sección que cierra la historia. (`clarify`) **→ derivado a Lucas: reenvío de correo y cambio en Sanity**
- [x] **P2** "Hagamos equipo" + "Estoy con disponibilidad para sumarme a nuevos proyectos" suena a plantilla. Algo con la voz del sitio, por ejemplo: "Mandame un avión" o "¿Tenés un proyecto? Escribime". (`clarify`) **→ hecho: "Mandame un avión." (cargar en Sanity)**
- [x] **P3** Los tags de las cards ("Astro · TypeScript · PostgreSQL") compiten con la descripción en tamaño muy chico; mostrarlos solo en el modal o subirlos a 13 px mínimo. (`typeset`) **→ hecho: 14 px**

## Layout y jerarquía
- [x] **P1** Las 4 cards chicas en desktop tienen texto de 13 a 14 px, descripciones cortadas con "..." y capturas de 150 px de alto: se leen como miniaturas de relleno al lado del destacado. Opciones: 2 columnas con captura más grande y una línea de "qué resolví", o una lista editorial (título, año, una línea) que abre el modal. (`layout`) **→ hecho: 2 columnas, 3 líneas de descripción, "Ver caso"**
- [x] **P2** En el destacado de TheJudex, "Ver el sitio" y "Cómo lo hice" son links chicos al pie; es el proyecto en producción y la acción principal de la página. Darle a "Ver el sitio" peso de botón. (`layout`) **→ hecho**
- [x] **P2** En móvil el header muestra solo los 4 íconos de redes: no hay forma de saltar a Proyectos, Sobre mí o Contacto. Agregar los 3 links como texto chico o un menú simple, y mover las redes al footer. (`adapt`) **→ hecho: links de sección arriba y redes abajo (las redes quedan en el header)**
- [x] **P3** En móvil, "Ver más proyectos (1)" esconde una sola card detrás de un toque extra. Con 5 proyectos, mostrarlos todos. (`distill`) **→ hecho**
- [x] **P3** Sobre mí en desktop: el texto queda corto al lado de un dibujo alto, con mucho aire abajo. Alinear el bloque de texto al centro vertical del pizarrón o sumar 1 o 2 líneas de "cómo trabajo". (`layout`) **→ descartado: la grilla ya centra el texto contra el pizarrón**

## Animación (historia del avión)
- [x] **P1** Cierre de la historia (regla pico-final): cuando el sobre entra al buzón y sube la bandera, no pasa nada con la acción principal. Al terminar la entrega, dibujar con tinta el subrayado del mail o hacer un pulso único en "Copiar mail", para que el final de la animación lleve a escribirte. (`delight`) **→ hecho: subrayado de tinta y pulso, test `contacto-cierre`**
- [x] **P3** En móvil los cruces no dejan estela. Una estela corta (la mitad del ancho de pantalla, que se borra sola) ayudaría a leer la dirección del vuelo sin ensuciar. (`animate`) **→ hecho**
- [x] **P3** Revisar a 1024 px el paso del avión por el margen izquierdo de Sobre mí: el margen es más angosto y puede rozar el pizarrón. (`adapt`) **→ hecho: verificado con capturas a 1024, 1100 y 1440 px**
- [x] **P3** El anillo rojo de las cards al pasar el avión y el `hover` (que también levanta la card) se parecen demasiado. Diferenciar: el avión dibuja el borde con tinta; el hover solo levanta. (`polish`) **→ hecho: el hover solo levanta**

## Accesibilidad y robustez
- [x] **P2** El hero comunica la historia solo con movimiento. Para lectores de pantalla, el `aria-label` del dibujo podría contar la acción ("Lucas en su escritorio; al bajar, tira un avión de papel que recorre la página") y el SVG del vuelo seguir oculto. (`harden`) **→ hecho: `aria-label` del hero**
- [x] **P2** Probar la página con zoom de navegador al 200 % y con `font-size` grande: las rutas del avión se calculan con el layout y conviene confirmar que se recalculan bien. (`harden`) **→ hecho: tests `overflow` a 320 y 720 px y `ruta-recalculo`**
- [x] **P3** La animación de reveal del H1 (SplitText con máscara) corre en cada carga; con conexión lenta el título tarda en leerse. Mostrarlo sin animar si la fuente tarda más de 1 s. (`harden`) **→ descartado: fuente precargada, FCP y LCP de 1,0 s (S5)**

## Rendimiento y archivos
- [x] **P2** `public/mano.svg` (212 KB) no se usa en ningún lado: borrarlo. (`optimize`) **→ hecho**
- [x] **P2** `public/favicon.svg` pesa 88 KB y `favicon.ico` 187 KB para un ícono de 32 px. Rehacerlo como un avión de papel simple (une el ícono con la historia) en menos de 2 KB. (`optimize`, `delight`) **→ hecho: avión de 354 bytes; `favicon.ico` de 3,5 KB**
- [x] **P2** `og-image.png` muestra otro dibujo (de pie, con plantas y estante) en tinta gris, no el estilo actual. Regenerarla con el personaje del hero, el avión y la tinta marrón (1200 x 630), así al compartir el link se ve el sitio nuevo. (`polish`) **→ hecho: `scripts/og-image.mjs`, 25 KB**
- [x] **P3** El JS de la página pesa unos 60 KB comprimidos (GSAP incluido). Cargar `flight` y las escenas de abajo con import dinámico, después del primer render, dejaría el hilo libre antes en celulares lentos. (`optimize`) **→ descartado: sin ganancia medible (performance 100, TBT 0 a 40 ms)**

## Proceso
- [x] Correr `/impeccable init` para dejar `PRODUCT.md` (a quién le hablás, tono, qué tiene que pasar al terminar de ver el sitio) y `/impeccable document` para `DESIGN.md` con los tokens actuales; las próximas revisiones van a ser más precisas. **→ derivado a Lucas: requiere entrevista, sesión aparte**
- [x] Después de los cambios de copy y layout, repetir `/impeccable critique` completo (con los dos subagentes) para tener puntaje de referencia. **→ hecho: ver resultado en el handoff**
