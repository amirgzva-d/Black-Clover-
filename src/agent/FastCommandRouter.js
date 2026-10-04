const normalize=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[؟?!.،,]+/g,' ').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
const digits=s=>String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const n=s=>Number(digits(String(s)).replace(/[^0-9]/g,''));
const clamp=x=>Math.max(0,Math.min(100,Number(x)));

const appAliases=[
  [/\bchrome\b|کروم/i,'Google Chrome'],[/firefox|فایرفاکس/i,'Firefox'],[/edge|اج\b|مایکروسافت اج/i,'Microsoft Edge'],[/telegram|تلگرام/i,'Telegram'],[/whatsapp|واتساپ/i,'WhatsApp'],[/rubika|روبیکا/i,'Rubika'],[/instagram|اینستاگرام/i,'Instagram'],[/discord|دیسکورد/i,'Discord'],[/vscode|vs code|وی.?اس.?کد/i,'Visual Studio Code'],[/photoshop|فتوشاپ/i,'Adobe Photoshop'],[/excel|اکسل/i,'Excel'],[/word|ورد/i,'Word'],[/powerpoint|پاورپوینت/i,'PowerPoint'],[/notepad|نوت.?پد/i,'Notepad'],[/calculator|ماشین.?حساب/i,'Calculator'],[/explorer|فایل اکسپلورر|اکسپلورر/i,'File Explorer']
];
const has=(s,re)=>re.test(s);
const audio=/صدا|ولوم|volume|اسپیکر|speaker/i;
const bright=/نور|روشنایی|brightness/i;
const increase=/زیاد|بیشتر|بالا|ببر بالا|بیار بالا|بالاتر|تقویت|قوی.?تر/i;
const decrease=/کم|کمتر|پایین|بیار پایین|ببر پایین|پایین.?تر|آروم.?تر/i;
const maximum=/تا آخر|تا ته|تهش|حداکثر|max|maximum|صد درصد|100 درصد|روی 100|روی ۱۰۰|فول/i;
const minimum=/صفر|0 درصد|روی 0|روی صفر|کامل قطع/i;

function extractPercent(s,keywordRe){
  const t=digits(s),m=t.match(new RegExp(`(?:${keywordRe.source}).{0,30}?(\\d{1,3})\\s*(?:درصد|%|$)`,'i'))||t.match(new RegExp(`(\\d{1,3})\\s*(?:درصد|%)?.{0,20}(?:${keywordRe.source})`,'i'));
  return m?clamp(n(m[1])):null;
}
function genericAppName(s){
  if(/فایل|پوشه|فولدر|سایت|لینک|تنظیمات/i.test(s))return null;
  let m=s.match(/^(?:لطفا\s*)?(.+?)\s*(?:رو|را)?\s*(?:باز کن|اجرا کن|راه بنداز|بالا بیار)$/i);
  if(!m)return null;
  return m[1].replace(/^(?:برنامه|اپ|نرم افزار)\s+/i,'').trim();
}

