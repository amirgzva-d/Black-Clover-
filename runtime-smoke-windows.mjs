import {Agent} from './src/agent/Agent.js';
import {runTool} from './src/agent/toolRegistry.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out={};
const agent=new Agent();
try{
  const before=await runTool('get_volume',{});
  const old=Number(before.data?.percent??0), target=old>=95?old-3:old+3;
  const r=await agent.chat(`صدا رو روی ${target} درصد بذار`);
  const after=await runTool('get_volume',{});
  await runTool('set_volume',{percent:old});
  const restored=await runTool('get_volume',{});
  out.volume={old,target,agent:r.text,direct:r.direct,after:after.data,restored:restored.data,ok:after.data?.percent===target&&restored.data?.percent===old};
}catch(e){out.volume={ok:false,error:e.message};}
try{
  const before=await runTool('get_brightness',{});
  if(before.success&&Number.isFinite(Number(before.data?.percent))){
    const old=Number(before.data.percent),target=old>=95?old-3:old+3;
    const r=await agent.chat(`نور صفحه رو روی ${target} درصد بذار`);
    const after=await runTool('get_brightness',{});
    await runTool('set_brightness',{percent:old});
    const restored=await runTool('get_brightness',{});
    out.brightness={old,target,agent:r.text,direct:r.direct,after:after.data,restored:restored.data,ok:after.data?.percent===target&&restored.data?.percent===old};
  }else out.brightness={ok:null,reason:'brightness unavailable',before};
}catch(e){out.brightness={ok:false,error:e.message};}
try{
  const r=await agent.chat('نوت پد رو باز کن');
  await sleep(1200);
  const ps=await runTool('list_processes',{filter:'notepad'});
  out.notepad={agent:r.text,direct:r.direct,found:(ps.data||[]).length,ok:(ps.data||[]).length>0};
  await runTool('close_app',{name:'notepad'}).catch(()=>{});
}catch(e){out.notepad={ok:false,error:e.message};}
try{
  const r=await runTool('global_find_files',{query:'runtime-smoke-windows.mjs',limit:20});
  const items=Array.isArray(r.data)?r.data:(r.data?.items||[]);
  const hit=items.find(x=>String(x.path||'').includes('Black-Clover-Live'));
  out.fileSearch={engine:r.data?.engine||'unknown',count:items.length,hit,ok:Boolean(hit)};
}catch(e){out.fileSearch={ok:false,error:e.message};}
console.log(JSON.stringify(out,null,2));