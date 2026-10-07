import { matchFastCommand } from './FastCommandRouter.js';
import { resolveConversationContext } from './ConversationContext.js';

const verifyRe=/(?:مطمئن شو|چک کن|بررسی کن|ببین).*?(?:شد|شده|باز|انجام|اجرا)|(?:بگو|خبر بده).*?(?:باز|انجام|اجرا|شد|شده)/i;
const fillerRe=/^(?:بعد|بعدش|سپس|خب|حالا|و|لطفا|لطفاً|برام|برای من|واقعاً|واقعا)+$/i;
const imperative=/(?:کن|ببند|برو|بفرست|بردار|بده|بذار|بیار|ببر|پیدا|ارسال|فوروارد|ادامه|نشون)/i;
const clean=s=>String(s||'').replace(/^\s*(?:و\s+بعد|بعدش|بعد|سپس)\s*/i,'').trim();
function splitCandidates(text){
  // Preserve connectors inside quoted messages and search queries.
  let mask='',end=null;
  for(const c of text){
    if(end){if(c===end)end=null;mask+=' '.repeat(c.length);continue;}
    if(c==='"'||c==='«'||c==='“'){end=c==='«'?'»':c==='“'?'”':'"';mask+=' ';continue;}
    mask+=c;
  }
  const re=/\s+(?:و\s+بعد|بعدش|بعد از اون|بعد از آن|سپس|و)\s+|[؛;،,]/gi;
  const spans=[];let start=0,match;
  while((match=re.exec(mask))){spans.push(text.slice(start,match.index));start=match.index+match[0].length;}
  spans.push(text.slice(start));
  const parts=spans.map(clean).filter(Boolean);
  if(parts.length<2)return parts;
  if(parts.filter(p=>matchFastCommand(p)||imperative.test(p)||verifyRe.test(p)).length<2)return [text.trim()];
  return parts;
}
export function planFastSequence(text){
  const parts=splitCandidates(String(text||'')),steps=[],unknown=[];let previous=null,previousText='';
  for(const part of parts){
    if(previous&&verifyRe.test(part)){steps.push({type:'verify',text:part,command:previous});continue;}
    const resolved=previousText?resolveConversationContext(part,[{role:'user',content:previousText}]):{text:part};
    const cmd=resolved.ambiguous?null:matchFastCommand(resolved.text);
    if(cmd){steps.push({type:'action',text:part,command:cmd});previous=cmd;previousText=resolved.text;continue;}
    if(fillerRe.test(part))continue;
    unknown.push(part);
  }
  return {steps,unknown,complete:steps.length>0&&unknown.length===0,multi:parts.length>1,atomic:parts.length===1};
}
