/**
 * UniversalIntentEngine
 *
 * Converts varied Persian/English colloquial requests into a small, typed
 * execution vocabulary. It deliberately does not execute anything. The host
 * Agent still applies PermissionPolicy, runs the selected tool, and verifies
 * postconditions.
 */

const FA_DIGITS='۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS='٠١٢٣٤٥٦٧٨٩';

export function normalizeIntentText(value=''){
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[يى]/g,'ی')
    .replace(/ك/g,'ک')
    .replace(/[ۀة]/g,'ه')
    .replace(/[\u200c\u200d]/g,' ')
    .replace(/[۰-۹]/g,d=>String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g,d=>String(AR_DIGITS.indexOf(d)))
    .replace(/[إأٱ]/g,'ا')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase();
}

const has=(text,re)=>re.test(text);
const clamp=n=>Math.max(0,Math.min(100,Number(n)));
const numberNear=(text,re)=>{
  const m=text.match(new RegExp(re.source+'.{0,28}?(\\d{1,3})\\s*(?:درصد|%)?','i'))
    || text.match(new RegExp('(\\d{1,3})\\s*(?:درصد|%)?.{0,28}?'+re.source,'i'));
  return m ? clamp(Number(m[1])) : null;
};

const words={
  volume:/صدا|ولوم|volume|اسپیکر|بلندگو|سایلنت|میوت|mute|unmute/i,
  brightness:/نور|روشنایی|brightness|مانیتور|نمایشگر/i,
  power:/خاموش|ری.?استارت|راه.?اندازی مجدد|اسلیپ|خواب|قفل|shutdown|restart|sleep|lock/i,
  search:/سرچ|جستجو|جست.?وجو|بگرد|گوگل|google|search|find|پیدا کن/i,
  browser:/کروم|chrome|مرورگر|browser|گوگل|google|یوتیوب|youtube/i,
  files:/فایل|پرونده|پوشه|فولدر|دایرکتوری|دسکتاپ|desktop|zip|فشرده|استخراج|extract|کپی|منتقل|جابه.?جا|تغییر.?نام/i,
  media:/آهنگ|موزیک|موسیقی|فیلم|ویدیو|کلیپ|media|movie|video|پخش/i,
  apps:/برنامه|اپ|نرم.?افزار|application|app|کروم|chrome|فایرفاکس|firefox|اج|edge|تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اکسل|excel|ورد|word|فتوشاپ|photoshop|وی.?اس.?کد|vscode/i,
  research:/تحقیق|بررسی چندمنبعی|منبع|مقاله|مطالعه|خلاصه کن|research|sources|investigate/i,
  desktop:/دسکتاپ|desktop|مرتب|گروه.?بندی|organize/i,
  updates:/آپدیت|به.?روز|به.?روزرسانی|نصب|حذف|uninstall|install|upgrade|update/i,
  diagnostics:/ارور|خطا|مشکل|خراب|عیب.?یابی|بررسی کن چرا|diagnos|debug|repair/i
};

const openVerbs=/باز کن|بازش کن|اجرا کن|راه بنداز|بالا بیار|بیاور|بیار|open|launch|start/i;
const closeVerbs=/ببند|ببندش|بستن|بسته کن|close|quit|exit/i;
const upVerbs=/زیاد|بیشتر|بالا|بلندتر|قوی.?تر|افزایش|ببر بالا|بیار بالا|تا آخر|تا ته|فول|نهایت|maximum|up/i;
const downVerbs=/کم|کمتر|پایین|آروم.?تر|کاهش|ببر پایین|بیار پایین|تا کف|حداقل|minimum|down/i;
const muteOn=/بی.?صدا|سایلنت|میوت|قطع صدا|خفه|(?:صدا|ولوم|اسپیکر).{0,12}(?:ببند|بستن|قطع)|mute(?!d? ?off)/i;
const muteOff=/از بی.?صدا دربیار|از میوت دربیار|وصل صدا|صدا رو وصل|unmute|برگردون صدا/i;

