# OMYLA usage billing design

## Current state

The public preview does not charge users. Each Goal record stores the selected agents, model identity, provider-reported token counts where available, a versioned rate card, the estimated cost cap for the short preview call, and a suggested price using a gross margin set in the server-side `MARGIN_BPS` configuration (3500 = 35%). Missing usage, unknown models, or failed agent calls leave actual cost and suggested price unset. No money is collected and no billing event is emitted. USD micro units avoid rounding away small AI calls.

The model adapter supports Cloudflare Workers AI and OpenAI Responses (`gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`). Agent identity stays independent of model identity. The deployed `TEXT_MODEL` remains Cloudflare. An operator can set `OPENAI_API_KEY` as a Worker secret and select an OpenAI `TEXT_MODEL` after adding authenticated accounts and hard spending controls. Never put the key in `wrangler.jsonc` or the browser. Selecting OpenAI without the secret returns 503 before reserving a demo request. This adapter does not enable paid billing, and switching to a paid model will cause provider costs for public demo traffic.

The estimates currently cover inference for the listed model only. Storage, compute, speech, image, browser, search, connector, retries, taxes, and payment fees must join the cost ledger before charging. The 16K input / 180 output Cloudflare estimate and 16K input / 1200 output OpenAI estimate are planning figures, not enforced spending caps. Reasoning tokens count within OpenAI output usage. Cached input is priced separately where reported. Provider charges may differ from per-response usage due to minimum charges or provider billing details. Reconcile with provider invoices.

## Charged workflow to implement after authenticated accounts

1. Associate an account and device with the Goal. Derive a server-owned idempotency key from `goalId` and operation. Never trust a client-supplied cost or margin.
2. Create an immutable quote containing rate version, expected steps, currency, estimated total, maximum authorized charge, and expiry. The user can accept the maximum once, then continue without repeated prompts while work remains within that limit.
3. Reserve an available balance or approved payment limit atomically before any paid provider call. Stop before any step that would exceed it, preserving task state for top-up or approval.
4. Write append-only usage events for each provider/model/tool call, including tokens, discounts, raw provider usage, cost, timestamps, task and agent IDs, and a stable event ID. Record errors and retries separately. Guard concurrent agents against double spending the same balance.
5. Calculate final actual cost from reconciled usage and versioned rates. Customer amount is `ceil(total_cost / (1 - margin_rate))`, with a minimum charge or aggregation for tiny items. Tax and payment processing fees have explicit treatment. Never bill an event without trustworthy usage.
6. Send idempotent billable events to a billing provider, handle asynchronous webhooks, reconcile invoices and refunds, and expose itemized receipts. Failed billing never changes the AI task into a completed paid task.

For a new usage-based Stripe integration, the current Stripe guidance routes usage rating through Metronome, with Stripe collecting invoices. Evaluate service fees and complexity before choosing it over a smaller prepaid credit system. No Stripe keys or customer/payment methods are configured in this repository.

Published rates at the time of this draft: [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing). Recheck them before enabling billing.
