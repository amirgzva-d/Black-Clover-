import { actionIntent } from './ActionIntent.js';
const uniq=a=>[...new Set(a)];
const groups={
  memory:['remember_fact','recall_memory','list_recent_memories','update_memory','forget_memory','permission_status','protect_resource','unprotect_resource'],
  notes:['create_pinned_note','list_pinned_notes','update_pinned_note','recall_memory'],
  learning:['search_action_book','action_book_status','search_learned_skills','learning_status','teach_skill','forget_learned_skill','research_topic','live_web_search','read_web_page'],
  research:['live_web_search','read_web_page','wikipedia_search','research_topic','web_search','chrome_search','open_url','search_action_book','search_learned_skills'],
  knowledge:['live_web_search','read_web_page','wikipedia_search','research_topic'],
  aiBrains:['ai_provider_status','open_ai_portal','chrome_open_service','search_action_book','search_learned_skills','open_url','web_search','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key'],
  apps:['find_app','find_any_app','list_installed_apps','launch_app','launch_any_app','close_app','winget_search','install_app','uninstall_app','list_winget_upgrades','upgrade_app','search_action_book','search_learned_skills'],
  storage:['storage_overview','global_find_files','open_named_file','reveal_named_file','open_named_folder','list_directory','file_info','open_folder','open_file','search_files','search_action_book','search_learned_skills'],
  files:['global_find_files','open_named_file','reveal_named_file','open_named_folder','list_directory','file_info','read_text_file','create_folder','write_text_file','delete_path','open_folder','open_file','search_files','rename_path','move_path','copy_path','create_text_file','append_text_file','open_downloads','open_desktop','search_action_book','search_learned_skills'],
  spreadsheet:['global_find_files','open_named_file','excel_status','excel_list_sheets','excel_read_range','excel_set_cells','excel_append_rows','excel_add_image','excel_list_hyperlinks','excel_collect_images','copy_files_to_clipboard','search_action_book','search_learned_skills'],
  clipboard:['copy_to_clipboard','read_clipboard','copy_files_to_clipboard'],
  screen:['take_screenshot','list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','move_mouse','mouse_click','mouse_scroll','search_learned_skills'],
  audio:['get_volume','set_volume','volume_up','volume_down','set_mute','toggle_mute','media_play_pause','media_next','media_previous'],
  media:['global_find_files','open_named_file','open_file','launch_any_app','find_any_app','youtube_search','chrome_search','web_search','media_play_pause','media_next','media_previous','search_action_book','search_learned_skills'],
  display:['get_brightness','set_brightness','brightness_up','brightness_down','open_display_settings','turn_off_display'],
  personalization:['set_wallpaper','organize_desktop','open_desktop','global_find_files','search_action_book','search_learned_skills'],
  settings:['open_display_settings','open_sound_settings','open_bluetooth_settings','open_network_settings','open_apps_settings','open_storage_settings','open_privacy_settings','open_windows_security','check_windows_update'],
  power:['lock_pc','sleep_pc','shutdown_pc','restart_pc','sign_out','get_power_plan','get_battery_status'],
  social:['messenger_open','messenger_stage_files','copy_files_to_clipboard','open_social_web','chrome_open_service','global_find_files','excel_collect_images','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','focus_window','list_windows','search_action_book','search_learned_skills'],
  creative:['find_any_app','launch_any_app','global_find_files','open_named_file','copy_files_to_clipboard','list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','move_mouse','mouse_click','mouse_scroll','search_action_book','search_learned_skills','live_web_search'],
  web:['chrome_status','chrome_open_url','chrome_search','chrome_open_service','open_url','web_search','youtube_search','google_maps_search','open_web_search_in_service','live_web_search','read_web_page','research_topic','search_action_book','search_learned_skills'],
  system:['get_system_info','get_time','list_processes','list_windows','storage_overview','get_battery_status','get_cpu_details','get_gpu_details','get_memory_details','list_fixed_disks'],
  windowsAdmin:['get_disk_health','list_network_adapters','get_network_configuration','list_wifi_profiles','flush_dns_cache','renew_network_lease','get_firewall_status','get_defender_status','run_defender_quick_scan','list_services','start_service','stop_service','restart_service','list_startup_commands','list_scheduled_tasks','recent_system_errors','recent_system_warnings','get_power_plan','set_power_mode_balanced','set_power_mode_high_performance','open_task_manager','open_device_manager','open_event_viewer','open_services_console','open_system_information','open_disk_management','open_resource_monitor','run_sfc_scan','run_dism_health_scan','run_dism_restore_health','clean_user_temp_files','empty_recycle_bin','list_optional_features'],
  coding:['inspect_project','run_project_task','project_search_text','read_project_file','replace_project_text','write_project_file','project_quality_task','git_create_branch','git_commit_changes','global_find_files','list_directory','file_info','live_web_search','read_web_page','research_topic','search_action_book','search_learned_skills','ai_provider_status','find_any_app','launch_any_app'],
  scheduler:['get_time','create_reminder','create_scheduled_action','list_reminders','cancel_reminder','search_action_book'],
  wellbeing:['wellbeing_status','remind_eye_break','remind_move_body','remind_posture','remind_hydration','remind_meal_break','remind_sleep_wind_down','remind_focus_reset','remind_breathing_pause','remind_wrist_stretch','remind_neck_stretch','remind_back_stretch','remind_screen_distance','remind_brightness_comfort','remind_audio_comfort','remind_ventilation','remind_workspace_reset','remind_deep_work_pace','remind_long_session_break','remind_late_night_pause','remind_quiet_pause'],
  permissions:['permission_status','set_permission_profile','protect_resource','unprotect_resource'],
  workflowBridge:['search_action_book','search_learned_skills','find_any_app','launch_any_app','global_find_files','open_named_file','list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','copy_files_to_clipboard','chrome_open_url','chrome_search','chrome_open_service','open_url','web_search','research_topic']
};
const patterns=[
  ['memory',/(یاد|حافظه|remember|فراموش|ترجیح|اسمم|هیچ.?وقت|هرگز)/i],
  ['notes',/(یادداشت|نوت|متن مهم|پین کن|پین شده|prompt|پرامپت|نوشته مهم)/i],
  ['learning',/(یاد بگیر|بلد نیست|بلدی|مهارت|روش انجام|چطور انجام|خودت یاد|learn|skill|workflow|نمی.?دونی|نمی.?دانی|خودت رو بهتر|خودت را بهتر|گزارش.*بلد نیست)/i],
  ['research',/(جدیدترین|آخرین\s+(?:خبر|اطلاعات|نسخه|قیمت|وضعیت)|خبر(?:های)?\s+(?:امروز|جدید)|تحقیق|منبع|اینترنت|آنلاین|research|latest|current\s+(?:news|info|version|price)|وب)/i],
  ['aiBrains',/(chatgpt|چت.?جی.?پی.?تی|openai|اوپن.?ای.?آی|claude|کلود|anthropic|آنتروپیک|deepseek|دیپ.?سیک|qwen|کیون|هوش مصنوعی.*(?:باز|وصل|استفاده)|مدل.*(?:آنلاین|هوش))/i],
  ['apps',/(برنامه|نرم.?افزار|اپ|نصب|حذف برنامه|آپدیت برنامه|winget|install|uninstall|upgrade|chrome|کروم|firefox|telegram|تلگرام|واتساپ|whatsapp|روبیکا|discord|vscode|فتوشاپ|photoshop|illustrator|ایلوستریتور|word|ورد|powerpoint|پاورپوینت)/i],
  ['spreadsheet',/(اکسل|excel|xlsx|xlsm|xls\b|سلول|شیت|worksheet|workbook|جدول اکسل|فرمول|ستون|ردیف|سطر)/i],
  ['storage',/(کل حافظه|کل سیستم|کل درایو|همه درایو|اسم فایل|فایل.*پیدا|پیداش کن|جستجوی فایل|search.*file|find.*file|storage|drive|هرجا.*فایل)/i],
  ['files',/(فایل|پوشه|فولدر|دایرکتوری|مسیر|rename|اسم.*عوض|تغییر نام|copy|move|جابه.?جا|کپی|دانلود|دسکتاپ|documents)/i],
  ['personalization',/(پس.?زمینه|والپیپر|wallpaper|دسکتاپ.*مرتب|مرتب.*دسکتاپ|desktop.*organize)/i],
  ['clipboard',/(کلیپ.?بورد|clipboard|کپی کن|متن کپی)/i],
  ['screen',/(صفحه|اسکرین|پنجره|کلیک|موس|ماوس|کیبورد|تایپ|دکمه|ببین چی روی صفحه|چی می.?بینی|screen|window|click|mouse|keyboard|vision)/i],
  ['audio',/(صدا|ولوم|بی.?صدا|اسپیکر|volume|mute)/i],
  ['media',/(موزیک|آهنگ|موسیقی|فیلم|ویدیو|کلیپ|ترک|پخش|movie|video|media)/i],
  ['display',/(نور|روشنایی|brightness|نمایشگر|مانیتور|صفحه.*خاموش)/i],
  ['settings',/(تنظیمات|بلوتوث|شبکه|وای.?فای|storage|privacy|security|windows update)/i],
  ['power',/(خاموش|ری.?استارت|قفل|اسلیپ|خواب|خروج از حساب|shutdown|restart|sleep|lock|باتری|power plan)/i],
  ['social',/(تلگرام|telegram|واتساپ|whatsapp|روبیکا|rubika|اینستاگرام|instagram|دیسکورد|discord|پیام بده|پیام بفرست|فوروارد|forward|بفرست.*(?:فایل|عکس|تصویر|پیام)|ارسال.*(?:فایل|عکس|تصویر|پیام)|آخرین پیام|آخرین عکس)/i],
  ['creative',/(فتوشاپ|photoshop|ایلوستریتور|illustrator|طراحی|ادیت عکس|ویرایش عکس|پوستر|بنر)/i],
  ['web',/(گوگل|کروم|chrome|یوتیوب|youtube|نقشه|maps|سایت|لینک|مرورگر|search|سرچ|جستجو|بگرد)/i],
  ['coding',/(کد|برنامه.?نویسی|پروژه|npm|build|test|گیت|git|سایت بساز|بازی بساز|اپ بساز|coding|کدنویس|کد نویس|vscode|vs code|باگ|خطای کد|refactor)/i],
  ['scheduler',/(یادآور|یادم بنداز|ساعت .* (?:بگو|انجام|بفرست|تحقیق|باز|اجرا)|فردا .* (?:یاد|انجام|بفرست|تحقیق)|remind|schedule|زمان.?بندی|بعداً.*انجام|سر وقت.*انجام)/i],
  ['wellbeing',/(استراحت|خسته|چشم|نشستن|حالت بدن|آب بخور|هیدرات|تمرکز|وقفه|گردن|مچ|کمر|خواب|سلامت|wellbeing|break)/i],
  ['windowsAdmin',/(خراب|مشکل ویندوز|مشکل برنامه|سیستم کند|بهبود سیستم|سلامت سیستم|تعمیر ویندوز|repair|defender|فایروال|firewall|سرویس|service|startup|استارت.?آپ|event log|لاگ خطا|خطاهای سیستم|دیسک|disk health|شبکه.*مشکل|dns|task manager|device manager|عیب.?یابی|سطل.?زباله|recycle.?bin|فایل.?موقت|temporary|temp)/i],
  ['permissions',/(مجوز|دسترسی|permission|محافظت|حذف نکن|پاک نکن)/i],
  ['system',/(سیستم|رم|پردازنده|process|فرایند|زمان|ساعت|تاریخ|cpu|gpu)/i]
];
const MODE_TO_GROUPS={audio:['audio'],display:['display','settings'],media:['media','audio','storage','files'],apps:['apps','screen'],web:['web','screen'],files:['storage','files'],spreadsheet:['spreadsheet','storage','screen'],social:['social','screen','files','web'],creative:['creative','files','screen','web'],coding:['coding','apps','files','web'],software:['apps','windowsAdmin','web','screen'],diagnostics:['windowsAdmin','system','apps','web','screen'],personalization:['personalization','files','screen'],settings:['settings','screen'],power:['power'],scheduler:['scheduler'],ui:['screen'],ai:['aiBrains','web','screen']};
const factualQuestion=/(؟|\?|چیست|چیه|چی هست|کیه|کی هست|کجاست|کجا هست|چرا|چطور|چگونه|چه کسی|چه زمانی|چه موقع|چند تا|فرق .* چیه|تفاوت .* چیه|معنی .* چیه|what\b|who\b|where\b|when\b|why\b|how\b)/i;
const personalSmallTalk=/(حالت چطوره|خوبی|چه خبر|اسم من|من کی.?ام|منو می.?شناسی|من را می.?شناسی|یادت میاد|یادت هست|دوستم داری|خسته.?ای|سلام|صبح بخیر|شب بخیر)/i;
export function selectToolNames(text,hints=[]){
  const selected=[],s=String(text||''),intent=actionIntent(s);
  for(const [group,re] of patterns)if(re.test(s))selected.push(...(groups[group]||[]));
  for(const mode of intent.modes)for(const group of MODE_TO_GROUPS[mode]||[])selected.push(...(groups[group]||[]));
  for(const hint of hints){const key=String(hint).toLowerCase();for(const [group,names] of Object.entries(groups))if(key.includes(group))selected.push(...names);}
  if(intent.action)selected.push('search_action_book','search_learned_skills');
  if(intent.multiStep)selected.push(...groups.workflowBridge);
  if(!selected.length&&intent.action)selected.push(...groups.workflowBridge,...groups.audio,...groups.display,...groups.power,...groups.apps,...groups.web,...groups.storage,...groups.screen,...groups.system);
  if(!selected.length&&factualQuestion.test(s)&&!personalSmallTalk.test(s))selected.push(...groups.knowledge);
  return uniq(selected).slice(0,72);
}
export const TOOL_GROUPS=groups;
export const ACTION_MODE_GROUPS=MODE_TO_GROUPS;
