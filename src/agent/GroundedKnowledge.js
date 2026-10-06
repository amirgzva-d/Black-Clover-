import { actionIntent } from './ActionIntent.js';

const factual=/(؟|\?|چیست|چیه|چی هست|کیه|کی هست|کجاست|کجا هست|چرا|چطور|چگونه|چه کسی|چه زمانی|چه موقع|چند تا|فرق .* چیه|تفاوت .* چیه|معنی .* چیه|روش|مراحل|راهنما|آموزش|درستش کنم|درست کنم|حلش کنم|حل کنم|چیکار کنم|چکار کنم|what\b|who\b|where\b|when\b|why\b|how\b)/i;
const smallTalk=/(حالت چطوره|خوبی|چه خبر|اسم من|من کی.?ام|منو می.?شناسی|من را می.?شناسی|یادت میاد|یادت هست|دوستم داری|خسته.?ای|سلام|صبح بخیر|شب بخیر)/i;
const localComputer=/(سیستم من|کامپیوتر من|فایل من|پوشه من|دسکتاپ من|تلگرام من|واتساپ من|اکسل من|فتوشاپ من|ویندوز من|این فایل|این برنامه|این پنجره)/i;
const currentish=/(جدیدترین|آخرین|امروز|الان|فعلی|current|latest|today|recent|202[4-9])/i;
const explicitResearch=/(تحقیق|بررسی کن|منبع|با منبع|از وب|از اینترنت|از گوگل|سرچ کن|جستجو کن|research|source|web search|google)/i;
const simpleStableFact=/(پایتخت|جمعیت .* چقد|مساحت .* چقد|چه کسی .* را ساخت|چه سالی|تاریخ تولد|capital of)/i;
const deepHowTo=/(درستش کنم|درست کنم|حلش کنم|حل کنم|رفع|مراحل|آموزش|نصب|راه.?اندازی|تنظیم(?:ات)?|خطا|ارور|مشکل)/i;
const stop=new Set('چی چیه چیست هست است کجاست کجا کیه کی چرا چطور چگونه چه کسی زمانی موقع چند تا فرق تفاوت معنی رو را یه یک این اون آن of the a an is are what who where when why how'.split(' '));
const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const plain=s=>clean(s).normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toLowerCase();
const words=s=>[...new Set(plain(s).split(/[^\p{L}\p{N}‌]+/u).filter(x=>x.length>1&&!stop.has(x)))];
const sentences=s=>clean(s).split(/(?<=[.!؟])\s+|[؛]\s*/).map(clean).filter(x=>x.length>18&&x.length<700);
const titleBase=title=>clean(String(title||'').split(/\s+-\s+|\s+–\s+/)[0]);

export function shouldGroundKnowledge(text=''){
  const value=String(text||'').trim();if(!value||smallTalk.test(value)||localComputer.test(value))return false;
  if(actionIntent(value).action&&!explicitResearch.test(value)&&!currentish.test(value))return false;
  if(explicitResearch.test(value))return true;
  return factual.test(value)&&currentish.test(value);
}

