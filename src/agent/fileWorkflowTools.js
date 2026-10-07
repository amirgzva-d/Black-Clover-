import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {resolveResource} from './resourceResolverTools.js';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const schema=(properties,required=[])=>({type:'object',properties,required});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const clean=s=>String(s??'').trim();
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function special(name='desktop'){
  const key=String(name||'desktop').toLowerCase(),map={desktop:'Desktop',documents:'MyDocuments',downloads:'Downloads'};
  if(key==='downloads'){const p=path.join(os.homedir(),'Downloads');if(await exists(p))return p;}
  const token=map[key]||name,quoted=String(token).replaceAll("'","''");
  try{const out=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"[Environment]::GetFolderPath('"+quoted+"')"],{windowsHide:true,timeout:8000});if(out.stdout.trim())return out.stdout.trim();}catch{}
  return path.resolve(String(name||os.homedir()));
}
async function one(query,kind='auto',contextHint=''){
  const items=await resolveResource(query,{limit:12,kind,contextHint});if(!items.length)return {item:null,candidates:[],ambiguous:false};
  const top=items[0],ambiguous=Boolean(items[1]&&Math.abs((top.score||0)-(items[1].score||0))<8&&top.target!==items[1].target);
  return {item:ambiguous?null:top,candidates:items.slice(0,6),ambiguous};
}
async function folderTarget(value,contextHint=''){
  const v=clean(value);if(!v)return special('desktop');
  if(/^(desktop|دسکتاپ)$/i.test(v))return special('desktop');
  if(/^(documents|document|اسناد|داکیومنت)$/i.test(v))return special('documents');
  if(/^(downloads|download|دانلودها|دانلود)$/i.test(v))return special('downloads');
  if(path.isAbsolute(v)&&await exists(v))return v;
  const r=await one(v,'folder',contextHint);return r.item?.target||null;
}
async function uniqueDest(p){if(!await exists(p))return p;const x=path.parse(p);for(let i=2;i<1000;i++){const q=path.join(x.dir,x.name+' ('+i+')'+x.ext);if(!await exists(q))return q;}throw new Error('Could not create a unique destination name');}
function shellOpen(target){const c=spawn('explorer.exe',[target],{detached:true,stdio:'ignore',windowsHide:true});c.unref();}
export const fileWorkflowTools={
  resolve_named_resource:tool('read','Find the best file or folder for a human/partial name anywhere on this Windows PC.',schema({name:{type:'string'},kind:{type:'string',enum:['auto','file','folder']},context_hint:{type:'string'}},['name']),async({name,kind='auto',context_hint=''})=>{const r=await one(name,kind,context_hint);return result('resolve_named_resource',Boolean(r.item),r.item?'پیدا شد: '+r.item.target:r.ambiguous?'چند مورد خیلی شبیه پیدا شد':'موردی پیدا نشد',{resolved:r.item,candidates:r.candidates,ambiguous:r.ambiguous});}),
  create_named_folder:tool('low','Create a folder by name in Desktop, Documents, Downloads or another resolved parent. Defaults to the real Windows Desktop.',schema({name:{type:'string'},parent:{type:'string'}},['name']),async({name,parent='desktop'})=>{const dir=await folderTarget(parent);if(!dir)return result('create_named_folder',false,'پوشه مقصد پیدا نشد',{parent});const dst=path.join(dir,path.basename(clean(name)));await fs.mkdir(dst,{recursive:false});return result('create_named_folder',true,'پوشه ساخته شد: '+dst,{path:dst,parent:dir});}),
  copy_named_resource:tool('sensitive','Copy a named file/folder found anywhere on this PC into a named destination folder. Resolve both names before copying.',schema({source:{type:'string'},destination_folder:{type:'string'},context_hint:{type:'string'}},['source','destination_folder']),async({source,destination_folder,context_hint=''})=>{const s=await one(source,'auto',context_hint),dir=await folderTarget(destination_folder,context_hint);if(!s.item)return result('copy_named_resource',false,s.ambiguous?'نام مبدا مبهم است':'مبدا پیدا نشد',{candidates:s.candidates});if(!dir)return result('copy_named_resource',false,'پوشه مقصد پیدا نشد',{destination_folder});const dst=await uniqueDest(path.join(dir,path.basename(s.item.target)));await fs.cp(s.item.target,dst,{recursive:true,errorOnExist:true});return result('copy_named_resource',true,'کپی شد: '+dst,{from:s.item.target,to:dst});}),
  move_named_resource:tool('sensitive','Cut/move a named file/folder found anywhere on this PC into a named destination folder.',schema({source:{type:'string'},destination_folder:{type:'string'},context_hint:{type:'string'}},['source','destination_folder']),async({source,destination_folder,context_hint=''})=>{const s=await one(source,'auto',context_hint),dir=await folderTarget(destination_folder,context_hint);if(!s.item)return result('move_named_resource',false,s.ambiguous?'نام مبدا مبهم است':'مبدا پیدا نشد',{candidates:s.candidates});if(!dir)return result('move_named_resource',false,'پوشه مقصد پیدا نشد',{destination_folder});const dst=await uniqueDest(path.join(dir,path.basename(s.item.target)));await fs.rename(s.item.target,dst);return result('move_named_resource',true,'منتقل شد: '+dst,{from:s.item.target,to:dst});}),
  rename_named_resource:tool('sensitive','Rename a named file/folder found anywhere on the PC without requiring the user to know its path.',schema({source:{type:'string'},new_name:{type:'string'},context_hint:{type:'string'}},['source','new_name']),async({source,new_name,context_hint=''})=>{const s=await one(source,'auto',context_hint);if(!s.item)return result('rename_named_resource',false,s.ambiguous?'نام مبدا مبهم است':'مبدا پیدا نشد',{candidates:s.candidates});const dst=path.join(path.dirname(s.item.target),path.basename(clean(new_name)));if(await exists(dst))return result('rename_named_resource',false,'نام مقصد از قبل وجود دارد',{destination:dst});await fs.rename(s.item.target,dst);return result('rename_named_resource',true,'نام تغییر کرد: '+dst,{from:s.item.target,to:dst});}),
  open_named_resource:tool('low','Open a file or folder from a human name after resolving the best match anywhere on this PC.',schema({name:{type:'string'},kind:{type:'string',enum:['auto','file','folder']},context_hint:{type:'string'}},['name']),async({name,kind='auto',context_hint=''})=>{const r=await one(name,kind,context_hint);if(!r.item)return result('open_named_resource',false,r.ambiguous?'چند مورد مشابه پیدا شد؛ نام دقیق‌تر لازم است':'فایل یا پوشه پیدا نشد',{candidates:r.candidates});shellOpen(r.item.target);return result('open_named_resource',true,'باز شد: '+r.item.target,{resolved:r.item,candidates:r.candidates});})
};