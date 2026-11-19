---
trigger: always_on
description: Seguridad base.
---

# 06. Seguridad Base

> **Por qué:** Un secreto filtrado o una entrada sin validar es un incidente, no un bug.

1. No escribas secretos en código, logs, commits ni prompts. Usa variables de entorno o gestor de secretos.
2. No leas ni edites `.env` ni credenciales sin orden explícita.
3. Valida toda entrada externa en la frontera, con esquema.
4. No agregues dependencias sin preguntar.
5. Usa consultas parametrizadas; nunca concatenes entrada en SQL, shell o HTML.
6. Ante acción destructiva o irreversible (borrar datos, `rm -rf`, force push), pregunta primero.

## Guardián
Escáner de secretos y auditoría de dependencias.

<!-- adapt -->
- Escáner CSP y headers: `pnpm check:seo` (`src/middleware.ts`, `vercel.json`). Auditoría: `pnpm audit --prod`.
<!-- /adapt -->
