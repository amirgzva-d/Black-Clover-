import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);

const appData=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const runtimeDir=()=>path.join(appData(),'runtime');
const modelDir=()=>path.join(appData(),'models');
const voiceDir=()=>path.join(appData(),'voices');
const where=async exe=>{try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:10000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}};
const run=async(cmd,args,{timeout=900000,cwd}={})=>{const {stdout,stderr}=await execFileAsync(cmd,args,{windowsHide:false,timeout,maxBuffer:20_000_000,cwd,env:process.env});return {stdout:stdout.trim(),stderr:stderr.trim()};};
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function findFile(root,name){try{const entries=await fs.readdir(root,{withFileTypes:true});for(const e of entries){const p=path.join(root,e.name);if(e.isFile()&&e.name.toLowerCase()===name.toLowerCase())return p;if(e.isDirectory()){const x=await findFile(p,name);if(x)return x;}}}catch{}return null;}
async function download(url,dest,onProgress=()=>{}){await fs.mkdir(path.dirname(dest),{recursive:true});const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'BlackCloverMaria/0.5'}});if(!r.ok)throw new Error(`Download HTTP ${r.status}`);const total=Number(r.headers.get('content-length')||0),fh=await fs.open(dest,'w');let done=0;try{for await(const chunk of r.body){const b=Buffer.from(chunk);await fh.write(b);done+=b.length;if(total)onProgress({done,total,percent:Math.round(done/total*100)});}}finally{await fh.close();}return dest;}
async function isAdmin(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command','([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'],{windowsHide:true,timeout:10000});return stdout.trim().toLowerCase()==='true';}catch{return false;}}
async function ollamaModels(){try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(3500)});if(!r.ok)return[];const j=await r.json();return (j.models||[]).map(x=>x.name);}catch{return[];}}
async function latestWhisperAsset(){const r=await fetch('https://api.github.com/repos/ggml-org/whisper.cpp/releases?per_page=10',{headers:{'user-agent':'BlackCloverMaria/0.5'}});if(!r.ok)throw new Error(`GitHub HTTP ${r.status}`);const releases=await r.json();for(const rel of releases){const asset=(rel.assets||[]).find(a=>a.name==='whisper-bin-x64.zip');if(asset)return {url:asset.browser_download_url,tag:rel.tag_name,digest:asset.digest||null};}throw new Error('No official Windows x64 whisper.cpp asset found');}

