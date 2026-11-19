---
trigger: always_on
description: Flujo de trabajo del agente y definición de terminado.
---

# 00. Flujo de Trabajo

> **Por qué:** Implementar en la dirección equivocada es lo más caro; verificar antes de entregar evita rehacer.

1. Explora antes de editar: lee los archivos que toca la tarea y busca si ya existe algo reutilizable.
2. Planifica en tareas que toquen varios archivos o sean ambiguas. Muestra el plan y detente por completo: no edites ni ejecutes nada hasta que el usuario lo lea y lo apruebe de forma explícita.
3. Implementa el cambio mínimo que cumple el pedido. No refactorices código adyacente.
   - No: Renombrar variables vecinas "ya que estoy".
   - Sí: Tocar solo las líneas que se trazan al pedido y mencionar el resto.
4. En un bug, reproduce primero y arregla la causa raíz, no el síntoma. Revisa los demás llamadores.
5. Verifica antes de cerrar. Si no puedes verificarlo, no lo declares terminado.
6. Pregunta ante ambigüedad real; si hay un valor por defecto razonable, úsalo y dilo.
7. Tras dos correcciones fallidas del mismo problema, detente, resume lo aprendido y propone otro enfoque.

## Definición de Terminado
- [ ] Linter, tipos y pruebas del módulo tocado en verde.
- [ ] Sin código muerto ni imports huérfanos creados por el cambio.
- [ ] Docs actualizadas si cambió el comportamiento.
- [ ] Reporte final corto: qué cambió, qué se verificó, qué se omitió.

## Guardián
Comando de verificación canónico del proyecto.

<!-- adapt -->
- Verificación: `pnpm astro check && pnpm build && pnpm check:seo && pnpm check:motion`.
<!-- /adapt -->
