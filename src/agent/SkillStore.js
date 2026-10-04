import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const dataDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const filePath=()=>path.join(dataDir(),'skills.json');
const now=()=>new Date().toISOString();
const clean=s=>String(s??'').replace(/\s+/g,' ').trim().slice(0,8000);
const words=s=>[...new Set(clean(s).toLowerCase().replace(/[\p{P}\p{S}]+/gu,' ').split(/\s+/).filter(x=>x.length>1))];
const overlap=(a,b)=>{const A=new Set(words(a)),B=words(b);if(!A.size||!B.length)return 0;let hit=0;for(const w of B)if(A.has(w))hit++;return hit/Math.max(1,Math.min(A.size,B.length));};
const defaultState=()=>({version:1,skills:[],knowledge:[],queue:[],meta:{lastIdleLearning:null,curriculumIndex:0}});
const CURRICULUM=[
  'Windows 11 UI Automation accessibility patterns and reliable desktop control',
  'Windows 11 package management with WinGet install update uninstall and repair workflows',
  'Windows CoreAudio endpoint volume and media control best practices',
  'Persian speech recognition and local speech-to-text quality improvement techniques',
  'Persian text-to-speech prosody and offline neural TTS quality improvement techniques',
  'Electron desktop application reliability security IPC and Windows integration best practices',
  'Browser and web-app automation using accessibility trees keyboard navigation and robust selectors',
  'Safe Windows file automation backup move copy rename search and recovery workflows',
  'Local vision-language models for GUI understanding coordinate grounding and screen automation',
  'Coding agent workflows for inspecting testing building and repairing JavaScript Electron projects'
];

