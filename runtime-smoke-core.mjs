import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {runTool} from './src/agent/toolRegistry.js';
import {Agent} from './src/agent/Agent.js';
import {SpeechService} from './src/main/SpeechService.js';
const exec=promisify(execFile),out={};
const root=path.join(os.tmpdir(),'maria-runtime-smoke-'+Date.now());
await fs.mkdir(root,{recursive:true});
const workbook=path.join(root,'maria-smoke.xlsx'),png=path.join(root,'sample.png');
try{
 const py="from openpyxl import Workbook\nfrom openpyxl.drawing.image import Image\nfrom PIL import Image as PImage\nimport sys\nworkbook=sys.argv[1];png=sys.argv[2]\nwb=Workbook();ws=wb.active;ws.title='Sales';ws['A1']='Name';ws['B1']='Value';ws['A2']='Ali';ws['B2']=10\nim=PImage.new('RGB',(32,32),(90,140,220));im.save(png)\nws.add_image(Image(png),'D2');wb.save(workbook)\n";
 await exec('py.exe',['-3','-c',py,workbook,png],{windowsHide:true,timeout:60000});
 const status=await runTool('excel_status',{});
 const before=await runTool('excel_read_range',{file:workbook,sheet:'Sales',range:'A1:D3'});
 const changed=await runTool('excel_set_cells',{file:workbook,sheet:'Sales',changes:[{cell:'B2',value:25}]});
 const after=await runTool('excel_read_range',{file:workbook,sheet:'Sales',range:'A1:B3'});
 const media=await runTool('excel_collect_images',{file:workbook,output_directory:path.join(root,'media')});
 const val=after.data?.cells?.find?.(x=>x.address==='B2')?.value;
 out.excel={status:status.data,valueBefore:before.data?.cells?.find?.(x=>x.address==='B2')?.value,valueAfter:val,backup:changed.data?.backup,mediaCount:media.data?.count,ok:Number(val)===25&&Boolean(changed.data?.backup)&&media.data?.count>=1};
}catch(e){out.excel={ok:false,error:e.message};}
try{
 const unique='Maria smoke reminder '+Date.now(),due=new Date(Date.now()+10*60*1000).toISOString();
 const created=await runTool('create_reminder',{message:unique,due_at:due});
 const listed=await runTool('list_reminders',{});
 const found=(listed.data||[]).find?.(x=>x.message===unique);
 if(found)await runTool('cancel_reminder',{id:found.id});
 const listed2=await runTool('list_reminders',{});
 out.reminder={created:created.data,found:Boolean(found),removed:!(listed2.data||[]).some?.(x=>x.message===unique),ok:Boolean(found)&&!(listed2.data||[]).some?.(x=>x.message===unique)};
}catch(e){out.reminder={ok:false,error:e.message};}
try{
 const speech=new SpeechService(),status=await speech.status();
 const t0=Date.now(),audio=await speech.synthesize('سلام، من ماریا هستم و صدام فارسیه.',{rate:1.02,pitch:1.04}),ttsMs=Date.now()-t0;
 const bytes=Buffer.from(audio.audio,'base64');
 const t1=Date.now(),stt=await speech.transcribe(bytes,{language:'fa'}),sttMs=Date.now()-t1;
 out.speech={status,engine:audio.engine,voice:audio.voice,bytes:bytes.length,ttsMs,stt,sttMs,ok:status.naturalTts&&audio.engine==='edge-tts'&&bytes.length>1000&&Boolean(stt.text)};
}catch(e){out.speech={ok:false,error:e.message};}
try{
 const r=await runTool('global_find_files',{query:'runtime-smoke-windows.mjs',limit:20}),items=r.data?.items||[];
 out.fileSearch={engine:r.data?.engine,count:items.length,hit:items.find(x=>String(x.path).includes('Black-Clover-Live')),ok:items.some(x=>String(x.path).includes('Black-Clover-Live'))};
}catch(e){out.fileSearch={ok:false,error:e.message};}
try{
 const agent=new Agent();const t=Date.now();const r=await agent.chat('سلام ماریا، امروز چطوری؟');const ms=Date.now()-t;
 out.chat={ms,text:r.text,brain:r.brain,direct:r.direct??false,ok:Boolean(r.text)&&ms<15000};
}catch(e){out.chat={ok:false,error:e.message};}
console.log(JSON.stringify(out,null,2));
await fs.rm(root,{recursive:true,force:true}).catch(()=>{});
process.exit(0);