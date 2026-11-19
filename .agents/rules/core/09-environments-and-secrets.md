---
trigger: always_on
description: Un archivo de entorno por ambiente, plantillas completas y secretos nunca subidos por el agente.
---

# 09. Entornos y Secretos

> **Por qué:** Compartir secretos entre ambientes o modificar gestores remotos de forma autónoma provoca fugas e incidentes.

1. Mantén una configuración separada por ambiente (desarrollo, pruebas, producción).
2. Provee una plantilla con claves descriptivas para cada ambiente.
3. Al agregar una variable, agrégala a todas las plantillas a la vez.
   - No: Añadirla a desarrollo y olvidar la plantilla de producción.
   - Sí: Declarar la clave en todas las plantillas en el mismo cambio.
4. No reutilices secretos, certificados ni bases de datos entre ambientes.
5. El agente nunca escribe ni sube secretos a gestores remotos. Modifica solo archivos locales y sugiere el comando para que el humano lo ejecute.

## Guardián
Validador de variables presentes y bloqueo de subida remota.

<!-- adapt -->
- Comprobación: `unit-staging-env` en `scripts/check-seo.mjs` y `.env.sample` como contrato de variables.
<!-- /adapt -->
