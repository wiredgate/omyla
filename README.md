# OMYLA public preview

Live at https://omyla.uwaaa.com. This is an early web slice of Talk / Point / Draw / Drop, not a desktop overlay or a connected computer assistant.

## What works

- Voice transcription in browsers with SpeechRecognition, text requests, pointing and drawing over this page's demo region, and file metadata Drop. File contents are never uploaded.
- The page associates a point or drawn region with a visible demo element, then sends the goal and selected labels to `/api/goals`.
- A Cloudflare Worker calls Workers AI for Kai, Mia, and Emma in parallel. Identity prompts are independent of the `TEXT_MODEL` configuration. The Worker limits each IP to five goals and everyone to 30 goals per UTC day using a SQLite Durable Object.
- A separate session Durable Object keeps the ten most recent goals for this browser. The session is carried by an HttpOnly cookie; it is not an account and does not sync across devices. The UI can delete the saved history.
- Agent responses are proposals only. The service cannot read email, alter code, browse the computer, publish, or execute tools. There is no simulated approval button.

## Deployment

Pushes to `main` deploy through GitHub Actions using the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The Cloudflare Worker and custom domain are defined in `wrangler.jsonc`. Never commit credentials. The model is configured in `src/worker.js`; replace `runAgent` with a provider adapter to route other models without changing agent identities.

## Development boundaries

The local Node prototype under `src/core.js` and `src/server.js` explores a permission engine and event records. It is not called by the deployed Worker. The public Worker has short browser session history, but no accounts, connector credentials, computer use, or a real approval workflow. Desktop overlay, OS accessibility and capture, authenticated workspaces, recoverable goal orchestration, and mobile companion are separate subsequent phases.