export class SkillStore{
  constructor({file=filePath(),maxSkills=500,maxKnowledge=500,maxQueue=120}={}){this.file=file;this.maxSkills=maxSkills;this.maxKnowledge=maxKnowledge;this.maxQueue=maxQueue;this.state=null;this.writeChain=Promise.resolve();}
  async load(){if(this.state)return this.state;try{const raw=await fs.readFile(this.file,'utf8'),parsed=JSON.parse(raw);this.state={...defaultState(),...parsed,meta:{...defaultState().meta,...(parsed.meta||{})}};}catch{this.state=defaultState();}return this.state;}
  async save(){const state=await this.load();this.writeChain=this.writeChain.then(async()=>{await fs.mkdir(path.dirname(this.file),{recursive:true});const tmp=`${this.file}.tmp`;await fs.writeFile(tmp,JSON.stringify(state,null,2),'utf8');await fs.rename(tmp,this.file);});return this.writeChain;}
  async stats(){const s=await this.load();return {skills:s.skills.length,knowledge:s.knowledge.length,pending:s.queue.filter(x=>x.status==='pending').length,lastIdleLearning:s.meta.lastIdleLearning};}
  async recall(query,{limit=5}={}){const s=await this.load(),q=clean(query);const candidates=[
    ...s.skills.map(x=>({...x,_kind:'skill',_score:overlap(`${x.title} ${x.intent} ${(x.triggers||[]).join(' ')}`,q)+(x.successes||0)*.015-(x.failures||0)*.01})),
    ...s.knowledge.map(x=>({...x,_kind:'knowledge',_score:overlap(`${x.title} ${x.query} ${x.summary}`,q)+.03}))
  ].filter(x=>x._score>.08).sort((a,b)=>b._score-a._score).slice(0,Math.max(1,Math.min(Number(limit)||5,10)));
  return candidates;}
  async learnFromTrace(task,trace=[]){const useful=(trace||[]).filter(x=>x?.name&&x.success!==false).slice(0,20);if(!task||useful.length<2)return null;const s=await this.load(),signature=useful.map(x=>x.name).join('>'),existing=s.skills.find(x=>x.signature===signature&&overlap(x.intent,task)>.35);if(existing){existing.uses=(existing.uses||0)+1;existing.successes=(existing.successes||0)+1;existing.updatedAt=now();existing.lastTask=clean(task);await this.save();return existing;}
    const skill={id:crypto.randomUUID(),title:clean(task).slice(0,120),intent:clean(task),triggers:words(task).slice(0,16),signature,plan:useful.map(x=>({tool:x.name,args:x.args||{},note:x.message||''})),uses:1,successes:1,failures:0,createdAt:now(),updatedAt:now(),lastTask:clean(task),source:'observed-success'};s.skills.unshift(skill);s.skills=s.skills.slice(0,this.maxSkills);await this.save();return skill;}
  async recordSkillResult(id,{success=true}={}){const s=await this.load(),x=s.skills.find(v=>v.id===id);if(!x)return false;x.uses=(x.uses||0)+1;if(success)x.successes=(x.successes||0)+1;else x.failures=(x.failures||0)+1;x.updatedAt=now();await this.save();return true;}
  async teach({title,intent,steps=[],triggers=[]}={}){const s=await this.load(),skill={id:crypto.randomUUID(),title:clean(title||intent||'مهارت جدید').slice(0,120),intent:clean(intent||title),triggers:[...new Set([...(triggers||[]),...words(intent||title)])].slice(0,20),signature:`manual:${crypto.randomUUID()}`,plan:(steps||[]).slice(0,30),uses:0,successes:0,failures:0,createdAt:now(),updatedAt:now(),source:'user-taught'};s.skills.unshift(skill);s.skills=s.skills.slice(0,this.maxSkills);await this.save();return skill;}
  async forget(id){const s=await this.load(),before=s.skills.length;s.skills=s.skills.filter(x=>x.id!==id);if(s.skills.length===before)return false;await this.save();return true;}
  async queueImprovement(task,{error='',tool='',privateContext=false}={}){if(privateContext||!clean(task))return null;const s=await this.load(),text=clean(task),dupe=s.queue.find(x=>x.status==='pending'&&overlap(x.task,text)>.72);if(dupe){dupe.count=(dupe.count||1)+1;dupe.lastError=clean(error).slice(0,700);dupe.updatedAt=now();await this.save();return dupe;}const item={id:crypto.randomUUID(),task:text,tool:clean(tool).slice(0,100),lastError:clean(error).slice(0,700),status:'pending',count:1,createdAt:now(),updatedAt:now()};s.queue.unshift(item);s.queue=s.queue.slice(0,this.maxQueue);await this.save();return item;}
  async nextImprovement(){const s=await this.load();return s.queue.find(x=>x.status==='pending')||null;}
  async markImprovement(id,{status='done',noteId=null,error=''}={}){const s=await this.load(),x=s.queue.find(v=>v.id===id);if(!x)return false;x.status=status;x.noteId=noteId||x.noteId||null;x.lastError=clean(error||x.lastError);x.updatedAt=now();await this.save();return true;}
  async saveKnowledge({title,query,summary,sources=[],kind='research'}={}){const s=await this.load(),item={id:crypto.randomUUID(),title:clean(title||query).slice(0,160),query:clean(query),summary:clean(summary),sources:(sources||[]).slice(0,10).map(x=>({title:clean(x.title).slice(0,180),url:clean(x.url).slice(0,1500)})),kind,createdAt:now(),updatedAt:now()};s.knowledge.unshift(item);s.knowledge=s.knowledge.slice(0,this.maxKnowledge);await this.save();return item;}
  async shouldIdleLearn({minIntervalMs=6*60*60*1000}={}){const s=await this.load(),last=s.meta.lastIdleLearning?Date.parse(s.meta.lastIdleLearning):0;return !last||Date.now()-last>=minIntervalMs;}
  async markIdleLearning(){const s=await this.load();s.meta.lastIdleLearning=now();await this.save();}
  async nextCurriculum(){const s=await this.load(),i=Math.abs(Number(s.meta.curriculumIndex)||0)%CURRICULUM.length,topic=CURRICULUM[i];s.meta.curriculumIndex=(i+1)%CURRICULUM.length;await this.save();return topic;}
}

export const skills=new SkillStore();
