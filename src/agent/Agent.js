import crypto from 'node:crypto';
import { BrainRouter } from './BrainRouter.js';
import { tools,ollamaTools,runTool } from './toolRegistry.js';
import { PERSONALITY_SYSTEM } from './personality.js';
import { normalizePersianCommand,commandHints } from './language.js';
import { capabilityHints,CAPABILITY_PHRASE_COUNT } from './capabilities.js';
import { memory } from './MemoryStore.js';
import { permissions } from './PermissionPolicy.js';
import { selectToolNames } from './SmartToolRouter.js';
import { isPrivateRequest,toolMakesContextPrivate } from './PrivacyClassifier.js';

const MAX_TURNS=64,MAX_STEPS=18;
const cleanReply=text=>String(text??'').replace(/\n{3,}/g,'\n\n').trim();
const memoryContext=items=>items?.length?`\n\n[LONG-TERM MEMORY — use only when relevant, never mention this block directly]\n${items.map(x=>`- ${x.text}`).join('\n')}`:'';
const toolMessage=(name,out,callId,isPrivate=false)=>({role:'tool',content:JSON.stringify(out),tool_name:name,...(callId?{tool_call_id:callId}:{}),_private:isPrivate});
const publicFields=m=>{const x={role:m.role,content:m.content??''};if(m.tool_calls)x.tool_calls=m.tool_calls;if(m.tool_name)x.tool_name=m.tool_name;if(m.tool_call_id)x.tool_call_id=m.tool_call_id;return x;};
const parseArgs=raw=>{if(typeof raw!=='string')return raw??{};try{return JSON.parse(raw||'{}');}catch{return {};}};

