import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { redactSecrets } from '../memory/MemoryPolicy.js';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const safe=v=>redactSecrets(String(v??'')).slice(0,4000);
const now=()=>new Date().toISOString();

export class RunStore{
  constructor({directory=defaultDir(),maxBytes=3_000_000}={}){
    this.directory=directory;this.file=path.join(directory,'runtime-v2-runs.jsonl');this.errorFile=path.join(directory,'runtime-v2-errors.jsonl');this.maxBytes=maxBytes;
  }
  async _rotate(file){
    try{const s=await fs.stat(file);if(s.size<=this.maxBytes)return;const raw=await fs.readFile(file,'utf8'),lines=raw.split(/\r?\n/).filter(Boolean),keep=lines.slice(Math.floor(lines.length*.55));await fs.writeFile(file,keep.join('\n')+'\n','utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  async _append(file,obj){await fs.mkdir(this.directory,{recursive:true});await this._rotate(file);await fs.appendFile(file,JSON.stringify(obj)+'\n','utf8');}
  async start({text='',privateContext=false,profile='general'}={}){
    const id=crypto.randomUUID(),entry={type:'run-start',id,at:now(),privateContext:Boolean(privateContext),profile,text:privateContext?'[PRIVATE REQUEST]':safe(text)};
    await this._append(this.file,entry);return id;
  }
  async event(id,event,{privateContext=false}={}){
    const payload={...event};for(const k of ['message','error','detail','text'])if(k in payload)payload[k]=privateContext?'[PRIVATE]':safe(payload[k]);
    delete payload.args;delete payload.content;await this._append(this.file,{type:'run-event',id,at:now(),...payload});
  }
  async finish(id,{ok=true,provider='',model='',profile='',trace=[],error='',privateContext=false}={}){
    const compactTrace=(trace||[]).slice(0,64).map(x=>({tool:x.name,success:x.success!==false,verification:x.verification?.level||x.verification||null,error:privateContext?'':safe(x.error||'')}));
    const entry={type:'run-finish',id,at:now(),ok:Boolean(ok),provider,model,profile,privateContext:Boolean(privateContext),trace:compactTrace,error:privateContext?'':safe(error)};
    await this._append(this.file,entry);
    if(!ok||error||compactTrace.some(x=>!x.success))await this._append(this.errorFile,entry);
    return entry;
  }
  async list({errorsOnly=false,limit=50}={}){
    const file=errorsOnly?this.errorFile:this.file;try{const raw=await fs.readFile(file,'utf8'),lines=raw.split(/\r?\n/).filter(Boolean).slice(-Math.max(1,Math.min(Number(limit)||50,300)));return lines.map(x=>{try{return JSON.parse(x);}catch{return null;}}).filter(Boolean).reverse();}catch(e){if(e.code==='ENOENT')return[];throw e;}
  }
  async diagnosticReport({limit=30}={}){
    const rows=await this.list({errorsOnly:true,limit});return {generatedAt:now(),errors:rows.map(x=>({id:x.id,at:x.at,profile:x.profile,provider:x.provider,model:x.model,trace:x.trace,error:x.error}))};
  }
}
export const runStore=new RunStore();
