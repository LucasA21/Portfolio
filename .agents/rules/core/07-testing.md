---
trigger: always_on
description: Pruebas automatizadas.
---

# 07. Testing

> **Por qué:** Una verificación concreta es lo que permite al agente iterar solo.

1. Escribe pruebas para todo código nuevo con lógica (ramas, bucles, parsers, dinero, seguridad).
2. Para un bug, escribe primero la prueba que falla y luego el arreglo.
3. Corre solo las pruebas del módulo tocado, no la suite completa, salvo al cerrar.
4. Mantén pruebas deterministas: sin red real, sin reloj real, sin orden entre pruebas.
5. No debilites ni borres una prueba para hacerla pasar.
   - No: Cambiar el valor esperado hasta que coincida.
   - Sí: Entender por qué falla y corregir el código o el requisito.

## Guardián
Suite de pruebas en CI.

<!-- adapt -->
- Un test de motion: `ONLY=<regex> pnpm check:motion`. Suites completas: `pnpm check:seo && pnpm check:motion`.
<!-- /adapt -->
