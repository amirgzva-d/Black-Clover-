import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const rootDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const filePath=()=>path.join(rootDir(),'chats.json');
const now=()=>new Date().toISOString();
const cleanTitle=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,120)||'گفتگوی جدید';
const cleanText=value=>String(value??'').trim();

function defaultState(){return {version:1,folders:[],conversations:[]};}
function normalizeMessage(message={}){
  return {
    id:String(message.id||crypto.randomUUID()),
    role:message.role==='assistant'?'assistant':'user',
    text:cleanText(message.text??message.content),
    at:String(message.at||now()),
    editedAt:message.editedAt?String(message.editedAt):null,
    meta:message.meta&&typeof message.meta==='object'?message.meta:{}
  };
}
function normalizeConversation(item={}){
  return {
    id:String(item.id||crypto.randomUUID()),
    title:cleanTitle(item.title),
    folderId:item.folderId?String(item.folderId):null,
    pinned:Boolean(item.pinned),
    archived:Boolean(item.archived),
    createdAt:String(item.createdAt||now()),
    updatedAt:String(item.updatedAt||item.createdAt||now()),
    messages:Array.isArray(item.messages)?item.messages.map(normalizeMessage).filter(x=>x.text):[]
  };
}
async function load(){
  try{
    const raw=JSON.parse(await fs.readFile(filePath(),'utf8'));
    return {
      version:1,
      folders:Array.isArray(raw?.folders)?raw.folders.map(x=>({id:String(x.id||crypto.randomUUID()),name:cleanTitle(x.name),instructions:String(x.instructions||'').slice(0,5000),createdAt:String(x.createdAt||now())})):[],
      conversations:Array.isArray(raw?.conversations)?raw.conversations.map(normalizeConversation):[]
    };
  }catch{return defaultState();}
}
async function save(state){
  await fs.mkdir(rootDir(),{recursive:true});
  const target=filePath(),tmp=target+'.tmp';
  await fs.writeFile(tmp,JSON.stringify(state,null,2),'utf8');
  await fs.rename(tmp,target);
}
const autoTitle=text=>cleanTitle(cleanText(text).replace(/[\r\n]+/g,' ').slice(0,56));

