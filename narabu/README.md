# NARABU beta
Independent Cloudflare Worker at narabu.uwaaa.com, with an SQLite-backed Durable Object. This folder shares CI credentials with the repository's other apps but has its own Worker, domain and storage. No existing app is modified.

Supports device-scoped trial profiles, shared requests, applications, requester selection, participant-only messaging, waiting/handoff states, requester-confirmed completion, atomic escrow/refunds and a trial-point ledger. No monetary value, payment processing, redemption, verified identity, GPS proof, push notifications, dispute/support system or account recovery. Not ready for paid transactions. Browser localStorage stores the device bearer token; request and transaction records persist server-side.

Posting requires confirmation that the venue permits proxy queueing and handoffs. Examples are explicitly non-actionable samples. A newcomer receives 5,000 trial points. Point creation is abuseable through repeated profiles and is intentionally confined to valueless trial use. Registration is globally limited to 100 per hour, active requests to five per profile, and messages to 100 per request. All participants must independently follow venue rules.

Tests: `node --test tests/*.test.js` (Node 22+ with node:sqlite). Covers two-party flow, access restrictions, exactly-once payout/refund, insufficient balance, validation, unauthenticated access and origin enforcement. Browser visual QA was unavailable in this environment.
