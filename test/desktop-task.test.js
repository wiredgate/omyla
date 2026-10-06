import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {parseDesktopAction,desktopStepResponse} from '../src/desktop-planner.js';
const require=createRequire(import.meta.url);
const {TaskEngine,validateAction,actionPolicy}=require('../desktop/task-engine.cjs');
const click={kind:'click',summary:'検索欄を選ぶ',x:.3,y:.4};
const target={windowId:'42',name:'検索',controlType:'Edit',process:'chrome',title:'ホーム',editable:true,password:false};
function fixture(actions=[click,{kind:'done',summary:'入力を確認したよ'}]){
 const calls=[];let index=0;
 const adapter={status:x=>calls.push(['status',x]),capture:async()=>{calls.push(['capture']);return {image:'frame'};},plan:async()=>{calls.push(['plan']);return actions[Math.min(index++,actions.length-1)];},walk:async()=>calls.push(['walk']),inspect:async()=>({...target}),unchanged:async()=>true,execute:async()=>calls.push(['execute']),settle:async()=>{},confirm:async()=>true,finish:()=>calls.push(['finish'])};
 return {calls,adapter,engine:new TaskEngine(adapter)};
}
test('observe, walk, act and re-observe before reporting completion',async()=>{
 const f=fixture();assert.equal((await f.engine.run('検索する')).state,'done');
 const names=f.calls.map(x=>x[0]);assert.ok(names.indexOf('walk')<names.indexOf('execute'));assert.equal(names.filter(x=>x==='capture').length,3);assert.equal(names.filter(x=>x==='execute').length,1);
});
test('stop during walking never executes a queued click',async()=>{
 const f=fixture();f.adapter.walk=async()=>f.engine.stop();assert.equal((await f.engine.run('検索する')).state,'stopped');assert.equal(f.calls.some(x=>x[0]==='execute'),false);
});
test('changed screenshot requires replanning instead of acting',async()=>{
 const f=fixture();f.adapter.unchanged=async()=>false;await f.engine.run('検索する');assert.equal(f.calls.some(x=>x[0]==='execute'),false);
});
test('passwords and shells are blocked even when model says ordinary',()=>{
 assert.equal(actionPolicy(click,{...target,password:true}),'block');assert.equal(actionPolicy(click,{...target,process:'WindowsTerminal'}),'block');assert.equal(actionPolicy({...click,kind:'type',text:'javascript:alert(1)'},target),'block');
});
test('sensitive actions wait for concrete approval and denial stops execution',async()=>{
 const f=fixture([{...click,sensitive:true}]);let asked=0;f.adapter.confirm=async()=>{asked++;return false;};assert.equal((await f.engine.run('送信する')).state,'stopped');assert.equal(asked,1);assert.equal(f.calls.some(x=>x[0]==='execute'),false);
});
test('changed native target after approval is rejected',async()=>{
 const f=fixture([{...click,sensitive:true}]);let reads=0;f.adapter.inspect=async()=>({...target,windowId:++reads===1?'42':'43'});assert.equal((await f.engine.run('検索')).error,'target_changed');assert.equal(f.calls.some(x=>x[0]==='execute'),false);
});
test('task cap ends an endless model loop',async()=>{
 const f=fixture([click]);assert.equal((await f.engine.run('検索')).summary,'step_limit');assert.equal(f.calls.filter(x=>x[0]==='execute').length,12);
});
test('provider asks for help without executing an action',async()=>{
 const f=fixture([{kind:'ask',summary:'どのファイルか教えて'}]);assert.equal((await f.engine.run('開いて')).state,'needs_you');assert.equal(f.calls.some(x=>x[0]==='execute'),false);
});
test('task deadline cancels a pending planner request',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const f=fixture();let planning;
 const started=new Promise(resolve=>{planning=resolve;});
 f.adapter.plan=async(_payload,signal)=>{planning();return new Promise(resolve=>signal.addEventListener('abort',()=>resolve(click),{once:true}));};
 const task=f.engine.run('検索');await started;t.mock.timers.tick(300000);assert.equal((await task).state,'stopped');assert.equal(f.calls.some(x=>x[0]==='execute'),false);
});
test('both trust boundaries reject invalid actions and arbitrary hotkeys',()=>{
 for(const a of [{...click,x:NaN},{...click,x:-.1},{...click,kind:'shell'},{...click,kind:'key',key:'WIN+R'},{...click,kind:'type',text:''}]){assert.throws(()=>validateAction(a));assert.throws(()=>parseDesktopAction(JSON.stringify(a)));}
});
test('typing multiline text and submission hotkeys require approval',()=>{
 assert.equal(actionPolicy({...click,kind:'type',text:'a\nb'},target),'ask');assert.equal(actionPolicy({...click,kind:'key',key:'ENTER'},target),'ask');assert.equal(actionPolicy({...click,kind:'type',text:'岡山'},target),'allow');
});
test('missing element name is treated as ambiguous',()=>assert.equal(actionPolicy(click,{...target,name:''}),'ask'));
test('planner rejects invalid input before reserving inference quota',async()=>{
 let called=false;const result=await desktopStepResponse(new Request('https://omyla.test/api/desktop-step',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal:'abc',image:'wrong'})}),{QUOTA:{getByName(){called=true;}}});assert.equal(result.status,400);assert.equal(called,false);
});
test('planner respects quota and never calls inference after limit',async()=>{
 let inferred=false;const result=await desktopStepResponse(new Request('https://omyla.test/api/desktop-step',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal:'abc',image:'data:image/jpeg;base64,'+'A'.repeat(1200)})}),{QUOTA:{getByName:()=>({reserveDesktop:async()=>false})},AI:{run(){inferred=true;}}});assert.equal(result.status,429);assert.equal(inferred,false);
});
