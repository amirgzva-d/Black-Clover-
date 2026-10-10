import {CORE_PERSIAN_INTENTS} from './PersianIntentCatalog.js';
import {normalizePersianSurface,commandSafetyGuard} from './PersianSurface.js';

const asciiNumbers=s=>String(s||'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const simplified=t=>normalizePersianSurface(t,{repairTypos:false}).toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu,' ').replace(/\s+/g,' ').trim();
const prepared=CORE_PERSIAN_INTENTS.map(intent=>({
  ...intent,
  objs:[...new Set(intent.objects.map(simplified))].filter(Boolean),
  verbs:[...new Set(intent.verbs.map(simplified))].filter(Boolean)
}));
const pairWindow=160;
function findPositions(text,phrase){
  const result=[];
  if(!phrase)return result;
  let from=0;
  while(from<text.length){
    const at=text.indexOf(phrase,from);
    if(at<0)break;
    const end=at+phrase.length;
    if((at===0||!/\p{Letter}/u.test(text[at-1]))
      &&(end===text.length||!/\p{Letter}/u.test(text[end])))result.push(at);
    from=at+phrase.length;
  }
  return result;
}
function scoreIntent(t,spec){
  let object=null,verb=null,dist=Infinity;
  for(const obj of spec.objs){
    const points=findPositions(t,obj);if(!points.length)continue;
    for(const v of spec.verbs){
      const verbs=findPositions(t,v);if(!verbs.length)continue;
      for(const a of points)for(const b of verbs){
        if(a<b+v.length&&b<a+obj.length)continue;
        const span=Math.max(a+obj.length,b+v.length)-Math.min(a,b);
        if(span>pairWindow)continue;
        const distance=Math.abs(a-b);
        if(distance<dist||(distance===dist&&obj.length+v.length>(object?.length||0)+(verb?.length||0))){
          object=obj;verb=v;dist=distance;
        }
      }
    }
  }
  if(!object||!verb)return null;
  let score=object.length*1.5+verb.length*3+Math.min(10,35/(dist+1));
  // "صدای سیستم رو خاموش کن" means mute, not shut down the PC.
  if(spec.mode==='power'&&/(?:صدا|صدای|ولوم|اسپیکر)/.test(t))score-=22;
  // A polite suffix 'برای سیستم من' is not the troubleshooting target
  // if the explicit object is a file/folder and no failure is described.
  if(spec.id==='system.troubleshoot'&&/(?:پوشه|فولدر|فایل)/.test(t)&&!/(?:مشکل|ارور|خطا|خراب|عیب)/.test(t))score-=30;
  return {spec,object,verb,score};
}
export function understandPersianIntent(raw,{allowFuzzy=true}={}){
  const original=String(raw??'').trim(),safety=commandSafetyGuard(original);
  const corrected=normalizePersianSurface(original,{repairTypos:allowFuzzy});
  const t=simplified(corrected);
  if(!t)return {original,corrected,intent:null,confidence:0,guard:safety,needsClarification:false};
  const scores=prepared.map(s=>scoreIntent(t,s)).filter(Boolean).sort((a,b)=>b.score-a.score);
  const best=scores[0];
  if(!best)return {original,corrected,intent:null,confidence:0,guard:safety,needsClarification:false};
  // Competing intents in the same domain are not executed without an
  // unambiguous command. Differing domains in one utterance are multi-step.
  const competitors=scores.filter(x=>x!==best&&x.spec.id!==best.spec.id);
  const conflicting=competitors.some(x=>Math.abs(x.score-best.score)<5.2&&(x.spec.mode===best.spec.mode));
  const multiDomain=competitors.some(x=>x.spec.mode!==best.spec.mode&&
    /(?:\sو\sبعد|\sسپس|\sبعدش|؛|;)/i.test(original));
  const confidence=conflicting?0.51:0.94;
  return {
    original,corrected,
    intent:best.spec.id,mode:best.spec.mode,tool:best.spec.tool,
    canonical:best.spec.canonical,
    matched:{object:best.object,verb:best.verb},
    confidence,guard:safety,
    direct:confidence>=0.9&&safety.allowDirect&&best.spec.direct&&!multiDomain,
    risk:best.spec.risk,
    requiresTarget:best.spec.requiresTarget,
    needsClarification:conflicting,
    multiStep:multiDomain,
    candidateIntents:conflicting?scores.slice(0,3).map(x=>x.spec.id):[]
  };
}
export function enrichedCommandText(text){
  const understood=understandPersianIntent(text);
  return understood.corrected||String(text||'');
}
export function semanticIntentRouteHint(text){
  const hit=understandPersianIntent(text);
  if(!hit.intent||hit.needsClarification)return null;
  return {intent:hit.intent,mode:hit.mode,tool:hit.tool,confidence:hit.confidence,
    canonical:hit.canonical,requiresTarget:hit.requiresTarget,
    execution:hit.direct?'eligible-for-confirmed-fast-path':'planner-or-clarification'};
}
export const PERSIAN_INTENT_COUNT=CORE_PERSIAN_INTENTS.length;
