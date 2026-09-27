# OMYLA visual canvas pipeline

The live product should observe only an explicitly selected frame or short user-approved clip from a monitor, tab, phone screen, or camera. The normal state is no recording. The desktop preview currently offers a one-time local thumbnail for review; it does not upload the pixels or send them to AI. Its geometry handoff is separate from image capture.

## Proposed data contract

`Canvas`: `canvasId`, `deviceId`, `kind`, display/window/camera source ID, bounds and transform, pixel density, orientation, and capability grants.

`Frame`: `frameId`, `canvasId`, capture timestamp, viewport dimensions, image mime type, content hash, expiration, and user approval state. Camera frames and screen captures use the same frame record but separate permission scopes. Do not store image bytes in Goal history or URL fragments.

`Mark`: `markId`, `frameId`, kind (point/circle/arrow/line), normalized path, tip or enclosed region, optional semantic target, and whether the target was inferred. If a display or camera frame changes, existing marks are stale and cannot authorize an action on a new frame.

## Production flow

1. User invokes OMYLA on a specific canvas. Local client presents a one-time preview or crop after OS capture permission. It excludes the overlay controls from capture.
2. User reviews exactly which frame and which marks will be sent. A scoped server authorization binds account, device, goal, frame hash, maximum bytes, expiry, and single-use idempotency key. An anonymous browser cookie is insufficient for private screenshots.
3. Upload the selected image by authenticated POST with strict byte/pixel/type limits. Strip metadata and expire temporary bytes quickly. Never put pixels in URLs, analytics, model logs, or ordinary Goal records.
4. Vision provider receives the user-approved frame plus marks rendered into the frame or described as indexed coordinates. It returns target candidates and confidence; the named Agent receives that structured context while its identity remains independent of the vision model.
5. Show the proposal over the originating canvas. Any Computer Use action requires a fresh target check and a separate permission decision for that exact app/resource and action.

For realtime understanding, sample frames only while the user has opened an active observation session, with a visible capture indicator, explicit stop, adaptive low frame rate, changed-region detection, and per-session spend cap. Camera use always requires its own grant. Do not silently capture all monitors or background camera feeds.

## Provider choice

Cloudflare documents vision-capable Workers AI models such as `@cf/mistralai/mistral-small-3.1-24b-instruct`; model selection remains operator-controlled. Cloudflare's Llama 3.2 Vision requires separate Meta license acceptance before use, so it is not silently activated. OpenAI vision may be routed through the provider adapter after an authenticated budget and billing workflow exists. Visual token cost and retention must be measured from provider usage, not estimated from a text-only rate. No vision model is enabled in the public preview.

References: [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer), [display ID mapping](https://www.electronjs.org/docs/latest/api/structures/desktop-capturer-source), [Cloudflare Mistral Small 3.1](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/), [Cloudflare Llama Vision](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/).
