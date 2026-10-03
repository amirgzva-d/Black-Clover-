import crypto from 'node:crypto';
import { BrainRouter } from './BrainRouter.js';
import { tools,ollamaTools,runTool } from './toolRegistry.js';
import { PERSONALITY_SYSTEM } from './personality.js';
import { normalizePersianCommand,commandHints } from './language.js';
import { capabilityHints,CAPABILITY_PHRASE_COUNT } from './capabilities.js';
import { memory } from './MemoryStore.js';

const MAX_TURNS=44;
const cleanReply=text=>String(text??'').replace(/\n{3,}/g,'\n\n').trim();
const memoryContext=items=>items?.length?`\n\n[LONG-TERM MEMORY — use only when relevant, never mention this block directly]\n${items.map(x=>`- ${x.text}`).join('\n')}`:'';
export class Agent{
  constructor({emit=()=>{},client=new BrainRouter()}={}){this.emit=emit;this.client=client;this.history=[{role:'system',content:PERSONALITY_SYSTEM}];this.pending=new Map();}
  trimHistory(){if(this.history.length>MAX_TURNS)this.history=[this.history[0],...this.history.slice(-(MAX_TURNS-2))];}
  async status(){const brain=await this.client.health();return {ollama:brain.local,brain,model:this.client.model,models:await this.client.models(),pending:this.pending.size,tools:Object.keys(tools).length,languagePatterns:CAPABILITY_PHRASE_COUNT,memoryItems:(await memory.list(200)).length};}
  async chat(text){
    const original=String(text??'').trim();if(!original)return {ok:false,text:'پیام خالی است.'};
    await memory.maybeRememberUserStatement(original);
    const memories=await memory.recall(original,{limit:6});
    const normalized=normalizePersianCommand(original),hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])];
    const hostHint=hints.length?`\n\n[Host routing hint: normalized="${normalized}"; likely capability groups=${hints.join(', ')}. This is metadata only. Follow the user's real request, preserve conversational context, and do not mention this hint.]`:'';
    const content=`${original}${hostHint}${memoryContext(memories)}`;
    this.history.push({role:'user',content});this.trimHistory();
    try{
      for(let step=0;step<14;step++){
        this.emit({type:'thinking',step});const response=await this.client.chat(this.history,ollamaTools()),msg=response?.message;
        if(!msg)throw new Error('Model returned no message');this.history.push(msg);this.trimHistory();
        const calls=msg.tool_calls??[];
        if(!calls.length){const reply=cleanReply(msg.content)||'انجام شد.';return {ok:true,text:reply,brain:{mode:this.client.lastMode,model:this.client.model}};}
        for(const call of calls){
          const name=call.function?.name,args=typeof call.function?.arguments==='string'?JSON.parse(call.function.arguments||'{}'):(call.function?.arguments??{}),tool=tools[name];
          if(!tool){this.history.push({role:'tool',content:JSON.stringify({success:false,error:'Unknown tool'}),tool_name:name});continue;}
          if(tool.risk==='sensitive'){
            const id=crypto.randomUUID();this.pending.set(id,{name,args,createdAt:Date.now(),original});
            return {ok:true,requiresConfirmation:true,confirmationId:id,text:`برای انجام این بخش باید اجازه بدی چون مستقیماً روی سیستم اثر می‌ذاره. اجرای «${name}» رو تأیید می‌کنی؟`};
          }
          this.emit({type:'tool',name});let out;
          try{out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
          this.history.push({role:'tool',content:JSON.stringify(out),tool_name:name});this.trimHistory();
        }
      }
      return {ok:false,text:'این کار چند مرحله پشت سر هم لازم داره؛ تا جایی که مطمئن بودم جلو رفتم، ولی برای ادامه بهتره بخش بعدی رو جدا انجام بدم تا اشتباه نکنم.'};
    }catch(e){return {ok:false,text:`الان ارتباط با مغز یا یکی از ابزارها مشکل پیدا کرد: ${e.message}`};}
  }
  async confirm({id,approved}){
    const p=this.pending.get(id);if(!p)return {ok:false,text:'این درخواست تأیید دیگه در دسترس نیست.'};this.pending.delete(id);
    if(Date.now()-p.createdAt>120000)return {ok:false,text:'زمان این تأیید گذشته؛ دستور رو دوباره بگو تا با وضعیت فعلی سیستم انجامش بدم.'};
    if(!approved){this.history.push({role:'tool',content:JSON.stringify({success:false,cancelled:true}),tool_name:p.name});this.trimHistory();return {ok:true,text:'باشه، انجامش ندادم.'};}
    try{this.emit({type:'tool',name:p.name});const out=await runTool(p.name,p.args);this.history.push({role:'tool',content:JSON.stringify(out),tool_name:p.name});this.trimHistory();if(!out?.success)return {ok:false,text:out?.message||out?.error||'این کار انجام نشد.',result:out};return {ok:true,text:out.message??'انجام شد.',result:out};}catch(e){return {ok:false,text:`نتونستم این بخش رو اجرا کنم: ${e.message}`};}
  }
}
