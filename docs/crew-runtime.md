# OMYLA managed crew pilot

This adds an opt-in Agents API backend to the existing Cloudflare Worker. It uses the documented HTTP API directly (no SDK dependency required). The public preview and Electron panel have NOT yet been connected to this pilot.

## Implemented

- A persisted provider session with follow-up input: hosted work continues when the browser or Worker observer disconnects.
- Manager instructions describe Kai (engineering), Mia (design), Emma (operations); native multi-agent delegation is enabled with at most three concurrent subagents. These role names are instructions, not guaranteed stable subagent identities or individual model assignments. OMYLA must own that UI mapping in a subsequent layer.
- A dedicated SQLite Durable Object stores the provider session ID, personal memories, tool results and the latest 20 drafts. This is separate from the anonymous browser history.
- Coordinator-only function tools: read saved memory and save a draft. Native subagents do not support application function tools; the Manager must perform these calls.
- Durable Object alarms answer pending function calls even without an open browser. Polling stops after 30 minutes, five consecutive failures, idle/failed status, or an unsupported required action. Provider work is not cancelled when polling stops; a follow-up restarts polling. Idle is NOT presented as verified success.
- Unknown tools are denied. No email, publication, payments, repo connector, or real desktop control is attached. Prompt restrictions alone are not a permission boundary: tools are limited by the handler.
- Stored draft results can be replayed without duplicating a draft. Ambiguous creation/message failures are not automatically retried. A failed request may still have started provider work; inspect the provider before clearing the local `mutation` marker. A lost create response can leave a session that needs manual provider reconciliation.

## Enable and operate

Disabled by default with `CREW_ENABLED=false`. An operator must set `CREW_ENABLED=true`, choose `CREW_MODEL`, and provision `CREW_OPERATOR_TOKEN` as a Worker secret. Reuse the existing `OPENAI_API_KEY` Worker secret. Do not put either secret in source, browser JavaScript, localStorage, or the desktop renderer. The key needs Agents API read/write and Responses write permissions, project beta access, and model access. A configured Responses key does not prove Agents API access.

All routes require `Authorization: Bearer <CREW_OPERATOR_TOKEN>` from a trusted server-side caller. This is ONE operator workspace (`operator-pilot-v1`), not multi-user account authentication. It rejects untrusted cross-origin browser requests. Do not distribute the operator token to users. Production needs verified account IDs, workspace membership, per-account budgets and separate Durable Object namespaces before replacing this pilot authorization.

| Method / route | Input / output |
|---|---|
| POST `/api/crew` | `{ "text": "..." }`; creates first session or continues it, returns HTTP 202 and snapshot |
| GET `/api/crew` | Provider status, usage if known, pending action summaries and saved drafts |
| POST `/api/crew/memory` | `{ "memory": ["..."] }`; explicitly replaces saved memory |
| DELETE `/api/crew` | Deletes remote session first, then local state and alarm |

Snapshot returns `outcomeVerified: false`. It intentionally does not equate session idle with completed work. Full turn/item retrieval, outputs/artifact download, event-to-character animation mapping, approvals for external tools, daily budgets, account sync and UI wiring remain outstanding. Unknown usage is null, not zero; existing preview pricing does not cover hosted sandbox/tool charges.

## Validation

Run `npm test` on Node 20+. Tests use injected provider clients, no API key and no paid calls. They cover restart continuation, creation ambiguity, memory isolation, duplicate draft handling, disallowed tools, invalid arguments, credential redaction, authorization and deletion order. Live Agents API and Wrangler deployment have not been verified from this environment; Cloudflare configuration access and a provider key are unavailable locally.

## Official contracts checked 2026-10-04

- https://developers.openai.com/api/docs/guides/agents-api/quickstart
- https://developers.openai.com/api/docs/guides/agents-api/multi-agent
- https://developers.openai.com/api/docs/guides/agents-api/tools/functions
- https://developers.openai.com/api/docs/guides/agents-api/sessions/events
