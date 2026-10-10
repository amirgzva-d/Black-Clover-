import {ACTION_BOOK} from './ActionBook.js';
import {EXTENDED_ACTION_BOOK} from './ActionBookExtended.js';
import {EXTENDED_ACTION_BOOK_2} from './ActionBookExtended2.js';
import {CORE_PERSIAN_INTENTS} from './PersianIntentCatalog.js';

// An example is a training/QA variant, not a new hard-coded execution rule.
// Preserving the action id lets tests compare variants against one stable intent.
export const UTTERANCES_PER_ACTION=1000;
const PREFIXES=[
  '','ماریا ','ماریا، ','ماریا جان ','لطفاً ','لطفا ','خواهش می‌کنم ','خواهشا ',
  'حالا ','خب ','الان ','همین الان ','یه لحظه ','زحمت میشه ','اگه زحمتی نیست ',
  'برام ','یه لطفی کن ','هرجوری راحتی ','ماریا لطفاً ','لطفا ماریا ',
  'می‌شه ','میشه ','می‌تونی ','میتونی ','ماریا میشه ','سریع ',
  'راستی ','برای من ','وقت داری ','اگه میشه ','ممکنه ','فوری '
];
const SUFFIXES=[
  '',' لطفا',' لطفاً',' برام',' واسه من',' الان',' همین الان',' سریع',' یه لحظه',
  ' وقتی میتونی',' ممنون',' مرسی',' ممنونت میشم',' اگه میشه',' امکانش هست',
  ' لطف میکنی',' ماریا',' خیلی خوب میشه',' بدون معطلی',' برای من',
  ' تو همین کار',' برام انجام بده',' اگه ممکنه',' همینو میخوام',
  ' به همین روش',' برای سیستم من',' حالا',' لطفا انجامش بده',
  ' در همین لحظه',' با دقت'
];
const VARIANTS=[
  ['صدا','صوذا'],['روشنایی','روسنایی'],['گوگل','کوکل'],['تلگرام','تلخرام'],
  ['حذف','حزف'],['اکسل','اکسِل'],['یادآور','یاداور'],
  ['یوتیوب','یوتوب'],['واتساپ','واتصاپ'],['برنامه','برنامع'],['پوشه','پوشع']
];
const clean=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
function seedsFor(action){
  if(action.kind==='core'){
    const row=action.source,seeds=[row.canonical];
    for(const obj of row.objects)for(const verb of row.verbs){
      seeds.push(`${obj} رو ${verb}`,`${obj} را ${verb}`,`${verb} ${obj}`);
    }
    return [...new Set(seeds.map(clean).filter(Boolean))];
  }
  return [...new Set([...(action.source.triggers||[]),action.source.intent,action.source.title]
    .map(clean).filter(x=>x.length>=5&&/[\p{Letter}]/u.test(x)))];
}
export function allPersianCorpusActions(){
  return [
    ...CORE_PERSIAN_INTENTS.map(x=>({id:'intent:'+x.id,kind:'core',source:x})),
    ...ACTION_BOOK.map(x=>({id:'recipe:'+x.id,kind:'recipe',source:x})),
    ...EXTENDED_ACTION_BOOK.map(x=>({id:'recipe:'+x.id,kind:'recipe',source:x})),
    ...EXTENDED_ACTION_BOOK_2.map(x=>({id:'recipe:'+x.id,kind:'recipe',source:x}))
  ];
}
export function* generateActionVariants(action,count=UTTERANCES_PER_ACTION,{exclude=null}={}){
  const seeds=seedsFor(action);
  if(!seeds.length)throw Error('Action without lexical seed: '+action.id);
  if(!Number.isInteger(count)||count<1||count>10000)throw Error('Invalid count');
  const unique=new Set();
  const total=seeds.length*PREFIXES.length*SUFFIXES.length;
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  let stride=Math.floor(total*0.618034)|1;
  while(gcd(stride,total)!==1)stride+=2;
  let hash=0;
  for(const ch of action.id)hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
  const start=hash%total;
  // Deterministic coprime permutation of the full cartesian product:
  // 1000 examples include different verbs, nouns, politeness and clitics;
  // they are NOT only 1000 copies of one seed with changing suffixes.
  for(let index=0;index<total;index++){
    const permutation=(start+index*stride)%total;
    const seedIndex=permutation%seeds.length;
    const prefixIndex=Math.floor(permutation/seeds.length)%PREFIXES.length;
    const suffixIndex=Math.floor(permutation/(seeds.length*PREFIXES.length));
    let surface=seeds[seedIndex];
    if((prefixIndex+suffixIndex)%11===5){
      const pair=VARIANTS.find(([before])=>surface.includes(before));
      if(pair)surface=surface.replace(pair[0],pair[1]);
    }
    const sentence=clean(PREFIXES[prefixIndex]+surface+SUFFIXES[suffixIndex]);
    if(!sentence||unique.has(sentence)||exclude?.has(sentence))continue;
    unique.add(sentence);
    exclude?.add(sentence);
    yield sentence;
    if(unique.size===count)return;
  }
  if(unique.size<count)throw Error('Not enough meaningful combinations for '+action.id+': '+unique.size);
}
export function summarizeCorpus(){
  const actions=allPersianCorpusActions();
  const ids=new Set(actions.map(x=>x.id));
  if(ids.size!==actions.length)throw Error('Duplicate action IDs in MARIA corpus');
  return {
    actionCount:actions.length,coreIntentCount:CORE_PERSIAN_INTENTS.length,
    recipeCount:actions.length-CORE_PERSIAN_INTENTS.length,
    examplesPerAction:UTTERANCES_PER_ACTION,
    totalExamples:actions.length*UTTERANCES_PER_ACTION,
    generator:'deterministic-morphology-phrasing-v1',
    isSynthetic:true
  };
}
