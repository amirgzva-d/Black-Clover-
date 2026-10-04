import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const dataDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const files=['memory.json','memory.backup.json','skills.json','permissions.json','reminders.json','reminders.backup.json','pinned-notes.json'];
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
const exists=async p=>{try{await fs.access(p);return true;}catch{return false;}};

export class DataVault{
  constructor({directory=dataDir()}={}){this.directory=directory;this.configFile=path.join(directory,'vault-config.json');}
  localBackupDir(){return path.join(this.directory,'backups');}
  async config(){try{return JSON.parse(await fs.readFile(this.configFile,'utf8'));}catch{return {syncDirectory:process.env.BLACK_CLOVER_SYNC_DIR||'',updatedAt:null};}}
  async setSyncDirectory(directory=''){const cfg=await this.config(),value=String(directory||'').trim();if(value){const p=path.resolve(value);await fs.mkdir(p,{recursive:true});cfg.syncDirectory=p;}else cfg.syncDirectory='';cfg.updatedAt=new Date().toISOString();await fs.mkdir(this.directory,{recursive:true});await fs.writeFile(this.configFile,JSON.stringify(cfg,null,2),'utf8');return cfg;}
  async manifest(){const out=[];for(const name of files){const p=path.join(this.directory,name);try{const s=await fs.stat(p);out.push({name,size:s.size,modified:s.mtime.toISOString()});}catch{}}return out;}
  async prune(root,keep=12){let entries=[];try{entries=await fs.readdir(root,{withFileTypes:true});}catch{return 0;}const dirs=entries.filter(x=>x.isDirectory()&&x.name.startsWith('maria-')).map(x=>x.name).sort().reverse();let removed=0;for(const name of dirs.slice(Math.max(1,Number(keep)||12))){await fs.rm(path.join(root,name),{recursive:true,force:true});removed++;}return removed;}
  async backup({destination=null,keep=12}={}){const root=destination?path.resolve(destination):this.localBackupDir(),folder=path.join(root,`maria-${stamp()}`);await fs.mkdir(folder,{recursive:true});const copied=[];for(const name of files){const src=path.join(this.directory,name);if(!await exists(src))continue;const dst=path.join(folder,name);await fs.copyFile(src,dst);copied.push(name);}const meta={version:2,createdAt:new Date().toISOString(),source:this.directory,files:copied};await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(meta,null,2),'utf8');const pruned=await this.prune(root,keep);return {folder,files:copied,pruned};}
  async sync(){const cfg=await this.config();if(!cfg.syncDirectory)return {ok:false,configured:false,message:'No sync folder configured'};const result=await this.backup({destination:cfg.syncDirectory,keep:20});return {ok:true,configured:true,...result};}
  async status(){const cfg=await this.config(),manifest=await this.manifest();return {directory:this.directory,localBackupDirectory:this.localBackupDir(),syncDirectory:cfg.syncDirectory||null,trackedFiles:manifest,totalBytes:manifest.reduce((n,x)=>n+x.size,0)};}
}
export const dataVault=new DataVault();
