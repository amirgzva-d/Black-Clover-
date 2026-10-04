const norm=s=>String(s??'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLowerCase();

const actionWords=/(باز|اجرا|راه بنداز|راهش بنداز|بیار|بیاور|بنداز|بزن|بده|بکن|کن|ببند|پخش|کم|زیاد|بالا|پایین|تنظیم|برو|بگرد|سرچ|جستجو|پیدا|بردار|ور دار|بگیر|بفرست|ارسال|کپی|منتقل|جابه|تغییر|عوض|ویرایش|بنویس|تایپ|کلیک|دانلود|نصب|حذف|پاک|آپدیت|به.?روز|درست|تعمیر|بررسی|چک|بساز|کدنویسی|مرتب|ذخیره|سیو|rename|open|launch|play|search|find|send|copy|move|edit|install|uninstall|update|fix|build|save)/i;
const multiStepWords=/(بعدش|بعد از اون|بعد از آن|سپس|و بعد|بعدش هم|اول .* بعد|از .* بردار.*بفرست|باز کن.*(?:بعد|و).*|پیدا کن.*(?:بعد|و).*)/i;
const guiApps=/(فتوشاپ|photoshop|ایلوستریتور|illustrator|کروم|chrome|تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اکسل|excel|ورد|word|پاورپوینت|powerpoint|vscode|vs code|مرورگر)/i;
const fileLike=/(فایل|پوشه|فولدر|دسکتاپ|desktop|دانلود|downloads|اکسل|xlsx|xlsm|عکس|تصویر|ویدیو|فیلم|آهنگ|موزیک)/i;

const MODE_PATTERNS=[
  ['audio',/(صدا|ولوم|اسپیکر|بلندگو|mute|unmute|volume)/i],
  ['display',/(نور|روشنایی|brightness|مانیتور|نمایشگر)/i],
  ['media',/(آهنگ|موزیک|موسیقی|فیلم|ویدیو|کلیپ|ترک|media|movie|video|play|pause|پخش)/i],
  ['apps',/(برنامه|نرم.?افزار|اپ|chrome|کروم|firefox|edge|telegram|تلگرام|whatsapp|واتساپ|rubika|روبیکا|discord|vscode|vs code|نوت.?پد|calculator)/i],
  ['web',/(گوگل|google|وب|اینترنت|مرورگر|سایت|لینک|youtube|یوتیوب|سرچ|جستجو|بگرد)/i],
  ['files',/(فایل|پوشه|فولدر|دایرکتوری|مسیر|درایو|هارد|حافظه|desktop|دسکتاپ|downloads|دانلود|rename|کپی|جابه.?جا)/i],
  ['spreadsheet',/(اکسل|excel|xlsx|xlsm|xls\b|workbook|worksheet|شیت|سلول|ردیف|ستون|فرمول)/i],
  ['social',/(تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اینستاگرام|instagram|discord|پیام|بفرست|ارسال)/i],
  ['creative',/(فتوشاپ|photoshop|ایلوستریتور|illustrator|طراحی|ادیت عکس|ویرایش عکس|طرح|پوستر|بنر)/i],
  ['coding',/(کد|کدنویسی|برنامه.?نویسی|vscode|vs code|پروژه|سایت بساز|بازی بساز|اپ بساز|npm|git|build|test|باگ|debug|refactor)/i],
  ['software',/(نصب|دانلود.*نصب|حذف برنامه|آن.?اینستال|uninstall|install|upgrade|آپدیت برنامه|به.?روزرسانی برنامه|winget)/i],
  ['diagnostics',/(مشکل|خراب|ارور|خطا|کند|عیب.?یابی|بررسی کن چرا|درستش کن|تعمیر|repair|diagnos|event log|defender|firewall|dns)/i],
  ['personalization',/(پس.?زمینه|والپیپر|wallpaper|مرتب.*دسکتاپ|دسکتاپ.*مرتب|ظاهر ویندوز)/i],
  ['settings',/(تنظیمات|settings|بلوتوث|شبکه|وای.?فای|امنیت ویندوز|windows update|آپدیت ویندوز|privacy|storage settings)/i],
  ['power',/(خاموش|ری.?استارت|restart|shutdown|sleep|اسلیپ|خواب|قفل|lock|sign.?out|خروج از حساب)/i],
  ['scheduler',/(یادآور|یادم بنداز|remind|schedule|زمان.?بندی)/i],
  ['ui',/(کلیک|موس|ماوس|کیبورد|تایپ|دکمه|پنجره|اسکرول|drag|درگ|screen|صفحه رو ببین|چی روی صفحه)/i],
  ['ai',/(chatgpt|چت.?جی.?پی.?تی|claude|کلود|deepseek|دیپ.?سیک|qwen|کیون|هوش مصنوعی|ai)/i]
];

export function actionModes(text=''){
  const value=norm(text),modes=[];
  for(const [name,re] of MODE_PATTERNS)if(re.test(value))modes.push(name);
  return [...new Set(modes)];
}

export function actionIntent(text=''){
  const value=norm(text),modes=actionModes(value),action=actionWords.test(value);
  const multiStep=action&&(multiStepWords.test(value)||modes.length>=2&&/(و|بعد|سپس|بعدش)/i.test(value));
  return {action,multiStep,gui:action&&guiApps.test(value),fileLike:action&&fileLike.test(value),modes,primaryMode:modes[0]||null};
}

export function actionExecutionHint(text=''){
  const intent=actionIntent(text);if(!intent.action)return '';
  return [
    'This is an EXECUTION request, not merely a request for instructions.',
    intent.modes.length?`Action modes: ${intent.modes.join(', ')}.`:'',
    'Interpret the Persian wording semantically. Do not require an exact command phrase, percentage wording, application alias, or rigid syntax.',
    'Execute the user goal with available tools and verify results before claiming success.',
    intent.multiStep?'This request is multi-step: keep the original end goal, carry outputs from one tool into the next, and continue until the requested final state is reached or a real blocker appears.':'Use the shortest reliable execution path.',
    intent.fileLike?'If a file/folder location is unknown, search the whole indexed storage first instead of asking for a path the agent can discover.':'',
    intent.gui?'For GUI applications/websites, focus the intended window, inspect accessible UI or vision before blind clicks, then act and verify. Reuse the user’s existing signed-in browser session; never request or expose passwords.':'',
    'If the application is not found by a familiar alias, discover installed apps first. If the workflow is unfamiliar, search learned skills and public documentation, then use available UI/computer tools rather than replying that the command is undefined.',
    'The host owns permission prompts. Do not invent an extra confirmation when the host has not requested one.'
  ].filter(Boolean).join(' ');
}
