const path=require('node:path');
const {TaskEngine}=require('./task-engine.cjs');
const {nativeInput}=require('./windows-input.cjs');
const sleep=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(new Error('stopped'));
 const abort=()=>{clearTimeout(timer);reject(new Error('stopped'));};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
 signal?.addEventListener('abort',abort,{once:true});
});

function installDesktopTasks({BrowserWindow,ipcMain,screen,desktopCapturer,globalShortcut,getWindow,getDisplay,authorized,prepare,setBusy,setWalking,updateAnchor,targetChanged,canStart}) {
 let hud,confirmation,engine,grantedDisplay;
 const point=action=>{const d=getDisplay();return {x:d.bounds.x+Math.min(d.bounds.width-1,Math.floor(action.x*d.bounds.width)),y:d.bounds.y+Math.min(d.bounds.height-1,Math.floor(action.y*d.bounds.height))};};
 const physical=action=>screen.dipToScreenPoint(point(action));
 const hide=()=>{getWindow()?.hide();hud?.hide();};
 const show=()=>{getWindow()?.showInactive();hud?.showInactive();};
 const snapshotDisplay=()=>{const d=getDisplay();return {id:String(d.id),bounds:{...d.bounds},scaleFactor:d.scaleFactor};};
 const equalDisplay=(a,b)=>a.id===b.id&&a.scaleFactor===b.scaleFactor&&['x','y','width','height'].every(k=>a.bounds[k]===b.bounds[k]);
 const createHud=()=>{
  if(hud&&!hud.isDestroyed())return;
  const area=getDisplay().workArea;
  hud=new BrowserWindow({x:area.x+area.width-334,y:area.y+12,width:320,height:155,frame:false,transparent:true,alwaysOnTop:true,skipTaskbar:true,resizable:false,focusable:false,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'task-preload.cjs')}});
  hud.webContents.on('will-navigate',e=>e.preventDefault());hud.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  hud.on('closed',()=>{hud=null;engine?.stop();});hud.loadFile(path.join(__dirname,'task.html'));
  hud.webContents.once('did-finish-load',()=>{hud?.showInactive();hud?.webContents.send('task:state',{state:'observing',summary:'画面を見ているよ',count:0});});
 };
 const adapter={
  status:value=>{hud?.webContents.send('task:state',value);getWindow()?.webContents.send('task:state',value);},
  async capture(signal) {
   const display=snapshotDisplay();if(!equalDisplay(grantedDisplay,display))throw new Error('display_changed');hide();
   try {
    await sleep(160,signal);
    const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:1280,height:720}});
    if(signal.aborted)throw new Error('stopped');
    const source=sources.find(s=>s.display_id===display.id);if(!source||source.thumbnail.isEmpty())throw new Error('capture_failed');
    if(!equalDisplay(display,snapshotDisplay()))throw new Error('display_changed');
    const jpeg=source.thumbnail.toJPEG(72);if(jpeg.length>740000)throw new Error('image_too_large');
    return {image:`data:image/jpeg;base64,${jpeg.toString('base64')}`,fingerprint:source.thumbnail.resize({width:320,height:180}).toBitmap(),display,pointer:screen.getCursorScreenPoint()};
   } finally {show();}
  },
  async plan(payload,signal) {
   const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),60000);
   const abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});
   try {
    const response=await fetch('https://omyla.uwaaa.com/api/desktop-step',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'OMYLA-Desktop/0.2','Origin':'https://omyla.uwaaa.com'},body:JSON.stringify(payload),signal:timeout.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'planner_unavailable');return result.action;
   }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  },
  async walk(action,signal) {
   const win=getWindow();if(!win||win.isDestroyed())throw new Error('window_closed');
   const area=getDisplay().workArea,p=point(action),size=win.getBounds();
   const destination={x:Math.round(Math.max(area.x,Math.min(area.x+area.width-size.width,p.x-size.width-15))),y:Math.round(Math.max(area.y,Math.min(area.y+area.height-size.height,p.y-size.height-15)))};
   setWalking(true);win.webContents.send('task:facing',destination.x<win.getBounds().x?'left':'right');
   try {
    const start=win.getBounds();const distance=Math.hypot(destination.x-start.x,destination.y-start.y);
    const duration=Math.min(2200,Math.max(300,distance*2));const began=Date.now();
    while(Date.now()-began<duration){if(signal.aborted)throw new Error('stopped');const fraction=(Date.now()-began)/duration;win.setPosition(Math.round(start.x+(destination.x-start.x)*fraction),Math.round(start.y+(destination.y-start.y)*fraction));await sleep(30,signal);}
    win.setPosition(destination.x,destination.y);updateAnchor(destination.x+size.width,destination.y+size.height);
   }finally{setWalking(false);}
  },
  async inspect(action,signal) {hide();try{await sleep(100,signal);return await nativeInput({operation:'inspect',...physical(action),kind:action.kind},signal);}finally{show();}},
  async confirm(action,target,signal) {
   return new Promise(resolve=>{
    const finish=value=>{if(confirmation?.finish!==finish)return;confirmation=null;signal.removeEventListener('abort',abort);hud?.webContents.send('task:approval',null);resolve(value);};
    const abort=()=>finish(false);confirmation={finish,target};signal.addEventListener('abort',abort,{once:true});
    hud?.webContents.send('task:approval',{summary:action.summary,text:action.kind==='type'?action.text.slice(0,300):null});
   });
  },
  async unchanged(frame,latest,action,approved) {
   if(!equalDisplay(frame.display,latest.display))throw new Error('display_changed');
   if(!approved&&Math.hypot(frame.pointer.x-latest.pointer.x,frame.pointer.y-latest.pointer.y)>35)throw new Error('user_intervened');
   return !targetChanged(frame.fingerprint,latest.fingerprint,action);
  },
  async execute(action,target,signal) {hide();try{await sleep(100,signal);const result=await nativeInput({operation:'execute',...physical(action),...action,x:physical(action).x,y:physical(action).y,windowId:target.windowId,name:target.name,controlType:target.controlType},signal);if(!result.delivered)throw new Error('input_rejected');}finally{show();}},
  settle:signal=>sleep(550,signal),
  cancel:()=>confirmation?.finish(false),
  finish:()=>{grantedDisplay=null;setBusy(false);setWalking(false);show();}
 };
 engine=new TaskEngine(adapter);
 ipcMain.handle('task:start',async(event,goal)=>{
  if(!authorized(event)||process.platform!=='win32')return {error:'windows_required'};
  if(engine.task||!canStart())return {error:'task_busy'};
  if(typeof goal!=='string'||!goal.trim()||goal.length>1500)return {error:'invalid_goal'};
  prepare();grantedDisplay=snapshotDisplay();setBusy(true);createHud();
  return engine.run(goal);
 });
 ipcMain.handle('task:stop',event=>{if(authorized(event)||hud&&event.sender===hud.webContents){engine.stop();return true;}return false;});
 ipcMain.handle('task:approve',(event,decision)=>{if(!hud||event.sender!==hud.webContents||typeof decision!=='boolean'||!confirmation)return false;confirmation.finish(decision);return true;});
 ipcMain.handle('task:dismiss',event=>{if(hud&&event.sender===hud.webContents&&!engine.task){hud.close();return true;}return false;});
 globalShortcut.register('Control+Alt+S',()=>engine.stop());
 return {stop:()=>engine.stop(),busy:()=>Boolean(engine.task)};
}
module.exports={installDesktopTasks};
