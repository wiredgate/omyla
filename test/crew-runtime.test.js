import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { CrewRuntime, agentsClient, crewAuthorization } from '../src/crew-runtime.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
function fixture() {
  const data = new Map();
  const sent = [];
  let remote = { id: 'sess_1', status: 'in_progress', required_actions: [] };
  const storage = { get: async k => structuredClone(data.get(k)), put: async (k,v) => data.set(k, structuredClone(v)), delete: async k => data.delete(k), deleteAll: async () => data.clear() };
  const client = { create: async body => { sent.push(body); return remote; }, retrieve: async () => remote, events: async (id,events) => sent.push({ id, events }), remove: async id => sent.push({ deleted: id }) };
  return { data, sent, storage, client, setRemote: value => { remote = value; }, runtime: new CrewRuntime({ storage, client, model: 'test-model' }) };
}
test('hosted session persists and a new runtime continues the same session', async () => {
  const f = fixture();
  await f.runtime.start('調べて');
  assert.equal(f.sent[0].environment.type, 'openai_hosted');
  assert.equal(f.sent[0].agent.multi_agent.max_concurrent_subagents, 3);
  const resumed = new CrewRuntime({ storage: f.storage, client: f.client, model: 'test-model' });
  await resumed.followup('続けて');
  assert.equal(f.sent[1].id, 'sess_1');
  assert.equal(f.sent[1].events[0].input[0].content[0].text, '続けて');
});
test('lost creation response blocks another paid creation', async () => {
  const f = fixture(); let calls = 0;
  f.client.create = async () => { calls++; throw new Error('timeout'); };
  await assert.rejects(f.runtime.start('作って'), /timeout/);
  await assert.rejects(f.runtime.start('作って'), /reconciliation/);
  assert.equal(calls, 1);
});
test('idle is never confused with successful turn completion', async () => {
  const f=fixture(); await f.runtime.start('調べて');
  f.setRemote({ id:'sess_1',status:'idle' });
  assert.deepEqual((await f.runtime.refresh()).outcomeVerified, false);
});
test('personal memories are scoped to the storage owner', async () => {
  const a=fixture(), b=fixture(); await a.runtime.start('a'); await b.runtime.start('b');
  await a.runtime.setMemory(['日本語を好む']);
  const action={type:'function_call',name:'read_memory',arguments:{},turn_id:'turn',call_id:'read'};
  for(const f of [a,b]) { f.setRemote({id:'sess_1',status:'requires_action',required_actions:[action]}); await f.runtime.handleTools(); }
  assert.deepEqual(JSON.parse(a.sent.at(-1).events[0].output).memory,['日本語を好む']);
  assert.deepEqual(JSON.parse(b.sent.at(-1).events[0].output).memory,[]);
});
test('tool replay does not duplicate drafts', async () => {
  const f=fixture(); await f.runtime.start('下書き');
  f.setRemote({id:'sess_1',status:'requires_action',required_actions:[{type:'function_call',name:'save_draft',arguments:JSON.stringify({title:'返信',text:'こんにちは'}),turn_id:'turn',call_id:'draft'}]});
  await f.runtime.handleTools(); await f.runtime.handleTools();
  assert.equal(f.data.get('drafts').length,1);
  assert.equal(JSON.parse(f.sent.at(-1).events[0].output).published,false);
});
test('unknown external tools are rejected instead of executed', async () => {
  const f=fixture(); await f.runtime.start('返信');
  f.setRemote({id:'sess_1',status:'requires_action',required_actions:[{type:'function_call',name:'send_email',arguments:{},turn_id:'turn',call_id:'send'}]});
  await f.runtime.handleTools();
  assert.equal(f.sent.at(-1).events[0].success,false);
  assert.equal(f.sent.at(-1).events[0].error,'tool_not_allowed');
});
test('invalid drafts are rejected and no draft is saved', async () => {
  const f=fixture(); await f.runtime.start('draft');
  f.setRemote({id:'sess_1',status:'requires_action',required_actions:[{type:'function_call',name:'save_draft',arguments:'{',turn_id:'t',call_id:'c'}]});
  await f.runtime.handleTools(); assert.equal(f.data.has('drafts'),false); assert.equal(f.sent.at(-1).events[0].success,false);
});
test('provider error does not reveal credentials or upstream body', async () => {
  let calls=0;
  const client=agentsClient('SECRET',async () => { calls++; return new Response('SECRET',{status:403}); });
  await assert.rejects(client.create({}), {message:'agents_http_403'}); assert.equal(calls,1);
});
test('transport uses official endpoint and beta header', async () => {
  let captured;
  const client=agentsClient('SECRET',async (url,options) => { captured={url,options}; return Response.json({id:'sess'}); });
  await client.events('sess_1',[{type:'example'}]);
  assert.equal(captured.url,'https://api.openai.com/v1/agents/sessions/sess_1/events');
  assert.equal(captured.options.headers['OpenAI-Beta'],'agents=v1');
});
test('pilot authentication fails closed without every setting', async () => {
  const req=new Request('https://omyla.test/api/crew',{headers:{Authorization:'Bearer operator-secret'}});
  const env={CREW_ENABLED:'true',CREW_OPERATOR_TOKEN:'operator-secret',OPENAI_API_KEY:'secret',CREW_MODEL:'model'};
  assert.equal(await crewAuthorization(req,env),true);
  for(const key of Object.keys(env)) assert.equal(await crewAuthorization(req,{...env,[key]:''}),false);
  assert.equal(await crewAuthorization(new Request(req.url),env),false);
});
test('deleting the provider session clears local memory only after success', async () => {
  const f=fixture(); await f.runtime.start('task'); await f.runtime.setMemory(['private']);
  f.client.remove=async()=>{throw new Error('busy');}; await assert.rejects(f.runtime.remove(),/busy/); assert.equal(f.data.has('session'),true);
  f.client.remove=async()=>({}); await f.runtime.remove(); assert.equal(f.data.size,0);
});
