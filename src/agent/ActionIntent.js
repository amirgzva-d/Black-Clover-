const norm=s=>String(s??'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLowerCase();

const actionWords=/(باز|اجرا|راه بنداز|راهش بنداز|بیار|بیاور|بنداز|بزن|بده|بکن|بذار|بگذار|ببند|پخش|کم|زیاد|بالا|پایین|تنظیم|برو|بگرد|سرچ|جستجو|پیدا|بردار|ور دار|بگیر|بفرست|ارسال|کپی|منتقل|جابه|تغییر|عوض|ویرایش|بنویس|تایپ|کلیک|دانلود|نصب|حذف|پاک|آپدیت|به.?روز|درست|تعمیر|بررسی|چک|بساز|کدنویسی|مرتب|ذخیره|سیو|rename|open|launch|play|search|find|send|copy|move|edit|install|uninstall|update|fix|build|save)/i;
const multiStepWords=/(بعدش|بعد از اون|بعد از آن|سپس|و بعد|بعدش هم|اول .* بعد|از .* بردار.*بفرست|باز کن.*(?:بعد|و).*|پیدا کن.*(?:بعد|و).*)/i;
const guiApps=/(فتوشاپ|photoshop|ایلوستریتور|illustrator|کروم|chrome|تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اکسل|excel|ورد|word|پاورپوینت|powerpoint|vscode|vs code|مرورگر)/i;
const fileLike=/(فایل|پوشه|فولدر|دسکتاپ|desktop|دانلود|downloads|اکسل|xlsx|xlsm|عکس|تصویر|ویدیو|فیلم|آهنگ|موزیک)/i;

export const ACTION_MODES=[
  {id:'audio',title:'کنترل صدا',description:'کم/زیاد/قطع/وصل کردن صدای سیستم',pattern:/(صدا|ولوم|اسپیکر|بلندگو|mute|unmute|volume)/i},
  {id:'display',title:'نور و نمایشگر',description:'روشنایی و تنظیمات نمایشگر',pattern:/(نور|روشنایی|brightness|مانیتور|نمایشگر)/i},
  {id:'media',title:'پخش رسانه',description:'پخش و کنترل آهنگ، فیلم و ویدیو',pattern:/(آهنگ|موزیک|موسیقی|فیلم|ویدیو|کلیپ|ترک|media|movie|video|play|pause|پخش)/i},
  {id:'apps',title:'برنامه‌ها',description:'پیدا کردن، باز کردن و کنترل برنامه‌های نصب‌شده',pattern:/(برنامه|نرم.?افزار|اپ|chrome|کروم|firefox|edge|telegram|تلگرام|whatsapp|واتساپ|rubika|روبیکا|discord|vscode|vs code|نوت.?پد|calculator)/i},
  {id:'web',title:'وب و جستجو',description:'مرورگر، گوگل، یوتیوب و وب',pattern:/(گوگل|google|وب|اینترنت|مرورگر|سایت|لینک|youtube|یوتیوب|سرچ|جستجو|بگرد)/i},
  {id:'files',title:'فایل و حافظه',description:'جستجو و کار با فایل‌ها، پوشه‌ها، تصاویر و درایوها',pattern:/(فایل|پوشه|فولدر|دایرکتوری|مسیر|درایو|هارد|حافظه|عکس|تصویر|desktop|دسکتاپ|downloads|دانلود|rename|کپی|جابه.?جا)/i},
  {id:'spreadsheet',title:'Excel',description:'خواندن، استخراج و ویرایش فایل‌های Excel',pattern:/(اکسل|excel|xlsx|xlsm|xls\b|workbook|worksheet|شیت|سلول|ردیف|ستون|فرمول)/i},
  {id:'social',title:'پیام‌رسان',description:'Telegram، WhatsApp، Rubika و ارسال فایل/پیام',pattern:/(تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اینستاگرام|instagram|discord|پیام|بفرست|ارسال)/i},
  {id:'creative',title:'Adobe و طراحی',description:'کار با Photoshop، Illustrator و گردش‌کارهای طراحی',pattern:/(فتوشاپ|photoshop|ایلوستریتور|illustrator|طراحی|ادیت عکس|ویرایش عکس|طرح|پوستر|بنر)/i},
  {id:'coding',title:'کدنویسی',description:'VS Code، ساخت سایت/بازی/اپ، تست و رفع باگ',pattern:/(کد|کدنویسی|برنامه.?نویسی|vscode|vs code|پروژه|سایت بساز|بازی بساز|اپ بساز|npm|git|build|test|باگ|debug|refactor)/i},
  {id:'software',title:'نصب و مدیریت نرم‌افزار',description:'نصب، حذف، آپدیت و ارتقای برنامه‌ها',pattern:/(نصب|دانلود.*نصب|حذف برنامه|آن.?اینستال|uninstall|install|upgrade|آپدیت برنامه|به.?روزرسانی برنامه|winget)/i},
  {id:'diagnostics',title:'عیب‌یابی',description:'بررسی خطا و مشکل برنامه یا Windows',pattern:/(مشکل|خراب|ارور|خطا|کند|عیب.?یابی|بررسی کن چرا|درستش کن|تعمیر|repair|diagnos|event log|defender|firewall|dns)/i},
  {id:'personalization',title:'دسکتاپ و شخصی‌سازی',description:'مرتب‌سازی دسکتاپ و تغییر پس‌زمینه',pattern:/(پس.?زمینه|والپیپر|wallpaper|مرتب.*دسکتاپ|دسکتاپ.*مرتب|ظاهر ویندوز)/i},
  {id:'settings',title:'تنظیمات Windows',description:'شبکه، بلوتوث، امنیت، Storage و Update',pattern:/(تنظیمات|settings|بلوتوث|شبکه|وای.?فای|امنیت ویندوز|windows update|آپدیت ویندوز|privacy|storage settings)/i},
  {id:'power',title:'برق و نشست',description:'قفل، Sleep، Restart و Shutdown',pattern:/(خاموش|ری.?استارت|restart|shutdown|sleep|اسلیپ|خواب|قفل|lock|sign.?out|خروج از حساب)/i},
  {id:'scheduler',title:'یادآور و زمان‌بندی',description:'یادآوری و کارهای زمان‌بندی‌شده',pattern:/(یادآور|یادم بنداز|remind|schedule|زمان.?بندی)/i},
  {id:'ui',title:'کنترل رابط کاربری',description:'دیدن صفحه، کلیک، تایپ، موس، کیبورد و پنجره‌ها',pattern:/(کلیک|موس|ماوس|کیبورد|تایپ|دکمه|پنجره|اسکرول|drag|درگ|screen|صفحه رو ببین|چی روی صفحه)/i},
  {id:'ai',title:'هوش مصنوعی',description:'باز کردن و کار با سرویس‌ها و مدل‌های AI',pattern:/(chatgpt|چت.?جی.?پی.?تی|claude|کلود|deepseek|دیپ.?سیک|qwen|کیون|هوش مصنوعی|ai)/i}
];

export function actionModes(text=''){
  const value=norm(text),modes=[];
  for(const mode of ACTION_MODES)if(mode.pattern.test(value))modes.push(mode.id);
  return [...new Set(modes)];
}
export function actionModeDetails(text=''){const ids=new Set(actionModes(text));return ACTION_MODES.filter(x=>ids.has(x.id)).map(({pattern,...rest})=>rest);}

export function actionIntent(text=''){
  const value=norm(text),modes=actionModes(value),action=actionWords.test(value);
  const multiStep=action&&(multiStepWords.test(value)||modes.length>=2&&/(و|بعد|سپس|بعدش)/i.test(value));
  return {action,multiStep,gui:action&&guiApps.test(value),fileLike:action&&fileLike.test(value),modes,primaryMode:modes[0]||null};
}

export function actionExecutionHint(text=''){
  const intent=actionIntent(text);if(!intent.action)return '';
  const details=actionModeDetails(text);
  return [
    'This is an EXECUTION request, not merely a request for instructions.',
    details.length?`Action modes: ${details.map(x=>`${x.title} (${x.description})`).join(' | ')}.`:'',
    'Interpret the Persian wording semantically. Do not require an exact command phrase, percentage wording, application alias, or rigid syntax.',
    'Execute the user goal with available tools and verify results before claiming success.',
    intent.multiStep?'This request is multi-step: keep the original end goal, carry outputs from one tool into the next, and continue until the requested final state is reached or a real blocker appears.':'Use the shortest reliable execution path.',
    intent.fileLike?'If a file/folder location is unknown, search the whole indexed storage first instead of asking for a path the agent can discover.':'',
    intent.gui?'For GUI applications/websites, focus the intended window, inspect accessible UI or vision before blind clicks, then act and verify. Reuse the user’s existing signed-in browser session; never request or expose passwords.':'',
    'If the application is not found by a familiar alias, discover installed apps first. If the workflow is unfamiliar, search learned skills and public documentation, then use available UI/computer tools rather than replying that the command is undefined.',
    'The host owns permission prompts. Do not invent an extra confirmation when the host has not requested one.'
  ].filter(Boolean).join(' ');
}
