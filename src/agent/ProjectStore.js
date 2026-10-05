import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const dataRoot=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const storeFile=()=>path.join(dataRoot(),'projects.json');
const defaultProjectsRoot=()=>path.join(os.homedir(),'Documents','BlackClover Projects');
const safeName=value=>String(value||'Project').replace(/[<>:"/\\|?*]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Project';
const slug=value=>safeName(value).replace(/\s+/g,'-').replace(/[^\p{L}\p{N}._-]/gu,'').slice(0,70)||`project-${Date.now()}`;

async function load(){try{const raw=JSON.parse(await fs.readFile(storeFile(),'utf8'));return Array.isArray(raw)?raw:[];}catch{return[];}}
async function save(items){await fs.mkdir(dataRoot(),{recursive:true});const file=storeFile(),tmp=`${file}.tmp`;await fs.writeFile(tmp,JSON.stringify(items,null,2),'utf8');await fs.rename(tmp,file);}

export class ProjectStore{
  async list(){return (await load()).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));}
  async get(id){return (await load()).find(x=>x.id===id)||null;}
  async create({name,type='coding',directory='',provider='ollama',model='auto'}={}){
    const items=await load(),title=safeName(name),root=directory?path.resolve(String(directory)):path.join(defaultProjectsRoot(),slug(title));
    await fs.mkdir(root,{recursive:true});
    const now=new Date().toISOString(),item={id:crypto.randomUUID(),name:title,type:String(type||'coding'),directory:root,provider:String(provider||'ollama'),model:String(model||'auto'),messages:[],createdAt:now,updatedAt:now};
    items.push(item);await save(items);return item;
  }
  async update(id,patch={}){const items=await load(),i=items.findIndex(x=>x.id===id);if(i<0)throw new Error('Project not found');const current=items[i],next={...current,...patch,id:current.id,updatedAt:new Date().toISOString()};if(patch.name)next.name=safeName(patch.name);if(patch.directory)next.directory=path.resolve(String(patch.directory));if(Array.isArray(patch.messages))next.messages=patch.messages.slice(-80);items[i]=next;await save(items);return next;}
  async remove(id){const items=await load(),next=items.filter(x=>x.id!==id);if(next.length===items.length)return false;await save(next);return true;}
  async appendMessage(id,message){const item=await this.get(id);if(!item)throw new Error('Project not found');const messages=[...(item.messages||[]),{role:message.role==='assistant'?'assistant':'user',content:String(message.content||''),at:new Date().toISOString()}].slice(-80);return this.update(id,{messages});}
}

export const projects=new ProjectStore();
