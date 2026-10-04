const uniq=a=>[...new Set(a)];
const groups={
  memory:['remember_fact','recall_memory','list_recent_memories','update_memory','forget_memory','permission_status','protect_resource','unprotect_resource'],
  research:['live_web_search','read_web_page','wikipedia_search','research_topic','web_search','open_url'],
  apps:['find_app','list_installed_apps','launch_app','close_app','winget_search','install_app','uninstall_app','list_winget_upgrades','upgrade_app'],
  files:['list_directory','file_info','read_text_file','create_folder','write_text_file','delete_path','open_folder','open_file','search_files','rename_path','move_path','copy_path','create_text_file','append_text_file','open_downloads','open_desktop'],
  clipboard:['copy_to_clipboard','read_clipboard'],
  screen:['take_screenshot','list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','move_mouse','mouse_click','mouse_scroll'],
  audio:['get_volume','set_volume','volume_up','volume_down','toggle_mute','media_play_pause','media_next','media_previous'],
  display:['get_brightness','set_brightness','open_display_settings'],
  settings:['open_display_settings','open_sound_settings','open_bluetooth_settings','open_network_settings','open_apps_settings','open_storage_settings','open_privacy_settings','open_windows_security','check_windows_update'],
  power:['lock_pc','sleep_pc','shutdown_pc','restart_pc','sign_out'],
  social:['open_social_web','open_web_search_in_service','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','focus_window','list_windows'],
  web:['open_url','web_search','youtube_search','google_maps_search','open_web_search_in_service','live_web_search','read_web_page','research_topic'],
  system:['get_system_info','get_time','list_processes','list_windows'],
  coding:['inspect_project','run_project_task','read_text_file','write_text_file','create_text_file','append_text_file','search_files','list_directory','file_info','live_web_search','read_web_page','research_topic'],
  scheduler:['get_time','create_reminder','list_reminders','cancel_reminder'],
  permissions:['permission_status','set_permission_profile','protect_resource','unprotect_resource']
};
const patterns=[
  ['memory',/(یاد|حافظه|remember|فراموش|ترجیح|اسمم|هیچ.?وقت|هرگز)/i],['research',/(جدیدترین|آخرین\s+(?:خبر|اطلاعات|نسخه|قیمت|وضعیت)|خبر(?:های)?\s+(?:امروز|جدید)|تحقیق|منبع|اینترنت|آنلاین|research|latest|current\s+(?:news|info|version|price)|وب)/i],['apps',/(برنامه|نرم.?افزار|اپ|نصب|حذف برنامه|آپدیت برنامه|winget|install|uninstall|upgrade|chrome|firefox|telegram|واتساپ|discord|vscode)/i],['files',/(فایل|پوشه|دایرکتوری|مسیر|rename|copy|move|جابه.?جا|کپی|دانلود|دسکتاپ|documents)/i],['clipboard',/(کلیپ.?بورد|clipboard|کپی کن|متن کپی)/i],['screen',/(صفحه|اسکرین|پنجره|کلیک|موس|ماوس|کیبورد|تایپ|دکمه|ببین چی روی صفحه|چی می.?بینی|screen|window|click|mouse|keyboard|vision)/i],['audio',/(صدا|ولوم|بی.?صدا|موزیک|آهنگ|پخش|volume|mute|media)/i],['display',/(نور|روشنایی|brightness|نمایشگر|مانیتور)/i],['settings',/(تنظیمات|بلوتوث|شبکه|وای.?فای|storage|privacy|security|windows update)/i],['power',/(خاموش|ری.?استارت|قفل|اسلیپ|خروج از حساب|shutdown|restart|sleep|lock)/i],['social',/(تلگرام|telegram|واتساپ|whatsapp|اینستاگرام|instagram|دیسکورد|discord|پیام بده|پیام بفرست)/i],['web',/(گوگل|یوتیوب|youtube|نقشه|maps|سایت|لینک|مرورگر|search|سرچ)/i],['coding',/(کد|برنامه.?نویسی|پروژه|npm|build|test|گیت|git|سایت بساز|بازی بساز|اپ بساز|coding)/i],['scheduler',/(یادآور|یادم بنداز|ساعت .* بگو|فردا .* یاد|remind|schedule|زمان.?بندی)/i],['permissions',/(مجوز|دسترسی|permission|محافظت|حذف نکن|پاک نکن)/i],['system',/(سیستم|رم|پردازنده|process|فرایند|زمان|ساعت|تاریخ)/i]
];
export function selectToolNames(text,hints=[]){const selected=[],s=String(text||'');for(const [group,re] of patterns)if(re.test(s))selected.push(...(groups[group]||[]));for(const hint of hints){const key=String(hint).toLowerCase();for(const [group,names] of Object.entries(groups))if(key.includes(group))selected.push(...names);}if(!selected.length&&/(انجام|باز کن|ببند|کم کن|زیاد کن|برو|اجرا|کنترل)/i.test(s))selected.push(...groups.system,...groups.apps,...groups.screen);return uniq(selected).slice(0,44);}
export const TOOL_GROUPS=groups;
