import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const source='C:\\Users\\cibesabz\\Black-Clover-Live';
const target='C:\\Users\\cibesabz\\maria-windows-sync-20261011';
const preview='C:\\Users\\cibesabz\\maria-phase13-merge-preview';
if(fs.existsSync(preview))throw Error('Preview exists; refusing overwrite');
fs.mkdirSync(preview,{recursive:true});
const git=(dir,args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',maxBuffer:30*1024*1024});
const split=s=>s.trim()?s.trim().split(/\r?\n/):[];
const normalize=s=>String(s).replace(/\r\n/g,'\n');
const modified=split(git(source,['diff','--name-only'])).filter(x=>/^(src|tests|docs|scripts)\/.+\.(?:js|mjs|cjs|css|json|md)$/.test(x));
const untracked=split(git(source,['ls-files','--others','--exclude-standard'])).filter(x=>
 /^(src|tests|docs)\/.+\.(?:js|mjs|cjs|css|json|md)$/.test(x)
 || /^scripts\/phase(?:[2-9]|1[0-3])-[^/]+\.mjs$/.test(x)
);
const results=[];
for(const rel of modified){
 const ours=normalize(fs.readFileSync(path.join(source,rel),'utf8'));
 const base=normalize(git(source,['show','HEAD:'+rel]));
 let theirs;
 try{theirs=normalize(git(target,['show','HEAD:'+rel]));}
 catch{theirs='';}
 let output=ours,conflicts=0,remoteChanged=base!==theirs;
 if(remoteChanged){
  const dir=path.join(preview,'merge-inputs');
  fs.mkdirSync(dir,{recursive:true});
  const id=rel.replaceAll('/','--');
  const paths=[ours,base,theirs].map((x,i)=>{const p=path.join(dir,id+'.'+i);fs.writeFileSync(p,x);return p;});
  const cmd=spawnSync('git',['merge-file','-p','--diff3',paths[0],paths[1],paths[2]],{cwd:target,encoding:'utf8',maxBuffer:30*1024*1024});
  if(cmd.error)throw cmd.error;
  output=cmd.stdout;
  conflicts=(output.match(/^<<<<<<< /gm)||[]).length;
 }
 const dest=path.join(preview,'merged',rel);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,output);
 results.push({file:rel,type:'tracked',conflicts,remoteChanged,
   oursBytes:ours.length,theirsBytes:theirs.length,mergedBytes:output.length});
}
for(const rel of untracked){
 const ours=normalize(fs.readFileSync(path.join(source,rel),'utf8'));
 const exists=fs.existsSync(path.join(target,rel));
 const theirs=exists?normalize(fs.readFileSync(path.join(target,rel),'utf8')):null;
 const dest=path.join(preview,'merged',rel);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,ours);
 results.push({file:rel,type:exists?'existing-untracked':'new',conflicts:0,
  remoteChanged:exists&&theirs!==ours,oursBytes:ours.length,theirsBytes:theirs?.length||0});
}
const report={createdAt:new Date().toISOString(),source,target,preview,
 tracked:modified.length,untracked:untracked.length,
 conflicts:results.filter(x=>x.conflicts>0).length,
 conflictHunks:results.reduce((n,x)=>n+x.conflicts,0),
 outputCount:results.length,
 results};
fs.writeFileSync(path.join(preview,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({preview,tracked:report.tracked,untracked:report.untracked,
 conflictedFiles:report.conflicts,conflictHunks:report.conflictHunks,
 conflicts:results.filter(x=>x.conflicts).map(x=>({file:x.file,hunks:x.conflicts})),
 existingUntracked:results.filter(x=>x.type==='existing-untracked'&&x.remoteChanged).map(x=>x.file)},null,2));
