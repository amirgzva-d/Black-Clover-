import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const dataRoot=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const runtime=()=>path.join(dataRoot(),'runtime');
const models=()=>path.join(dataRoot(),'models');
const voices=()=>path.join(dataRoot(),'voices');
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:10000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
async function findFile(root,name){try{for(const e of await fs.readdir(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isFile()&&e.name.toLowerCase()===name.toLowerCase())return p;if(e.isDirectory()){const x=await findFile(p,name);if(x)return x;}}}catch{}return null;}
async function run(cmd,args,{timeout=180000,stdin=null}={}){return new Promise((resolve,reject)=>{const child=execFile(cmd,args,{windowsHide:true,timeout,maxBuffer:12_000_000},(err,stdout,stderr)=>err?reject(Object.assign(err,{stdout,stderr})):resolve({stdout,stderr}));if(stdin!=null){child.stdin.write(stdin);child.stdin.end();}});}
export class SpeechService{
  constructor(){this.tempDir=path.join(os.tmpdir(),'black-clover-maria');}
  async paths(){return {ffmpeg:await where('ffmpeg.exe'),python:await where('py.exe'),whisper:await findFile(path.join(runtime(),'whisper'),'whisper-cli.exe'),whisperModel:path.join(models(),'ggml-small.bin'),piperVoice:path.join(voices(),'fa_IR-amir-medium.onnx')};}
  async status(){const p=await this.paths();return {localStt:Boolean(p.ffmpeg&&p.whisper&&await exists(p.whisperModel)),localTts:Boolean(p.python&&await exists(p.piperVoice)),paths:p};}
  async transcribe(bytes,{language='fa'}={}){const p=await this.paths();if(!p.ffmpeg||!p.whisper||!await exists(p.whisperModel))throw new Error('موتور Whisper محلی کامل نصب نشده.');await fs.mkdir(this.tempDir,{recursive:true});const id=crypto.randomUUID(),input=path.join(this.tempDir,`${id}.webm`),wav=path.join(this.tempDir,`${id}.wav`),base=path.join(this.tempDir,`${id}-result`),txt=`${base}.txt`;try{const data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes?.data||bytes||[]);if(data.length<200)throw new Error('صدای ضبط‌شده خالی است.');await fs.writeFile(input,data);await run(p.ffmpeg,['-y','-hide_banner','-loglevel','error','-i',input,'-ac','1','-ar','16000','-c:a','pcm_s16le',wav],{timeout:90000});await run(p.whisper,['-m',p.whisperModel,'-f',wav,'-l',language,'-otxt','-of',base,'-np','-nt','--prompt','گفتگوی فارسی روان، فرمان کامپیوتر، نام برنامه‌ها و واژه‌های فنی'],{timeout:240000});const text=(await fs.readFile(txt,'utf8')).replace(/\s+/g,' ').trim();if(!text)throw new Error('Whisper متنی تشخیص نداد.');return {text,engine:'whisper.cpp',language};}finally{await Promise.all([input,wav,txt].map(f=>fs.rm(f,{force:true}).catch(()=>{})));}}
  async synthesize(text,{rate=1,volume=1}={}){const p=await this.paths();if(!p.python||!await exists(p.piperVoice))throw new Error('Piper یا صدای فارسی محلی نصب نشده.');await fs.mkdir(this.tempDir,{recursive:true});const out=path.join(this.tempDir,`${crypto.randomUUID()}.wav`),clean=String(text??'').replace(/https?:\/\/\S+/gi,' لینک ').replace(/[`*_#>|~]/g,' ').replace(/\s+/g,' ').trim();if(!clean)return null;const lengthScale=Math.max(.72,Math.min(1.45,1/Math.max(.75,Math.min(1.3,Number(rate)||1))));try{await run(p.python,['-m','piper','-m',p.piperVoice,'-f',out,'--length-scale',String(lengthScale),'--volume',String(Math.max(0,Math.min(1,Number(volume)||1))),'--',clean],{timeout:180000});const audio=await fs.readFile(out);return {audio:audio.toString('base64'),mime:'audio/wav',engine:'piper',text:clean};}finally{await fs.rm(out,{force:true}).catch(()=>{});}}
}
