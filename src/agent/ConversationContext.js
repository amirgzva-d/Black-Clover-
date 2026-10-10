import { parseWebRequest } from './WebRequest.js';
const norm=value=>String(value||'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim();
const followUp=/(?:همون|همین|اونو|آن را|این رو|اون رو|بیشتر توضیح|ادامه بده|جزئیات بیشتر|در موردش|درباره اش|کمترش|بیشترش|کم(?:ش)? کن|زیاد(?:ش)? کن|قطعش کن|وصلش کن|بازش کن|ببندش|کمی|یه کم|یکم|دوباره|بازم|از نظر|از لحاظ|حالا چی|حالا چطور|پس چی|پس چطور)/i;
const briefQuestion=/^(?:(?:حالا|خب|خوب|پس|اوکی)\s*)?(?:(?:از نظر|از لحاظ)\s+[^؟?]{1,50}(?:چطور|چطوره|چی|کدوم|بهتر|بدتر)?|(?:چرا|چطور|چطوری|چگونه|مثلا|مثلاً|مزایاش|معایبش|مزایا|معایب|قیمتش|سرعتش|دوامش|کیفیتش|کدومش|فرقش|چند|چه جوری|و بعد))(?:[؟?\s].*)?$/i;
const cleanPriorTopic=prior=>norm(prior).replace(/^(?:لطفاً?|خواهشاً|در\s+یک\s+جمله|در\s+چند\s+کلمه|کوتاه|مختصر)\s+/i,'').replace(/\s+(?:رو|را)\s+(?:بگو|توضیح بده|شرح بده|مقایسه کن|بررسی کن)(?:[؟?!.\s].*)?$/i,'').trim();
export function resolveConversationContext(input,history=[]) {
  const original=norm(input),previous=[...history].reverse().find(m=>m.role==='user');
  const result={text:original,private:false,reference:null,ambiguous:false};
  if(!previous||!(followUp.test(original)||briefQuestion.test(original)))return result;
  const prior=norm(previous._resolvedGoal||previous._original||String(previous.content||'').split('\n\n[Host')[0]);
  const currentControl=[/صدا|ولوم|اسپیکر|volume|mute/i,/نور|روشنایی|brightness/i].map(re=>re.test(original));
  const previousControl=[/صدا|ولوم|اسپیکر|volume|mute/i,/نور|روشنایی|brightness/i].map(re=>re.test(prior));
  const adjustment=/(?:کم(?:ش)?|زیاد(?:ش)?|بیشتر(?:ش)?|کمتر(?:ش)?|بالا(?:تر)?|پایین(?:تر)?|قطع|وصل|باز(?:ش)?|ببند(?:ش)?).*?(?:کن|ببر|بیار)|ببر.*(?:بالا|پایین)|بیار.*(?:بالا|پایین)/i.test(original);
  if(adjustment&&!currentControl.some(Boolean)&&previousControl.some(Boolean)){
    if(previousControl.every(Boolean))return {...result,ambiguous:true,reference:prior,private:Boolean(previous._private)};
    // Preserve a previous application/media target. "کمترش کن" after
    // "صدای کروم رو کم کن" must NEVER reduce master system volume.
    const scoped=previousControl[0]?prior.match(/(?:صدای?\s+(?:فقط\s+)?|صدا\s+(?:رو\s+)?(?:فقط\s+)?(?:توی?|در)\s+)(کروم|فیلم|ویدیو|یوتیوب|تلگرام|واتساپ|روبیکا|اسپاتیفای|برنامه|پلیر)/i):null;
    const subject=scoped?.[1]?'صدای '+scoped[1]+' ':(previousControl[0]?'صدا ':'روشنایی ');
    return {...result,text:subject+original,reference:prior,private:Boolean(previous._private)};
  }
  if(currentControl.some(Boolean)||/(?:سرچ|جستجو|تحقیق).*(?:درباره|در مورد)\s+(?!همون|همین|این|اون)/i.test(original))return result;
  const previousWeb=parseWebRequest(prior);
  const topic=previousWeb?.query||cleanPriorTopic(prior)||prior;
  if(/^(?:همونو|همون رو|همین رو|اونو|آن را)(?:\s+رو)?\s*(?:سرچ|جستجو|تحقیق)/i.test(original)){
    return {...result,text:original.replace(/^(?:همونو|همون رو|همین رو|اونو|آن را)(?:\s+رو)?/,topic),reference:prior,private:Boolean(previous._private)};
  }
  const topical=briefQuestion.test(original)||/بیشتر توضیح|ادامه بده|جزئیات|درباره اش|در موردش|مزایا|معایب|قیمت|سرعت|دوام|کیفیت|عملکرد|مصرف|بهتره|از نظر|از لحاظ/i.test(original);
  if(topical&&!previousControl.some(Boolean))return {...result,text:`${topic} — ${original}`,reference:prior,private:Boolean(previous._private)};
  return {...result,reference:prior,private:Boolean(previous._private)};
}
