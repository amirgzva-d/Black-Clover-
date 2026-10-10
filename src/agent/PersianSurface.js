// Persian command surface normalization. Keep user payloads (quoted text,
// local paths, numbers, URLs, email addresses) intact while repairing command
// vocabulary. This is deterministic and works completely offline.
const DIGITS='۰۱۲۳۴۵۶۷۸۹',ARABIC_DIGITS='٠١٢٣٤٥٦٧٨٩';
const explicit=new Map(Object.entries({
  'صوذا':'صدا','صوذای':'صدای','صوذادار':'صدادار','صدآ':'صدا','سدا':'صدا','صدارو':'صدا رو',
  'ولومو':'ولوم رو','ولومم':'ولوم',
  'روسنایی':'روشنایی','روشنأیی':'روشنایی','روشنیایی':'روشنایی','نوررو':'نور رو',
  'کرم':'کروم','کرومو':'کروم رو','گولگ':'گوگل','کوگل':'گوگل','کوکل':'گوگل',
  'تلخرام':'تلگرام','تلخرامو':'تلگرام رو','تلگرم':'تلگرام','تلگام':'تلگرام','تلگرامو':'تلگرام رو',
  'واتصاپ':'واتساپ','واتساپو':'واتساپ رو','وتساپ':'واتساپ',
  'روبیگا':'روبیکا','روبیکاو':'روبیکا رو',
  'یوطیوب':'یوتیوب','یوتوب':'یوتیوب','یوتیوبو':'یوتیوب رو',
  'برنامع':'برنامه','برنامرو':'برنامه رو',
  'حزف':'حذف','هذف':'حذف','حزفش':'حذفش',
  'ببندشس':'ببندش','بابز':'باز','باض':'باز',
  'باکن':'باز کن','بازگن':'باز کن','بازکن':'باز کن',
  'پوشرو':'پوشه رو','پوشع':'پوشه','پوشهو':'پوشه رو',
  'اپدیت':'آپدیت','ابدت':'آپدیت','آپدییت':'آپدیت','بهروزرسانی':'بروزرسانی',
  'یاداور':'یادآور','یاداوری':'یادآوری','یادمن':'یادم',
  'پنجررو':'پنجره رو','منضورم':'منظورم','فورواردش':'فوروارد',
  'اکسلو':'اکسل رو','اکسِل':'اکسل',
  'بفرصت':'بفرست','بفرستشس':'بفرست','بفرستب':'بفرست',
  'ترجمهش':'ترجمش','ترجمح':'ترجمه','ترجمش':'ترجمه',
  'ویندوزو':'ویندوز رو','پخشگن':'پخش کن','اسلیپش':'اسلیپ',
  'شاتداون':'shutdown','ریستارد':'ریستارت',
  'کپیگن':'کپی کن','اینو':'این رو','اونو':'اون رو','همونو':'همون رو',
  'بشع':'بشه','کنشس':'کنش'
}));
const vocab=[
  'صدا','ولوم','اسپیکر','روشنایی','نور','مانیتور','نمایشگر','کروم','گوگل',
  'تلگرام','واتساپ','روبیکا','یوتیوب','اکسل','ورد','فتوشاپ','فایرفاکس',
  'برنامه','فایل','پوشه','فولدر','پنجره','دسکتاپ','میانبر','یادآور','یادآوری',
  'بلوتوث','وایفای','میکروفون','صدای','سیستم','ویندوز','حذف','پاک','ببند','بستن',
  'بساز','باز','اجرا','بفرست','ارسال','فوروارد','بگیر','ببین','جستجو','سرچ',
  'پیدا','دانلود','نصب','آپدیت','بروزرسانی','تغییر','تبدیل','ذخیره','کپی','انتقال',
  'جابجا','ترجمه','ترجمان','پخش','توقف','مکث','بعدی','قبلی','کم','زیاد','روشن',
  'خاموش','قطع','وصل','بیشتر','کمتر','بالا','پایین','اسلیپ','ریستارت','قفل',
  'مرتب','نشان','بده','ببر','بیار','کن','کنم','کنه','بکن','لینک','متن','صفحه',
  'تنظیمات','ساعت','دقیقه','روز','فردا','امروز','هفته','عکس','تصویر','فیلم',
  'موزیک','موسیقی','آهنگ','گزارش','حسابداری','باربری','فیش','پلاک','سلول',
  'پین','یادداشت','پوشه','اسم','شماره'
];
const lexicon=[...new Set(vocab)];
const noFuzzy=new Set(['خاموشی','صدادار','روشنتر','یادآوری','ایمنی','این','اون','رو','را','کن','نه','نکن','نکنه','نکردن','نبند','نفرست',
  'حالا','بعد','به','از','در','تو','توی','چی','چرا','چطور','چگونه','کجا','چه','وقت','کی',
  'همون','فقط','برای','من','ما','تا','با','و','یا','اگر','وقتی','قبل','آیا','میشه']);
const normalizeChars=s=>String(s??'').normalize('NFKC')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/ۀ/g,'ه')
  .replace(/[أإٱ]/g,'ا').replace(/[ة]/g,'ه')
  .replace(/[۰-۹]/g,d=>String(DIGITS.indexOf(d)))
  .replace(/[٠-٩]/g,d=>String(ARABIC_DIGITS.indexOf(d)))
  .replace(/\u200c/g,' ').replace(/ـ/g,'').replace(/[\u064B-\u065F]/g,'')
  .replace(/\s+/g,' ').trim();
