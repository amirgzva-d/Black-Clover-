import { actionIntent } from './ActionIntent.js';

const norm=s=>String(s??'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLowerCase();

export const ACTION_MODES=[
  {
    id:'quick-control',title:'کنترل سریع سیستم',groups:['audio','display','settings','power'],
    description:'کنترل مستقیم صدا، نور، نمایشگر، تنظیمات و وضعیت‌های پایه Windows با کوتاه‌ترین مسیر قابل اعتماد.',
    hints:['volume','brightness','media','power','settings','updates'],
    pattern:/(صدا|ولوم|اسپیکر|میوت|بی.?صدا|نور|روشنایی|brightness|نمایشگر|مانیتور|بلوتوث|وای.?فای|خاموش|ری.?استارت|اسلیپ|قفل|volume|mute|restart|shutdown|sleep)/i,
    examples:['صدا رو یه ذره بیشتر کن','تا ته ببرش','نور خیلی زیاده کمش کن','مانیتور رو خاموش کن','بلوتوث رو باز کن']
  },
  {
    id:'media',title:'پخش و کنترل رسانه',groups:['audio','apps','files','storage','web','screen'],
    description:'پیدا کردن و پخش آهنگ، موسیقی، فیلم و ویدیو از فایل محلی یا سرویس وب و کنترل پخش.',
    hints:['media','youtube'],
    pattern:/(آهنگ|موزیک|موسیقی|فیلم|ویدیو|کلیپ|پخش کن|بزن پخش|pause|play|next|previous|یوتیوب)/i,
    examples:['یه آهنگ پخش کن','فیلمی که دیشب دانلود کردم رو باز کن','بعدی رو بزن','این ویدیو رو تو VLC پخش کن']
  },
  {
    id:'application',title:'برنامه‌ها و پنجره‌ها',groups:['apps','screen'],
    description:'کشف برنامه‌های نصب‌شده، باز/بسته/فوکوس کردن آن‌ها و ادامه کار داخل رابط گرافیکی.',
    hints:['apps','windowIntent'],
    pattern:/(برنامه|نرم.?افزار|اپ|بازش کن|بیارش بالا|اجراش کن|ببندش|پنجره|chrome|کروم|telegram|تلگرام|whatsapp|واتساپ|روبیکا|photoshop|فتوشاپ|illustrator|ایلوستریتور|excel|اکسل|word|ورد|vscode|vs code)/i,
    examples:['فتوشاپو بیار بالا','هرجا تلگرام نصبه بازش کن','پنجره اکسل رو بیار جلو','کروم منو باز کن']
  },
  {
    id:'files-storage',title:'فایل و حافظه',groups:['storage','files','clipboard'],
    description:'جستجو در حافظه و درایوها، پیدا/باز/تغییرنام/کپی/انتقال فایل و پوشه و کار با Clipboard.',
    hints:['files','storage','clipboard'],
    pattern:/(فایل|پوشه|فولدر|دایرکتوری|درایو|هارد|حافظه|دسکتاپ|دانلود|documents|rename|تغییر نام|کپی|منتقل|جابه.?جا|مسیر)/i,
    examples:['این فایل هرجا هست پیداش کن','برو تو پوشه پروژه','اسم این فایل رو عوض کن','اینارو ببر تو پوشه عکس‌ها']
  },
  {
    id:'web-research',title:'وب و تحقیق',groups:['web','research','knowledge'],
    description:'جستجوی Google/Web، خواندن منابع، تحقیق چندمنبعی و بازکردن سایت‌ها در مرورگر موجود کاربر.',
    hints:['web','youtube','maps','learning'],
    pattern:/(گوگل|وب|اینترنت|سایت|سرچ|جستجو|بگرد|تحقیق|منبع|آخرین|جدیدترین|research|search|browser|مرورگر)/i,
    examples:['تو گوگل بگرد','این موضوع رو تحقیق کن','جدیدترین نسخه رو پیدا کن','این سایت رو باز کن']
  },
  {
    id:'messaging',title:'پیام‌رسان و ارسال',groups:['social','screen','clipboard','files','storage'],
    description:'بازکردن پیام‌رسان یا نسخه وب، پیدا کردن مخاطب/چت و آماده‌سازی یا ارسال متن و فایل با UI Automation.',
    hints:['messaging'],
    pattern:/(پیام|بفرست|ارسال|تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اینستاگرام|instagram|دیسکورد|discord|مخاطب|چت)/i,
    examples:['این عکسو برای علی تو تلگرام بفرست','روبیکا رو تو کروم باز کن','به این چت پیام بده','فایل‌ها رو برای ارسال آماده کن']
  },
  {
    id:'office-spreadsheet',title:'Excel و Office',groups:['spreadsheet','files','storage','screen','clipboard'],
    description:'بازکردن و خواندن Excel، استخراج عکس/لینک، تغییر سلول‌ها، افزودن داده و کار با Office از طریق ابزار مستقیم یا UI.',
    hints:['spreadsheet'],
    pattern:/(اکسل|excel|xlsx|xlsm|شیت|سلول|ردیف|ستون|فرمول|ورک.?بوک|word|ورد|powerpoint|پاورپوینت|office)/i,
    examples:['اکسل فروش رو باز کن','عکس‌های داخل فایل رو بردار','این سلول رو اصلاح کن','لینک‌های شیت دوم رو دربیار']
  },
  {
    id:'creative-design',title:'طراحی و Adobe',groups:['apps','screen','files','storage','clipboard','web'],
    description:'کنترل Photoshop/Illustrator و نرم‌افزارهای طراحی با مشاهده UI، کلیک، تایپ، میانبر و فایل‌های محلی.',
    hints:['mouseIntent','keyboardIntent','windowIntent'],
    pattern:/(فتوشاپ|photoshop|ایلوستریتور|illustrator|طراحی|ادوبی|adobe|لایه|layer|canvas|تصویر|عکس.*ویرایش|ادیت عکس)/i,
    examples:['این عکس رو تو فتوشاپ باز کن','یه لایه جدید بساز','متن لوگو رو عوض کن','فایل رو برای طراحی باز کن']
  },
  {
    id:'coding',title:'کدنویسی و ساخت پروژه',groups:['coding','apps','files','storage','web','research'],
    description:'بازکردن پروژه در VS Code، خواندن/ویرایش کد، ساخت سایت/بازی/اپ، اجرای build/test و تحقیق فنی.',
    hints:['coding'],
    pattern:/(کد|کدنویسی|برنامه.?نویسی|vscode|vs code|پروژه|سایت بساز|بازی بساز|اپ بساز|npm|build|test|git|باگ|خطای کد|refactor)/i,
    examples:['این پروژه رو تو VS Code باز کن','یه سایت برام بساز','تست‌ها رو اجرا کن و خطا رو درست کن','این باگ رو پیدا کن']
  },
  {
    id:'install-maintenance',title:'نصب، حذف، آپدیت و تعمیر',groups:['apps','settings','windowsAdmin','web','research'],
    description:'پیدا کردن نرم‌افزار، نصب/حذف/آپدیت، بررسی خرابی برنامه و عیب‌یابی Windows یا برنامه‌ها.',
    hints:['install','uninstall','updates'],
    pattern:/(نصب|دانلود.*نصب|حذف برنامه|آن.?اینستال|uninstall|install|آپدیت|به.?روز|upgrade|خراب|مشکل برنامه|درستش کن|تعمیر|repair)/i,
    examples:['این برنامه رو نصب کن','تلگرام رو آپدیت کن','این برنامه مشکل داره بررسیش کن','این نرم‌افزار رو حذف کن']
  },
  {
    id:'system-admin',title:'مدیریت و عیب‌یابی Windows',groups:['system','windowsAdmin','settings'],
    description:'بررسی CPU/GPU/RAM/Disk/Network/Defender/Services/Event Logs و بازکردن ابزارهای مدیریتی Windows.',
    hints:['system','process'],
    pattern:/(سیستم|ویندوز|cpu|gpu|رم|ram|دیسک|disk|شبکه|dns|defender|فایروال|firewall|service|سرویس|startup|task manager|device manager|کند شده|خطای سیستم)/i,
    examples:['ببین چرا سیستم کند شده','وضعیت دیسک رو چک کن','خطاهای اخیر ویندوز رو ببین','برنامه‌های استارتاپ رو بررسی کن']
  },
  {
    id:'desktop-personalization',title:'Desktop و شخصی‌سازی',groups:['personalization','files','storage','screen','settings'],
    description:'مرتب‌کردن Desktop، تغییر Wallpaper و انجام کارهای شخصی‌سازی مرتبط با فایل‌ها و تنظیمات.',
    hints:[],
    pattern:/(دسکتاپ.*مرتب|مرتب.*دسکتاپ|پس.?زمینه|والپیپر|wallpaper|شخصی.?سازی|personalization)/i,
    examples:['دسکتاپمو مرتب کن','این عکس رو پس زمینه کن','فایل‌های دسکتاپ رو دسته‌بندی کن']
  },
  {
    id:'ai-browser',title:'هوش مصنوعی در وب و برنامه',groups:['aiBrains','web','screen','apps','clipboard'],
    description:'بازکردن سرویس‌های AI موجود، استفاده از جلسه ورود فعلی کاربر و تعامل با آن‌ها بدون درخواست رمز عبور.',
    hints:[],
    pattern:/(chatgpt|چت.?جی.?پی.?تی|claude|کلود|deepseek|دیپ.?سیک|qwen|کیون|هوش مصنوعی.*(?:باز|چت|بپرس)|ai.*chat)/i,
    examples:['چت جی پی تی رو باز کن','از دیپ سیک اینو بپرس','با هوش مصنوعی داخل کروم چت کن']
  },
  {
    id:'memory-schedule',title:'حافظه، یادداشت و یادآوری',groups:['memory','notes','scheduler'],
    description:'یادسپاری اطلاعات، پین‌کردن متن، ساخت/فهرست/لغو یادآوری و استفاده از حافظه شخصی محلی.',
    hints:['memory','notes'],
    pattern:/(یاد بگیر|یادت باشه|یادداشت|پین کن|یادم بنداز|یادآور|remind|schedule|حافظه)/i,
    examples:['این متن رو پین کن','فردا یادم بنداز','این رو یادت بمونه','یادآوری‌هام رو نشون بده']
  },
  {
    id:'workflow',title:'کار چندمرحله‌ای بین برنامه‌ها',groups:['workflowBridge','apps','screen','files','storage','clipboard'],
    description:'حفظ هدف نهایی و زنجیره کردن چند ابزار/برنامه؛ خروجی هر مرحله ورودی مرحله بعد می‌شود و کار تا نتیجه نهایی ادامه پیدا می‌کند.',
    hints:[],
    pattern:/(بعدش|سپس|بعد از اون|اول .* بعد|از .* بردار.*بفرست|باز کن.*(?:و بعد|بعدش)|پیدا کن.*(?:و بعد|بعدش))/i,
    examples:['اکسل رو باز کن عکس‌هاشو بردار بعد برای علی بفرست','فایل رو پیدا کن و بعد تو فتوشاپ بازش کن','تحقیق کن بعد نتیجه رو تو فایل ذخیره کن']
  },
  {
    id:'universal-execution',title:'اجرای عمومی کامپیوتر',groups:['workflowBridge','apps','screen','files','storage','web','system'],
    description:'Fallback عمومی برای درخواست اجرایی که در یک عنوان خاص جا نمی‌شود؛ هدف را از زبان طبیعی بفهم و با ابزارهای موجود اجرا و نتیجه را بررسی کن.',
    hints:[],pattern:null,examples:['این کارو برام انجام بده','همونی که گفتم رو اجرا کن','خودت راه انجامش رو پیدا کن و انجام بده']
  }
];

const hintMap=new Map();
for(const mode of ACTION_MODES)for(const hint of mode.hints||[]){if(!hintMap.has(hint))hintMap.set(hint,[]);hintMap.get(hint).push(mode.id);}
const byId=new Map(ACTION_MODES.map(x=>[x.id,x]));

export function detectActionModes(text='',hints=[]){
  const value=norm(text),intent=actionIntent(value),scores=new Map();
  const add=(id,score)=>scores.set(id,(scores.get(id)||0)+score);
  for(const mode of ACTION_MODES){if(mode.pattern?.test(value))add(mode.id,4);}
  for(const raw of hints){const h=String(raw||'').toLowerCase();for(const [key,ids] of hintMap)if(h.includes(key))for(const id of ids)add(id,3);}
  if(intent.multiStep)add('workflow',8);
  if(intent.gui)add('application',2);
  if(intent.fileLike)add('files-storage',2);
  if(intent.action&&!scores.size)add('universal-execution',5);
  return [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,score])=>({...byId.get(id),score}));
}

export function actionModeGroups(modes=[]){return [...new Set(modes.flatMap(m=>m.groups||[]))];}

export function actionModePrompt(modes=[]){
  if(!modes.length)return '';
  return modes.map(m=>`${m.title}: ${m.description}`).join(' | ');
}

export const ACTION_MODE_COUNT=ACTION_MODES.length;
export const ACTION_MODE_EXAMPLE_COUNT=ACTION_MODES.reduce((n,m)=>n+(m.examples?.length||0),0);
