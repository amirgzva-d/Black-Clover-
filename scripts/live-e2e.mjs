import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Agent } from '../src/agent/Agent.js';
import { runTool } from '../src/agent/toolRegistry.js';
import { memory } from '../src/agent/MemoryStore.js';
import { reminders } from '../src/agent/ReminderStore.js';
import { SpeechService } from '../src/main/SpeechService.js';

const rows=[]; const mark=(name,ok,detail='')=>{rows.push({name,ok:Boolean(ok),detail:String(detail||'').slice(0,500)});console.log((ok?'PASS ':'FAIL ')+name+(detail?' :: '+detail:''));};
const temp=path.join(os.tmpdir(),'black-clover-e2e-'+Date.now()),marker='maria-e2e-'+crypto.randomUUID().slice(0,8);await fs.mkdir(temp,{recursive:true});
try{
  const agent=new Agent({enableScheduler:false});
  // volume + direct Persian command + verify + restore
  const vb=await runTool('get_volume',{}),oldVol=Number(vb?.data?.percent??50),target=oldVol>=99?oldVol-1:oldVol+1;
  const vr=await agent.chat('صدا رو روی '+target+' درصد بزار'),va=await runTool('get_volume',{});
  mark('volume-direct',vr?.direct===true&&Number(va?.data?.percent)===target,JSON.stringify({oldVol,target,after:va?.data?.percent,tool:vr?.tool,model:vr?.brain?.model}));
  await runTool('set_volume',{percent:oldVol});

  // app catalog + fuzzy resolve
  const cat=await runTool('list_known_apps',{filter:'notepad',limit:20}),app=await runTool('find_any_app',{name:'نوت پد',limit:10});
  mark('app-catalog',(cat?.data?.total||0)>10,'total='+cat?.data?.total);
  mark('app-fuzzy-resolve',Array.isArray(app?.data)&&app.data.length>0,app?.data?.[0]?.name||'none');

  // file index + resolver
  const file=path.join(temp,marker+'.txt');await fs.writeFile(file,'Black Clover E2E '+marker,'utf8');
  await new Promise(r=>setTimeout(r,1200));
  const find=await runTool('global_find_files',{query:marker,limit:20,kind:'file'}),res=await runTool('resolve_resource',{query:marker,limit:12});
  mark('global-file-search',find?.data?.items?.some(x=>path.resolve(x.path)===path.resolve(file)),find?.data?.engine||'');
  mark('resource-resolver',res?.data?.items?.some(x=>x.kind==='file'&&path.resolve(x.target)===path.resolve(file)),JSON.stringify(res?.data?.items?.slice(0,2)||[]));

  // clipboard save / set / verify / restore
  let oldClip='';try{oldClip=(await runTool('read_clipboard',{}))?.data?.text||'';}catch{}
  await runTool('copy_to_clipboard',{text:marker});const clip=await runTool('read_clipboard',{});
  mark('clipboard',String(clip?.data?.text||'').includes(marker),String(clip?.data?.text||'').slice(0,80));
  await runTool('copy_to_clipboard',{text:oldClip});

  // screenshot
  const shot=path.join(temp,'screen.png');const ss=await runTool('take_screenshot',{file:shot});let shotSize=0;try{shotSize=(await fs.stat(shot)).size;}catch{}
  mark('screenshot',ss?.success!==false&&shotSize>1000,'bytes='+shotSize);

  // durable reminder create/list/cancel
  const due=new Date(Date.now()+60*60*1000).toISOString(),rem=await reminders.create({message:marker,dueAt:due}),list=await reminders.list();
  mark('reminder-persist',list.some(x=>x.id===rem.id),rem.id);await reminders.cancel(rem.id);

  // durable memory
  const mem=await memory.remember(marker+' preference',{kind:'e2e',importance:.2,source:'test',tags:['e2e']}),rec=await memory.recall(marker,{limit:10});
  mark('memory-persist',rec.some(x=>x.id===mem.id),mem.id);await memory.remove(mem.id);

  // Excel create/read/write/verify on a disposable workbook
  const xlsx=path.join(temp,marker+'.xlsx');
  execFileSync('py.exe',['-3','-c',"from openpyxl import Workbook;import sys;w=Workbook();s=w.active;s.title='Data';s['A1']='name';s['B1']='value';s['A2']='Maria';s['B2']=1;w.save(sys.argv[1])",xlsx],{windowsHide:true});
  const sheets=await runTool('excel_list_sheets',{file:xlsx}),read1=await runTool('excel_read_range',{file:xlsx,sheet:'Data',range:'A1:B2'}),write=await runTool('excel_set_cells',{file:xlsx,sheet:'Data',changes:[{cell:'B2',value:42}]}),read2=await runTool('excel_read_range',{file:xlsx,sheet:'Data',range:'B2:B2'});
  mark('excel-read',sheets?.data?.sheets?.includes('Data')&&read1?.data?.cells?.some(x=>x.address==='A2'&&x.value==='Maria'),JSON.stringify(sheets?.data));
  mark('excel-write-backup',write?.success!==false&&Boolean(write?.data?.backup)&&read2?.data?.cells?.[0]?.value===42,JSON.stringify({backup:write?.data?.backup,value:read2?.data?.cells?.[0]?.value}));

  // TTS female Persian + STT round trip
  const speech=new SpeechService(),st=await speech.status(),tts=await speech.synthesize('سلام، من ماریا هستم. صدا را زیاد کن.',{rate:1.02,pitch:1.05});
  const audio=Buffer.from(tts.audio,'base64');mark('tts-persian-female',st.naturalTts&&tts.voice==='fa-IR-DilaraNeural'&&audio.length>5000,JSON.stringify({voice:tts.voice,engine:tts.engine,bytes:audio.length}));
  try{const tr=await speech.transcribe(audio,{language:'fa'});mark('stt-persian',Boolean(tr?.text)&&tr.text.length>4,tr?.text||'');}catch(e){mark('stt-persian',false,e.message);}

  // system device visibility (not biometric enrollment)
  try{
    const out=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$cam=@(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue|? {$_.Class -in @('Camera','Image')});$mic=@(Get-CimInstance Win32_SoundDevice -ErrorAction SilentlyContinue);[pscustomobject]@{camera=$cam.Count;audio=$mic.Count}|ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true});
    const d=JSON.parse(out);mark('camera-audio-visible',d.camera>0&&d.audio>0,JSON.stringify(d));
  }catch(e){mark('camera-audio-visible',false,e.message);}

}finally{await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});}
const passed=rows.filter(x=>x.ok).length;console.log('\nSUMMARY '+passed+'/'+rows.length);console.log(JSON.stringify(rows,null,2));process.exitCode=passed===rows.length?0:2;
