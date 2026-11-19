---
target: portfolio completo (src/pages/index.astro)
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/lk/Proyectos/Portfolio/src/pages/index.astro"
target_fingerprint: "sha256:8c23359773e8ba18dcc0ed47df02b6633946df4516d3731cc6504b33d2d7a500"
target_path: /home/lk/Proyectos/Portfolio/src/pages/index.astro
timestamp: 2026-11-11T05-18-56Z
slug: src-pages-index-astro
---
Method: dual-agent (A: agy gemini-3.8-flash-medium, diseño sobre capturas y código · B: agy gemini-3.8-flash-medium, análisis de evidencia técnica), con verificación del orquestador (Claude) de cada hallazgo contra el código y el navegador.

## Design Health Score

Puntajes reescritos por el orquestador: A puntuó al revés (severidad, donde menos es mejor) y dio "11/32 de penalizaciones"; acá 4 es excelente. Heurísticas 7 y 10 n/a (superficie Experience: un portfolio no tiene atajos ni documentación).

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | "Copiado" se anuncia con `aria-live`; el avión y los anillos de las cards dan feedback del scroll. Falta confirmación visual en el botón. |
| 2 | Lenguaje del mundo real | 3 | La metáfora del mensaje que viaja es fuerte; el H1 "Frontend Developer especializado en UI/UX." es genérico. |
| 3 | Control y libertad | 3 | Esc cierra el modal y devuelve el foco bien; el lanzamiento arranca con 8 px de scroll y no hay forma de saltarlo (se puede repetir subiendo). |
| 4 | Consistencia | 3 | El destacado tiene botones explícitos; las cards se abren con un botón invisible sobre toda la card. |
| 5 | Prevención de errores | 3 | Sin formularios; mail con copiar y fallback. |
| 6 | Reconocimiento antes que recuerdo | 2 | Las cards no muestran que abren un modal; en celular el header solo tiene 4 íconos de redes y ninguna sección. |
| 7 | Flexibilidad | n/a | Superficie Experience. |
| 8 | Estética y minimalismo | 3 | Limpio y coherente; texto de 13 px en tags y etiquetas; el avión ilumina cards mientras se lee. |
| 9 | Recuperación de errores | 3 | Mensaje claro si falla el portapapeles. |
| 10 | Ayuda | n/a | Superficie Experience. |
| **Total** | | **23/32** | **Bueno (72 %)** |

## Design Specificity Verdict

Hecho para este producto, no intercambiable. El personaje dibujado, el avión que cruza la página y el sobre que entra al buzón no los puede usar otro portfolio. Lo genérico está en el texto y en la grilla: el H1, el copy de contacto ("Hagamos equipo") y las cards chicas con chips de tecnologías.

Detector mecánico: `[]` (sin hallazgos). Evidencia de navegador (producción local): 0 errores de consola, 0 fallas de contraste después de corregir la medición, 6 textos de 13 px, targets táctiles todos de 44 px o más salvo el skip link (43 px, cumple WCAG 2.2 AA que pide 24), sin desborde horizontal a 320 px, reduced motion y sin JavaScript correctos.

## Overall Impression

La identidad es lo mejor del sitio y ya no hay nada roto en la animación. La mayor oportunidad no está en el dibujo sino en lo que el dibujo no dice: quién es Lucas y para qué trabajo contratarlo. El hero promete frontend, el proyecto destacado vende backend, y el final de la historia no empuja a escribirle.

## What's Working

- El dibujo a mano, la paleta (tinta `#531F1F`, papel `#F6F5F1`, acento `#a8433a`) y la Kalam como nota manuscrita forman una identidad única y coherente de punta a punta.
- La historia del avión tiene principio (lanzamiento), recorrido y final (sobre en el buzón) y respeta el scroll nativo, reduced motion y el celular con su propio recorrido.
- Contacto sin fricción: mail grande, copiar con confirmación y fallback, LinkedIn directo.

## Priority Issues

**[P1] El mensaje de posicionamiento se contradice.** El H1 dice "Frontend Developer especializado en UI/UX" y Sobre mí dice "me animo con el backend cuando el proyecto lo pide", pero el proyecto destacado (TheJudex) se describe con "SEO programático, PostgreSQL, enriquecimiento con IA, sin JavaScript de cliente": casi todo backend. Quien llega no sabe qué hace Lucas. Fix: reescribir el H1 con lo que hacés y para quién, y contar TheJudex desde las decisiones de interfaz y rendimiento. Comando: `$impeccable clarify`.

