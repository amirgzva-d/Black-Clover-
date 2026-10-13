import {app} from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR_PATTERN=/^(?:black-clover-desktop-agent|BlackClover(?:LiveDev.*)?|BlackClover-Live)$/i;

export function sharedIdentityRoot(){
  const base=process.platform==='win32'&&process.env.APPDATA?process.env.APPDATA:app.getPath('appData');
  return path.join(base,'MARIA-Shared');
}
function candidateRoots(){
  const root=process.platform==='win32'&&process.env.APPDATA?process.env.APPDATA:app.getPath('appData');
  let names=[];try{names=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()&&APP_DIR_PATTERN.test(x.name)).map(x=>path.join(root,x.name));}catch{}
  return [...new Set(names)];
}
export function migrateBrainProviders(targetFile){
  if(fs.existsSync(targetFile))return targetFile;
  const merged={version:2,providers:{},migratedAt:new Date().toISOString()};
  const files=candidateRoots().map(root=>path.join(root,'brain-providers.json')).filter(f=>fs.existsSync(f)).map(file=>({file,mtime:fs.statSync(file).mtimeMs})).sort((a,b)=>a.mtime-b.mtime);
  for(const {file} of files){
    try{const data=JSON.parse(fs.readFileSync(file,'utf8'));for(const [provider,cfg] of Object.entries(data?.providers||{}))merged.providers[provider]={...(merged.providers[provider]||{}),...cfg};}catch{}
  }
  if(files.length){
    fs.mkdirSync(path.dirname(targetFile),{recursive:true});
    fs.writeFileSync(targetFile,JSON.stringify(merged,null,2),'utf8');
  }
  return targetFile;
}
export function migrateChatGPTStorage(targetDir){
  const targetAuth=path.join(targetDir,'chatgpt-auth.json');
  if(fs.existsSync(targetAuth))return targetDir;
  const candidates=[];
  for(const root of candidateRoots()){
    const dir=path.join(root,'chatgpt'),auth=path.join(dir,'chatgpt-auth.json');
    if(fs.existsSync(auth))candidates.push({dir,mtime:fs.statSync(auth).mtimeMs});
  }
  candidates.sort((a,b)=>b.mtime-a.mtime);
  const newest=candidates[0];if(!newest)return targetDir;
  fs.mkdirSync(targetDir,{recursive:true});
  for(const name of ['chatgpt-auth.json','chatgpt-host.json']){
    const src=path.join(newest.dir,name),dst=path.join(targetDir,name);
    if(fs.existsSync(src))fs.copyFileSync(src,dst);
  }
  return targetDir;
}
