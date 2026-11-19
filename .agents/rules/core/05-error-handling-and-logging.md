---
trigger: always_on
description: Manejo de errores y logging.
---

# 05. Errores y Logging

> **Por qué:** Un error tragado o un log con secretos cuesta más que el bug original.

1. No captures una excepción sin manejarla, registrarla o relanzarla.
   - No: `catch (e) {}`.
   - Sí: Capturar el caso concreto y devolver un error con contexto.
2. Falla rápido en fronteras externas (entrada de usuario, red, disco) con mensajes accionables.
3. No manejes escenarios imposibles dentro del código propio.
4. Usa el logger del proyecto, no `print`/`console.log` sueltos.
5. No registres secretos, tokens, contraseñas ni datos personales.
6. Preserva datos: el manejo de errores nunca debe perder escrituras a medias sin avisar.

## Guardián
Regla de linter contra bloques vacíos y logs directos.

<!-- adapt -->
- Logger: errores explícitos en scripts de consola; fallbacks defensivos en `src/utils/sanity.ts` sin inventar datos faltantes.
<!-- /adapt -->
