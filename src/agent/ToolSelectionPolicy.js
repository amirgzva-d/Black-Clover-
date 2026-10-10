const uniq=a=>[...new Set((a||[]).filter(Boolean))];

const ALWAYS_ACTION=['search_action_book','search_learned_skills'];
const BRIDGE=['resolve_resource','open_resource','find_any_app','launch_any_app','global_find_files','list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','press_key','type_text'];

const modePriorities={
  audio:['get_volume','set_volume','set_mute','toggle_mute','volume_up','volume_down','media_play_pause','media_next','media_previous'],
  display:['get_brightness','set_brightness','brightness_up','brightness_down','open_display_settings','turn_off_display'],
  apps:['find_any_app','find_running_app','launch_any_app','close_app','list_installed_apps','list_windows','focus_window','inspect_ui','invoke_ui_element'],
  files:['global_find_files','open_named_file','open_named_folder','reveal_named_file','list_directory','file_info','open_file','open_folder','rename_path','move_path','copy_path','zip_files','extract_archive'],
  spreadsheet:['global_find_files','open_named_file','excel_status','excel_list_sheets','excel_read_range','excel_set_cells','excel_append_rows','excel_list_hyperlinks','excel_collect_images','copy_files_to_clipboard'],
  social:['messenger_open','messenger_stage_files','copy_files_to_clipboard','chrome_open_service','list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key'],
  web:['chrome_status','chrome_open_url','chrome_search','chrome_open_service','open_url','web_search','youtube_search','live_web_search','read_web_page'],
  coding:['inspect_project','project_search_text','read_project_file','replace_project_text','write_project_file','project_quality_task','run_project_task','git_create_branch','git_commit_changes'],
  scheduler:['get_time','create_reminder','create_scheduled_action','list_reminders','cancel_reminder'],
  power:['lock_pc','sleep_pc','shutdown_pc','restart_pc','sign_out','get_battery_status','get_power_plan'],
  diagnostics:['get_system_info','recent_system_errors','recent_system_warnings','get_disk_health','get_network_configuration','get_defender_status','list_processes','list_windows'],
  personalization:['set_wallpaper','organize_desktop','open_desktop','global_find_files'],
  ui:['list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','move_mouse','mouse_click','mouse_scroll'],
  ai:['ai_provider_status','open_ai_portal','chrome_open_service','open_web_search_in_service']
};

function scoreName(name,text,modes){
  let score=0;
  const t=String(text||'').toLowerCase();
  if(ALWAYS_ACTION.includes(name))score+=500;
  if(['resolve_resource','open_resource'].includes(name))score+=420;
  for(const mode of modes||[]){const i=(modePriorities[mode]||[]).indexOf(name);if(i>=0)score+=350-i*8;}
  if(/اکسل|excel|xlsx|xlsm/i.test(t)&&/^excel_|global_find_files|open_named_file|copy_files_to_clipboard/.test(name))score+=220;
  if(/تلگرام|واتساپ|روبیکا|telegram|whatsapp|rubika|پیام/i.test(t)&&/messenger|chrome_|inspect_ui|vision_|invoke_ui|set_ui|type_text|press_key|copy_files/.test(name))score+=220;
  if(/فایل|پوشه|اسم فایل|کجاست|پیدا/i.test(t)&&/global_find|open_named|resolve_resource|file_|list_directory/.test(name))score+=210;
  if(/باز|اجرا|برنامه|نرم افزار|نرم‌افزار/i.test(t)&&/find_any_app|launch_any_app|resolve_resource|open_resource/.test(name))score+=200;
  if(/صفحه|کلیک|دکمه|پنجره|موس|تایپ/i.test(t)&&/inspect_ui|vision_|invoke_ui|set_ui|press_key|mouse_|list_windows|focus_window/.test(name))score+=200;
  if(/سرچ|جستجو|گوگل|وب|اینترنت/i.test(t)&&/web_|chrome_|live_web|read_web|research/.test(name))score+=190;
  if(/یادآور|یادم بنداز|schedule/i.test(t)&&/reminder|scheduled|get_time/.test(name))score+=190;
  if(/کد|پروژه|vscode|git|باگ|build|test/i.test(t)&&/project_|run_project|git_|inspect_project/.test(name))score+=190;
  if(/پین ویندوز|رمز ویندوز|windows pin|windows hello|تشخیص چهره|صورت من|face recognition/i.test(t)&&/windows_signin|windows_pin|windows_hello|face_identity/.test(name))score+=260;
  if(/wake.?on.?lan|remote wake|روشن.*از راه دور|سیستم.*روشن.*شبکه/i.test(t)&&/wake_/.test(name))score+=260;
  if(/نمای فایل|explorer.*view|details.*فایل|پسوند فایل|فایل مخفی|hidden items|file extensions/i.test(t)&&/explorer_/.test(name))score+=250;
  if(/اشتراک.*صفحه|screen.?share|share.*screen/i.test(t)&&/screen_share|inspect_ui|vision_|list_windows/.test(name))score+=250;
  if(/پوشه.*تلگرام|telegram.*folder|چند.*مخاطب|همه.*گروه|bulk.*send|multi.?recipient/i.test(t)&&/telegram_folder|recipient_set|messenger_|inspect_ui|vision_/.test(name))score+=255;
  if(/گوگل ایمیج|google images|عکس.*گوگل|سرچ.*عکس|جستجوی.*تصویر/i.test(t)&&/google_image_search|chrome_|live_web|read_web/.test(name))score+=250;
  return score;
}

export function compactToolSelection(text,names,{modes=[],action=false,multiStep=false,max=22}={}){
  const source=uniq(names);
  if(!action)return source.slice(0,Math.max(0,max));
  const extras=multiStep?BRIDGE:[];
  const candidates=uniq([...ALWAYS_ACTION,...extras,...source]);
  const transfer=/(?:تلگرام|واتساپ|روبیکا|telegram|whatsapp|rubika)/i.test(text)&&/(?:بفرست|ارسال|فوروارد|بردار|پیوی)/i.test(text);
  const required=transfer?['messenger_open','inspect_ui','messenger_delivery_checkpoint','messenger_verify_delivery','list_windows','focus_window','vision_inspect_screen','invoke_ui_element','set_ui_value','type_text','press_key','copy_files_to_clipboard','search_action_book']:[];
  const sourceIndex=new Map(source.map((n,i)=>[n,i]));
  const ranked=candidates
    .map(name=>({name,score:scoreName(name,text,modes)+(sourceIndex.has(name)?Math.max(0,100-sourceIndex.get(name)):0)}))
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))
    .map(x=>x.name);
  return uniq([...required,...ranked]).slice(0,Math.max(8,required.length,Math.min(Number(max)||22,32)));
}

export function expandToolSelection(current,toolOutput,{max=30}={}){
  const names=[...(current||[])];
  const items=toolOutput?.data?.items||toolOutput?.items||[];
  for(const item of Array.isArray(items)?items:[]){
    for(const step of item?.steps||[]){
      for(const token of String(step||'').split('|').map(x=>x.trim()).filter(Boolean))names.push(token);
    }
    for(const token of item?.tools||[])names.push(token);
  }
  return uniq(names).slice(0,Math.max(12,Math.min(Number(max)||30,40)));
}