const apps=[
  [/کروم|chrome/i,'Google Chrome'],
  [/فایرفاکس|firefox/i,'Firefox'],
  [/اج\b|edge/i,'Microsoft Edge'],
  [/تلگرام|telegram/i,'Telegram'],
  [/واتساپ|whatsapp/i,'WhatsApp'],
  [/روبیکا|rubika/i,'Rubika'],
  [/اکسل|excel/i,'Excel'],
  [/ورد|word/i,'Word'],
  [/پاورپوینت|powerpoint/i,'PowerPoint'],
  [/فتوشاپ|photoshop/i,'Adobe Photoshop'],
  [/ایلوستریتور|illustrator/i,'Adobe Illustrator'],
  [/وی.?اس.?کد|vscode|vs code/i,'Visual Studio Code'],
  [/اسپاتیفای|spotify/i,'Spotify'],
  [/وی.?ال.?سی|vlc/i,'VLC']
];

function extractApp(text){
  for(const [re,name] of apps) if(re.test(text)) return name;
  const m=text.match(/^(?:لطفا\s*)?(?:برنامه|اپ|نرم.?افزار)?\s*(.{2,80}?)\s*(?:رو|را)?\s*(?:باز کن|اجرا کن|راه بنداز|ببند|ببندش|open|launch|close)$/i);
  return m?.[1]?.trim() || null;
}

function extractQuery(text){
  const patterns=[
    /(?:درباره|برای|راجع به|در مورد)\s+(.+?)(?:\s+(?:رو|را)?\s*(?:سرچ|جستجو|بگرد|پیدا کن)|$)/i,
    /(?:سرچ|جستجو|جست.?وجو|بگرد|google|search)\s+(?:کن\s+)?(.+)/i,
    /(.+?)\s+(?:رو|را)?\s*(?:سرچ|جستجو|جست.?وجو|بگرد)(?:\s+کن)?$/i
  ];
  for(const p of patterns){const m=text.match(p);if(m?.[1]?.trim())return m[1].trim();}
  return null;
}

