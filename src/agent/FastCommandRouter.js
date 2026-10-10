import { canonicalizeCommand } from './SemanticCanonicalizer.js';
import { parseWebRequest } from './WebRequest.js';
const normalize=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[؟?!.،,]+/g,' ').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
const digits=s=>String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const n=s=>Number(digits(String(s)).replace(/[^0-9]/g,''));
const clamp=x=>Math.max(0,Math.min(100,Number(x)));

const appAliases=[
  [/\bchrome\b|کروم/i,'Google Chrome'],[/firefox|فایرفاکس/i,'Firefox'],[/edge|اج\b|مایکروسافت اج/i,'Microsoft Edge'],[/telegram|تلگرام/i,'Telegram'],[/whatsapp|واتساپ/i,'WhatsApp'],[/rubika|روبیکا/i,'Rubika'],[/instagram|اینستاگرام/i,'Instagram'],[/discord|دیسکورد/i,'Discord'],[/vscode|vs code|وی.?اس.?کد/i,'Visual Studio Code'],[/photoshop|فتوشاپ/i,'Adobe Photoshop'],[/illustrator|ایلوستریتور/i,'Adobe Illustrator'],[/excel|اکسل/i,'Excel'],[/word|ورد/i,'Word'],[/powerpoint|پاورپوینت/i,'PowerPoint'],[/spotify|اسپاتیفای/i,'Spotify'],[/vlc/i,'vlc'],[/notepad|نوت.?پد/i,'Notepad'],[/calculator|ماشین.?حساب/i,'Calculator'],[/explorer|فایل اکسپلورر|اکسپلورر/i,'File Explorer']
];
const has=(s,re)=>re.test(s);
const audio=/صدا|ولوم|volume|اسپیکر|speaker|mute|unmute|سایلنت|بی.?صدا/i;
const bright=/نور|روشنایی|brightness/i;
const increase=/زیاد|بیشتر|بالا|ببر بالا|بیار بالا|بکش بالا|بده بالا|بکن بالا|بالاتر|بلندتر|تقویت|قوی.?تر|افزایش/i;
const decrease=/کم|کمتر|پایین|بیار پایین|ببر پایین|بکش پایین|بده پایین|بکن پایین|پایین.?تر|آروم.?تر|آرام.?تر|کاهش/i;
const maximum=/تا آخر|تا ته|تهش|ته ته|آخرش|انتهاش|انتها|تا نهایت|نهایت|تا سقف|سقف|آخرین حد|آخرین درجه|بیشترین|max|maximum|صد درصد|100 درصد|روی 100|روی ۱۰۰|صدش کن|فول|کامل بالا/i;
const minimum=/صفر|(?:^|\D)0\s*(?:درصد|%|$)|روی\s*0(?:\D|$)|روی صفر|کامل قطع|ته پایین|تا کف|کف|کمترین|کامل پایین|حداقل|\bmin\b|\bminimum\b/i;
const launchVerb=/(?:باز کن|بازش کن|اجرا کن|اجراش کن|راه بنداز|راهش بنداز|بالا بیار|بیارش بالا|بنداز بالا|بیار بالا|بیاورش|بیارش|بزن بالا)/i;
const factualQuestion=/(چیست|چیه|چی هست|کیه|کی هست|کجاست|کجا هست|چرا|چطور|چگونه|چه کسی|چه زمانی|چه موقع|چند تا|فرق .* چیه|تفاوت .* چیه|معنی .* چیه|what\b|who\b|where\b|when\b|why\b|how\b)/i;
const simpleStableFact=/(پایتخت|capital of|چه سالی|تاریخ تولد)/i;
const personalSmallTalk=/(حالت چطوره|خوبی|چه خبر|اسم من|من کی.?ام|منو می.?شناسی|من را می.?شناسی|یادت میاد|یادت هست|دوستم داری|خسته.?ای|سلام|صبح بخیر|شب بخیر)/i;
const computerProblem=/(سیستم|ویندوز|برنامه|فایل|پوشه|صدا|نور|کروم|تلگرام|واتساپ|روبیکا|اکسل|فتوشاپ|ایلوستریتور|نصب|حذف|آپدیت|ارور|خطا|مشکل|کند)/i;

