---
trigger: always_on
description: Qué hacer cuando el pedido no define alcance, criterio de hecho o verificación.
---

# 14. Pedidos Ambiguos

> **Por qué:** Implementar sin criterio de éxito produce trabajo que hay que rehacer.

1. Antes de empezar, confirma que el pedido define: objetivo, alcance y criterio de terminado.
2. Si falta algo y hay un valor razonable por defecto, úsalo y dilo en una línea.
3. Si falta algo y equivocarse es caro (datos, producción, varios archivos), pregunta antes.
4. Para tareas grandes, entrevista al usuario y escribe la especificación antes de implementar.
   - No: Elegir en silencio una de dos interpretaciones.
   - Sí: "Asumo X porque Y. Dime si es otra cosa".
5. Propón tú el comando o prueba que demuestra que el pedido está cumplido.

## Guardián
Ninguno determinista; depende del criterio del agente.
