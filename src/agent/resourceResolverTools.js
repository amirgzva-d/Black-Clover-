import { appDiscoveryTools } from './appDiscoveryTools.js';
import { storageTools } from './storageTools.js';
import { spawn } from 'node:child_process';
import os from 'node:os';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/[^\p{L}\p{N}.]+/gu,' ').replace(/\s+/g,' ').trim();
const fileLike=/\.[a-z0-9]{1,8}$|فایل|پرونده|اکسل|عکس|تصویر|فیلم|ویدیو|آهنگ|موزیک|pdf|docx|xlsx|txt/i;
const folderLike=/پوشه|فولدر|folder|directory/i;
const appLike=/برنامه|اپ|نرم افزار|نرم‌افزار|application/i;
const home=norm(os.homedir());

function pathScore(target='',contextHint=''){
  const p=norm(target),h=norm(contextHint);let score=0;
  if(h&&p.includes(h))score+=55;
  if(home&&p.includes(home))score+=14;
  if(/\\desktop\\|\\documents\\|\\downloads\\|\\projects?\\|\\source\\|\\workspace\\/i.test(String(target)))score+=8;
  if(/\\node_modules\\|\\windows\\winsxs\\|\\program files\\/i.test(String(target)))score-=6;
  return score;
}

async function resolve(query,{limit=12,contextHint='',kind='auto'}={}){
  const q=String(query||'').trim();if(!q)throw new Error('query required');
  const wantApps=kind==='auto'||kind==='app',wantFiles=kind==='auto'||kind==='file',wantFolders=kind==='auto'||kind==='folder';
  const [apps,files,folders]=await Promise.all([
    wantApps?appDiscoveryTools.find_any_app.run({name:q,limit:Math.min(limit,20)}).catch(()=>null):null,
    wantFiles?storageTools.global_find_files.run({query:q,limit:Math.max(Math.min(limit*6,120),30),kind:'file',path_hint:contextHint}).catch(()=>null):null,
    wantFolders?storageTools.global_find_files.run({query:q,limit:Math.max(Math.min(limit*4,80),20),kind:'folder',path_hint:contextHint}).catch(()=>null):null
  ]),items=[];
  for(const a of apps?.data||[])items.push({kind:'app',name:a.name,target:a.target,score:(a.score||0)+(appLike.test(q)?20:0),source:a.source});
  for(const f of files?.data?.items||[])items.push({kind:'file',name:f.name,target:f.path,score:(fileLike.test(q)?90:38)+(norm(f.name).includes(norm(q))?25:0)+pathScore(f.path,contextHint),source:files.data.engine,modified:f.modified,size:f.size});
  for(const f of folders?.data?.items||[])items.push({kind:'folder',name:f.name,target:f.path,score:(folderLike.test(q)?90:34)+(norm(f.name).includes(norm(q))?25:0)+pathScore(f.path,contextHint),source:folders.data.engine,modified:f.modified});
  if(appLike.test(q))for(const x of items)if(x.kind==='app')x.score+=40;
  return items.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(Number(limit)||12,50)));
}
export const resourceResolverTools={
  resolve_resource:tool('read','Resolve an ambiguous human name to installed apps, files or folders across the whole Windows computer. context_hint can be a project/folder such as Desktop, Downloads or Black-Clover-Live.',schema({query:{type:'string'},limit:{type:'number'},kind:{type:'string',enum:['auto','app','file','folder']},context_hint:{type:'string'}},['query']),async({query,limit=12,kind='auto',context_hint=''})=>{const items=await resolve(query,{limit,kind,contextHint:context_hint});const top=items[0];return result('resolve_resource',true,top?'Best match: '+top.kind+' '+top.name:'No matching app/file/folder found',{query,context_hint,items,ambiguous:items.length>1&&Math.abs((items[0]?.score||0)-(items[1]?.score||0))<12});}),
  open_resource:tool('low','Open a named resource after resolving whether it is an installed app, file or folder. context_hint disambiguates duplicate names. Avoid this for destructive actions.',schema({query:{type:'string'},kind:{type:'string',enum:['auto','app','file','folder']},context_hint:{type:'string'}},['query']),async({query,kind='auto',context_hint=''})=>{
    const items=await resolve(query,{limit:20,kind,contextHint:context_hint}),top=items[0];if(!top)return result('open_resource',false,'No matching resource found',{query,kind,context_hint});
    if(kind==='auto'&&items[1]&&Math.abs(top.score-items[1].score)<8&&top.kind!==items[1].kind)return result('open_resource',false,'Resource name is ambiguous; inspect candidates first',{query,candidates:items.slice(0,6),ambiguous:true});
    let out;if(top.kind==='app')out=await appDiscoveryTools.launch_any_app.run({name:top.name});else{const child=spawn(top.kind==='folder'?'explorer.exe':'cmd.exe',top.kind==='folder'?[top.target]:['/c','start','',top.target],{detached:true,stdio:'ignore',windowsHide:true});child.unref();out={success:true,message:'Resolved resource opened directly',data:{path:top.target}};}
    return result('open_resource',out?.success!==false,out?.success===false?'Resolved resource could not be opened':'Resolved resource opened',{resolved:top,delegate:out});
  })
};
export { resolve as resolveResource };
