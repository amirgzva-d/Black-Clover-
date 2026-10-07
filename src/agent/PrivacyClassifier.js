const privateTools=new Set([
  'read_text_file','list_directory','file_info','search_files','global_find_files','open_named_file','open_named_resource','resolve_named_resource','reveal_named_file','storage_overview','read_clipboard','take_screenshot','vision_inspect_screen','list_windows','inspect_ui',
  'excel_status','excel_list_sheets','excel_read_range','excel_set_cells','excel_append_rows','excel_add_image','excel_list_hyperlinks','excel_collect_images',
  'messenger_open','messenger_stage_files','messenger_delivery_checkpoint','messenger_verify_delivery','copy_files_to_clipboard',
  'remember_fact','recall_memory','list_recent_memories','update_memory','forget_memory','create_pinned_note','list_pinned_notes','update_pinned_note','delete_pinned_note',
  'get_system_info','list_processes','get_battery_status','get_cpu_details','get_gpu_details','get_memory_details','list_fixed_disks','get_disk_health','list_network_adapters','get_network_configuration','list_wifi_profiles','list_services','list_startup_commands','list_scheduled_tasks','recent_system_errors','recent_system_warnings','get_defender_status','get_firewall_status',
  'type_text','set_ui_value','invoke_ui_element','mouse_click','move_mouse','press_key','rename_path','move_path','copy_path','rename_named_resource','move_named_resource','copy_named_resource','write_text_file','delete_path','inspect_project','run_project_task','project_search_text','read_project_file','replace_project_text','write_project_file','project_quality_task','git_create_branch','git_commit_changes',
  'teach_skill','search_learned_skills','learning_status','forget_learned_skill'
]);
const secretText=/(رمز|پسورد|password|token|api.?key|کلید\s*(?:api|خصوصی)|secret|کد\s*دسترسی|شماره\s*کارت|cvv|کد\s*ملی)/i;
const firstPersonData=/(فایل|پوشه|مسیر|desktop|documents|دانلود|اکانت|حساب|ایمیل|پیام|تلگرام|واتساپ|روبیکا|اینستاگرام|اکسل|excel|xlsx|xlsm|اسکرین|صفحه|کامپیوتر|سیستم|حافظه|یادداشت|کد|پروژه).{0,24}(?:من|خودم|شرکت)|(?:من|خودم|شرکت).{0,24}(فایل|پوشه|مسیر|اکانت|حساب|ایمیل|پیام|تلگرام|واتساپ|روبیکا|اکسل|سیستم|کامپیوتر|پروژه)/i;
const localAction=/(باز کن|ببند|پیدا کن|اجرا کن|کپی|پیست|منتقل|جابه|rename|تغییر نام|حذف|پاک|ذخیره|سیو|تایپ|کلیک|بفرست|ارسال|دانلود|نصب|ویرایش|تغییر بده|بساز|روی سیستم|در سیستم|روی کامپیوتر)/i;
const localObject=/(فایل|پوشه|مسیر|desktop|documents|downloads|کلیپ.?بورد|clipboard|صفحه|پنجره|سیستم|کامپیوتر|صدا|نور|برنامه|تلگرام|واتساپ|روبیکا|اکسل|excel|فتوشاپ|پروژه|درایو|هارد)/i;
const forceOnline=/(از اینترنت|آنلاین جستجو|سرچ آنلاین|تحقیق آنلاین|منبع جدید|آخرین اطلاعات|از گوگل|در گوگل|latest|current web|research online)/i;
export function isPrivateRequest(text,hints=[]){
  const s=String(text||'');if(secretText.test(s))return true;
  if(/(?:کلیپ.?بورد|clipboard).{0,24}(?:من|بخون|خواندن|محتوا)|(?:من|محتوا).{0,24}(?:کلیپ.?بورد|clipboard)/i.test(s))return true;
  if(forceOnline.test(s)&&!firstPersonData.test(s)&&!(localAction.test(s)&&localObject.test(s)))return false;
  if(firstPersonData.test(s))return true;
  const executingLocal=localAction.test(s)&&localObject.test(s);
  if(executingLocal)return true;
  const hintPrivate=hints.some(x=>/(clipboard|screen|window|system|storage|notes)/i.test(String(x)));
  return hintPrivate&&localAction.test(s);
}
export function toolMakesContextPrivate(name){return privateTools.has(name);}
export function explainPrivacyMode(isPrivate){return isPrivate?'local-private':'online-eligible';}