function extractPercent(s,keywordRe){
  const t=digits(s),m=t.match(new RegExp(`(?:${keywordRe.source}).{0,30}?(\\d{1,3})\\s*(?:درصد|%|$)`,'i'))||t.match(new RegExp(`(\\d{1,3})\\s*(?:درصد|%)?.{0,20}(?:${keywordRe.source})`,'i'));
  return m?clamp(n(m[1])):null;
}
function genericAppName(s){
  if(/فایل|پوشه|فولدر|سایت|لینک|تنظیمات/i.test(s))return null;
  let m=s.match(/^(?:لطفا\s*)?(.+?)\s*(?:رو|را)?\s*(?:باز کن|بازش کن|اجرا کن|اجراش کن|راه بنداز|راهش بنداز|بالا بیار|بیارش بالا|بنداز بالا|بیار بالا|بیاورش|بیارش|بزن بالا)$/i);
  if(!m)return null;
  return m[1].replace(/^(?:برنامه|اپ|نرم افزار)\s+/i,'').trim();
}
function reminderCommand(raw){
  const s=normalize(digits(raw));
  const rel=s.match(/(?:(\d{1,4})\s*(دقیقه|ساعت|روز)\s*(?:دیگه|دیگر|بعد|بعدتر)?\s*(?:یادم بنداز|یادآوری کن)\s*(?:که)?\s*(.+)|(?:یادم بنداز|یادآوری کن)\s*(?:که)?\s*(\d{1,4})\s*(دقیقه|ساعت|روز)\s*(?:دیگه|دیگر|بعد)?\s*(.+))/i);
  if(rel){const amount=Number(rel[1]||rel[4]),unit=rel[2]||rel[5],message=String(rel[3]||rel[6]||'').trim();if(amount>0&&message){const mult=unit==='دقیقه'?60000:unit==='ساعت'?3600000:86400000;return {name:'create_reminder',args:{message,due_at:new Date(Date.now()+amount*mult).toISOString()},reply:'باشه، یادآوریش می‌کنم.'};}}
  const tomorrow=s.match(/(?:فردا)\s*(?:ساعت)?\s*(\d{1,2})(?::(\d{1,2}))?\s*(?:یادم بنداز|یادآوری کن)\s*(?:که)?\s*(.+)|(?:یادم بنداز|یادآوری کن)\s*(?:که)?\s*فردا\s*(?:ساعت)?\s*(\d{1,2})(?::(\d{1,2}))?\s*(.+)/i);
  if(tomorrow){const h=Number(tomorrow[1]||tomorrow[4]),m=Number(tomorrow[2]||tomorrow[5]||0),message=String(tomorrow[3]||tomorrow[6]||'').trim();if(h>=0&&h<24&&m>=0&&m<60&&message){const d=new Date();d.setDate(d.getDate()+1);d.setHours(h,m,0,0);return {name:'create_reminder',args:{message,due_at:d.toISOString()},reply:'باشه، برای فردا یادآوریش می‌کنم.'};}}
  return null;
}
function pinnedNoteCommand(raw){
  const t=String(raw||'').trim();let m=t.match(/^(?:پین کن|ذخیره کن|یادداشت کن)\s*[:：-]?\s*(.{2,2000})$/i);if(!m)m=t.match(/^(.{2,1800}?)\s+(?:رو|را)\s+(?:به عنوان )?(?:متن مهم )?(?:پین|ذخیره|یادداشت) کن$/i);if(!m?.[1]?.trim())return null;const text=m[1].trim();if(/^(?:این|اونو|همونو)$/i.test(text))return null;return {name:'create_pinned_note',args:{title:text.slice(0,70),text,pinned:true,tags:['user-pinned']},reply:'ذخیره‌ش کردم که یادت نره.'};
}
function namedMedia(s){
  const m=s.match(/(?:فیلم|ویدیو|کلیپ|آهنگ|موزیک|موسیقی)\s+(.+?)\s*(?:رو|را)?\s*(?:پخش|باز)(?:ش)?\s*کن/i)||s.match(/(.+?)\s+(?:رو|را)\s*(?:پخش|باز)(?:ش)?\s*کن\s*(?:با\s+پلیر)?$/i);
  if(!m?.[1]?.trim())return null;
  const name=m[1].trim();if(name.length>140)return null;
  const video=/(فیلم|ویدیو|کلیپ)/i.test(s),music=/(آهنگ|موزیک|موسیقی)/i.test(s);
  if(!video&&!music)return null;
  return {name,extensions:video?['mp4','mkv','avi','mov','webm','m4v']:['mp3','wav','m4a','flac','ogg','aac']};
}
function searchQueryFor(raw,engine='generic'){
  const s=normalize(raw).replace(/^(?:لطفا|لطفاً)\s*/i,'');
  const engines={google:'(?:گوگل|google)',chrome:'(?:کروم|chrome)',youtube:'(?:یوتیوب|youtube)'};
  const clean=q=>String(q||'').replace(/^(?:درباره|راجع به|دنبال)\s+/i,'').replace(/\s+(?:رو|را)$/i,'').trim();
  if(engine!=='generic'){
    const e=engines[engine],v='(?:سرچ|جستجو|بگرد|پیدا)(?:\\s*کن)?',patterns=[
      new RegExp(`^(?:(?:تو|در)\\s*)?${e}\\s+(?:درباره\\s+)?(.+?)\\s+(?:رو|را)?\\s*${v}$`,'i'),
      new RegExp(`^(?:(?:تو|در)\\s*)?${e}\\s*${v}\\s+(?:(?:درباره|راجع به|دنبال)\\s+)?(.+)$`,'i'),
      new RegExp(`^(.+?)\\s+(?:رو|را)?\\s*(?:تو|در)\\s*${e}\\s*${v}$`,'i'),
      new RegExp(`^(.+?)\\s+(?:رو|را)?\\s*${v}\\s*(?:تو|در)\\s*${e}$`,'i')
    ];
    for(const re of patterns){const m=s.match(re),q=clean(m?.[1]);if(q&&!/^(?:کن|سرچ|جستجو|بگرد|پیدا)$/i.test(q))return q;}
    return null;
  }
  const patterns=[
    /^(?:سرچ|جستجو|بگرد)(?:\s*کن)?\s+(?:(?:درباره|راجع به|دنبال)\s+)?(.+)$/i,
    /^(.+?)\s+(?:رو|را)?\s*(?:سرچ|جستجو)(?:\s*کن)?$/i
  ];
  for(const re of patterns){const m=s.match(re),q=clean(m?.[1]);if(q&&!/^(?:کن|سرچ|جستجو|بگرد)$/i.test(q))return q;}
  return null;
}
function statusReadCommand(raw){
  const s=normalize(canonicalizeCommand(raw));
  if(!s)return null;
  const query=/(?:چند(?:ه| است| هست)?|مقدار|درصد|وضعیت|چقدره|چقدر است|چقدر هست|الان)/i;
  if(has(s,audio)&&query.test(s)&&extractPercent(s,audio)===null&&!maximum.test(s)&&!minimum.test(s)&&!/(?:کم|زیاد|ببر|بیار|بکش|بذار|بگذار|تنظیم|قطع|وصل|mute|unmute|روشن|خاموش|کن|باشه)/i.test(s))return {name:'get_volume',args:{}};
  if(has(s,bright)&&query.test(s)&&extractPercent(s,bright)===null&&!/(?:کم|زیاد|ببر|بیار|بکش|بذار|بگذار|تنظیم|خاموش)/i.test(s))return {name:'get_brightness',args:{}};
  if(/(?:باتری|battery)/i.test(s)&&query.test(s)&&!/(?:حالت ذخیره|battery saver|روشن کن|خاموش کن|تنظیم)/i.test(s))return {name:'get_battery_status',args:{}};
  return null;
}
function namedFileCommand(raw){
  const text=String(raw||'').trim();if(!text)return null;
  const verb=String.raw`(?:پیدا(?:ش)? کن|بگرد|کجاست|کجا هست|باز(?:ش)? کن|بیار(?:ش)?|بیاور(?:ش)?|گیر(?:ش)?\s*(?:بیار|بیارش)|در\s*بیار|دربیار|نشون(?:م)?\s*بده)`;
  const wantsFind=/(?:پیدا(?:ش)? کن|بگرد|کجاست|کجا هست|گیر(?:ش)?\s*(?:بیار|بیارش)|در\s*بیار|دربیار|نشون(?:م)?\s*بده)/i.test(text);
  const wantsOpen=/(?:باز(?:ش)? کن|بیار(?:ش)?|بیاور(?:ش)?|گیر(?:ش)?\s*(?:بیار|بیارش)|در\s*بیار|دربیار|نشون(?:م)?\s*بده)/i.test(text);
  if(!wantsFind&&!wantsOpen)return null;
  const folder=text.match(new RegExp(String.raw`(?:پوشه|فولدر)\s+(.+?)(?:\s+(?:رو|را))?\s+${verb}`,'i'))?.[1]?.trim();
  if(folder&&!/^(?:رو|را)$/i.test(folder))return {name:'open_named_folder',args:{name:folder},reply:`پوشه ${folder} رو پیدا کردم و بازش کردم.`};
  const extName=text.match(/([^\s"'،؟]+\.[a-z0-9]{1,8})/i)?.[1];
  let pathHint=text.match(new RegExp(String.raw`(?:از\s+)?(?:پروژه|داخل\s+پوشه|توی\s+پوشه|در\s+پوشه)\s+(.+?)(?=\s+(?:(?:رو|را)\s+)?(?:برام\s+)?${verb}|$)`,'i'))?.[1]?.trim()||'';
  if(!pathHint)pathHint=text.match(/(?:از\s+)?(?:پروژه|داخل\s+پوشه|توی\s+پوشه|در\s+پوشه)\s+([^\s،؟]+)/i)?.[1]?.trim()||'';
  pathHint=pathHint.replace(/\s+(?:رو|را)(?:\s+برام)?$/i,'').trim();
  let name=extName||text.match(new RegExp(String.raw`(?:فایل|پرونده)\s+(.+?)(?:\s+(?:رو|را))?\s+${verb}`,'i'))?.[1]?.trim();
  let extensions=[];
  if(!name){const excel=text.match(new RegExp(String.raw`(?:اکسل|excel)\s+(.+?)(?:\s+(?:رو|را))?\s+${verb}`,'i')),candidate=excel?.[1]?.trim();if(candidate&&!/^(?:رو|را)$/i.test(candidate)){name=candidate;extensions=['xlsx','xlsm','xls'];}}
  if(!name)return null;name=name.replace(/^(?:اکسل|excel)\s+/i,'').trim();if(!name||name.length>180)return null;
  return wantsOpen?{name:'open_named_file',args:{name,extensions,path_hint:pathHint},reply:`${name} رو پیدا کردم و بازش کردم.`}:{name:'global_find_files',args:{query:name,extensions,limit:20,kind:'file',path_hint:pathHint}};
}

export function matchFastCommand(input){
  const statusRead=statusReadCommand(input);if(statusRead)return statusRead;
  const localFile=/(?:فایل|پرونده|پوشه|فولدر|اکسل|excel|\.(?:pdf|docx?|xlsx?|xlsm|txt|csv|json|mp[34]|mkv|vrm|png|jpe?g)\b)/i.test(input)&&!/(?:سایت|website|گوگل|google|کروم|chrome|از اینترنت|از وب)/i.test(input)?namedFileCommand(input):null;
  if(localFile)return localFile;
  const web=parseWebRequest(input);
  if(web){
    if(web.mode==='website')return {name:'chrome_open_named_site',args:{site:web.site,profile:'personal'}};
    if(web.mode==='browser')return {name:web.engine==='youtube'?'youtube_search':'chrome_search',args:{query:web.query,...(web.engine==='youtube'?{}:{profile:'personal'})}};
    return {name:'grounded_factual_answer',args:{query:web.domain?`site:${web.domain} ${web.query}`:web.query}};
  }
  // A launch is only one step of a messenger transfer; leave the whole goal
  // to the planner. Public search phrases must not execute embedded commands.
  if(/(?:تلگرام|واتساپ|روبیکا|telegram|whatsapp|rubika)/i.test(input)&&/(?:پیوی|چت|مخاطب|پیام|فوروارد|بفرست|ارسال|بردار)/i.test(input))return null;
  if(/(?:چطور|چگونه|چرا|آموزش|نحوه|اگر|وقتی|نگفتم|نکن|نکنید)/i.test(input))return null;
  input=canonicalizeCommand(input);
  const s=normalize(input);
  if(!s)return null;

  if(has(s,audio)){
    if(/(?:چند(?:ه| است| هست)?|مقدار|درصد|وضعیت).*(?:صدا|ولوم|volume)|(?:صدا|ولوم|volume).*(?:چند(?:ه| است| هست)?|مقدار|درصد|وضعیت)/i.test(s)&&extractPercent(s,audio)===null&&!/(?:کم|زیاد|ببر|بیار|بکش|بذار|بگذار|تنظیم|قطع|وصل|mute|unmute|روشن|خاموش)/i.test(s))return {name:'get_volume',args:{}};
    if(/unmute|(?:از\s*)?(?:بی.?صدا|سایلنت|mute).*(?:در.?بیار|بردار|خاموش کن)|صدا.*(?:وصل(?:ش)?|فعال|روشن|باز)\s*کن/i.test(s))return {name:'set_mute',args:{muted:false},reply:'صدا دوباره وصله.'};
    if(/(?:بی.?صدا|سایلنت|mute)|صدا.*(?:قطع(?:ش)?|ببند(?:ش)?|خاموش)\s*کن/i.test(s)&&!/unmute|در.?بیار|بردار|وصل|فعال|روشن|باز/i.test(s))return {name:'set_mute',args:{muted:true},reply:'صدا رو بی‌صدا کردم.'};
    if(has(s,maximum)&&has(s,/(?:زیاد|بالا|ببر|بیار|بکش|بده|بکن|کن|بذار|تنظیم|فول|سقف|نهایت|انتها|آخر)/i))return {name:'set_volume',args:{percent:100},reply:'صدا رو تا آخر بردم بالا، رئیس.'};
    if(has(s,minimum)&&has(s,/(?:کم|پایین|ببر|بیار|بکش|بده|بکن|کن|بذار|تنظیم|کف)/i))return {name:'set_volume',args:{percent:0},reply:'صدا رو روی صفر گذاشتم.'};
    const percent=extractPercent(s,audio),relative=has(s,increase)||has(s,decrease);
    if(relative&&!/(?:روی|بذار|بگذار|تنظیم|برسون|برسان|تا\s*\d)/i.test(s)){
      const amount=percent??(/(?:یه کم|یکم|کمی|یه ذره|یک ذره|یخورده|یخرده|اندکی)/i.test(s)?3:10);
      return {name:has(s,increase)?'volume_up':'volume_down',args:{amount},reply:has(s,increase)?'صدا رو بیشتر کردم.':'صدا رو کمتر کردم.'};
    }
    if(percent!==null)return {name:'set_volume',args:{percent},reply:`صدا رو روی ${percent}٪ تنظیم کردم.`};
  }

  if(has(s,bright)){
    if(/(?:چند(?:ه| است| هست)?|مقدار|درصد|وضعیت).*(?:نور|روشنایی|brightness)|(?:نور|روشنایی|brightness).*(?:چند(?:ه| است| هست)?|مقدار|درصد|وضعیت)/i.test(s)&&extractPercent(s,bright)===null&&!/(?:کم|زیاد|ببر|بیار|بکش|بذار|بگذار|تنظیم|روشن|خاموش)/i.test(s))return {name:'get_brightness',args:{}};
    if(has(s,maximum))return {name:'set_brightness',args:{percent:100},reply:'روشنایی رو تا آخر بردم بالا.'};
    if(has(s,minimum))return {name:'set_brightness',args:{percent:0},reply:'روشنایی رو روی صفر گذاشتم.'};
    const percent=extractPercent(s,bright);if(percent!==null)return {name:'set_brightness',args:{percent},reply:`روشنایی رو روی ${percent}٪ گذاشتم.`};
    if(has(s,increase))return {name:'brightness_up',args:{},reply:'نور صفحه رو بیشتر کردم.'};
    if(has(s,decrease))return {name:'brightness_down',args:{},reply:'نور صفحه رو کمتر کردم.'};
  }

  const reminder=reminderCommand(input);if(reminder)return reminder;
  const note=pinnedNoteCommand(input);if(note)return note;
  const mediaFile=namedMedia(s);if(mediaFile)return {name:'open_named_file',args:mediaFile,reply:`${mediaFile.name} رو پیدا کردم و برای پخش بازش کردم.`};
  if(/(?:آهنگ|موزیک|media|پخش).*(?:بعدی|next)|(?:بعدی|next).*(?:آهنگ|موزیک|ترک)/i.test(s))return {name:'media_next',args:{},reply:'رفتم ترک بعدی.'};
  if(/(?:آهنگ|موزیک|media|پخش).*(?:قبلی|previous)|(?:قبلی|previous).*(?:آهنگ|موزیک|ترک)/i.test(s))return {name:'media_previous',args:{},reply:'برگشتم ترک قبلی.'};
  if(/(?:آهنگ|موزیک|media).*(?:پخش|ادامه|pause|توقف|نگه دار)|(?:پخش|توقف|مکث).*(?:آهنگ|موزیک)/i.test(s))return {name:'media_play_pause',args:{},reply:'کنترل پخش رو انجام دادم.'};

  if(/(?:خاموشش کن|خاموش کن|سیستم.*خاموش|کامپیوتر.*خاموش|shutdown)/i.test(s))return {name:'shutdown_pc',args:{},reply:'خاموش‌کردن سیستم تأیید شد.'};
  if(/(?:ری.?استارت|راه.?اندازی مجدد|restart)/i.test(s))return {name:'restart_pc',args:{},reply:'ری‌استارت سیستم تأیید شد.'};
  if(/(?:اسلیپ|بخوابون|حالت خواب|sleep)/i.test(s))return {name:'sleep_pc',args:{},reply:'سیستم رو به حالت خواب می‌برم.'};
  if(/(?:قفلش کن|قفل کن|lock)/i.test(s))return {name:'lock_pc',args:{},reply:'سیستم قفل شد.'};
  if(/(?:آپدیت ویندوز|windows update|به.?روزرسانی ویندوز)/i.test(s))return {name:'check_windows_update',args:{},reply:'Windows Update رو باز کردم.'};
  if(/(?:سطل(?: زباله)?|recycle ?bin).*(?:خالی|پاک|تمیز)|(?:خالی|پاک|تمیز).*(?:سطل(?: زباله)?|recycle ?bin)/i.test(s))return {name:'empty_recycle_bin',args:{},reply:'سطل زباله رو خالی کردم.'};
  if(/(?:فایل(?:های)? موقت|temp|temporary).*(?:پاک|تمیز|خالی)|(?:پاک|تمیز).*(?:temp|فایل(?:های)? موقت)/i.test(s))return {name:'clean_user_temp_files',args:{older_than_hours:24},reply:'فایل‌های موقت قدیمی رو پاک‌سازی کردم.'};
  if(/(?:تسک ?منیجر|task ?manager).*(?:باز|اجرا)|(?:باز|اجرا).*(?:تسک ?منیجر|task ?manager)/i.test(s))return {name:'open_task_manager',args:{},reply:'Task Manager رو باز کردم.'};
  if(/(?:دیوایس ?منیجر|device ?manager).*(?:باز|اجرا)|(?:باز|اجرا).*(?:دیوایس ?منیجر|device ?manager)/i.test(s))return {name:'open_device_manager',args:{},reply:'Device Manager رو باز کردم.'};
  if(/(?:event ?viewer|رویدادهای ویندوز|لاگ ویندوز).*(?:باز|نشون)|(?:باز|نشون).*(?:event ?viewer|رویدادهای ویندوز)/i.test(s))return {name:'open_event_viewer',args:{},reply:'Event Viewer رو باز کردم.'};
  if(/(?:دسکتاپ|desktop).*(?:مرتب|دسته.?بندی|جمع و جور)/i.test(s))return {name:'organize_desktop',args:{},reply:'دسکتاپ رو مرتب کردم.'};
  if(/(?:دانلودها|downloads).*(?:باز|نشون)|(?:باز|نشون).*(?:دانلودها|downloads)/i.test(s))return {name:'open_downloads',args:{},reply:'پوشه دانلودها رو باز کردم.'};
  if(/(?:بلوتوث|bluetooth).*(?:باز|تنظیمات)|(?:تنظیمات).*(?:بلوتوث|bluetooth)/i.test(s))return {name:'open_bluetooth_settings',args:{},reply:'تنظیمات Bluetooth رو باز کردم.'};
  if(/(?:وای.?فای|wifi|شبکه|network).*(?:تنظیمات|باز)/i.test(s))return {name:'open_network_settings',args:{},reply:'تنظیمات شبکه رو باز کردم.'};
  if(/(?:dns).*(?:پاک|خالی|flush)|(?:flush).*(?:dns)/i.test(s))return {name:'flush_dns_cache',args:{},reply:'کش DNS رو پاک کردم.'};
  if(/(?:defender|ویندوز دیفندر).*(?:وضعیت|status|روشن|فعاله)/i.test(s))return {name:'get_defender_status',args:{}};
  if(/(?:defender|ویندوز دیفندر).*(?:اسکن سریع|quick scan)|(?:اسکن سریع|quick scan).*(?:defender|ویندوز)/i.test(s))return {name:'run_defender_quick_scan',args:{},reply:'اسکن سریع Defender رو اجرا کردم.'};
  if(/(?:پنجره|window).*(?:کوچیک|کمینه|minimize)|(?:کمینه|minimize).*(?:پنجره|window)/i.test(s))return {name:'minimize_foreground_window',args:{},reply:'پنجره رو کمینه کردم.'};
  if(/(?:پنجره|window).*(?:بزرگ|maximize)|(?:بزرگ|maximize).*(?:پنجره|window)/i.test(s))return {name:'maximize_foreground_window',args:{},reply:'پنجره رو بزرگ کردم.'};
  if(/(?:دسکتاپ رو نشون بده|show desktop|همه پنجره.?ها رو جمع کن)/i.test(s))return {name:'show_desktop',args:{},reply:'دسکتاپ رو نشون دادم.'};
  const closeNamed=s.match(/^(.{1,60}?)\s*(?:رو|را)?\s*(?:ببند|ببندش|close کن)$/i);if(closeNamed&&!/(سیستم|کامپیوتر|ویندوز|پنجره)/i.test(closeNamed[1]))return {name:'close_app',args:{name:closeNamed[1].trim()},reply:`${closeNamed[1].trim()} رو بستم.`};

  const fileCommand=namedFileCommand(input);if(fileCommand)return fileCommand;

  if(launchVerb.test(s)){
    // Keep the legacy launch_app contract for Photoshop while the universal
    // launcher remains the default for every other installed application.
    if(/photoshop|فتوشاپ/i.test(s))return {name:'launch_app',args:{name:'Adobe Photoshop'},reply:'Adobe Photoshop رو باز کردم.'};
    if(/whatsapp|واتساپ/i.test(s))return {name:'chrome_open_service',args:{service:'whatsapp'},reply:'واتساپ شرکت رو در پروفایل شرکتی Chrome باز کردم.'};
    if(/rubika|روبیکا/i.test(s))return {name:'chrome_open_service',args:{service:'rubika'},reply:'روبیکای شرکت رو در پروفایل شرکتی Chrome باز کردم.'};
    for(const [re,name] of appAliases)if(re.test(s))return {name:'launch_any_app',args:{name},reply:`${name} رو باز کردم.`};
    const name=genericAppName(s);if(name&&name.length<80)return {name:'launch_any_app',args:{name},reply:`${name} رو باز کردم.`};
  }

  const chromeSearch=searchQueryFor(s,'chrome');
  if(chromeSearch)return {name:'chrome_search',args:{query:chromeSearch,profile:'personal'},reply:'نتایج رو در Chrome با پروفایل Amir باز کردم.'};
  const yt=searchQueryFor(s,'youtube');
  if(yt)return {name:'youtube_search',args:{query:yt},reply:'نتایج YouTube رو با پروفایل Amir باز کردم.'};
  const google=searchQueryFor(s,'google');
  if(google)return {name:'chrome_search',args:{query:google,profile:'personal'},reply:'نتایج Google رو در پروفایل Amir باز کردم.'};
  const genericSearch=searchQueryFor(s,'generic');
  if(genericSearch&&!/فایل|پوشه|سیستم/i.test(genericSearch))return {name:'chrome_search',args:{query:genericSearch,profile:'personal'},reply:'نتایج جستجو رو در Google با پروفایل Amir باز کردم.'};

  if(factualQuestion.test(s)&&simpleStableFact.test(s)&&!personalSmallTalk.test(s)&&!computerProblem.test(s))return {name:'grounded_factual_answer',args:{query:input}};
  return null;
}
