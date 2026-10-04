import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const appData=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const runtimeDir=()=>path.join(appData(),'runtime'),modelDir=()=>path.join(appData(),'models'),voiceDir=()=>path.join(appData(),'voices');
const provisionFile=()=>path.join(appData(),'provision-v2.json');
const INSTALL_ORDER=['vc_runtime','ollama','qwen','vision','ffmpeg','whisper_runtime','whisper_model','python','piper','piper_voice','git','vscode'];
const OPTIONAL_IDS=new Set(['vision','git','vscode']);
const COMMON={
  ollama:[path.join(process.env.LOCALAPPDATA||'','Programs','Ollama','ollama.exe'),path.join(process.env.PROGRAMFILES||'','Ollama','ollama.exe')],
  python:[path.join(process.env.LOCALAPPDATA||'','Programs','Python','Python312','python.exe'),path.join(process.env.PROGRAMFILES||'','Python312','python.exe')],
  git:[path.join(process.env.PROGRAMFILES||'','Git','cmd','git.exe')],
  code:[path.join(process.env.LOCALAPPDATA||'','Programs','Microsoft VS Code','bin','code.cmd'),path.join(process.env.PROGRAMFILES||'','Microsoft VS Code','bin','code.cmd')],
  ffmpeg:[path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Links','ffmpeg.exe')]
};
const where=async exe=>{try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:10000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}};
async function exists(p){if(!p)return false;try{await fs.access(p);return true;}catch{return false;}}
async function resolveExe(kind,fallback){const candidates=[...(COMMON[kind]||[])];for(const c of candidates)if(await exists(c))return c;return where(fallback);}
const run=async(cmd,args,{timeout=900000,cwd}={})=>{const {stdout,stderr}=await execFileAsync(cmd,args,{windowsHide:false,timeout,maxBuffer:30_000_000,cwd,env:process.env});return {stdout:stdout.trim(),stderr:stderr.trim()};};
async function findFile(root,name){try{const entries=await fs.readdir(root,{withFileTypes:true});for(const e of entries){const p=path.join(root,e.name);if(e.isFile()&&e.name.toLowerCase()===name.toLowerCase())return p;if(e.isDirectory()){const x=await findFile(p,name);if(x)return x;}}}catch{}return null;}
async function download(url,dest,onProgress=()=>{}){await fs.mkdir(path.dirname(dest),{recursive:true});const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'BlackCloverMaria/0.5'}});if(!r.ok)throw new Error(`Download HTTP ${r.status}`);const total=Number(r.headers.get('content-length')||0),fh=await fs.open(dest,'w');let done=0;try{for await(const chunk of r.body){const b=Buffer.from(chunk);await fh.write(b);done+=b.length;if(total)onProgress({done,total,percent:Math.round(done/total*100)});}}finally{await fh.close();}return dest;}
async function isAdmin(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command','([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'],{windowsHide:true,timeout:10000});return stdout.trim().toLowerCase()==='true';}catch{return false;}}
async function vcRuntimeInstalled(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$p=Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64' -ErrorAction SilentlyContinue; if($p.Installed -eq 1){'true'}else{'false'}"],{windowsHide:true,timeout:10000});return stdout.trim()==='true';}catch{return false;}}
async function ollamaModels(){try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(3500)});if(!r.ok)return[];const j=await r.json();return (j.models||[]).map(x=>x.name);}catch{return[];}}
async function waitForOllama(exe){for(let i=0;i<20;i++){const models=await ollamaModels();if(models.length||i>1){try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(1500)});if(r.ok)return true;}catch{}}if(i===0&&exe){try{const child=spawn(exe,['serve'],{detached:true,stdio:'ignore',windowsHide:true});child.unref();}catch{}}await new Promise(r=>setTimeout(r,1000));}throw new Error('Ollama نصب شد ولی سرویس آن آماده نشد');}
async function latestWhisperAsset(){const r=await fetch('https://api.github.com/repos/ggml-org/whisper.cpp/releases?per_page=10',{headers:{'user-agent':'BlackCloverMaria/0.5'}});if(!r.ok)throw new Error(`GitHub HTTP ${r.status}`);const releases=await r.json();for(const rel of releases){const asset=(rel.assets||[]).find(a=>a.name==='whisper-bin-x64.zip');if(asset)return {url:asset.browser_download_url,tag:rel.tag_name,digest:asset.digest||null};}throw new Error('No official Windows x64 whisper.cpp asset found');}
async function wingetInstall(id){const winget=await where('winget.exe');if(!winget)throw new Error('WinGet در دسترس نیست؛ Windows App Installer را به‌روزرسانی کن');return run(winget,['install','-e','--id',id,'--silent','--disable-interactivity','--accept-package-agreements','--accept-source-agreements'],{timeout:1800000});}
export class DependencyManager{
  constructor({emit=()=>{}}={}){this.emit=emit;this.provisioning=false;}
  paths(){return {data:appData(),runtime:runtimeDir(),models:modelDir(),voices:voiceDir(),whisperModel:path.join(modelDir(),'ggml-small.bin'),piperVoice:path.join(voiceDir(),'fa_IR-amir-medium.onnx')};}
  async status(){const p=this.paths(),[winget,ollama,ffmpeg,python,git,code,admin,models,whisperExe,piperVoice,vcRuntime]=await Promise.all([where('winget.exe'),resolveExe('ollama','ollama.exe'),resolveExe('ffmpeg','ffmpeg.exe'),resolveExe('python','py.exe'),resolveExe('git','git.exe'),resolveExe('code','code.cmd'),isAdmin(),ollamaModels(),findFile(path.join(runtimeDir(),'whisper'),'whisper-cli.exe'),exists(path.join(voiceDir(),'fa_IR-amir-medium.onnx')),vcRuntimeInstalled()]);let piper=false;if(python){try{await run(python.endsWith('py.exe')?python:python,['-m','piper','--help'],{timeout:20000});piper=true;}catch{}}const whisperModel=await exists(p.whisperModel),qwen=models.some(x=>/^qwen3:4b/i.test(x)),vision=models.some(x=>/^qwen3-vl:4b/i.test(x));const items=[
    {id:'vc_runtime',name:'Microsoft Visual C++ Runtime x64',required:true,installed:vcRuntime,detail:'پیش‌نیاز باینری‌های سریع محلی روی Windows'},
    {id:'ollama',name:'Ollama',required:true,installed:Boolean(ollama),detail:ollama||'موتور مدل‌های محلی'},
    {id:'qwen',name:'Qwen3 4B',required:true,installed:qwen,detail:'مغز محلی اصلی ماریا'},
    {id:'vision',name:'Qwen3-VL 4B',required:false,installed:vision,detail:'دید محلی صفحه و رابط کاربری • چند گیگابایت'},
    {id:'ffmpeg',name:'FFmpeg',required:true,installed:Boolean(ffmpeg),detail:'تبدیل صوت برای میکروفن محلی'},
    {id:'whisper_runtime',name:'whisper.cpp',required:true,installed:Boolean(whisperExe),detail:'تشخیص گفتار فارسی کاملاً محلی'},
    {id:'whisper_model',name:'Whisper Small Multilingual',required:true,installed:whisperModel,detail:'مدل چندزبانه مناسب فارسی و 8GB RAM'},
    {id:'python',name:'Python 3.12',required:true,installed:Boolean(python),detail:'پیش‌نیاز موتور صدای محلی Piper'},
    {id:'piper',name:'Piper TTS',required:true,installed:piper,detail:'موتور صدای عصبی آفلاین'},
    {id:'piper_voice',name:'Persian Piper Voice',required:true,installed:piperVoice,detail:'صدای فارسی آفلاین ماریا'},
    {id:'git',name:'Git',required:false,installed:Boolean(git),detail:'برای Coding Agent و پروژه‌ها'},
    {id:'vscode',name:'Visual Studio Code',required:false,installed:Boolean(code),detail:'محیط پیشنهادی کدنویسی'}
  ];return {platform:process.platform,arch:process.arch,admin,winget:Boolean(winget),items,paths:{...p,whisperExe},recommendedReady:items.every(x=>x.installed||OPTIONAL_IDS.has(x.id)),fullReady:items.every(x=>x.installed),visionReady:vision,localVoiceReady:Boolean(whisperExe&&whisperModel),localTtsReady:Boolean(piper&&piperVoice),provisioning:this.provisioning};}
  progress(id,message,data={}){this.emit({type:'dependency',id,message,...data});}
  async needsProvisioning(){try{const j=JSON.parse(await fs.readFile(provisionFile(),'utf8'));if(j?.version===2&&j?.complete)return false;}catch{}return !(await this.status()).fullReady;}
  async markProvisioned(result){await fs.mkdir(appData(),{recursive:true});await fs.writeFile(provisionFile(),JSON.stringify({version:2,complete:Boolean(result?.ok),finishedAt:new Date().toISOString(),result},null,2),'utf8');}
  async installAll({includeOptional=true}={}){if(this.provisioning)return {ok:false,alreadyRunning:true};this.provisioning=true;const results=[];this.emit({type:'provision',state:'start',message:'آماده‌سازی کامل ماریا شروع شد'});try{for(const id of INSTALL_ORDER){if(!includeOptional&&OPTIONAL_IDS.has(id))continue;const before=await this.status(),item=before.items.find(x=>x.id===id);if(item?.installed){results.push({id,ok:true,skipped:true});continue;}try{this.emit({type:'provision',state:'installing',id,message:`در حال آماده‌سازی ${item?.name||id}`});await this.install(id);results.push({id,ok:true});}catch(error){results.push({id,ok:false,error:error.message||String(error)});this.emit({type:'provision',state:'error',id,message:error.message||String(error)});if(!OPTIONAL_IDS.has(id))continue;}}
      const final=await this.status(),ok=includeOptional?final.fullReady:final.recommendedReady,result={ok,results,status:final};await this.markProvisioned(result);this.emit({type:'provision',state:ok?'complete':'partial',message:ok?'آماده‌سازی کامل شد':'بعضی پیش‌نیازها نیاز به تلاش دوباره دارند',result});return result;
    }finally{this.provisioning=false;}}
  async install(id){if(process.platform!=='win32')throw new Error('Dependency installer currently targets Windows 11');const p=this.paths();this.progress(id,'شروع نصب…');
    if(id==='vc_runtime')await wingetInstall('Microsoft.VCRedist.2015+.x64');
    else if(id==='ollama'){await wingetInstall('Ollama.Ollama');const exe=await resolveExe('ollama','ollama.exe');if(!exe)throw new Error('Ollama نصب شد ولی فایل اجرایی پیدا نشد');await waitForOllama(exe);}
    else if(id==='qwen'||id==='vision'){const ollama=await resolveExe('ollama','ollama.exe');if(!ollama)throw new Error('اول Ollama باید آماده شود');await waitForOllama(ollama);const model=id==='qwen'?'qwen3:4b':'qwen3-vl:4b';await run(ollama,['pull',model],{timeout:7200000});}
    else if(id==='ffmpeg')await wingetInstall('Gyan.FFmpeg');
    else if(id==='python')await wingetInstall('Python.Python.3.12');
    else if(id==='piper'){const py=await resolveExe('python','py.exe');if(!py)throw new Error('اول Python باید آماده شود');await run(py,['-m','pip','install','--upgrade','piper-tts==1.8.0'],{timeout:1800000});}
    else if(id==='piper_voice'){const py=await resolveExe('python','py.exe');if(!py)throw new Error('Python موجود نیست');await fs.mkdir(voiceDir(),{recursive:true});await run(py,['-m','piper.download_voices','--data-dir',voiceDir(),'fa_IR-amir-medium'],{timeout:1800000});}
    else if(id==='git')await wingetInstall('Git.Git');
    else if(id==='vscode')await wingetInstall('Microsoft.VisualStudioCode');
    else if(id==='whisper_runtime'){const info=await latestWhisperAsset(),dir=path.join(runtimeDir(),'whisper'),zip=path.join(runtimeDir(),'whisper.zip');await fs.rm(dir,{recursive:true,force:true});await download(info.url,zip,x=>this.progress(id,`دانلود whisper.cpp ${x.percent}%`,x));await fs.mkdir(dir,{recursive:true});await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${zip.replaceAll("'","''")}' -DestinationPath '${dir.replaceAll("'","''")}' -Force`],{timeout:300000});await fs.rm(zip,{force:true});if(!await findFile(dir,'whisper-cli.exe'))throw new Error('whisper-cli.exe در بسته پیدا نشد');}
    else if(id==='whisper_model'){await fs.mkdir(modelDir(),{recursive:true});const tmp=`${p.whisperModel}.part`;await fs.rm(tmp,{force:true});await download('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin?download=true',tmp,x=>this.progress(id,`دانلود مدل Whisper ${x.percent}%`,x));await fs.rename(tmp,p.whisperModel);}
    else throw new Error('Unknown dependency');this.progress(id,'نصب کامل شد',{done:true});return this.status();}
}
export { INSTALL_ORDER };
