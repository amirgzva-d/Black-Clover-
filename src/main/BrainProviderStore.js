import { app,safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { BRAIN_PROVIDER_PRESETS } from '../agent/OnlineBrainPool.js';

const execFileAsync=promisify(execFile),FILE='brain-providers.json';
const clean=s=>String(s||'').trim();

export class BrainProviderStore{
  constructor(){this.file=path.join(app.getPath('userData'),FILE);}
  async read(){try{return JSON.parse(await fs.readFile(this.file,'utf8'));}catch{return {version:1,providers:{}};}}
  async write(data){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify(data,null,2),'utf8');}
  encrypt(value){if(!safeStorage.isEncryptionAvailable())throw new Error('Windows secure storage is not available yet.');return safeStorage.encryptString(String(value)).toString('base64');}
  decrypt(value){if(!value)return'';try{return safeStorage.decryptString(Buffer.from(value,'base64'));}catch{return'';}}
  async githubCliToken(){try{const {stdout}=await execFileAsync('gh.exe',['auth','token'],{windowsHide:true,timeout:8000,maxBuffer:200_000});return clean(stdout);}catch{return'';}}
  async githubCliState(){const token=await this.githubCliToken();return {installed:await this.hasGh(),authenticated:Boolean(token)};}
  async hasGh(){try{await execFileAsync('where.exe',['gh.exe'],{windowsHide:true,timeout:5000});return true;}catch{return false;}}
  async startGithubLogin(){if(!await this.hasGh())throw new Error('GitHub CLI نصب نیست.');const child=spawn('cmd.exe',['/k','gh auth login --hostname github.com --web --git-protocol https'],{detached:true,stdio:'ignore',windowsHide:false});child.unref();return {ok:true,started:true};}
  async runtimeConfig(){
    const data=await this.read(),out={};
    for(const [provider,p] of Object.entries(data.providers||{})){if(!BRAIN_PROVIDER_PRESETS[provider]||p?.enabled===false)continue;const apiKey=this.decrypt(p.apiKey);if(!apiKey)continue;out[provider]={apiKey,baseUrl:clean(p.baseUrl)||BRAIN_PROVIDER_PRESETS[provider].baseUrl,model:clean(p.model)||BRAIN_PROVIDER_PRESETS[provider].model};}
    if(!out.github){const token=await this.githubCliToken();if(token){const p=BRAIN_PROVIDER_PRESETS.github;out.github={apiKey:token,baseUrl:p.baseUrl,model:p.model};}}
    return out;
  }
  async publicState(){
    const data=await this.read(),ghToken=await this.githubCliToken(),ghInstalled=await this.hasGh();
    return {secure:safeStorage.isEncryptionAvailable(),githubCli:{installed:ghInstalled,authenticated:Boolean(ghToken)},providers:Object.entries(BRAIN_PROVIDER_PRESETS).map(([provider,p])=>{const saved=data.providers?.[provider]||{},savedKey=this.decrypt(saved.apiKey),viaCli=provider==='github'&&!savedKey&&Boolean(ghToken);return {provider,label:p.label,configured:Boolean(savedKey)||viaCli,source:savedKey?'secure-storage':viaCli?'github-cli':null,enabled:saved.enabled!==false,baseUrl:clean(saved.baseUrl)||p.baseUrl,model:clean(saved.model)||p.model,note:p.note};})};
  }
  async saveProvider({provider,apiKey,baseUrl,model,enabled=true}={}){provider=clean(provider).toLowerCase();const preset=BRAIN_PROVIDER_PRESETS[provider];if(!preset)throw new Error('Unknown brain provider');const data=await this.read(),prev=data.providers?.[provider]||{},next={...prev,enabled:Boolean(enabled),baseUrl:clean(baseUrl)||preset.baseUrl,model:clean(model)||preset.model};if(clean(apiKey))next.apiKey=this.encrypt(clean(apiKey));data.providers={...(data.providers||{}),[provider]:next};await this.write(data);return this.publicState();}
  async removeProvider(provider){provider=clean(provider).toLowerCase();const data=await this.read();if(data.providers?.[provider])delete data.providers[provider];await this.write(data);return this.publicState();}
}
