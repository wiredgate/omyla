# RIFT / No Rules Royale v2

Independent Cloudflare Worker, with same-origin static assets and a WebSocket Durable Object per room. Published from the isolated `rift-online` branch in wiredgate/omyla; this app's CI does not deploy the OMYLA Worker. Public workers.dev origin is verified by deployment logs and live smoke tests.

Guests enter a name and room code. Guest credentials are scoped to that room, saved in browser localStorage, and hashed in Durable Object storage. This is guest session authentication, not verified accounts or cross-device identity. Anyone who knows a room code can enter; rooms have no password. Never treat a code as private access control.

Up to 12 humans in a shared continuous free-for-all; bots fill rooms to eight total actors when humans are present. Five-minute rounds or fifteen kills, four-second respawn, two-second spawn protection. Inputs are received through authenticated WebSockets; the server calculates movement, hit scans, damage, cooldowns, ammunition, construction, item use, shared pickups, projectiles, and round scores. Client movement is predicted and reconciled; this is an initial implementation without lag compensation or competitive anti-cheat.

Six weapons: rifle, shotgun, rockets, sniper, SMG, energy rifle. Eight non-weapon pickup classes: shield, medkit, materials, grenades, shockwave, speed boost, jump pad, grapple charges. Walls and stair platforms are shared and destructible. Guest names are rendered as text. Connection input size/rate, room capacity, profile capacity, world construction and item counts are bounded.

Stylized procedural island and characters, WebGL instanced rendering, MSAA where supported, dynamic 1024px shadow maps with a 3x3 filter, high/ultra rendering resolution options, blue shield/red HP screen effects, directional damage arcs and floating hit numbers. No Fortnite assets or branding are used. Art is procedural; no detailed character textures, AAA animation rig, vehicles, terrain streaming or asset pipeline yet.

## Validation

`node --test tests/*.test.js` checks server combat, input authority, building collision, shared pickup ownership, guest auth, identical state delivery to two mock socket clients, rendering buffer layout and UI references. Renderer tests use a stub WebGL context and do not prove shader compilation or visual fidelity on a real GPU.

`node tests/live-smoke.mjs https://rift-island-royale.suzukihajimy.workers.dev` checks the deployed health/version, creates two bounded CI guests in a unique room, connects two actual WebSockets and asserts identical shared player state and cross-client observation of an inventory effect. Live human-versus-human hit testing is not covered by this smoke test; server tests cover the hit flow.

No browser automation skill was available for graphical QA in this environment. Real browser GPU, mobile frame rate, pointer lock and input feel remain to be verified. Active rooms run a 20Hz server tick and broadcast at 10Hz; inactive rooms stop ticking. Gameplay is ephemeral and resets after runtime restart; profile identities persist. Room codes max 24 ASCII characters; 2,000 guest profiles per room and 12 new login requests/minute/IP/room.
