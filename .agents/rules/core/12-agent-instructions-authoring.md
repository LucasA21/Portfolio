---
trigger: always_on
description: Cómo escribir y mantener AGENTS.md y las reglas para que no se hinchen ni se contradigan.
---

# 12. Redacción de instrucciones para agentes

> **Por qué:** Instrucciones largas o repetidas saturan el contexto del agente y se contradicen con el tiempo.

1. `AGENTS.md` tiene menos de 150 líneas: resumen, límites, comandos, mapa, definición de terminado e índice de reglas.
2. `CLAUDE.md` tiene menos de 30 líneas: importa `AGENTS.md` y agrega solo lo propio de Claude Code.
3. Una regla, un tema. Si no aplica a todo el repo, limita su alcance con `paths` en el encabezado.
4. Normas en imperativo, con un contraste No / Sí cuando evita un error repetido.
5. Cada norma vive en un solo archivo. No repitas una regla entre archivos; enlázala.
6. Un procedimiento de más de 30 líneas va a una skill, no a una regla.
7. Agrega una regla solo cuando el agente repite un error. Quita la que un linter ya aplica solo.
8. Actualiza las instrucciones en el mismo cambio que modifica la convención.

## Guardián
Revisión del diff; opcionalmente un script que compruebe que cada ruta citada en `AGENTS.md`, reglas y docs existe.
