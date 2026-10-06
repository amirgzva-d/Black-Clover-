import { selectToolNames } from '../SmartToolRouter.js';
import { actionIntent } from '../ActionIntent.js';

const uniq=a=>[...new Set(a)];
const tokens=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[\p{P}\p{S}]+/gu,' ').split(/\s+/).filter(x=>x.length>1);
const BOOSTS=[
  [/(سرچ|جستجو|گوگل|google|وب|سایت)/i,['chrome_search','chrome_open_url','live_web_search','research_topic','read_web_page']],
  [/(تحقیق|منبع|research|بررسی کن|اطلاعات جدید)/i,['research_topic','live_web_search','read_web_page','wikipedia_search']],
  [/(فایل|پرونده|پوشه|فولدر|folder|file)/i,['global_find_files','open_named_file','open_named_folder','file_info','open_file','open_folder']],
  [/(برنامه|اپ|نرم.?افزار|باز کن|اجرا کن|launch)/i,['find_any_app','launch_any_app','list_windows','list_processes']],
  [/(واتساپ|whatsapp|روبیکا|rubika)/i,['chrome_open_service','chrome_status','inspect_ui','focus_window']],
  [/(اکسل|excel|xlsx|xlsm)/i,['excel_status','excel_list_sheets','excel_read_range','excel_set_cells']],
  [/(کدنویسی|کد|پروژه|git|npm|build|test)/i,['inspect_project','project_search_text','read_project_file','run_project_task','project_quality_task']],
  [/(پنجره|کلیک|موس|کیبورد|صفحه|screen|window)/i,['list_windows','focus_window','inspect_ui','vision_inspect_screen','invoke_ui_element','press_key','type_text']]
];

function scoreTool(name,tool,text,index){
  let score=Math.max(0,40-index*.15);const low=String(text||'').toLowerCase(),hay=`${name} ${tool?.description||''}`.toLowerCase();
  for(const t of tokens(low))if(hay.includes(t))score+=3;
  for(const [re,names] of BOOSTS)if(re.test(low)){const i=names.indexOf(name);if(i>=0)score+=36-i*4;}
  if(/search|find|status|list|read|inspect/.test(name))score+=1.5;
  return score;
}

export class ToolResolver{
  constructor({tools,maxTools=28}={}){this.tools=tools||{};this.maxTools=Math.max(8,Math.min(Number(maxTools)||28,48));}
  resolve(text,hints=[],extra=[]){
    const intent=actionIntent(text),base=uniq([...extra,...selectToolNames(text,hints)]).filter(n=>this.tools[n]);
    if(!intent.action&&!base.length)return [];
    const ranked=base.map((name,index)=>({name,score:scoreTool(name,this.tools[name],text,index)})).sort((a,b)=>b.score-a.score).map(x=>x.name);
    const must=[];
    for(const [re,names] of BOOSTS)if(re.test(String(text||'')))for(const name of names)if(this.tools[name]&&base.includes(name))must.push(name);
    if(intent.multiStep)for(const n of ['search_action_book','search_learned_skills'])if(this.tools[n])must.push(n);
    return uniq([...must,...ranked]).slice(0,this.maxTools);
  }
}