export class ChatStore{
  async list({query='',folderId,includeArchived=false}={}){
    const state=await load(),q=String(query||'').trim().toLowerCase();
    let rows=state.conversations;
    if(!includeArchived)rows=rows.filter(x=>!x.archived);
    if(folderId!==undefined)rows=rows.filter(x=>(x.folderId||null)===(folderId||null));
    if(q)rows=rows.filter(x=>x.title.toLowerCase().includes(q)||x.messages.some(m=>m.text.toLowerCase().includes(q)));
    return [...rows].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.updatedAt).localeCompare(String(a.updatedAt))).map(x=>({...x,messages:undefined,messageCount:x.messages.length,preview:x.messages.at(-1)?.text?.slice(0,140)||''}));
  }
  async get(id){return (await load()).conversations.find(x=>x.id===String(id||''))||null;}
  async create({title='گفتگوی جدید',folderId=null}={}){
    const state=await load(),stamp=now(),item=normalizeConversation({id:crypto.randomUUID(),title,folderId,createdAt:stamp,updatedAt:stamp,messages:[]});
    state.conversations.push(item);await save(state);return item;
  }
  async update(id,patch={}){
    const state=await load(),i=state.conversations.findIndex(x=>x.id===String(id||''));if(i<0)throw new Error('Conversation not found');
    const current=state.conversations[i],next={...current,updatedAt:now()};
    if(typeof patch.title==='string')next.title=cleanTitle(patch.title);
    if('folderId'in patch)next.folderId=patch.folderId?String(patch.folderId):null;
    if('pinned'in patch)next.pinned=Boolean(patch.pinned);
    if('archived'in patch)next.archived=Boolean(patch.archived);
    state.conversations[i]=next;await save(state);return next;
  }
  async remove(id){const state=await load(),before=state.conversations.length;state.conversations=state.conversations.filter(x=>x.id!==String(id||''));if(state.conversations.length===before)return false;await save(state);return true;}
  async appendMessage(id,message){
    const state=await load(),item=state.conversations.find(x=>x.id===String(id||''));if(!item)throw new Error('Conversation not found');
    const msg=normalizeMessage(message);if(!msg.text)return null;
    item.messages.push(msg);if(item.messages.length===1&&item.title==='گفتگوی جدید')item.title=autoTitle(msg.text);
    item.updatedAt=now();await save(state);return msg;
  }
  async updateMessage(id,messageId,patch={}){
    const state=await load(),item=state.conversations.find(x=>x.id===String(id||''));if(!item)throw new Error('Conversation not found');
    const msg=item.messages.find(x=>x.id===String(messageId||''));if(!msg)throw new Error('Message not found');
    if(typeof patch.text==='string'&&cleanText(patch.text)){msg.text=cleanText(patch.text);msg.editedAt=now();}
    if(patch.meta&&typeof patch.meta==='object')msg.meta={...msg.meta,...patch.meta};
    item.updatedAt=now();await save(state);return msg;
  }
  async removeMessage(id,messageId){
    const state=await load(),item=state.conversations.find(x=>x.id===String(id||''));if(!item)throw new Error('Conversation not found');
    const before=item.messages.length;item.messages=item.messages.filter(x=>x.id!==String(messageId||''));if(item.messages.length===before)return false;
    item.updatedAt=now();await save(state);return true;
  }
  async truncateAfter(id,messageId,{include=false}={}){
    const state=await load(),item=state.conversations.find(x=>x.id===String(id||''));if(!item)throw new Error('Conversation not found');
    const index=item.messages.findIndex(x=>x.id===String(messageId||''));if(index<0)throw new Error('Message not found');
    item.messages=item.messages.slice(0,include?index:index+1);item.updatedAt=now();await save(state);return item;
  }
  async branch(id,messageId){
    const source=await this.get(id);if(!source)throw new Error('Conversation not found');
    const index=messageId?source.messages.findIndex(x=>x.id===String(messageId||'')):source.messages.length-1;
    const keep=index<0?source.messages:source.messages.slice(0,index+1),copy=await this.create({title:source.title+' • شاخه',folderId:source.folderId});
    const state=await load(),target=state.conversations.find(x=>x.id===copy.id);target.messages=keep.map(x=>normalizeMessage({...x,id:crypto.randomUUID()}));target.updatedAt=now();await save(state);return target;
  }
  async folders(){return (await load()).folders.sort((a,b)=>a.name.localeCompare(b.name,'fa'));}
  async createFolder(name){const state=await load(),item={id:crypto.randomUUID(),name:cleanTitle(name),instructions:'',createdAt:now()};state.folders.push(item);await save(state);return item;}
  async updateFolder(id,patch={}){const state=await load(),item=state.folders.find(x=>x.id===String(id||''));if(!item)throw new Error('Project not found');if(typeof patch.name==='string')item.name=cleanTitle(patch.name);if(typeof patch.instructions==='string')item.instructions=patch.instructions.trim().slice(0,5000);await save(state);return item;}
  async renameFolder(id,name){const state=await load(),item=state.folders.find(x=>x.id===String(id||''));if(!item)throw new Error('Folder not found');item.name=cleanTitle(name);await save(state);return item;}
  async removeFolder(id){const state=await load(),key=String(id||''),before=state.folders.length;state.folders=state.folders.filter(x=>x.id!==key);for(const chat of state.conversations)if(chat.folderId===key)chat.folderId=null;if(state.folders.length===before)return false;await save(state);return true;}
  async transcript(id){
    const item=await this.get(id);if(!item)throw new Error('Conversation not found');
    return '# '+item.title+'\n\n'+item.messages.map(m=>`**${m.role==='user'?'شما':'Maria'}**\n\n${m.text}`).join('\n\n---\n\n');
  }
}

export const chats=new ChatStore();
