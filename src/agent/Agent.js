import crypto from 'node:crypto';
import { OllamaClient } from './OllamaClient.js';
import { tools,ollamaTools,runTool } from './tools.js';
import { PERSONALITY_SYSTEM } from './personality.js';

export class Agent{
  constructor({emit=()=>{},client=new OllamaClient()}={}){this.emit=emit;this.client=client;this.history=[{role:'system',content:PERSONALITY_SYSTEM}];this.pending=new Map();}
  async status(){return {ollama:await this.client.health(),model:this.client.model,pending:this.pending.size};}
  async chat(text){
    const clean=text.trim(); if(!clean)return {ok:false,text:'پیام خالی است.'};
    this.history.push({role:'user',content:clean}); if(this.history.length>32)this.history=[this.history[0],...this.history.slice(-30)];
    try{
      for(let step=0;step<8;step++){
        this.emit({type:'thinking',step}); const response=await this.client.chat(this.history,ollamaTools()); const msg=response?.message;
        if(!msg)throw new Error('Model returned no message'); this.history.push(msg);
        const calls=msg.tool_calls??[];
        if(!calls.length)return {ok:true,text:msg.content||'انجام شد.'};
        for(const call of calls){
          const name=call.function?.name; const args=call.function?.arguments??{}; const tool=tools[name];
          if(!tool){this.history.push({role:'tool',content:JSON.stringify({success:false,error:'Unknown tool'}),tool_name:name});continue;}
          if(tool.risk==='sensitive'){
            const id=crypto.randomUUID(); this.pending.set(id,{name,args});
            return {ok:true,requiresConfirmation:true,confirmationId:id,text:`برای اجرای «${name}» تأیید شما لازم است.`};
          }
          this.emit({type:'tool',name});
          let out; try{out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
          this.history.push({role:'tool',content:JSON.stringify(out),tool_name:name});
        }
      }
      return {ok:false,text:'این کار مراحل زیادی داشت. بهتره به دو بخش تقسیمش کنیم.'};
    }catch(e){return {ok:false,text:`فعلاً نتونستم به مغز محلی یا ابزار لازم وصل بشم: ${e.message}`};}
  }
  async confirm({id,approved}){
    const p=this.pending.get(id); if(!p)return {ok:false,text:'درخواست تأیید پیدا نشد یا منقضی شده است.'}; this.pending.delete(id);
    if(!approved){this.history.push({role:'tool',content:JSON.stringify({success:false,cancelled:true}),tool_name:p.name});return {ok:true,text:'باشه، لغوش کردم.'};}
    try{const out=await runTool(p.name,p.args);this.history.push({role:'tool',content:JSON.stringify(out),tool_name:p.name});return {ok:true,text:out.message??'انجام شد.',result:out};}catch(e){return {ok:false,text:e.message};}
  }
}
