import { matchFastCommand } from './FastCommandRouter.js';

const verifyRe=/(?:مطمئن شو|چک کن|بررسی کن|ببین).*?(?:شد|شده|باز|انجام|اجرا)|(?:بگو|خبر بده).*?(?:باز|انجام|اجرا|شد|شده)/i;
const fillerRe=/^(?:بعد|بعدش|سپس|خب|حالا|و|لطفا|لطفاً|برام|برای من|واقعاً|واقعا)+$/i;
const clean=s=>String(s||'').replace(/^\s*(?:و\s+بعد|بعدش|بعد|سپس)\s*/i,'').trim();

function splitCandidates(text){
  const base=String(text||'').split(/\s+(?:و\s+بعد|بعدش|بعد از اون|بعد از آن|سپس)\s+|[؛;]/i).map(clean).filter(Boolean);
  if(base.length>1)return base;
  const comma=String(text||'').split(/[،,]/).map(clean).filter(Boolean);
  if(comma.length>1)return comma;
  const andParts=String(text||'').split(/\s+و\s+/).map(clean).filter(Boolean);
  if(andParts.length>1){
    const hits=andParts.map(matchFastCommand);
    if(hits.filter(Boolean).length>=2)return andParts;
  }
  return [String(text||'').trim()].filter(Boolean);
}

export function planFastSequence(text){
  const parts=splitCandidates(text),steps=[];let previous=null,unknown=[];
  for(const part of parts){
    const cmd=matchFastCommand(part);
    if(cmd){steps.push({type:'action',text:part,command:cmd});previous=cmd;continue;}
    if(previous&&verifyRe.test(part)){steps.push({type:'verify',text:part,command:previous});continue;}
    if(fillerRe.test(part))continue;
    unknown.push(part);
  }
  return {steps,unknown,complete:steps.length>0&&unknown.length===0,multi:steps.length>1};
}
