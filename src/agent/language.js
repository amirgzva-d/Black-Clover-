const DIGITS = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
const REPLACEMENTS = [
  [/\b(ولوم|صداشو|صداش)\b/g,'صدا'],[/\b(کمترش کن|بیارش پایین)\b/g,'کم کن'],[/\b(بیشترش کن|ببرش بالا)\b/g,'زیاد کن'],
  [/\b(کرومو|کروم رو)\b/g,'Chrome را'],[/\b(یوتوب|یوتیوبو)\b/g,'YouTube را'],[/\b(گوگلو|گوگل رو)\b/g,'Google را'],
  [/\b(خاموشش کن|سیستم رو خاموش کن)\b/g,'کامپیوتر را خاموش کن'],[/\b(ریستارتش کن|سیستم رو ریستارت کن)\b/g,'کامپیوتر را ریستارت کن'],
  [/\b(بخوابونش|سیستم رو بخوابون)\b/g,'کامپیوتر را به حالت خواب ببر'],[/\b(قفلش کن|سیستم رو قفل کن)\b/g,'کامپیوتر را قفل کن'],
  [/\b(آهنگو نگه دار|موزیکو نگه دار|موزیک رو نگه دار)\b/g,'موسیقی را pause کن'],[/\b(آهنگ بعدی|بعدی رو بزن)\b/g,'موسیقی بعدی'],
  [/\b(یه سرچ بزن|سرچ کن ببین|بگرد ببین)\b/g,'در وب جستجو کن'],[/\b(بازش کن)\b/g,'آن را باز کن']
];
export function normalizePersianCommand(input=''){
  let text=String(input).normalize('NFKC').replace(/[۰-۹٠-٩]/g,d=>DIGITS[d]??d).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
  for(const [pattern,replacement] of REPLACEMENTS) text=text.replace(pattern,replacement);
  return text.trim();
}
export function commandHints(text=''){
  const t=normalizePersianCommand(text).toLowerCase();
  const hints=[];
  const add=(when,hint)=>{if(when)hints.push(hint);};
  add(/صدا|ولوم|mute|میوت/.test(t),'volume controls');
  add(/نور|روشنایی|brightness/.test(t),'display brightness');
  add(/موسیقی|آهنگ|pause|play|بعدی|قبلی/.test(t),'media controls');
  add(/خاموش|ریستارت|خواب|قفل|sign.?out/.test(t),'Windows power/session controls');
  add(/نصب|حذف برنامه|پاک.*برنامه|winget/.test(t),'installed software/package management');
  add(/گوگل|یوتیوب|وب|سرچ|جستجو/.test(t),'web/search tools');
  add(/فایل|پوشه|فولدر|کلیپ.?بورد|اسکرین.?شات/.test(t),'files/clipboard/screenshot tools');
  add(/باز کن|اجرا کن|ببند/.test(t),'application/window tools');
  return hints;
}
