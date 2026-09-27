# HeyClicky capability coverage for OMYLA

Source review: https://www.heyclicky.com/ and https://www.heyclicky.com/changelog (checked 2026-09-27). This is a capability target, not a claim of shipped parity. OMYLA retains its own Talk / Point / Draw / Drop UX, operator-controlled model routing, cross-device resource model, and minimal transparent presence. Do not copy branding, visual assets, code, or identical interaction design.

| Capability seen in HeyClicky | OMYLA status | Deliverable |
| --- | --- | --- |
| Mac resident presence, shortcut from any app | Windows/macOS Electron shell; global Ctrl/Cmd+Shift+O shortcut added, subject to OS shortcut availability | Signed installer, reliable launch on login, small one-button presence |
| Spoken question, spoken answer | Browser speech input and browser speech-synthesis for demo guidance | Native microphone session, interruption, streaming speech, selectable voices and text fallback |
| Dictation into current app | No global dictation | Local consented microphone and text insertion adapter, clipboard fallback only with explicit indication |
| Screen question on any app | Local display screenshot preview and human-drawn geometry; screen pixels never reach AI | On-demand frame capture, local review/redaction, vision model, geometry grounding and short-lived frame |
| Human point/circle/arrow/scribble | Windows transparent ink and browser demo | Inference from marked region plus screenshot; persist canvas coordinates per resource |
| AI draws over the actual screen and walks through a tool | Web demo canvas guidance only | Separate click-through desktop teaching overlay with typed shapes, narration, frame-bound anchors, Stop |
| Agent clicks/types in apps and browser | Windows user-triggered cursor move only | Task-scoped grant, authenticated desktop session, UI Automation/Win32 adapter, observe-act-verify loop, stop and audit |
| Named persistent agents, memory, conversations, files | Named agents and parallel response per goal; limited per-session goal history | Agent identity CRUD, separate model assignment, personal/project memory, durable conversations and artifact store |
| Multiple agents in parallel | Parallel model calls for a single goal | Independent durable task queues, budgets and simultaneous device/tool scopes |
| App/MCP connections | Resource connector architecture only | OAuth/API-key vault, capability discovery, per-resource permissions, revocation |
| Suggestions from connected apps | Not shipped | Read-only opt-in collection, source-backed proposals, user approval and pause |
| Scheduled routines | Not shipped | Durable schedules, retry/backoff, offline resume and per-agent cancellation |
| Full PDF/page understanding | File names only in demo; no content upload | Explicit attachment parsing, citation to document sections, retention/deletion controls |
| Search, pin/archive and per-agent files | Not shipped | Agent workspace and searchable activity |
| Usage limits and paid plans | Preview quota and cost ledger; live billing disabled | Usage-metered billing with operator margin and hard spend caps |
| Privacy controls and deletion | Screenshot local only, browser goal deletion | Cross-device deletion/export, screen retention guarantees, per-connector access log |

## Build order

1. **Real screen teaching on Windows**: explicit one-time capture, vision model adapter, structured `GuideStep` (frame ID, display ID, shape, normalized anchor, short Japanese explanation), local overlay with Stop. Reject stale or ungrounded coordinates. Never infer an exact target from text geometry alone.
2. **Real Computer Use**: separate `TaskGrant`, local action engine, step budget and fresh observation after every action. Agent may perform ordinary steps within the authorized task; external sends, purchases, destructive changes and credentials ask at action time.
3. **Native voice and dictation**: microphone input and spoken output with interruption, push-to-talk shortcut, supported focus-aware insertion.
4. **Durable agent organization**: per-agent identity, conversation and memory; model selection lives in operator routing; parallel jobs and artifacts.
5. **Connectors, proactive proposals, schedules**: opt-in and source-linked. Bring mobile/camera into the same surface model with OS-specific capability constraints.
6. **Account and metered billing**: authenticated devices, budget controls, billing and support flows.

Do not promise parity until each capability is actually working on real applications. A Mac-only feature can have a Windows implementation first; platform differences should be reported, not hidden. Device control and screen capture require the local client; the public LP and browser demo cannot grant OS-wide privileges.
