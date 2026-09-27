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
| Multiple agents in parallel | Parallel model calls for a single goal; no independent execution queues yet | Independent durable task queues, budgets and simultaneous device/tool scopes |
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

## OMYLA's next level

Parity is the floor. OMYLA's product boundary is the user's real environment: every monitor, mobile screen, browser page, camera stream, file, connected service, and eventually physical device is a `Resource` with its own observations, actions, capabilities, and permission scope. No central chat window is required for ordinary use. The one small Presence button is an entry point; guidance and work appear at the resource itself.

A `Goal` belongs to the person or team, not to a device or an LLM. A `Manager` can delegate simultaneous `Task` records to named `AgentIdentity` records. Each task uses a separately resolved `ModelRoute`; changing Astra/Sol/Luna or another provider must not erase an agent's personality, memory, permissions, or work. Agents can collaborate through typed artifacts and observations, rather than sharing unrestricted device access.

For each resource, distinguish `Observe`, `Explain`, `Annotate`, and `Act`. The first three may support live teaching; `Act` requires a task-specific grant. A user can say “show me” and see a grounded arrow and short explanation, then say “do it” to authorize bounded execution. Drawing on a screen never silently becomes permission to click. A successful task includes a verified resulting state, an action trail, and a way to undo or recover when the external system permits it.

### Acceptance scenarios

1. On two Windows monitors, the user circles a control in an unfamiliar app and asks by voice how to do something. OMYLA identifies the specific app/screen from a consented fresh frame, draws a correct pointer on that monitor, explains one step, and revises the next step after the screen changes.
2. The user asks OMYLA to perform that workflow. The agent obtains a task-scoped grant, works with its own input channel and a visible Stop control, and pauses at a payment, send, delete, or credential action for a separate decision. It reports the observed result rather than an intention.
3. The user begins on Windows and continues on mobile or in the browser. The same goal and agent identities remain, while each device exposes only the capabilities its OS and user permissions allow.
4. Two agents work in parallel on different resources under separate budgets; one can be stopped without stopping the other. The operator can change the model route while preserving identity and history.
5. A camera or future wearable produces an observation under the same resource protocol. It can inform advice without granting physical actuation by default.

The first acceptance scenario is the next engineering milestone. It unlocks the teaching experience and provides the observation loop needed for computer use. Native voice, cross-device sync, and physical actuation follow the same protocol but are separate deliverables.

## Concurrency comparison note

HeyClicky's September 12 changelog explicitly says different Clickys can work on separate jobs, while approved suggestions wait in a busy Clicky's queue. Do not claim that HeyClicky supports only one task globally. The OMYLA target is deeper coordination: split one goal into dependent and independent subtasks, run independent agents concurrently, coordinate shared resources with per-resource leases, stream partial results, and merge them into one verified outcome. Parallel LLM responses already exist in the preview; durable multi-agent execution and resource locking remain to be built.
