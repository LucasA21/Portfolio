> **Obsoleto (2026-11-11):** Lucas no hará más dibujos en Krita. Las escenas de Sobre mí y contacto quedan como están; el hero ya se resolvió con los 12 PNG existentes (ver `plan-hero-por-fotogramas.md`).

# Brief: personaje por capas y ajustes del vuelo

Rama: `redesign/impeccable-update`. Producción (main) no se toca.
Antecedentes: handoff actual, `.agents/plans/plan-avion-de-papel.md`, `.agents/briefs/avion-de-papel.md`.

## 1. Por qué redibujar

Las ilustraciones actuales son SVG planos: cada dibujo es una sola capa y, donde el brazo tapa al torso, el torso no existe. Por eso hoy solo se pueden recortar piezas con `clipPath` y moverlas poco. Para que Lucas lance el avión con la mano, escriba en la pizarra o reciba el avión, hace falta un personaje armado como una marioneta: piezas separadas, articuladas en sus uniones y con las partes ocultas dibujadas.

Objetivo: **un solo personaje definido una vez**, reutilizado en hero, Sobre mí y contacto, con poses que se generan cambiando ángulos de articulaciones, y con el mismo look que las escenas actuales.

## 2. Pipeline (fuente única, generada por script)

Seguí la línea de `scripts/illustrations/plane.py`: nada dibujado a mano en el SVG final; todo sale de un script versionado.

- Carpeta nueva: `scripts/illustrations/character/` (Python, ejecutable con `python3 -I`).
- **Medí el estilo antes de dibujar**: en los SVG actuales de `public/` y `src/components/scenes/`, sacá el color de tinta, el grosor mínimo, típico y máximo, la forma de las puntas y cómo afina el trazo en los extremos. Dejalo en `style.py` como constantes.
- Cada pieza se define como **líneas centrales** (Bézier o polilíneas) con un perfil de grosor. El script las expande a **contornos rellenos** de grosor variable (normales muestreadas sobre la curva, ancho según el perfil, puntas que afinan). No se usa `stroke` uniforme: eso ya se descartó.
- Cada línea central también se exporta como path oculto (`data-draw`) para usarla como máscara de dibujado con DrawSVG, igual que hoy.
- Relleno de piel y ropa: el fondo claro del sitio, para que las piezas se tapen entre sí sin transparencias raras.

### Esqueleto
Grupos anidados para que rotar el hombro arrastre el codo y la mano:

```
character
  legs (leg-l, leg-r, feet)
  torso
    head
      face (eyes-open, eyes-closed, brows, mouth)
      hair
    arm-back (upper > fore > hand)
    arm-front (upper > fore > hand)
```

- Cada articulación lleva `data-pivot="x y"` en coordenadas del viewBox; en JS se rota con `gsap` y `svgOrigin`.
- Manos como variantes intercambiables: `open`, `grip` (sostiene tiza o avión), `point`, `type`.
- Las partes tapadas (torso detrás del brazo, la otra mano, la espalda debajo del pelo) **se dibujan completas** aunque no se vean en la pose base.
- Exportá también un `rig.json` con pivotes y límites de ángulo por articulación.

### Poses
`poses.py` con poses nombradas como ángulos de articulación: `typing`, `throw-windup`, `throw-release`, `reach-board`, `write`, `pin`, `lean`, `point`, `wave`. En el front, un helper `setPose(rig, pose, { duration, ease })` en `src/scripts/motion/rig.ts` interpola entre poses.

### Escenas
Escritorio, laptop y monitor, pizarra y buzón se rehacen con el mismo método (son más fáciles que el personaje). Las escenas generadas reemplazan a las de `src/components/scenes/`; los scripts viejos (`scenes.py`, `about.py`) quedan sin borrar hasta que Lucas apruebe el resultado.

## 3. Piloto obligatorio antes de rehacer todo

Dibujar un personaje con código es difícil y puede quedar peor que lo actual. Por eso:

1. Hacé **solo el personaje del hero** con tres poses (`typing`, `throw-windup`, `throw-release`).
2. Mostralo en `/dibujos` al lado del hero actual, al mismo tamaño, y también ampliado al 300 % para comparar el trazo.
3. **Frená y esperá que Lucas apruebe.** Si no llega a la calidad del actual, el plan B es conservar los dibujos actuales y rehacer solo las piezas que necesitan moverse (brazo y mano del hero, brazo de la pizarra), con las partes ocultas agregadas.

## 4. Las animaciones nuevas

Mantener: GSAP + ScrollTrigger, sin pin, sin Lenis, sin React para animar. Desde 1024 px el recorrido completo; debajo, cada escena anima lo suyo. Con `prefers-reduced-motion` no hay movimiento: se muestran las poses finales, quietas.

### Siempre (idle, muy sutil)
- Parpadeo cada 3–6 s con intervalo aleatorio (cambio a `eyes-closed` durante unos 120 ms).
- Respiración: torso con `scaleY` 1 → 1.01, ciclo de 4 s.
- Se pausan con `IntersectionObserver` cuando la escena no está en pantalla.

### Hero: el lanzamiento
- Pose base `typing`, con las manos alternando un poco sobre el teclado.
- Al empezar el scroll: deja de tipear, toma el avión de la pantalla de la laptop (`grip`), hace `throw-windup` (el brazo va atrás y el torso gira apenas) y después `throw-release`. El avión sale **de su mano**, no del borde de la mesa.
- El avión arranca con velocidad y planea en arco. Lucas lo sigue con la cabeza un instante y vuelve a `typing`.

