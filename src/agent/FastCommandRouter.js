const normalize=s=>String(s||'').toLowerCase().replace(/[؟?!.،,]+/g,' ').replace(/\s+/g,' ').trim();
const n=s=>Number(String(s).replace(/[^0-9]/g,''));
const clamp=x=>Math.max(0,Math.min(100,Number(x)));

const appAliases=[
  [/\bchrome\b|کروم/i,'Google Chrome'],[/telegram|تلگرام/i,'Telegram'],[/whatsapp|واتساپ/i,'WhatsApp'],[/rubika|روبیکا/i,'Rubika'],[/vscode|vs code|وی.?اس.?کد/i,'Visual Studio Code'],[/photoshop|فتوشاپ/i,'Adobe Photoshop'],[/excel|اکسل/i,'Excel'],[/word|ورد/i,'Word'],[/powerpoint|پاورپوینت/i,'PowerPoint'],[/notepad|نوت.?پد/i,'Notepad'],[/calculator|ماشین حساب/i,'Calculator']
];

export function matchFastCommand(input){
  const s=normalize(input);
  if(!s)return null;

  if(/(?:صدا|ولوم|volume)/i.test(s)){
    if(/(?:تا آخر|حداکثر|max|صد درصد|100 درصد|روی 100|روی ۱۰۰)/i.test(s)&&/(?:زیاد|بالا|ببر|کن|بذار|تنظیم)/i.test(s))return {name:'set_volume',args:{percent:100},reply:'صدا رو تا آخر بردم بالا، رئیس.'};
    if(/(?:صفر|0 درصد|روی 0|روی صفر)/i.test(s)&&/(?:کم|پایین|ببر|کن|بذار|تنظیم)/i.test(s))return {name:'set_volume',args:{percent:0},reply:'صدا رو روی صفر گذاشتم.'};
    const m=s.match(/(?:صدا|ولوم|volume).*?(?:روی|بذار(?: روی)?|کن|تنظیم(?: کن)? روی)?\s*(\d{1,3})\s*(?:درصد|%|$)/i);
    if(m)return {name:'set_volume',args:{percent:clamp(n(m[1]))},reply:`صدا رو روی ${clamp(n(m[1]))}٪ تنظیم کردم.`};
    if(/(?:بی.?صدا|سایلنت|mute)/i.test(s)&&!/(?:در.?بیار|بردار|unmute)/i.test(s))return {name:'set_mute',args:{muted:true},reply:'صدا رو بی‌صدا کردم.'};
    if(/(?:از بی.?صدا در.?بیار|صدا رو وصل کن|unmute)/i.test(s))return {name:'set_mute',args:{muted:false},reply:'صدا دوباره وصله.'};
    if(/(?:زیاد|بیشتر|بالا)/i.test(s))return {name:'volume_up',args:{},reply:'صدا رو بیشتر کردم.'};
    if(/(?:کم|کمتر|پایین)/i.test(s))return {name:'volume_down',args:{},reply:'صدا رو کمتر کردم.'};
  }

  if(/(?:نور|روشنایی|brightness)/i.test(s)){
    if(/(?:تا آخر|حداکثر|max|صد درصد|100 درصد)/i.test(s))return {name:'set_brightness',args:{percent:100},reply:'روشنایی رو تا آخر بردم بالا.'};
    const m=s.match(/(?:نور|روشنایی|brightness).*?(\d{1,3})\s*(?:درصد|%|$)/i);
    if(m)return {name:'set_brightness',args:{percent:clamp(n(m[1]))},reply:`روشنایی رو روی ${clamp(n(m[1]))}٪ گذاشتم.`};
  }

  if(/(?:خاموش کن|سیستم رو خاموش|کامپیوتر رو خاموش|shutdown)/i.test(s))return {name:'shutdown_pc',args:{},reply:'خاموش‌کردن سیستم تأیید شد.'};
  if(/(?:ری.?استارت|راه.?اندازی مجدد|restart)/i.test(s))return {name:'restart_pc',args:{},reply:'ری‌استارت سیستم تأیید شد.'};
  if(/(?:اسلیپ|بخوابون|حالت خواب|sleep)/i.test(s))return {name:'sleep_pc',args:{},reply:'سیستم رو به حالت خواب می‌برم.'};
  if(/(?:قفل کن|lock)/i.test(s))return {name:'lock_pc',args:{},reply:'سیستم قفل شد.'};

  if(/(?:باز کن|اجرا کن|راه بنداز)/i.test(s)){
    for(const [re,name] of appAliases)if(re.test(s))return {name:'launch_app',args:{name},reply:`${name} رو باز کردم.`};
  }

  const google=s.match(/(?:گوگل|google).*?(?:سرچ|جستجو)(?: کن)?\s+(.+)/i)||s.match(/(.+?)\s+(?:رو|را)?\s*(?:گوگل|google)\s*(?:سرچ|جستجو)(?: کن)?$/i);
  if(google?.[1]?.trim())return {name:'web_search',args:{query:google[1].trim()},reply:'سرچ گوگل رو باز کردم.'};

  return null;
}