export function damerauDistance(a,b,max=2){
  if(a===b)return 0;if(!a||!b||Math.abs(a.length-b.length)>max)return max+1;
  const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>new Uint8Array(n+1));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    let v=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,dp[i-2][j-2]+1);
    dp[i][j]=v;
  }
  return dp[m][n];
}
// Explicit domain terms can be repaired up to one edit if and only if the best
// candidate is unique. Never guess a person's name, file path or short token.
function repairToken(token){
  const found=explicit.get(token);if(found)return found;
  if(token.length<5||noFuzzy.has(token)||!/^\p{Script=Arabic}+$/u.test(token))return token;
  if(lexicon.includes(token))return token;
  let best=null,hit=0,ambiguous=false;
  for(const word of lexicon){
    if(Math.abs(word.length-token.length)>1)continue;
    const d=damerauDistance(token,word,1);
    if(d===1){hit++;if(hit===1)best=word;else{ambiguous=true;break;}}
  }
  return !ambiguous&&hit===1?best:token;
}
const quoted=/"[^"]*"|'[^']*'|«[^»]*»|“[^”]*”/g;
const opaque=/https?:\/\/[^\s]+|(?:[a-z]:[\\/]|\\\\)[^\s،؛]+|\b[\w.-]+@[\w.-]+\.[a-z]{2,}\b|\b[\w-]+\.(?:png|jpe?g|pdf|xlsx?|xlsm|docx?|mp[34]|txt|zip|exe|json|csv|mkv|mov|webp)\b/gi;
export function normalizePersianSurface(input,{repairTypos=true}={}){
  const text=normalizeChars(input);
  if(!repairTypos||!text)return text;
  const spans=[];
  for(const re of [quoted,opaque])for(const hit of text.matchAll(new RegExp(re.source,re.flags)))spans.push([hit.index,hit.index+hit[0].length]);
  const protectedAt=(from,to)=>spans.some(([a,b])=>from<b&&to>a);
  const pieces=[];let prev=0;
  const tokens=/[\p{L}\p{M}]+/gu;let match;
  while((match=tokens.exec(text))){
    const word=match[0],start=match.index,end=start+word.length;
    pieces.push(text.slice(prev,start));
    pieces.push(protectedAt(start,end)?word:repairToken(word.toLowerCase()));
    prev=end;
  }
  pieces.push(text.slice(prev));
  return pieces.join('').replace(/\s+/g,' ').trim();
}
export function commandSafetyGuard(text=''){
  const raw=normalizePersianSurface(text).toLowerCase();
  // A whole negative imperative is a refusal request, not a command.
  const negated=/(?:^|\s)(?:نکن|نکنید|نزن|نفرست|نفرستید|نبند|نبندش|نپاک|حذف نکن|خاموش نکن|قفل نکن|اجرا نکن|باز نکن|کم نکن|زیاد نکن|پاک نکن|نمیخوام|نمی خواهم)(?:\s|$)/i.test(raw);
  const explanatory=/(?:چطوری|چطور|چگونه|نحوه|آموزش|روش|یاد بده|مثال بزن|معنی|فرق|آیا|میشه بگی|می شه بگی).{0,130}(?:کنم|کردن|کن|بفرست|حذف|باز)|(?:این جمله|این دستور|این متن|مثلا|مثلاً|فرض کن).{0,120}(?:کن|بفرست|حذف)/i.test(raw);
  const quotedPayload=/(?:پیام|متن|جمله|دستور|بنویس|نقل قول|میگه|گفت|گفته).{0,90}[«"“]/i.test(raw);
  const conditional=/(?:^|\s)(?:اگر|اگه|وقتی|هر وقت|در صورتی که)(?:\s|$)/i.test(raw);
  // Do not turn "صدای فیلم/کروم رو کم کن" into MASTER system volume.
  const scopedAudio=/(?:صدا|صدای|ولوم|volume).{0,45}(?:فیلم|ویدیو|پلیر|ترک|آهنگ|موزیک|یوتیوب|کروم|تلگرام|واتساپ|روبیکا|فتوشاپ|اسپاتیفای|برنامه|تب)|(?:فیلم|ویدیو|کروم|یوتیوب|تلگرام|اسپاتیفای|برنامه).{0,45}(?:صدا|صدای|ولوم|volume)/i.test(raw)
    &&/(?:کم|زیاد|قطع|وصل|بی صدا|میوت|ولوم|صدا|volume)/i.test(raw);
  const questionForm=/(?:کنم|بکنم|بفرستم|باز کنم|حذف کنم)\s*[؟?]\s*$/i.test(raw);
  const deferred=/(?:سر وقت|نه الان|نه همین الان|بعدا انجام|ساعت\s*\d{1,2}(?::\d{2})?\s*انجام|وقتی وقتش شد)/i.test(raw)
    &&!/(?:یادم بنداز|یادآوری کن)/i.test(raw);
  return {negated,explanatory,quotedPayload,conditional,deferred,scopedAudio,questionForm,allowDirect:!(negated||explanatory||quotedPayload||conditional||deferred||scopedAudio||questionForm)};
}
