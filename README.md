# Curio / Mapa del Deseo

Plataforma web bilingüe (EN/ES) de **entretenimiento y autoexploración para adultos**. Ayuda a una persona, sola o en pareja, a explorar su curiosidad íntima, deseo, fantasías, límites y comunicación, y a traducir todo eso en lenguaje claro, seguro y conversable.

> **Qué NO es.** No es un servicio de salud. No diagnostica. No da consejo médico ni psicológico. No sustituye terapia. El marco siempre es curiosidad y conversación, nunca evaluación clínica de una persona.

---

## Dos áreas

1. **Explorar solo/a.** Autoconocimiento individual. Corre **local-only**: las respuestas viven en el navegador, nunca tocan el servidor.
2. **Explorar en pareja.** Dos adultos comparan zonas comunes, zonas de conversación y límites. Cada persona decide qué comparte. El servidor guarda lo mínimo (scores por dimensión y permisos), nunca el texto de las respuestas.

## One-liner

- EN: Discover your intimate curiosity style in 2 minutes.
- ES: Descubre tu estilo de curiosidad íntima en 2 minutos.

---

## Stack

- Frontend: Next.js, React, TypeScript
- UI: Tailwind CSS + shadcn/ui
- Backend: Next.js server actions / API routes
- DB: Supabase Postgres (solo lo permitido por las reglas de privacidad)
- Auth: Supabase Auth (login opcional al inicio)
- Validación: Zod
- Tests: Vitest (unit) + Playwright (e2e)
- Deploy: Vercel
- Analytics: Plausible o PostHog, privacy-first
- Errores: Sentry, sin payloads sensibles
- Pagos (futuro): Stripe, sujeto a confirmar elegibilidad de contenido adulto

---

## Reglas que gobiernan este repo

Todas las reglas duras viven en [`AGENTS.md`](./AGENTS.md). Cualquier agente de IA o persona que trabaje en este repo las lee primero. Si una decisión de implementación contradice una regla de `AGENTS.md`, gana la regla.

Resumen de los no-negociables:

- Producto 18+. Age gate y consentimiento antes de cualquier pregunta.
- Modo individual local-only. Modo pareja: servidor mínimo, sin texto de respuestas.
- Ningún texto de respuesta llega a analytics, logs ni Sentry.
- El producto separa fantasía / curiosidad / deseo real / límite firme. Un límite firme nunca se sugiere como exploración.
- Modo pareja anti-coerción: ninguna zona implica permiso ni obligación; lo privado nunca aparece en el reporte.
- Ética comercial: sin vergüenza, sin ansiedad artificial, sin dark patterns. Compartir y comprar siempre desacoplados.
- Tono de entretenimiento, nunca clínico ni de diagnóstico.

---

## Estado

Pre-Etapa 0. Antes de recoger respuestas reales de usuarios, este proyecto requiere: decisión de entidad legal, confirmación de elegibilidad de pagos, y revisión de privacidad sobre datos sensibles. Ver Sección 11 del plan en Notion.

## Plan completo

El roadmap por etapas, modelo del quiz, modelo comercial y estrategia bilingüe viven en Notion: "Curio / Mapa del Deseo - Plan de Desarrollo".
