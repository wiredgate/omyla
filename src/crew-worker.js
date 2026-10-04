import { DurableObject } from 'cloudflare:workers';
import { agentsClient, CrewRuntime, crewAuthorization } from './crew-runtime.js';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export class CrewSession extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.env = env; }
  runtime() {
    return new CrewRuntime({ storage: this.ctx.storage, client: agentsClient(this.env.OPENAI_API_KEY), model: this.env.CREW_MODEL });
  }
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const path = new URL(request.url).pathname;
      const runtime = this.runtime();
      try {
        if (request.method === 'GET') return json(await runtime.refresh());
        if (request.method === 'DELETE') {
          const result = await runtime.remove();
          await this.ctx.storage.deleteAlarm();
          return json(result);
        }
        const body = await request.json();
        if (path === '/api/crew/memory') return json(await runtime.setMemory(body.memory));
        const result = await this.ctx.storage.get('session') ? await runtime.followup(body.text) : await runtime.start(body.text);
        await this.ctx.storage.put('pollDeadline', Date.now() + 30 * 60 * 1000);
        await this.ctx.storage.put('pollFailures', 0);
        await this.ctx.storage.setAlarm(Date.now() + 15000);
        return json(result, 202);
      } catch (error) {
        const message = String(error.message);
        const known = ['invalid_input', 'invalid_memory', 'session_not_found', 'mutation_needs_reconciliation', 'session_already_exists'];
        return json({ error: known.includes(message) ? message : 'crew_provider_unavailable' }, known.includes(message) ? 409 : 503);
      }
    });
  }
  async alarm() {
    return this.ctx.blockConcurrencyWhile(async () => {
      if (this.env.CREW_ENABLED !== 'true' || Date.now() >= (await this.ctx.storage.get('pollDeadline') || 0)) return;
      try {
        const result = await this.runtime().handleTools();
        await this.ctx.storage.put('pollFailures', 0);
        if (result.status === 'in_progress' || result.status === 'requires_action' && result.requiredActions.every(a => a.type === 'function_call')) {
          await this.ctx.storage.setAlarm(Date.now() + 15000);
        }
      } catch {
        const failures = (await this.ctx.storage.get('pollFailures') || 0) + 1;
        await this.ctx.storage.put('pollFailures', failures);
        if (failures < 5) await this.ctx.storage.setAlarm(Date.now() + 30000);
      }
    });
  }
}

export async function crewResponse(request, env) {
  if (!await crewAuthorization(request, env)) return json({ error: 'crew_unavailable' }, 403);
  const url = new URL(request.url);
  if (!['/api/crew', '/api/crew/memory'].includes(url.pathname)) return json({ error: 'not_found' }, 404);
  if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: 'origin_denied' }, 403);
  if (url.pathname.endsWith('/memory') ? request.method !== 'POST' : !['POST', 'GET', 'DELETE'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405);
  if (request.method === 'POST') {
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'json_required' }, 415);
    const text = await request.text();
    if (text.length > 60000) return json({ error: 'too_large' }, 413);
    try { JSON.parse(text); } catch { return json({ error: 'invalid_json' }, 400); }
    request = new Request(request.url, { method: 'POST', headers: request.headers, body: text });
  }
  // One fixed operator workspace. Never accept browser session IDs or body.userId.
  if (!env.CREW) return json({ error: 'crew_configuration_error' }, 503);
  return env.CREW.getByName('operator-pilot-v1').fetch(request);
}