**[P1] El lightbox de imágenes del modal no se abre con teclado.** `#modal-image-container` es un `div` con `click` y sin `tabindex`, `role` ni teclado (WCAG 2.1.1, nivel A). Además `#close-lightbox`, `#lightbox-prev` y `#lightbox-next` no tienen `aria-label` (WCAG 4.1.2, nivel A). Fix: envolver la imagen en un `button` con `aria-label="Ampliar imagen"` y nombrar los tres controles. Comando: `$impeccable harden`.

**[P2] Las cards no avisan que se abren, y en celular no hay navegación.** La card chica se abre con un `button` invisible a pantalla completa; sin hover (celular) nada lo indica. El header móvil muestra solo los íconos de redes: no hay forma de saltar a Proyectos, Sobre mí o Contacto. Fix: un "Ver caso" visible en la card y los 3 links de sección en el header móvil. Comando: `$impeccable clarify`, `$impeccable adapt`.

**[P2] Capturas reales y dibujos conviven sin criterio.** TheJudex y Tamara Vasak muestran capturas; Lumen, SyncLife y PixDex muestran íconos dibujados. En celular la grilla se vuelve una fila de cajas grises: es el valle emocional de la página. Fix real: cargar los links y correr `node scripts/screenshots.mjs`; hasta entonces, que los íconos dibujados se vean intencionales (marco igual al de las capturas). Comando: `$impeccable layout`.

**[P2] La historia termina sin empujar la acción y compite con la lectura.** El sobre entra y sube la bandera, pero nada en "Copiar mail" responde. Y en Proyectos el avión ilumina cards mientras se leen. Fix: subrayado de tinta o pulso único en el mail al terminar la entrega; reducir la intensidad del anillo o atarlo a velocidad de scroll alta. Comando: `$impeccable delight`, `$impeccable animate`.

## Persona Red Flags

**Jordan (primera vez):** el H1 y el destacado dicen cosas distintas (ver P1). El botón "Mandame un mensaje" está en la primera pantalla, pero "Hagamos equipo" y "Estoy con disponibilidad para sumarme a nuevos proyectos" suenan a plantilla.

**Riley (casos límite):** el scroll brusco resiste. Probado con 6 subidas y bajadas durante el lanzamiento, salto al fondo y a la cima, y cambio de tamaño de ventana: estado coherente, avión en la mano, sin errores, relanza bien. Sin desborde a 320 px. El único borde roto es el teclado en el modal (P1).

**Casey (celular, una mano):** sin navegación por sección en el header; tags de 13 px; la grilla de cajas grises. Los targets táctiles son correctos y el peso es bajo (Lighthouse móvil 100).

## Minor Observations

- Contraste de `uno en producción, los demás para aprender` (acento sobre fondo de sección): 4,55:1, pasa por poco; un tono más claro lo rompe.
- Los 4 separadores de ola decorativos no tienen `aria-hidden="true"`.
- El mail es `@hotmail.com` teniendo dominio propio.
- "Ver menos" hace `scrollIntoView` suave al colapsar (patrón normal; no es problema).
- El pie repite exactamente los links del header.

## Questions to Consider

- ¿Querés que te contraten por el criterio de interfaz o por la ingeniería completa? Hoy el sitio responde las dos cosas a la vez.
- Si alguien solo hace 10 segundos de scroll en el celular, ¿qué querés que recuerde además del dibujo?
- ¿El avión tiene que encender cards, o alcanza con que pase por el hueco?

## Revisión de los revisores (orquestador)

Rechazados por no coincidir con la realidad:
- A: "los botones del hero móvil no se ven hasta scrollear". Falso: están en la primera pantalla a 390x844.
- A: "flecha huérfana sobre la card de Tamara Vasak". Es el propio avión en vuelo.
- A: "scroll rápido desfasa el avión y `catchNow` falla". Probado: no.
- A: "Sobre mí partido en dos alturas" y "HTML pesado retrasa el primer render". Son un corte de la captura y una suposición: el HTML pesa 57 KB comprimido y el FCP móvil es de 1,0 s.
- A: comando `harmonize` (no existe en el catálogo) y puntaje invertido.
- B: "skip link fuera de viewport" y "primer ícono social móvil fuera de viewport". Artefactos de mi medición (el skip link aparece en `top: 16px`, verificado).
- B: "contraste superior a 7:1 en toda la superficie". No estaba medido; el mínimo real es 4,55:1.

Confirmados y verificados: los dos P1 de accesibilidad del lightbox (código y navegador), foco que vuelve a la card al cerrar el modal, trampa de foco del `dialog`, los 6 textos de 13 px.