function extractName(text){
  const m=text.match(/(?:فایل|پرونده|پوشه|فولدر)\s+(.+?)(?:\s+(?:رو|را))?\s*(?:باز کن|پیدا کن|بگرد|نشون بده|دربیار|open|find)?$/i);
  if(m?.[1]?.trim())return m[1].trim();
  const ext=text.match(/([^\s"'،؟]+\.[a-z0-9]{1,8})/i);
  return ext?.[1] || null;
}

function directFor(text){
  if(has(text,words.volume)){
    if(has(text,muteOff))return {name:'set_mute',args:{muted:false},reply:'صدا رو دوباره وصل کردم.'};
    if(has(text,muteOn))return {name:'set_mute',args:{muted:true},reply:'صدا رو بی‌صدا کردم.'};
    const percent=numberNear(text,words.volume);
    if(percent!==null)return {name:'set_volume',args:{percent},reply:`صدا رو روی ${percent}٪ تنظیم کردم.`};
    if(has(text,upVerbs))return {name:'volume_up',args:{},reply:'صدا رو بیشتر کردم.'};
    if(has(text,downVerbs))return {name:'volume_down',args:{},reply:'صدا رو کمتر کردم.'};
  }
  if(has(text,words.brightness)){
    const percent=numberNear(text,words.brightness);
    if(percent!==null)return {name:'set_brightness',args:{percent},reply:`روشنایی رو روی ${percent}٪ تنظیم کردم.`};
    if(has(text,upVerbs))return {name:'brightness_up',args:{},reply:'روشنایی رو بیشتر کردم.'};
    if(has(text,downVerbs))return {name:'brightness_down',args:{},reply:'روشنایی رو کمتر کردم.'};
  }
  if(has(text,words.power)){
    if(/خاموش|shutdown/i.test(text))return {name:'shutdown_pc',args:{},reply:'درخواست خاموش‌کردن سیستم آماده است.'};
    if(/ری.?استارت|راه.?اندازی مجدد|restart/i.test(text))return {name:'restart_pc',args:{},reply:'درخواست ری‌استارت آماده است.'};
    if(/اسلیپ|خواب|sleep/i.test(text))return {name:'sleep_pc',args:{},reply:'سیستم را به حالت خواب می‌برم.'};
    if(/قفل|lock/i.test(text))return {name:'lock_pc',args:{},reply:'سیستم را قفل می‌کنم.'};
  }
  if(has(text,words.search)){
    const query=extractQuery(text);
    if(query && !has(text,words.files))return {name:'web_search',args:{query},reply:'جست‌وجوی واقعی را انجام دادم.'};
  }
  if(has(text,words.apps)){
    const app=extractApp(text);
    if(app && has(text,openVerbs))return {name:'launch_any_app',args:{name:app},reply:`${app} رو باز کردم.`};
    if(app && has(text,closeVerbs))return {name:'close_app',args:{name:app},reply:`${app} رو بستم.`};
  }
  if(has(text,words.files)){
    const name=extractName(text);
    if(name && has(text,openVerbs))return {name:'open_named_file',args:{name},reply:`${name} رو پیدا کردم و باز کردم.`};
    if(name && /پیدا|بگرد|find|search/i.test(text))return {name:'global_find_files',args:{query:name,limit:20,kind:'file'},reply:`برای پیدا کردن ${name} جست‌وجو کردم.`};
  }
  if(has(text,words.desktop) && has(text,/(مرتب|گروه|organize)/i.test(text)))return {name:'organize_desktop',args:{},reply:'دسکتاپ را مرتب می‌کنم.'};
  return null;
}

export function resolveUniversalIntent(input=''){
  const text=normalizeIntentText(input);
  if(!text)return {text,goal:null,confidence:0,hints:[],direct:null,requiresPlanner:true};
  const hints=[];
  for(const [id,re] of Object.entries(words))if(re.test(text))hints.push(id);
  const direct=directFor(text);
  let goal=null;
  if(has(text,words.research))goal='research.topic';
  else if(has(text,words.updates))goal='software.manage';
  else if(has(text,words.diagnostics))goal='diagnostics.run';
  else if(has(text,words.files))goal='files.manage';
  else if(has(text,words.browser)&&has(text,words.search))goal='browser.search';
  else if(has(text,words.apps))goal='apps.manage';
  else if(has(text,words.media))goal='media.control';
  else if(has(text,words.volume))goal='audio.control';
  else if(has(text,words.brightness))goal='display.control';
  else if(has(text,words.power))goal='system.power';
  else if(has(text,words.desktop))goal='desktop.organize';
  else if(has(text,words.search))goal='web.search';
  const confidence=direct?0.98:goal?0.78:0.15;
  return {
    text,
    goal,
    confidence,
    hints:[...new Set(hints)],
    direct,
    requiresPlanner:!direct,
    entities:{
      app:extractApp(text),
      query:extractQuery(text),
      file:extractName(text)
    }
  };
}

/**
 * The matrix is generated compositionally for evaluation. It is deliberately
 * larger than 1000 utterances without storing a thousand brittle rules.
 */
export function generateEvaluationUtterances(){
  const subjects={
    volume:['صدا','ولوم','اسپیکر','بلندگو','volume','صداشو'],
    brightness:['نور','روشنایی','نور صفحه','brightness'],
    search:['سرچ','جستجو','جست و جو','بگرد','google search'],
    files:['فایل','پرونده','فایل متنی','document'],
    apps:['برنامه','اپ','نرم افزار','application']
  };
  const verbs={
    up:['زیاد کن','بیشتر کن','ببر بالا','بلندترش کن','تا آخر زیادش کن','تقویت کن'],
    down:['کم کن','کمتر کن','ببر پایین','آروم ترش کن','کاهش بده','تا کف بیار'],
    open:['باز کن','بازش کن','اجرا کن','راه بنداز','بالا بیار'],
    find:['پیدا کن','بگرد','در بیار','نشون بده','find کن']
  };
  const out=[];
  const prefixes=['','لطفا ','برام ','می‌تونی ','اگه میشه ','خواهشا ','برای من '];
  const suffixes=['',' لطفا',' رو انجام بده',' برام',' الان'];
  for(const subject of Object.keys(subjects)){
    for(const s of subjects[subject]){
      for(const kind of Object.keys(verbs)){
        for(const v of verbs[kind]){
          for(const prefix of prefixes){
            for(const suffix of suffixes){
              const text=`${prefix}${s} ${v}${suffix}`;
              const expected=subject==='volume'?'audio.control':subject==='brightness'?'display.control':subject==='search'?'web.search':subject==='files'?'files.manage':'apps.manage';
              out.push({text,expected});
            }
          }
        }
      }
    }
  }
  return out;
}
