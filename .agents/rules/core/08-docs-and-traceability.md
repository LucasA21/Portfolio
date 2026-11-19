---
trigger: always_on
description: Documentación mínima y trazabilidad de decisiones.
---

# 08. Docs y Trazabilidad

> **Por qué:** La documentación desactualizada es peor que ninguna; las decisiones sin registro se discuten dos veces.

1. Actualiza README y docs en el mismo cambio que modifica comportamiento, comandos o configuración.
2. Comenta el porqué, no el qué. No describas lo que el código ya dice.
3. Registra decisiones de diseño y trampas del entorno donde el equipo las lea (ADR, `docs/` o memoria del proyecto).
4. Mantén `AGENTS.md` por debajo de 150 líneas; mueve procedimientos largos a skills.
5. Añade una regla nueva solo cuando el agente repita un error.

## Guardián
Revisión del diff: ¿cambió comportamiento sin cambiar docs?

<!-- adapt -->
- Dónde se registran decisiones: `.agents/handoff.md`, `.agents/plans/` y `.agents/copy-sanity.md`.
<!-- /adapt -->