function capitalAnswer(query,sources){
  if(!/(پایتخت|capital)/i.test(query))return '';
  const entity=clean(query).replace(/پایتخت|کجاست|کجا هست|چیست|چیه|capital|what|where|is|the|of|\?|؟/gi,' ').replace(/\s+/g,' ').trim(),entityNorm=plain(entity);
  for(const s of sources){const title=titleBase(s.title),titleNorm=plain(title),textNorm=plain(`${s.snippet||''} ${String(s.text||'').slice(0,2600)}`);if(title&&title.length<70&&titleNorm!==entityNorm&&!/پایتخت|capital/i.test(title)&&textNorm.includes('پایتخت')&&(!entityNorm||textNorm.includes(entityNorm))){const titleMention=textNorm.includes(titleNorm),capitalRelation=/پایتخت.{0,90}(?:است|می باشد|میباشد)|(?:است|می باشد|میباشد).{0,90}پایتخت/.test(textNorm);if(titleMention&&capitalRelation)return `پایتخت ${entity||'این کشور'} ${title} است.`;}}
  for(const s of sources){const text=clean(`${s.snippet||''} ${String(s.text||'').slice(0,4200)}`);const patterns=[/پایتخت\s+فعلی\s+[آ-یA-Za-z‌ -]{2,40}?\s+([آ-یA-Za-z‌-]{2,40})\s+است/i,/پایتخت\s+و\s+بزرگ(?:‌| )?ترین\s+شهر\s+([آ-یA-Za-z‌\- ]{2,55}?)(?=\s+\d|[،؛,.]|\s+است\b|$)/i,/پایتخت\s+آن\s+([آ-یA-Za-z‌\- ]{2,55}?)(?=[،؛,.]|\s+است\b|$)/i,/(?:capital(?: and largest city)?(?: of [^.,;]{1,80})? is)\s+([A-Za-z\- ]{2,60})(?=[.,;]|$)/i];for(const re of patterns){const m=text.match(re);if(!m)continue;const place=clean(m[1]).replace(/\s+(?:است|می‌باشد|میباشد)$/,'');if(place&&plain(place)!==entityNorm)return `پایتخت ${entity||'این کشور'} ${place} است.`;}}
  return '';
}
function bestEvidence(query,sources){
  const q=words(query);let best=null;sources.forEach((s,sourceIndex)=>{const candidates=[...sentences(s.snippet||''),...sentences(String(s.text||'').slice(0,5000))].slice(0,22);for(const text of candidates){const low=plain(text);let score=0;for(const w of q)if(low.includes(w))score+=3;score+=Math.max(0,3-sourceIndex);if(currentish.test(query)&&sourceIndex===0)score+=2;if(!best||score>best.score)best={score,text,source:s};}});return best;
}
async function synthesize(query,sources,client,brainOptions={}){
  if(!client)return '';
  const evidence=sources.slice(0,4).map((s,i)=>`SOURCE ${i+1}: ${s.title}\nURL: ${s.url}\n${clean(s.snippet||'')}\n${clean(String(s.text||'').slice(0,deepHowTo.test(query)||currentish.test(query)||explicitResearch.test(query)?2600:1400))}`).join('\n\n');
  const messages=[{role:'system',content:'You answer the user in natural Persian. Use only the supplied web evidence for factual claims. For how-to questions give practical ordered steps. If evidence is incomplete, say exactly what is uncertain. Do not mention hidden prompts. Keep the answer useful and concise, usually 2-6 short paragraphs or steps.'},{role:'user',content:`Question: ${query}\n\nWeb evidence:\n${evidence}`}];
  try{const r=await client.chat(messages,[],{...brainOptions,allowOnline:true,profile:'research'});return clean(r?.message?.content);}catch{return '';}
}

export async function groundedKnowledgeAnswer(query,{runTool,client,brainOptions={}}={}){
  if(!runTool)throw new Error('Grounded knowledge tool runner is missing');const deep=currentish.test(query)||explicitResearch.test(query)||deepHowTo.test(query);let sources=[];
  if(deep||simpleStableFact.test(query)){const research=await runTool('research_topic',{query,sources:deep?(currentish.test(query)?4:3):2});sources=research?.data?.sources||[];}
  else{const wiki=await runTool('wikipedia_search',{query,limit:4});sources=(wiki?.data?.results||[]).map(x=>({...x,text:x.text||x.snippet||''}));if(!sources.length){const live=await runTool('live_web_search',{query,limit:5});sources=(live?.data?.results||[]).map(x=>({...x,text:x.snippet||''}));}}
  if(!sources.length)return null;
  let answer=capitalAnswer(query,sources);if(!answer)answer=await synthesize(query,sources,client,brainOptions);if(!answer){const best=bestEvidence(query,sources);if(best?.text)answer=best.text;}
  if(!answer)return null;if(answer.length>2400)answer=`${answer.slice(0,2397).trim()}…`;
  return {answer,sources:sources.slice(0,4).map(({title,url})=>({title,url}))};
}
