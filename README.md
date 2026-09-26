# OMYLA public preview

The product landing page is at https://omyla.uwaaa.com/. The web app preview lives at https://omyla.uwaaa.com/app/. This is an early slice of Talk / Point / Draw / Drop, not yet a connected computer assistant.

## What works

- Voice transcription in browsers with SpeechRecognition, text requests, pointing and drawing over this page's demo region, and file metadata Drop. File contents are never uploaded.
- The page associates a point, closed circle, arrow tip, or line endpoint with visible demo elements. It shows the selected labels before sending the goal, bounded geometry, and labels to `/api/goals`. Users can correct the last stroke's geometric classification.
- A Cloudflare Worker routes direct requests to named agents and routes general goals to relevant agents using explicit rules. Selected agents run in parallel and Manager aggregates the resulting proposals. This is a first routing layer, not autonomous task decomposition or execution. Identity prompts are independent of the `TEXT_MODEL` configuration. The Worker limits each IP to five goals and everyone to 30 goals per UTC day using a SQLite Durable Object.
- A separate session Durable Object keeps the ten most recent goals for this browser. The session is carried by an HttpOnly cookie; it is not an account and does not sync across devices. The UI can delete the saved history.
- The optional unpacked Chromium extension in `extension/` places one small button on ordinary web pages and hands only selected DOM labels, page hostname/title, and the user's instruction to the public preview for review. It requests HTTP/HTTPS site access to display on each page. See `extension/README.md` for installation and scope.
- The intended resident UI is a single small button on the page; the action panel and drawing surface appear only while the user opens it. The larger public site remains an explanatory preview.
- `desktop/` is a local Electron shell with one button above the desktop and a short request panel; it hands text to the public preview for review. Packaged Windows/macOS builds are configured to start at login, with an opt-out in the panel. An installer is not yet supplied. It does not yet capture the screen or control other applications. See `desktop/README.md`.
- Agent responses are proposals only. The service cannot read email, alter code, browse the computer, publish, or execute tools. There is no simulated approval button.

## Deployment

Pushes to `main` deploy through GitHub Actions using the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The Cloudflare Worker and custom domain are defined in `wrangler.jsonc`. Never commit credentials. The model is configured in `src/worker.js`; replace `runAgent` with a provider adapter to route other models without changing agent identities.

## Development boundaries

The local Node prototype under `src/core.js` and `src/server.js` explores a permission engine and event records. It is not called by the deployed Worker. The public Worker has short browser session history, but no accounts, connector credentials, computer use, or a real approval workflow. Desktop overlay, OS accessibility and capture, authenticated workspaces, recoverable goal orchestration, and mobile companion are separate subsequent phases.
