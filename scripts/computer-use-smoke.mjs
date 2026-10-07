import {Agent} from '../src/agent/Agent.js';import {runTool} from '../src/agent/toolRegistry.js';import {execFileSync} from 'node:child_process';
const a=new Agent({enableScheduler:false});const out={};
out.launch=await a.chat('نوت پد رو باز کن');await new Promise(r=>setTimeout(r,1200));
out.windows=await runTool('list_windows',{});const np=(out.windows.data||[]).find(x=>/notepad/i.test(x.ProcessName||x.processName||'')||/notepad/i.test(x.MainWindowTitle||x.mainWindowTitle||''));
if(np){await runTool('focus_window',{name:'Notepad'}).catch(()=>{});await new Promise(r=>setTimeout(r,400));out.ui=await runTool('inspect_ui',{limit:30}).catch(e=>({success:false,error:e.message}));}
console.log(JSON.stringify({launch:out.launch,notepadFound:Boolean(np),uiWindow:out.ui?.data?.window||null,uiCount:out.ui?.data?.count||0},null,2));
try{execFileSync('taskkill.exe',['/IM','Notepad.exe','/F'],{windowsHide:true,stdio:'ignore'});}catch{}