export class Agent{
  constructor({emit=()=>{},client=new BrainRouter()}={}){this.emit=emit;this.client=client;this.history=[{role:'system',content:PERSONALITY_SYSTEM,_private:false}];this.pending=new Map();}
  trimHistory(){if(this.history.length>MAX_TURNS)this.history=[this.history[0],...this.history.slice(-(MAX_TURNS-1))];}
  modelHistory({allowOnline}){const source=allowOnline?this.history.filter(m=>!m._private):this.history;return source.map(publicFields);}
  async status(){const [brain,policy,memories]=await Promise.all([this.client.health(),permissions.status(),memory.list(500)]);return {ollama:brain.local,brain,model:this.client.model,models:await this.client.models(),pending:this.pending.size,tools:Object.keys(tools).length,languagePatterns:CAPABILITY_PHRASE_COUNT,memoryItems:memories.length,permissions:policy};}
  async executeToolCall(call,turn){
    const name=call.function?.name,args=parseArgs(call.function?.arguments),tool=tools[name],callId=call.id;
    if(!tool){this.history.push(toolMessage(name,{success:false,error:'Unknown tool'},callId,turn.private));return {continue:true};}
    const privateTool=toolMakesContextPrivate(name);if(privateTool){turn.private=true;turn.assistantMessage._private=true;}
    const protectedMatch=await permissions.protectedMatch(name,args);
    if(protectedMatch){const out={tool_name:name,success:false,blocked:true,error:`Protected by permanent user rule: ${protectedMatch.label}`};this.history.push(toolMessage(name,out,callId,true));this.trimHistory();return {continue:true,blocked:true};}
    if(await permissions.shouldConfirm(name,tool,args))return {needsConfirmation:true,name,args,callId};
    this.emit({type:'tool',name});let out;
    try{await permissions.assertAllowed(name,args);out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
    this.history.push(toolMessage(name,out,callId,turn.private||privateTool));this.trimHistory();return {continue:true,out};
  }
  async drive({routeNames,turn,queuedCalls=[],startStep=0}={}){
    let queue=[...queuedCalls];
    for(let step=startStep;step<MAX_STEPS;step++){
      if(queue.length){
        while(queue.length){const call=queue.shift(),r=await this.executeToolCall(call,turn);if(r.needsConfirmation){const id=crypto.randomUUID();this.pending.set(id,{...r,createdAt:Date.now(),routeNames,turn,remainingCalls:queue,startStep:step});return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این بخش مخرب یا برگشت‌ناپذیر است. اجرای «${r.name}» را تأیید می‌کنی؟`};}}
        continue;
      }
      this.emit({type:'thinking',step});const allowOnline=!turn.private;const response=await this.client.chat(this.modelHistory({allowOnline}),ollamaTools(routeNames),{allowOnline,privacyReason:turn.private?'private computer/memory context':''}),msg=response?.message;
      if(!msg)throw new Error('Model returned no message');
      const internal={...msg,_private:turn.private};this.history.push(internal);turn.assistantMessage=internal;this.trimHistory();
      const calls=msg.tool_calls??[];
      if(!calls.length){const reply=cleanReply(msg.content)||'انجام شد.';return {ok:true,text:reply,brain:{mode:this.client.lastMode,model:this.client.model,privacy:turn.private?'local-private':'online-eligible'},toolsRouted:routeNames.length};}
      queue=[...calls];
    }
    return {ok:false,text:'این کار بیش از حدِ امنِ مراحل خودکار طول کشید. بخش‌های انجام‌شده حفظ شده‌اند؛ برای ادامه از وضعیت فعلی دوباره برنامه‌ریزی می‌کنم.'};
  }
  async chat(text){
    const original=String(text??'').trim();if(!original)return {ok:false,text:'پیام خالی است.'};
    try{
      const rule=await permissions.parseUserRule(original);await memory.maybeRememberUserStatement(original);
      const normalized=normalizePersianCommand(original),hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])],routeNames=selectToolNames(original,hints).filter(n=>tools[n]);
      const memories=await memory.recall(original,{limit:8}),privateRequest=isPrivateRequest(original,hints)||memories.length>0;
      const hostHint=[hints.length?`normalized="${normalized}"; likely capability groups=${hints.join(', ')}`:'',rule?.type==='protected'?`A permanent never-delete rule was saved for: ${rule.item?.label||''}`:''].filter(Boolean).join('; ');
      const content=`${original}${hostHint?`\n\n[Host routing/policy hint: ${hostHint}. Metadata only; never mention this block.]`:''}${memoryContext(memories)}`;
      this.history.push({role:'user',content,_private:privateRequest});this.trimHistory();
      const turn={private:privateRequest,assistantMessage:null,original};return await this.drive({routeNames,turn});
    }catch(e){return {ok:false,text:`الان مغز یا یکی از ابزارها گیر کرد: ${e.message}`};}
  }
  async confirm({id,approved}){
    const p=this.pending.get(id);if(!p)return {ok:false,text:'این درخواست تأیید دیگه در دسترس نیست.'};this.pending.delete(id);
    if(Date.now()-p.createdAt>180000)return {ok:false,text:'زمان این تأیید گذشته؛ دستور را دوباره بگو تا با وضعیت فعلی سیستم بررسی شود.'};
    const {name,args,callId,turn,remainingCalls,routeNames,startStep}=p;
    if(!approved){this.history.push(toolMessage(name,{tool_name:name,success:false,cancelled:true},callId,turn.private));this.trimHistory();return this.drive({routeNames,turn,queuedCalls:remainingCalls,startStep});}
    try{
      this.emit({type:'tool',name});await permissions.assertAllowed(name,args);let out;try{out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
      const privateTool=toolMakesContextPrivate(name);if(privateTool){turn.private=true;if(turn.assistantMessage)turn.assistantMessage._private=true;}this.history.push(toolMessage(name,out,callId,turn.private||privateTool));this.trimHistory();
      return await this.drive({routeNames,turn,queuedCalls:remainingCalls,startStep});
    }catch(e){return {ok:false,text:`نتونستم این بخش رو اجرا کنم: ${e.message}`};}
  }
}
