import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const CODER=process.env.BLACK_CLOVER_CODER_MODEL||'qwen2.5-coder:7b';
const REASONER=process.env.BLACK_CLOVER_REASONING_MODEL||'deepseek-r1:7b';
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:10000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
export class SpecialistModelManager{
  constructor({emit=()=>{}}={}){this.emit=emit;}
  async models(){try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});if(!r.ok)return[];const j=await r.json();return (j.models||[]).map(x=>x.name);}catch{return[];}}
  async status(){const m=await this.models();return {coder:{id:'coder_model',name:'Qwen2.5-Coder 7B',model:CODER,installed:m.includes(CODER),detail:'مغز تخصصی کدنویسی'},reasoner:{id:'reasoning_model',name:'DeepSeek-R1 7B',model:REASONER,installed:m.includes(REASONER),detail:'مغز تخصصی استدلال سنگین'}};}
  async install(id){const ollama=await where('ollama.exe');if(!ollama)throw new Error('Ollama باید اول نصب شود');const model=id==='coder_model'?CODER:id==='reasoning_model'?REASONER:null;if(!model)throw new Error('Unknown specialist model');this.emit({type:'dependency',id,message:`در حال آماده‌سازی ${model}…`});await execFileAsync(ollama,['pull',model],{windowsHide:false,timeout:7200000,maxBuffer:30_000_000});return this.status();}
}
