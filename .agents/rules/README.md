# Reglas modulares

Reglas base reutilizables. Cada archivo: un tema, normas en imperativo, `No / Sí`, guardián, bloque `<!-- adapt -->` para el stack.

## Portar a un proyecto
Usa la skill global `/new-project`, o a mano:
1. Copia `AGENTS.md`, `CLAUDE.md` y `.agents/` a la raíz.
2. Crea los symlinks: `.claude/rules -> ../.agents/rules`, `.claude/skills -> ../.agents/skills`.
3. Reescribe los bloques `<!-- adapt -->` y los placeholders `[...]` con el stack real.
4. Agrega reglas de negocio en `.agents/rules/project/2X-*.md`.
5. Borra las reglas de `core/` que no apliquen.

Una regla nueva solo cuando el agente repite un error.
