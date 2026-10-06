import fs from 'node:fs/promises';
import path from 'node:path';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const stem=s=>norm(path.basename(String(s||''),path.extname(String(s||''))));
const containsLoose=(a,b)=>{a=norm(a);b=norm(b);if(!a||!b)return false;return a.includes(b)||b.includes(a)||b.split(' ').some(x=>x.length>3&&a.includes(x));};

export class ToolVerifier{
  constructor({runTool,delayMs=280}={}){this.runTool=runTool;this.delayMs=delayMs;}
  async verify(name,args={},out={}){
    if(out?.success===false)return {ok:false,level:'hard',reason:out?.error||out?.message||'tool-failed'};
    try{
      if(['chrome_search','web_search'].includes(name)){
        const url=new URL(out?.data?.url||'');const q=url.searchParams.get('q')||'';
        return {ok:/google\./i.test(url.hostname)&&url.pathname.includes('/search')&&containsLoose(q,args.query),level:'hard',reason:'google-results-url'};
      }
      if(name==='youtube_search'){
        const url=new URL(out?.data?.url||'');return {ok:/youtube\.com$/i.test(url.hostname)||/youtube\.com$/i.test(url.hostname.replace(/^www\./,'')),level:'hard',reason:'youtube-results-url'};
      }
      if(name==='chrome_open_service'||name==='chrome_open_url'){
        const url=out?.data?.url||out?.data?.href||'';return {ok:/^https?:\/\//i.test(String(url)),level:'hard',reason:'public-url-opened'};
      }
      if(['open_named_file','reveal_named_file'].includes(name)){
        const p=out?.data?.path;if(!p)return {ok:false,level:'hard',reason:'missing-resolved-path'};await fs.access(p);return {ok:true,level:'hard',reason:'resolved-file-exists',evidence:{path:p}};
      }
      if(name==='open_named_folder'){
        const p=out?.data?.path;if(!p)return {ok:false,level:'hard',reason:'missing-resolved-path'};const s=await fs.stat(p);return {ok:s.isDirectory(),level:'hard',reason:'resolved-folder-exists',evidence:{path:p}};
      }
      if(['create_folder','write_text_file','create_text_file','append_text_file'].includes(name)){
        const p=out?.data?.path||args.directory||args.file;if(!p)return {ok:false,level:'hard',reason:'missing-output-path'};await fs.access(p);return {ok:true,level:'hard',reason:'output-exists',evidence:{path:p}};
      }
      if(['copy_path','move_path','rename_path'].includes(name)){
        const p=out?.data?.destination||out?.data?.path||args.destination||args.to;if(!p)return {ok:true,level:'reported',reason:'tool-reported-success'};await fs.access(p);return {ok:true,level:'hard',reason:'destination-exists',evidence:{path:p}};
      }
      if(['launch_any_app','launch_app'].includes(name)&&this.runTool){
        await wait(this.delayMs);const windows=await this.runTool('list_windows',{}),items=Array.isArray(windows?.data)?windows.data:[],wanted=args.name||out?.data?.name||'';
        const hit=items.find(x=>containsLoose(`${x.ProcessName||''} ${x.MainWindowTitle||''}`,wanted));
        return hit?{ok:true,level:'observed',reason:'visible-window-found',evidence:{process:hit.ProcessName,title:hit.MainWindowTitle}}:{ok:true,level:'reported',reason:'launch-reported-window-not-yet-observed'};
      }
      if(name==='close_app'&&this.runTool){
        await wait(this.delayMs);const p=await this.runTool('list_processes',{filter:args.name||''}),items=Array.isArray(p?.data)?p.data:[];
        return {ok:items.length===0,level:items.length===0?'observed':'reported',reason:items.length===0?'process-no-longer-visible':'process-still-visible'};
      }
      return {ok:true,level:'reported',reason:'tool-reported-success'};
    }catch(e){return {ok:false,level:'hard',reason:`verification-error: ${e.message}`};}
  }
}
