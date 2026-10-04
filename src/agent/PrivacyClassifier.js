const privateTools=new Set([
  'read_text_file','list_directory','file_info','search_files','global_find_files','open_named_file','reveal_named_file','storage_overview','read_clipboard','take_screenshot','vision_inspect_screen','list_windows','inspect_ui',
  'excel_status','excel_list_sheets','excel_read_range','excel_set_cells','excel_append_rows','excel_add_image','excel_list_hyperlinks','excel_collect_images',
  'messenger_open','messenger_stage_files','copy_files_to_clipboard',
  'remember_fact','recall_memory','list_recent_memories','update_memory','forget_memory','get_system_info','list_processes',
  'type_text','set_ui_value','invoke_ui_element','mouse_click','move_mouse','press_key','rename_path','move_path','copy_path','write_text_file','delete_path','inspect_project','run_project_task',
  'teach_skill','search_learned_skills','learning_status','forget_learned_skill'
]);
const privateText=/(رمز|پسورد|password|token|api.?key|کلید|کلیپ.?بورد|clipboard|فایل شخصی|پوشه|مسیر|desktop|documents|دانلود|اکانت|حساب|ایمیل|پیام خصوصی|تلگرام|واتساپ|روبیکا|اینستاگرام|اکسل|excel|xlsx|xlsm|اسکرین|صفحه من|روی سیستم من|کامپیوتر من|اطلاعات من|حافظه من|کل حافظه|کل درایو|ببین چی روی صفحه|چی می.?بینی)/i;
const forceOnline=/(از اینترنت|آنلاین جستجو|سرچ آنلاین|تحقیق آنلاین|منبع جدید|آخرین اطلاعات|latest|current web)/i;
export function isPrivateRequest(text,hints=[]){const s=String(text||'');if(forceOnline.test(s)&&!/(فایل|رمز|اکانت|پیام|کلیپ.?بورد|صفحه من|کامپیوتر من|اکسل|excel)/i.test(s))return false;return privateText.test(s)||hints.some(x=>/(file|clipboard|screen|window|social|system|coding|spreadsheet|storage)/i.test(String(x)));}
export function toolMakesContextPrivate(name){return privateTools.has(name);}
export function explainPrivacyMode(isPrivate){return isPrivate?'local-private':'online-eligible';}
