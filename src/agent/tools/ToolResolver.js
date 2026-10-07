import { selectToolNames } from '../SmartToolRouter.js';
import { matchFastCommand } from '../FastCommandRouter.js';
import { ToolManifest } from './ToolManifest.js';

const words=value=>String(value||'').toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}_]+/u).filter(x=>x.length>1);

export class ToolResolver {
  constructor({manifest=new ToolManifest(),maxTools=24}={}) {
    this.manifest=manifest;
    this.maxTools=Math.max(4,Number(maxTools)||24);
  }

  resolve(text,{hints=[],mode='action'}={}) {
    const fast=matchFastCommand(text);
    const routed=selectToolNames(text,hints);
    const names=[];
    const add=name=>{if(name&&this.manifest.has(name)&&!names.includes(name))names.push(name);};
    if(fast?.name)add(fast.name);
    for(const name of routed)add(name);

    if(mode==='research')for(const name of ['research_topic','live_web_search','read_web_page','wikipedia_search'])add(name);
    if(mode==='action')for(const name of ['search_action_book','search_learned_skills'])add(name);

    const cap=mode==='action'?this.maxTools:Math.min(this.maxTools,12);
    return {fast,names:names.slice(0,cap)};
  }

  search(query,{limit=12}={}) {
    const q=new Set(words(query));
    return this.manifest.list().map(item=>{
      const hay=words(item.name+' '+item.description);
      let score=0;
      for(const token of hay)if(q.has(token))score+=1;
      return {...item,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,limit));
  }
}
