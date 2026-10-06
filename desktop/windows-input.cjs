const {spawn}=require('node:child_process');
const path=require('node:path');
function nativeInput(payload,signal) {
  if(process.platform!=='win32') return Promise.reject(new Error('windows_required'));
  if(signal?.aborted) return Promise.reject(new Error('stopped'));
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-input.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve(value);};
    const abort=()=>{child.kill();finish(new Error('stopped'));};
    const timer=setTimeout(()=>{child.kill();finish(new Error('native_timeout'));},10000);
    signal?.addEventListener('abort',abort,{once:true});
    child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.length>30000)abort();});
    child.stderr.on('data',()=>{}); // Never log typed text or native private UI labels.
    child.on('error',()=>finish(new Error('native_unavailable')));
    child.on('close',code=>{if(code!==0)return finish(new Error('native_input_failed'));try{finish(null,JSON.parse(output.trim()));}catch{finish(new Error('native_invalid_result'));}});
    child.stdin.on('error',()=>finish(new Error('native_input_failed')));
    // JSON is input data to a fixed, packaged script, never executable command text.
    child.stdin.end(JSON.stringify(payload));
  });
}
module.exports={nativeInput};