### Proyectos
Sin personaje. Ver los ajustes del vuelo en la sección 5.

### Sobre mí: la pizarra
- La mano con la tiza **sigue el trazo** que se va dibujando: en cada frame, la punta de la tiza se ubica en `getPointAtLength` del path que dibuja DrawSVG, resolviendo los ángulos de hombro y codo con IK de dos segmentos (son unas 20 líneas de trigonometría; no hace falta una librería).
- Llega el avión: Lucas gira la cabeza, deja de escribir, el avión se clava en la pizarra con un pequeño rebote y él lo fija con la mano (`pin`); aparece la chinche. Después lo despega, lo vuelve a lanzar con un gesto corto y vuelve a escribir.

### Contacto: la entrega
- Pose base `lean` apoyado en el buzón, señalando el mail (`point`).
- Llega el avión: abre la tapa del buzón con la mano, el avión se desdobla en sobre (el stop-motion que ya existe), entra, cierra la tapa y sube la bandera con la mano. No sube sola.
- Al tocar "Copiar mail", un saludo corto (`wave`), una sola vez por sesión.

## 5. Ajustes vistos en el video

1. **El avión se lee como una flecha.** Visto de costado, fino y apuntando para abajo, parece un cursor o una flecha de "seguí bajando". Hacé que se vea más de 3/4, con la cara del ala visible y rellena, unos 64–80 px en desktop. Que se incline un poco en las curvas y que el rumbo se suavice con un lerp en lugar de saltar.
2. **Nada de tramos verticales.** Las caídas rectas (al costado de la mesa, entre secciones) refuerzan la lectura de flecha. La ruta tiene que planear: arcos amplios, una sola curva cerrada como máximo por sección, y nunca bajar recto más de unos 80 px.
3. **Las cards se encienden todas juntas.** Los bordes de Lumen, Tamara Vasak, SyncLife y PixDex aparecen a la vez. Tienen que ir **en secuencia**, cuando el avión pasa cerca de cada una, y apagarse cuando se aleja. El tramo horizontal que cruza por encima de las cards chicas tiene que pasar por el hueco, no sobre el contenido.
4. **Sobre mí arranca vacío.** Cuando la sección ya está en pantalla se ven puntitos sueltos y el texto gris. La figura base tiene que estar dibujada antes de entrar al viewport; solo se animan la escritura y el avión.
5. **El texto viejo de Sanity pisa al nuevo.** Hero ("Frontend Developer especializado en UI/UX") y contacto ("Hagamos equipo…") todavía muestran el copy anterior. El dataset es el mismo que el de producción, así que cargar los textos nuevos ahí cambia el sitio en vivo antes del merge. Proponé en el plan crear un dataset `staging` en Sanity, usarlo en dev y en los previews de Vercel por variable de entorno, y copiar los textos a `production` recién al mergear.
6. **Capturas reales.** Las cards siguen con `[captura]`. Generalas con Playwright desde los sitios publicados (thejudex.com y los que tengan URL), a 1440×900 con `deviceScaleFactor: 2`, exportadas a WebP. Dejá un script (`scripts/screenshots.mjs`) para regenerarlas. Las que no tengan URL quedan pendientes en el resumen.
7. **Placeholders `[ej: …]`.** Siguen visibles en dev, y está bien así. Listalos en `.agents/todo-release.md` para que no lleguen al push.

## 6. Presupuesto y verificación

- El JS de motion hoy pesa 64 KB gzip. El rig y la IK no deberían sumar más de 10 KB.
- Los SVG del personaje, optimizados, no deberían superar los 40 KB por escena. Inline solo la escena visible al cargar (hero); el resto con carga diferida.
- Tests en `scripts/check-motion.mjs`: el avión sale de la mano en el hero; el rumbo nunca es vertical más de 80 px; las cards se encienden una por vez; la punta de la tiza queda a menos de 2 px del extremo del trazo; el parpadeo se pausa fuera del viewport; con reduced motion no hay animación; debajo de 1024 px cada escena funciona sola.
- `pnpm astro check`, `pnpm build`, `pnpm check:motion` (unos 3 min, sin `timeout`) y `impeccable detect --json src` tienen que dar limpio.

## 7. Cómo trabajar

- Leé este brief y el handoff, armá el plan en `.agents/plans/plan-personaje-por-capas.md` y **detenete hasta que Lucas lo apruebe**.
- Fases (una sesión por fase):
  1. Ajustes de la sección 5 (puntos 1 a 4), que no dependen del redibujo.
  2. Estilo medido + piloto del personaje del hero → checkpoint de aprobación.
  3. Resto del personaje, poses y escenas (escritorio, pizarra, buzón).
  4. Animaciones del hero, de Sobre mí y de contacto + idle.
  5. Dataset `staging`, capturas, mobile, reduced motion y `dev-release-check`.
- Commits con Conventional Commits en español, sin emoji. No pushees sin que Lucas lo pida.
- Trampas vigentes: no commitear `.gitignore` ni `.projectmem/`; `offsetTop` de `#about` no sirve en los tests; en celular hay dos escenas de contacto y hay que leer la visible; `pkill` de un servidor en la misma línea mata el comando.
- Al cerrar cada fase: qué cambió, qué quedó pendiente y qué tiene que mirar Lucas en el navegador. Actualizá el handoff.
