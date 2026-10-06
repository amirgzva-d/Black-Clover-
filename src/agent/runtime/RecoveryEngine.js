const RECOVERY={
  chrome_search:['web_search','live_web_search'],
  web_search:['chrome_search','live_web_search'],
  chrome_open_url:['open_url'],
  launch_any_app:['find_any_app','launch_app'],
  launch_app:['find_any_app','launch_any_app'],
  open_named_file:['global_find_files','reveal_named_file'],
  open_named_folder:['global_find_files'],
  research_topic:['live_web_search','wikipedia_search'],
  live_web_search:['wikipedia_search']
};

export class RecoveryEngine{
  constructor({tools={}}={}){this.tools=tools;}
  advice(name,args={},out={},verification={}){
    if(out?.success!==false&&verification?.ok!==false)return null;
    const alternatives=(RECOVERY[name]||[]).filter(x=>this.tools[x]);
    const reason=verification?.reason||out?.error||out?.message||'unknown failure';
    return {reason,alternatives,hint:alternatives.length?`مرحله «${name}» تأیید نشد. ابزارهای جایگزین مجاز: ${alternatives.join(', ')}. قبل از اعلام موفقیت مسیر جایگزین را امتحان کن.`:`مرحله «${name}» تأیید نشد. نتیجه را موفق اعلام نکن و بر اساس خطا دوباره برنامه‌ریزی کن.`};
  }
}
