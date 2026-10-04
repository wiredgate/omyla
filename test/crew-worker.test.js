import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
// Cloudflare supplies DurableObject at deployment; stub only that platform import.
let source=await readFile(new URL('../src/crew-worker.js',import.meta.url),'utf8');
source=source.replace("import { DurableObject } from 'cloudflare:workers';",'class DurableObject { constructor(ctx) { this.ctx=ctx; } }');
source=source.replace("'./crew-runtime.js'",JSON.stringify(new URL('../src/crew-runtime.js',import.meta.url).href));
const {crewResponse,CrewSession}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={CREW_ENABLED:'true',CREW_OPERATOR_TOKEN:'operator',OPENAI_API_KEY:'key',CREW_MODEL:'model'};
const request=(path='/api/crew',method='GET',body,extra={})=>new Request('https://omyla.test'+path,{method,headers:{Authorization:'Bearer operator',...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
test('disabled pilot cannot reach the provider binding',async()=>{
  let calls=0;const result=await crewResponse(request(),{...env,CREW_ENABLED:'false',CREW:{getByName(){calls++;}}});
  assert.equal(result.status,403);assert.equal(calls,0);
});
test('route uses server-selected operator workspace and rejects foreign origins',async()=>{
  let workspace;
  const config={...env,CREW:{getByName(name){workspace=name;return {fetch:async()=>Response.json({})};}}};
  assert.equal((await crewResponse(request('/api/crew','POST',{text:'a',userId:'victim'}),config)).status,200);
  assert.equal(workspace,'operator-pilot-v1');
  assert.equal((await crewResponse(request('/api/crew','GET',null,{Origin:'https://evil.test'}),config)).status,403);
});
test('alarm stops without contacting provider after its deadline',async()=>{
  let calls=0;
  const ctx={storage:{get:async()=>Date.now()-1},blockConcurrencyWhile:fn=>fn()};
  const session=new CrewSession(ctx,env);session.runtime=()=>{calls++;throw new Error('unexpected');};
  await session.alarm();assert.equal(calls,0);
});
test('alarm answers tools and schedules more work only while active',async()=>{
  const alarms=[];const data=new Map([['pollDeadline',Date.now()+60000]]);
  const ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),setAlarm:async t=>alarms.push(t)},blockConcurrencyWhile:fn=>fn()};
  const session=new CrewSession(ctx,env);session.runtime=()=>({handleTools:async()=>({status:'in_progress',requiredActions:[]})});
  await session.alarm();assert.equal(alarms.length,1);
  session.runtime=()=>({handleTools:async()=>({status:'idle',requiredActions:[]})});
  await session.alarm();assert.equal(alarms.length,1);
});