export class DependencyManager{
  constructor({emit=()=>{}}={}){this.emit=emit;}
  paths(){return {data:appData(),runtime:runtimeDir(),models:modelDir(),voices:voiceDir(),whisperModel:path.join(modelDir(),'ggml-small.bin'),piperVoice:path.join(voiceDir(),'fa_IR-amir-medium.onnx')};}
  async status(){const p=this.paths(),[winget,ollama,ffmpeg,python,git,code,admin,models,whisperExe,piperVoice]=await Promise.all([where('winget.exe'),where('ollama.exe'),where('ffmpeg.exe'),where('py.exe'),where('git.exe'),where('code.cmd'),isAdmin(),ollamaModels(),findFile(path.join(runtimeDir(),'whisper'),'whisper-cli.exe'),exists(path.join(voiceDir(),'fa_IR-amir-medium.onnx'))]);let piper=false;if(python){try{await run(python,['-m','piper','--help'],{timeout:20000});piper=true;}catch{}}
    const whisperModel=await exists(p.whisperModel);return {platform:process.platform,arch:process.arch,admin,items:[
      {id:'ollama',name:'Ollama',required:true,installed:Boolean(ollama),detail:ollama||'موتور مدل محلی'},
      {id:'qwen',name:'Qwen3 4B',required:true,installed:models.some(x=>/^qwen3:4b/i.test(x)),detail:'مغز محلی اصلی ماریا'},
      {id:'ffmpeg',name:'FFmpeg',required:false,installed:Boolean(ffmpeg),detail:'تبدیل صوت برای میکروفن محلی'},
      {id:'whisper_runtime',name:'whisper.cpp',required:false,installed:Boolean(whisperExe),detail:'تشخیص گفتار فارسی کاملاً محلی'},
      {id:'whisper_model',name:'Whisper Small Multilingual',required:false,installed:whisperModel,detail:'مدل چندزبانه حدود 488MB؛ مناسب فارسی و 8GB RAM'},
      {id:'python',name:'Python 3.12',required:false,installed:Boolean(python),detail:'پیش‌نیاز موتور صدای محلی Piper'},
      {id:'piper',name:'Piper TTS',required:false,installed:piper,detail:'موتور صدای عصبی آفلاین'},
      {id:'piper_voice',name:'Persian Piper Voice',required:false,installed:piperVoice,detail:'صدای فارسی آفلاین؛ در نبود صدای زن مناسب Windows به‌عنوان fallback'},
      {id:'git',name:'Git',required:false,installed:Boolean(git),detail:'برای Coding Agent و پروژه‌ها'},
      {id:'vscode',name:'Visual Studio Code',required:false,installed:Boolean(code),detail:'محیط پیشنهادی کدنویسی'}
    ],paths:{...p,whisperExe},recommendedReady:Boolean(ollama)&&models.some(x=>/^qwen3:4b/i.test(x)),localVoiceReady:Boolean(whisperExe&&whisperModel),localTtsReady:Boolean(piper&&piperVoice)};}
  progress(id,message,data={}){this.emit({type:'dependency',id,message,...data});}
  async install(id){if(process.platform!=='win32')throw new Error('Dependency installer currently targets Windows 11');const p=this.paths();this.progress(id,'شروع نصب…');
    if(id==='ollama'){const winget=await where('winget.exe');if(!winget)throw new Error('WinGet در دسترس نیست');await run(winget,['install','-e','--id','Ollama.Ollama','--accept-package-agreements','--accept-source-agreements'],{timeout:1200000});}
    else if(id==='qwen'){const ollama=await where('ollama.exe')||'ollama.exe';await run(ollama,['pull','qwen3:4b'],{timeout:3600000});}
    else if(id==='ffmpeg'){const winget=await where('winget.exe');if(!winget)throw new Error('WinGet در دسترس نیست');await run(winget,['install','-e','--id','Gyan.FFmpeg','--accept-package-agreements','--accept-source-agreements'],{timeout:1200000});}
    else if(id==='python'){const winget=await where('winget.exe');if(!winget)throw new Error('WinGet در دسترس نیست');await run(winget,['install','-e','--id','Python.Python.3.12','--accept-package-agreements','--accept-source-agreements'],{timeout:1200000});}
    else if(id==='piper'){const py=await where('py.exe');if(!py)throw new Error('اول Python را نصب کن');await run(py,['-m','pip','install','--upgrade','piper-tts==1.8.0'],{timeout:1200000});}
    else if(id==='piper_voice'){const py=await where('py.exe');if(!py)throw new Error('Python موجود نیست');await fs.mkdir(voiceDir(),{recursive:true});await run(py,['-m','piper.download_voices','--data-dir',voiceDir(),'fa_IR-amir-medium'],{timeout:1200000});}
    else if(id==='git'){const winget=await where('winget.exe');if(!winget)throw new Error('WinGet در دسترس نیست');await run(winget,['install','-e','--id','Git.Git','--accept-package-agreements','--accept-source-agreements'],{timeout:1200000});}
    else if(id==='vscode'){const winget=await where('winget.exe');if(!winget)throw new Error('WinGet در دسترس نیست');await run(winget,['install','-e','--id','Microsoft.VisualStudioCode','--accept-package-agreements','--accept-source-agreements'],{timeout:1200000});}
    else if(id==='whisper_runtime'){const info=await latestWhisperAsset(),dir=path.join(runtimeDir(),'whisper'),zip=path.join(runtimeDir(),'whisper.zip');await fs.rm(dir,{recursive:true,force:true});await download(info.url,zip,x=>this.progress(id,`دانلود whisper.cpp ${x.percent}%`,x));await fs.mkdir(dir,{recursive:true});await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${zip.replaceAll("'","''")}' -DestinationPath '${dir.replaceAll("'","''")}' -Force`],{timeout:300000});await fs.rm(zip,{force:true});if(!await findFile(dir,'whisper-cli.exe'))throw new Error('whisper-cli.exe در بسته پیدا نشد');}
    else if(id==='whisper_model'){await fs.mkdir(modelDir(),{recursive:true});const tmp=`${p.whisperModel}.part`;await download('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin?download=true',tmp,x=>this.progress(id,`دانلود مدل Whisper ${x.percent}%`,x));await fs.rename(tmp,p.whisperModel);}
    else throw new Error('Unknown dependency');this.progress(id,'نصب کامل شد',{done:true});return this.status();}
}
