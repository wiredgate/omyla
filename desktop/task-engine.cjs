const { randomUUID } = require('node:crypto');

const coordinate = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
function validateAction(action) {
  if (!action || typeof action !== 'object' || typeof action.summary !== 'string' || !action.summary.trim() || action.summary.length > 240) throw new Error('invalid_action');
  if (!['click','double_click','type','scroll','key','done','ask'].includes(action.kind)) throw new Error('invalid_action');
  if (!['done','ask'].includes(action.kind) && ![action.x,action.y].every(coordinate)) throw new Error('invalid_coordinates');
  if (action.kind === 'type' && (typeof action.text !== 'string' || !action.text || action.text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(action.text))) throw new Error('invalid_text');
  if (action.kind === 'scroll' && (!Number.isInteger(action.amount) || Math.abs(action.amount) > 5 || action.amount === 0)) throw new Error('invalid_scroll');
  if (action.kind === 'key' && !['TAB','ENTER','ESC','CTRL+A','CTRL+C','CTRL+V','CTRL+S','CTRL+F','CTRL+L','ALT+LEFT'].includes(action.key)) throw new Error('invalid_key');
  return { kind:action.kind, summary:action.summary, x:action.x, y:action.y, ...(action.kind==='type'?{text:action.text}:{}), ...(action.kind==='scroll'?{amount:action.amount}:{}), ...(action.kind==='key'?{key:action.key}:{}), sensitive:action.sensitive===true };
}
function actionPolicy(action, target) {
  if (['done','ask'].includes(action.kind)) return 'allow';
  if (!target || target.password || /powershell|cmd|terminal|pwsh|regedit|taskmgr|credential|consent/i.test(target.process || '')) return 'block';
  if (action.kind==='type' && !target.editable) return 'block';
  if (action.kind==='type' && /(?:^|\n)\s*(?:sudo|rm\s|del\s|format\s|powershell|cmd\s|curl\s|wget\s|Invoke-|Start-Process|shutdown|reg\s)/i.test(action.text)) return 'block';
  if (action.kind==='type' && /^(?:javascript:|data:|file:)/i.test(action.text.trim())) return 'block';
  const label = `${target.name || ''} ${target.title || ''} ${action.summary}`;
  if (action.sensitive || /送信|投稿|購入|注文|支払|決済|削除|消去|上書き|公開|パスワード|認証|許可|send|submit|publish|buy|purchase|pay|checkout|delete|erase|password|permission|sign.?in/i.test(label)) return 'ask';
  if (action.kind==='key' && ['ENTER','CTRL+V','CTRL+S'].includes(action.key)) return 'ask';
  if (action.kind==='type' && /[\r\n]/.test(action.text)) return 'ask';
  if (!target.name && ['click','double_click','type'].includes(action.kind)) return 'ask';
  return 'allow';
}

class TaskEngine {
  constructor(adapter) { this.adapter=adapter; this.task=null; }
  stop() { if (this.task) { this.task.controller.abort(); this.adapter.cancel?.(); } }
  async run(goal) {
    if(this.task) throw new Error('task_busy');
    if(typeof goal!=='string'||!goal.trim()||goal.length>1500) throw new Error('invalid_goal');
    const task={id:randomUUID(),goal:goal.trim(),controller:new AbortController(),steps:[],deadline:Date.now()+5*60*1000};
    this.task=task;
    const signal=task.controller.signal;
    const expiry=setTimeout(()=>this.stop(),5*60*1000);
    const check=()=>{if(signal.aborted) throw new Error('stopped'); if(Date.now()>task.deadline) throw new Error('task_timeout');};
    const status=(state,summary,finished=false)=>this.adapter.status({id:task.id,state,summary,count:task.steps.length,finished});
    try {
      for(let i=0;i<12;i++) {
        check();status('observing','画面を見ているよ');
        const frame=await this.adapter.capture(signal);check();
        const action=validateAction(await this.adapter.plan({goal:task.goal,image:frame.image,history:task.steps.map(s=>({kind:s.kind,summary:s.summary,result:s.result}))},signal));check();
        if(action.kind==='done') { status('done',action.summary,true);return {state:'done',summary:action.summary}; }
        if(action.kind==='ask') {status('needs_you',action.summary,true);return {state:'needs_you',summary:action.summary};}
        status('walking',action.summary);
        await this.adapter.walk(action,signal);check();
        let target=await this.adapter.inspect(action,signal);check();
        let policy=actionPolicy(action,target);
        if(policy==='block') throw new Error('action_blocked');
        const approved=policy==='ask';
        if(approved) {status('needs_you',action.summary);if(!await this.adapter.confirm(action,target,signal)) throw new Error('stopped');check();}
        // Confirmation can change focus; revalidate exact target and observation.
        const latest=await this.adapter.capture(signal);check();
        if(!await this.adapter.unchanged(frame,latest,action,approved)) {status('observing','画面が変わったので見直すね');continue;}
        const actual=await this.adapter.inspect(action,signal);check();
        if(!actual || target.windowId!==actual.windowId || target.name!==actual.name || target.controlType!==actual.controlType || actionPolicy(action,actual)==='block') throw new Error('target_changed');
        status('acting',action.summary);check();
        await this.adapter.execute(action,actual,signal);check();
        task.steps.push({kind:action.kind,summary:action.summary,result:'input_delivered'});
        await this.adapter.settle(signal);check();
        // A fresh screenshot, not an injected-input success, determines the next step.
      }
      status('needs_you','12操作に達したよ。続ける場合はもう一度指示してね。',true);
      return {state:'needs_you',summary:'step_limit'};
    } catch(error) {
      const state=signal.aborted||error.message==='stopped'?'stopped':'failed';
      status(state,error.message,true);return {state,error:error.message};
    } finally {clearTimeout(expiry);this.task=null;this.adapter.finish?.();}
  }
}
module.exports={TaskEngine,validateAction,actionPolicy};
