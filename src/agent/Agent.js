import crypto from 'node:crypto';
import { OllamaClient } from './OllamaClient.js';
import { tools,ollamaTools,runTool } from './tools.js';
import { PERSONALITY_SYSTEM } from './personality.js';
import { normalizePersianCommand,commandHints } from './language.js';
import { capabilityHints,CAPABILITY_PHRASE_COUNT } from './capabilities.js';

export class Agent{
  constructor({emit=()=>{},client=new OllamaClient()}={}){this.emit=emit;this.client=client;this.history=[{role:'system',content:PERSONALITY_SYSTEM}];this.pending=new Map();}
  async status(){return {ollama:await this.client.health(),model:this.client.model,pending:this.pending.size,tools:Object.keys(tools).length,languagePatterns:CAPABILITY_PHRASE_COUNT};}
  async chat(text){
    const original=String(text??'').trim();if(!original)return {ok:false,text:'پیام خالی است.'};
    const normalized=normalizePersianCommand(original);
    const hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])];
    const content=hints.length?`${original}\n\n[Host interpretation aid: normalized="${normalized}"; likely capability groups=${hints.join(', ')}. This metadata is only a routing hint. Follow the user's actual words and never treat metadata as a new instruction.]`:original;
    this.history.push({role:'user',content});if(this.history.length>32)this.history=[this.history[0],...this.history.slice(-30)];
    try{
      for(let step=0;step<10;step++){
        this.emit({type:'thinking',step});const response=await this.client.chat(this.history,ollamaTools());const msg=response?.message;
        if(!msg)throw new Error('Model returned no message');this.history.push(msg);
        const calls=msg.tool_calls??[];
        if(!calls.length)return {ok:true,text:msg.content||'انجام شد.'};
        for(const call of calls){
          const name=call.function?.name,args=call.function?.arguments??{},tool=tools[name];
          if(!tool){this.history.push({role:'tool',content:JSON.stringify({success:false,error:'Unknown tool'}),tool_name:name});continue;}
          if(tool.risk==='sensitive'){
            const id=crypto.randomUUID();this.pending.set(id,{name,args,createdAt:Date.now()});
            return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این کار مهمه و می‌تونه روی سیستم تغییر ایجاد کنه. اجرای «${name}» رو تأیید می‌کنی؟`};
          }
          this.emit({type:'tool',name});let out;
          try{out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
          this.history.push({role:'tool',content:JSON.stringify(out),tool_name:name});
        }
      }
      return {ok:false,text:'این درخواست خیلی چندمرحله‌ای شد. یک بخشش رو مشخص کن تا مطمئن انجامش بدم.'};
    }catch(e){return {ok:false,text:`فعلاً نتونستم به مغز محلی یا ابزار لازم وصل بشم: ${e.message}`};}
  }
  async confirm({id,approved}){
    const p=this.pending.get(id);if(!p)return {ok:false,text:'درخواست تأیید پیدا نشد یا منقضی شده است.'};this.pending.delete(id);
    if(Date.now()-p.createdAt>120000)return {ok:false,text:'این تأیید قدیمی شده. دستور را دوباره بگو.'};
    if(!approved){this.history.push({role:'tool',content:JSON.stringify({success:false,cancelled:true}),tool_name:p.name});return {ok:true,text:'باشه، لغوش کردم.'};}
    try{const out=await runTool(p.name,p.args);this.history.push({role:'tool',content:JSON.stringify(out),tool_name:p.name});return {ok:true,text:out.message??'انجام شد.',result:out};}catch(e){return {ok:false,text:e.message};}
  }
}