export function matchFastCommand(input){
  const s=normalize(input);
  if(!s)return null;

  if(has(s,audio)){
    if(has(s,maximum)&&has(s,/(?:زیاد|بالا|ببر|بیار|کن|بذار|تنظیم|فول)/i))return {name:'set_volume',args:{percent:100},reply:'صدا رو تا آخر بردم بالا، رئیس.'};
    if(has(s,minimum)&&has(s,/(?:کم|پایین|ببر|بیار|کن|بذار|تنظیم|قطع)/i))return {name:'set_volume',args:{percent:0},reply:'صدا رو روی صفر گذاشتم.'};
    const percent=extractPercent(s,audio);if(percent!==null)return {name:'set_volume',args:{percent},reply:`صدا رو روی ${percent}٪ تنظیم کردم.`};
    if(/(?:از\s*)?(?:بی.?صدا|سایلنت|mute).*(?:در.?بیار|بردار|خاموش کن)|صدا رو (?:وصل|فعال) کن|unmute/i.test(s))return {name:'set_mute',args:{muted:false},reply:'صدا دوباره وصله.'};
    if(/بی.?صدا|سایلنت|mute|صدا.*قطع کن/i.test(s)&&!/unmute|در.?بیار|بردار/i.test(s))return {name:'set_mute',args:{muted:true},reply:'صدا رو بی‌صدا کردم.'};
    if(has(s,increase))return {name:'volume_up',args:{},reply:'صدا رو بیشتر کردم.'};
    if(has(s,decrease))return {name:'volume_down',args:{},reply:'صدا رو کمتر کردم.'};
  }

  if(has(s,bright)){
    if(has(s,maximum))return {name:'set_brightness',args:{percent:100},reply:'روشنایی رو تا آخر بردم بالا.'};
    if(has(s,minimum))return {name:'set_brightness',args:{percent:0},reply:'روشنایی رو روی صفر گذاشتم.'};
    const percent=extractPercent(s,bright);if(percent!==null)return {name:'set_brightness',args:{percent},reply:`روشنایی رو روی ${percent}٪ گذاشتم.`};
    if(has(s,increase))return {name:'brightness_up',args:{},reply:'نور صفحه رو بیشتر کردم.'};
    if(has(s,decrease))return {name:'brightness_down',args:{},reply:'نور صفحه رو کمتر کردم.'};
  }

  if(/(?:آهنگ|موزیک|media|پخش).*(?:بعدی|next)|(?:بعدی|next).*(?:آهنگ|موزیک|ترک)/i.test(s))return {name:'media_next',args:{},reply:'رفتم ترک بعدی.'};
  if(/(?:آهنگ|موزیک|media|پخش).*(?:قبلی|previous)|(?:قبلی|previous).*(?:آهنگ|موزیک|ترک)/i.test(s))return {name:'media_previous',args:{},reply:'برگشتم ترک قبلی.'};
  if(/(?:آهنگ|موزیک|media).*(?:پخش|ادامه|pause|توقف|نگه دار)|(?:پخش|توقف|مکث).*(?:آهنگ|موزیک)/i.test(s))return {name:'media_play_pause',args:{},reply:'کنترل پخش رو انجام دادم.'};

  if(/(?:خاموشش کن|خاموش کن|سیستم.*خاموش|کامپیوتر.*خاموش|shutdown)/i.test(s))return {name:'shutdown_pc',args:{},reply:'خاموش‌کردن سیستم تأیید شد.'};
  if(/(?:ری.?استارت|راه.?اندازی مجدد|restart)/i.test(s))return {name:'restart_pc',args:{},reply:'ری‌استارت سیستم تأیید شد.'};
  if(/(?:اسلیپ|بخوابون|حالت خواب|sleep)/i.test(s))return {name:'sleep_pc',args:{},reply:'سیستم رو به حالت خواب می‌برم.'};
  if(/(?:قفلش کن|قفل کن|lock)/i.test(s))return {name:'lock_pc',args:{},reply:'سیستم قفل شد.'};
  if(/(?:آپدیت ویندوز|windows update|به.?روزرسانی ویندوز)/i.test(s))return {name:'check_windows_update',args:{},reply:'Windows Update رو باز کردم.'};

  if(/(?:باز کن|اجرا کن|راه بنداز|بالا بیار)/i.test(s)){
    for(const [re,name] of appAliases)if(re.test(s))return {name:'launch_app',args:{name},reply:`${name} رو باز کردم.`};
    const name=genericAppName(s);if(name&&name.length<80)return {name:'launch_app',args:{name},reply:`${name} رو باز کردم.`};
  }

  const yt=s.match(/(?:یوتیوب|youtube).*?(?:سرچ|جستجو|بگرد)(?: کن)?\s+(.+)/i)||s.match(/(.+?)\s+(?:رو|را)?\s*(?:تو|در)?\s*(?:یوتیوب|youtube)\s*(?:سرچ|جستجو|پیدا)(?: کن)?$/i);
  if(yt?.[1]?.trim())return {name:'youtube_search',args:{query:yt[1].trim()},reply:'توی یوتیوب برات گشتم.'};
  const google=s.match(/(?:گوگل|google).*?(?:سرچ|جستجو|بگرد|پیدا)(?: کن)?\s+(.+)/i)||s.match(/(.+?)\s+(?:رو|را)?\s*(?:تو|در)?\s*(?:گوگل|google)\s*(?:سرچ|جستجو|پیدا)(?: کن)?$/i);
  if(google?.[1]?.trim())return {name:'web_search',args:{query:google[1].trim()},reply:'سرچ گوگل رو باز کردم.'};
  const genericSearch=s.match(/^(?:لطفا\s*)?(?:سرچ|جستجو|بگرد)\s+(?:کن\s+)?(?:درباره\s+)?(.+)/i)||s.match(/^(.+?)\s+(?:رو|را)?\s*(?:سرچ|جستجو)(?: کن)?$/i);
  if(genericSearch?.[1]?.trim()&&!/فایل|پوشه|سیستم/i.test(genericSearch[1]))return {name:'web_search',args:{query:genericSearch[1].trim()},reply:'برات سرچ کردم.'};

  return null;
}
