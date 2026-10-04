const norm=s=>String(s??'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLowerCase();

const actionWords=/(باز|اجرا|راه بنداز|بیار|بنداز|ببند|پخش|کم|زیاد|بالا|پایین|تنظیم|برو|بگرد|سرچ|جستجو|پیدا|بردار|بفرست|ارسال|کپی|منتقل|جابه|تغییر|عوض|ویرایش|بنویس|تایپ|کلیک|دانلود|نصب|حذف|پاک|آپدیت|به.?روز|درست|تعمیر|بررسی|چک|بساز|کدنویسی|مرتب|ذخیره|سیو|rename|open|launch|play|search|find|send|copy|move|edit|install|uninstall|update|fix|build|save)/i;
const multiStep=/(بعدش|بعد از اون|بعد از آن|سپس|و بعد|بعدش هم|از .* بردار.*بفرست|باز کن.*(?:بعد|و).*|پیدا کن.*(?:بعد|و).*|اول .* بعد)/i;
const guiApps=/(فتوشاپ|photoshop|ایلوستریتور|illustrator|کروم|chrome|تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اکسل|excel|ورد|word|پاورپوینت|powerpoint|vscode|vs code|مرورگر)/i;
const fileLike=/(فایل|پوشه|فولدر|دسکتاپ|desktop|دانلود|downloads|اکسل|xlsx|xlsm|عکس|تصویر|ویدیو|فیلم|آهنگ|موزیک)/i;

export function actionIntent(text=''){
  const value=norm(text);
  const action=actionWords.test(value);
  return {action,multiStep:action&&multiStep.test(value),gui:action&&guiApps.test(value),fileLike:action&&fileLike.test(value)};
}

export function actionExecutionHint(text=''){
  const intent=actionIntent(text);if(!intent.action)return '';
  return [
    'This is an EXECUTION request, not merely a request for instructions.',
    'Interpret the Persian wording semantically. Do not require an exact command phrase, percentage wording, application alias, or rigid syntax.',
    'Execute the user goal with available tools and verify results before claiming success.',
    intent.multiStep?'This request is multi-step: keep the original end goal, carry outputs from one tool into the next, and continue until the requested final state is reached or a real blocker appears.':'Use the shortest reliable execution path.',
    intent.fileLike?'If a file/folder location is unknown, search the whole indexed storage first instead of asking for a path the agent can discover.':'',
    intent.gui?'For GUI applications/websites, focus the intended window, inspect accessible UI or vision before blind clicks, then act and verify. Reuse the user’s existing signed-in browser session; never request or expose passwords.':'',
    'If the application is not found by a familiar alias, discover installed apps first. If the workflow is unfamiliar, search learned skills and public documentation, then use available UI/computer tools rather than replying that the command is undefined.',
    'The host owns permission prompts. Do not invent an extra confirmation when the host has not requested one.'
  ].filter(Boolean).join(' ');
}
