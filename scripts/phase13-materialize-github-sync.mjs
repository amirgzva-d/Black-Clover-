import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const source='C:\\Users\\cibesabz\\Black-Clover-Live';
const integration='C:\\Users\\cibesabz\\maria-windows-sync-20261011';
const preview='C:\\Users\\cibesabz\\maria-phase13-merge-preview';
const report=JSON.parse(fs.readFileSync(path.join(preview,'report.json'),'utf8'));
if(report.target!==integration||report.source!==source)throw Error('Mismatch in merge preview origin');
if(fs.existsSync(path.join(integration,'src','agent','Phase13Installed.flag')))throw Error('Unexpected deployed flag');
const text=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
let overrides=0;const updated=[];
for(const item of report.results){
 const rel=item.file;
 const dest=path.join(integration,rel);
 let result=text(path.join(preview,'merged',rel));
 if(item.conflicts){
  const id=rel.replaceAll('/','--');
  const inputs=[0,1,2].map(i=>path.join(preview,'merge-inputs',id+'.'+i));
  const m=spawnSync('git',['merge-file','-p','--ours',...inputs],
   {cwd:integration,encoding:'utf8',maxBuffer:30*1024*1024});
  if(m.error||m.status!==0)throw Error('Unresolved source conflict in '+rel+' exit '+m.status+' '+String(m.stderr));
  result=m.stdout.replace(/\r\n/g,'\n');
  overrides+=item.conflicts;
 }
 if(/^(<<<<<<< |=======\n|>>>>>>> )/m.test(result))throw Error('Conflict marker in '+rel);
 if(rel==='src/agent/toolRegistry.js'){
  if(!result.includes("import { archiveTools }"))throw Error('GitHub archive tools import lost');
  if(!result.includes('...archiveTools')){
   const anchor='...fileWorkflowTools,...incidentTools';
   if(result.split(anchor).length!==2)throw Error('Cannot safely integrate zip tool');
   result=result.replace(anchor,'...fileWorkflowTools,...archiveTools,...incidentTools');
  }
 }
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,result,'utf8');
 updated.push(rel);
}
function toolbar(s){
 const anchor='<header class="v4-topbar">';
 const i=s.indexOf(anchor),j=s.indexOf('</header>',i);
 if(i<0||j<0)throw Error('Topbar not present');
 return s.slice(i,j+9);
}
if(toolbar(text(path.join(source,'src/renderer/topIslandV4.js')))!==
   toolbar(text(path.join(integration,'src/renderer/topIslandV4.js'))))
 throw Error('Approved Windows Top Island bar diverged during sync');
const originals=[
 'src/agent/PersianIntentEngine.js','src/agent/PersianActionCorpus.js','src/agent/PersianSurface.js',
 'src/agent/archiveTools.js','scripts/generate-persian-1000-corpus.mjs'
];
for(const rel of originals)if(!fs.existsSync(path.join(integration,rel)))
 throw Error('Remote-only Persian feature lost: '+rel);
const filesToScan=updated.filter(x=>/\.(?:js|cjs|mjs|css|md|json)$/.test(x));
const secrets=[
 /sk-proj-[A-Za-z0-9_-]{20,}/,
 /gh[pousr]_[A-Za-z0-9]{30,}/,
 /AIza[A-Za-z0-9_-]{30,}/,
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/
];
for(const rel of filesToScan){
 const s=text(path.join(integration,rel));
 if(secrets.some(r=>r.test(s)))throw Error('Potential secret detected in '+rel);
}
console.log(JSON.stringify({success:true,integrated:updated.length,conflictHunksResolvedUsingWindows:overrides,
 sources:updated.filter(x=>x.startsWith('src/')).length,
 tests:updated.filter(x=>x.startsWith('tests/')).length,
 docs:updated.filter(x=>x.startsWith('docs/')).length,
 scripts:updated.filter(x=>x.startsWith('scripts/')).length,
 remoteOnlyPersianFeaturesPreserved:true,
 approvedTopbarPreserved:true},null,2));
