import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Orchestrator } from './core.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const app = new Orchestrator();
const port = Number(process.env.PORT || 4173);
const reply = (res, status, value, type = 'application/json') => {
  res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(type === 'application/json' ? JSON.stringify(value) : value);
};
const body = async req => {
  let data = '';
  for await (const chunk of req) { data += chunk; if (data.length > 100_000) throw new Error('入力が大きすぎる'); }
  return JSON.parse(data || '{}');
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/state') return reply(res, 200, app.snapshot());
    if (req.method === 'POST' && url.pathname === '/api/goals') return reply(res, 201, app.createGoal(await body(req)));
    const approval = url.pathname.match(/^\/api\/approvals\/([a-f0-9-]+)$/);
    if (req.method === 'POST' && approval) return reply(res, 200, app.decide(approval[1], (await body(req)).decision));
    if (req.method === 'GET' && ['/', '/index.html', '/app.js', '/style.css'].includes(url.pathname)) {
      const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const type = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html';
      return reply(res, 200, await readFile(join(root, name), 'utf8'), type);
    }
    reply(res, 404, { error: '見つからない' });
  } catch (error) { reply(res, error instanceof SyntaxError ? 400 : 400, { error: error.message }); }
}).listen(port, '127.0.0.1', () => process.stdout.write(`OMYLA local prototype: http://127.0.0.1:${port}\n`));
