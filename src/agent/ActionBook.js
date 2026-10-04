const clean=s=>String(s??'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();
const words=s=>[...new Set(clean(s).split(' ').filter(x=>x.length>1))];
const score=(recipe,query)=>{const q=new Set(words(query)),all=words([recipe.title,...recipe.triggers,...recipe.intent].join(' '));let hit=0;for(const w of all)if(q.has(w))hit++;return hit/Math.max(1,Math.min(q.size||1,all.length||1));};
const r=(id,title,intent,triggers,steps,notes='')=>({id,title,intent,triggers,steps,notes});

export const ACTION_BOOK=[
  r('volume-relative','کم/زیاد کردن صدا','تغییر نسبی صدای ویندوز',['صدا رو زیاد کن','کمترش کن','ولوم بالا','آرومتر'],['get_volume','volume_up|volume_down'],'برای جمله‌های نسبی درصد لازم نیست.'),
  r('volume-max','صدا تا انتها','بردن صدای ویندوز به بیشینه یا کمینه',['صدا رو تا ته ببر','فولش کن','صدش کن','تا کف'],['set_volume'],'عبارت‌های محاوره‌ای مثل ته، سقف، فول و کف را معنایی تفسیر کن.'),
  r('brightness','نور نمایشگر','کنترل روشنایی نمایشگر',['نور رو کم کن','روشن‌ترش کن','نور تا ته','تا کف'],['get_brightness','brightness_up|brightness_down|set_brightness']),
  r('play-local-media','پخش فایل رسانه‌ای محلی','پیدا کردن آهنگ/فیلم در کل درایوها و بازکردن آن',['فیلم فلان رو پخش کن','آهنگ فلان رو باز کن'],['global_find_files','open_named_file']),
  r('open-installed-app','بازکردن برنامه نصب‌شده','پیدا کردن برنامه با نام انسانی و اجرا',['فتوشاپ رو باز کن','برنامه حسابداری رو بیار بالا','کروم رو اجرا کن'],['find_any_app','launch_any_app']),
  r('chrome-search','جستجو حتماً در Chrome','باز کردن جستجوی وب در Google Chrome',['تو کروم سرچ کن','با کروم گوگل کن','حتما کروم'],['chrome_search']),
  r('chrome-service','بازکردن سرویس وب در Chrome','باز کردن Telegram/WhatsApp/Rubika/AI portals در Chrome',['تلگرام وب تو کروم','روبیکا رو در کروم باز کن','ChatGPT تو کروم'],['chrome_open_service']),
  r('find-file-anywhere','پیدا کردن فایل در کل سیستم','وقتی مسیر فایل معلوم نیست آن را در همه fixed driveهای قابل دسترسی پیدا کن',['فایل اکسل فروش کجاست','گزارش 1405 رو پیدا کن','هرجا هست بازش کن'],['global_find_files','open_named_file']),
  r('open-folder-anywhere','پیدا و بازکردن پوشه','پیدا کردن پوشه با نام و بازکردن Explorer',['پوشه پروژه رو پیدا کن','برو تو پوشه قراردادها'],['global_find_files','open_folder']),
  r('excel-read','خواندن Excel','پیدا کردن workbook و خواندن شیت/سلول/فرمول',['اکسل فروش رو بخون','شیت اول رو بررسی کن'],['global_find_files','excel_list_sheets','excel_read_range']),
  r('excel-edit','ویرایش Excel با پشتیبان','ویرایش سلول/ردیف و ذخیره با backup',['این سلول رو عوض کن','ردیف اضافه کن'],['excel_set_cells|excel_append_rows'],'ویرایش ماندگار نیازمند تأیید میزبان است.'),
  r('excel-images-to-telegram','عکس‌های Excel به Telegram','استخراج embedded/linked images و ارسال به مخاطب دقیق',['عکس های اکسل رو برای علی تلگرام بفرست'],['global_find_files','excel_collect_images','messenger_stage_files','inspect_ui','vision_inspect_screen','invoke_ui_element|type_text|press_key'],'قبل از ارسال مخاطب/گروه را روی صفحه تأیید بصری کن.'),
  r('excel-images-to-rubika','عکس‌های Excel به Rubika Web','استخراج تصاویر workbook و ارسال در Rubika داخل Chrome',['عکس های اکسل رو روبیکا وب برای شرکت بفرست'],['excel_collect_images','chrome_open_service','copy_files_to_clipboard','inspect_ui','vision_inspect_screen','type_text|press_key']),
  r('forward-last-message','فوروارد آخرین پیام','بازکردن چت مبدا، انتخاب آخرین پیام و فوروارد به مقصدهای خواسته‌شده',['آخرین پیام شرکت رو فوروارد کن','پیام آخری رو تو گروه ها بفرست'],['chrome_open_service','inspect_ui','vision_inspect_screen','invoke_ui_element|mouse_click|press_key'],'از نام چت و مقصد دقیق استفاده کن؛ اگر چند مورد همنام است قبل از ارسال از قرائن صفحه استفاده کن.'),
  r('download-last-photo-relay','دانلود آخرین عکس و ارسال جای دیگر','آخرین تصویر یک چت را دانلود و در پیام‌رسان دیگر ارسال کن',['آخرین عکس رو دانلود کن و روبیکا بفرست'],['chrome_open_service','inspect_ui','vision_inspect_screen','invoke_ui_element|mouse_click','global_find_files','copy_files_to_clipboard','type_text|press_key']),
  r('message-folder-batch','ارسال به گروه‌های یک پوشه','در Telegram Web پوشه/فیلتر مشخص را باز کن و پیام را به گروه‌های داخل آن ارسال کن',['گروه های پوشه اوکی','به همه گروه های این فولدر بفرست'],['chrome_open_service','inspect_ui','vision_inspect_screen','invoke_ui_element|mouse_click|type_text|press_key'],'پوشه مجازی داخل پیام‌رسان را با پوشه فایل ویندوز اشتباه نگیر.'),
  r('photoshop-edit','کار با Photoshop','بازکردن Photoshop و انجام کار از طریق UI Automation/Vision',['فتوشاپ این عکس رو ادیت کن','پوستر رو باز کن'],['launch_any_app','open_named_file','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element|set_ui_value|type_text|press_key|mouse_click'],'Save/Save As نیازمند تأیید میزبان است.'),
  r('illustrator-edit','کار با Illustrator','بازکردن Illustrator و اجرای گردش‌کار طراحی از طریق UI/Vision',['ایلوستریتور لوگو رو باز کن','طرح رو ویرایش کن'],['launch_any_app','open_named_file','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element|set_ui_value|press_key|mouse_click'],'Save/Save As نیازمند تأیید میزبان است.'),
  r('ai-web-chat','کار با هوش مصنوعی وب','بازکردن AI portal در Chrome و تعامل با session لاگین‌شده',['با ChatGPT چت کن','از DeepSeek بپرس','Qwen رو باز کن'],['chrome_open_service','inspect_ui','vision_inspect_screen','set_ui_value|type_text|press_key'],'هرگز رمز عبور درخواست یا استخراج نکن؛ CAPTCHA را دور نزن.'),
  r('build-website','ساخت سایت','ساخت/ویرایش پروژه و اجرای test/build',['یه سایت بساز','این سایت رو کامل کن'],['inspect_project','read_project_file','write_project_file|replace_project_text','project_quality_task']),
  r('build-game','ساخت بازی','ساخت پروژه بازی و تست/بیلد با ابزارهای کدنویسی',['یه بازی بساز','پروژه بازی رو درست کن'],['inspect_project','write_project_file|replace_project_text','project_quality_task']),
  r('diagnose-app','عیب‌یابی برنامه','بررسی process/error logs، تحقیق وب و UI برنامه',['این برنامه مشکل داره','ارورش رو پیدا کن و درستش کن'],['list_processes','recent_system_errors','inspect_ui','vision_inspect_screen','live_web_search|research_topic']),
  r('install-software','نصب برنامه','جستجوی winget و نصب پس از تأیید',['فلان برنامه رو نصب کن'],['winget_search','install_app'],'نصب همیشه تأیید می‌خواهد.'),
  r('upgrade-software','آپدیت برنامه','ارتقای برنامه با winget و fallback وب/Chrome',['این برنامه رو آپدیت کن'],['list_winget_upgrades','upgrade_app','live_web_search|chrome_search','inspect_ui|vision_inspect_screen']),
  r('uninstall-software','حذف برنامه','حذف نرم‌افزار با تأیید',['این برنامه رو پاک کن'],['uninstall_app'],'حذف همیشه تأیید می‌خواهد.'),
  r('windows-update','Windows Update','اسکن/بازکردن Windows Update و ادامه از UI',['ویندوز رو آپدیت کن','آپدیت های سیستم رو چک کن'],['check_windows_update','inspect_ui','vision_inspect_screen','invoke_ui_element'],'نصب آپدیت سیستم باید با قواعد امنیتی میزبان انجام شود.'),
  r('organize-desktop','مرتب‌کردن Desktop','دسته‌بندی فایل‌های معمولی دسکتاپ بدون حذف',['دسکتاپ رو مرتب کن'],['organize_desktop']),
  r('wallpaper','تغییر Wallpaper','پیدا کردن تصویر و تنظیم پس‌زمینه',['پس زمینه رو این عکس بذار'],['global_find_files','set_wallpaper']),
  r('scheduled-reminder','یادآوری ساده','در زمان مشخص فقط اعلان بده',['ساعت 8 یادم بنداز','فردا یادآوری کن'],['create_reminder']),
  r('scheduled-action','کار زمان‌بندی‌شده اجرایی','در زمان مشخص دوباره همان دستور را وارد Agent کن و واقعاً اجرا کن',['ساعت 8 تحقیق کن','فردا عکس ها رو بفرست','هر روز این گزارش رو آماده کن'],['create_scheduled_action'],'اگر هنگام اجرا یک مرحله حساس نیازمند تأیید شد، آن مرحله خودکار تأیید نشود.'),
  r('scheduled-research','تحقیق زمان‌بندی‌شده','در زمان مقرر تحقیق چندمنبعی انجام بده و نتیجه را گزارش کن',['فردا این موضوع رو تحقیق کن'],['create_scheduled_action','research_topic']),
  r('learn-unfamiliar','یادگیری کار ناآشنا','کمبود مهارت را ثبت، از منابع عمومی تحقیق و به دانش پایدار اضافه کن',['این کار رو بلد نیستی یاد بگیر','روش انجامش رو پیدا کن'],['search_action_book','search_learned_skills','research_topic','teach_skill']),
  r('repair-from-docs','رفع مشکل با مستندات','خطا را استخراج، مستندات رسمی/وب را بخوان و با ابزار موجود اقدام کن',['مشکل رو از گوگل پیدا کن و درستش کن'],['recent_system_errors','research_topic','search_action_book','inspect_ui|vision_inspect_screen']),
  r('rename-file','تغییر نام فایل','فایل را در کل سیستم پیدا و rename کن',['اسم این فایل رو عوض کن'],['global_find_files','rename_path']),
  r('copy-move-file','کپی یا جابه‌جایی فایل','فایل را پیدا و به مقصد خواسته‌شده کپی/منتقل کن',['این فایل رو ببر پوشه پروژه','ازش کپی بگیر'],['global_find_files','copy_path|move_path']),
  r('browser-ui-workflow','کار چندمرحله‌ای وب','Chrome را باز کن، UI را بخوان، با Vision در صورت نیاز ادامه بده و نتیجه را بررسی کن',['برو تو سایت و این کار رو انجام بده'],['chrome_open_url|chrome_search','inspect_ui','vision_inspect_screen','invoke_ui_element|set_ui_value|type_text|press_key|mouse_click'])
];

export function searchActionBook(query,{limit=8}={}){
  const n=Math.max(1,Math.min(Number(limit)||8,20));
  return ACTION_BOOK.map(x=>({...x,score:score(x,query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,n);
}
export function actionBookStatus(){return {recipes:ACTION_BOOK.length,categories:[...new Set(ACTION_BOOK.map(x=>x.id.split('-')[0]))].length};}
