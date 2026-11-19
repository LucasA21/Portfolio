---
trigger: always_on
description: Commits solo con orden, sin push, y formato estricto de mensaje.
---

# 10. Git y Commits

> **Por qué:** Commits o pushes autónomos corrompen el historial y rompen la confianza del equipo; un formato fijo hace el historial legible.

## 1. Disciplina
1. No hagas commit sin orden explícita del usuario.
2. Nunca ejecutes `git push`, ni a `main` ni a otra rama, bajo ninguna circunstancia salvo orden explícita.
   - No: Hacer push al terminar un plan o tarea.
   - Sí: Dejar el repo local limpio y verificado para que el usuario decida cuándo publicar.
3. Trabaja en una rama por tarea; commits pequeños y lógicos.
4. No commitees `.env`, credenciales ni artefactos generados.
5. No agregues `Co-Authored-By` ni firmas de herramientas (por ejemplo "Generated with ...") en commits o PR, salvo orden explícita.
6. No uses `--no-verify`, `reset --hard` ni `push --force` sin orden explícita.

## 2. Formato (al recibir orden de commit)
1. Primera línea: `tipo(alcance): título`, en español, menos de 72 caracteres.
2. Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
3. Cuerpo: una viñeta por cambio, con badge temático en corchetes (`[FEAT]`, `[REFACTOR]`, `[UI]`, `[PERF]`, `[DOCS]`, `[TEST]`, `[SEC]`).
4. Estructura:
   ```text
   tipo(alcance): título conciso

   [FEAT] Detalle de la funcionalidad o módulo
   [REFACTOR] Detalle de la reestructuración
   [TEST] Suites o cobertura verificadas
   ```

## 3. Guardián
Hook `commit-msg` que valida el formato, `pre-commit` con escáner de secretos y `deny` de `git push` en `.claude/settings.json`.

<!-- adapt -->
- El repo no usa `.githooks/` locales activos; respeta Conventional Commits en español sin atribución automática ni push sin orden.
<!-- /adapt -->
