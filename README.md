# OMYLA MVP — local foundation v0.1

This is the first executable vertical slice following the OMYLA directive. It is deliberately a **local prototype**, not the production product.

## Run

Requires Node.js 20+. No package installation or credentials are required.

```bash
npm start
```

Open `http://127.0.0.1:4173` in a browser. Draw a circle, point to the demo screen, and assign a goal. The public interface simulates Kai, Mia, and Emma independently in the current browser tab. Kai pauses at a simulated publish approval; approving or denying completes the goal. Browser speech recognition is used when available; text input always works.

## Cloudflare deployment

The `public/` directory is a static Cloudflare Workers Assets project configured by `wrangler.jsonc`. It needs no secrets or paid AI calls. Connect the GitHub repository to Cloudflare Workers Builds using `public` as the assets directory, or deploy with `npx wrangler deploy` from the repository root. Bind the custom domain `omyla.uwaaa.com` in Cloudflare after creating the Worker. The custom domain is not created by `wrangler.jsonc`.

```bash
npm test
```

## Implemented boundaries

- `AgentIdentity` is separate from `DemoModelAdapter`; the adapter can be replaced without renaming an agent.
- `Orchestrator` on the local Node server runs independent agent steps concurrently, records events, and waits on one approval without stopping other steps. The public static frontend is a browser-only interaction demo; it does not invoke this server.
- `PermissionEngine` denies physical operations and asks for external actions. Every unknown capability is denied.
- Screen point and stroke geometry travel alongside a goal as context, with dimensions and capture time.
- The server binds to loopback only. No external service, real email, browser control, deployment, purchase, or AI provider is called.

## Next implementation increments

1. Add durable PostgreSQL storage, authentication, workspace boundaries, workflow recovery, and authenticated event streaming. The current `MemoryStore` loses state on restart.
2. Build the Electron desktop shell and native Windows/macOS accessibility bridge; capture only user-invoked context, with explicit OS permission.
3. Add browser extension and Playwright cloud-browser worker. Match drawing regions to DOM/accessibility bounds and require fresh snapshots for actions.
4. Add real model adapters, constrained tool registry, connector credentials in a secrets manager, idempotency, budgets, and audit trails.
5. Add mobile companion and device registration. Require signed, scoped approval tokens validated immediately before execution.

## Review notes

This prototype proves the interaction shape only. The public frontend has no backend or shared user data. Its agent output is scripted and must never be represented as real investigation. The Node server separately proves orchestration mechanics. The current UI is a browser preview of Presence and Overlay, not a transparent desktop overlay. It does not yet implement actual Drop, cross-device state, screen capture, or Computer Use. Those require the next increments above and must not be inferred from the demo.
