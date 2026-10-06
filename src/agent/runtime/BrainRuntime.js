import crypto from 'node:crypto';
import { PERSONALITY_SYSTEM } from '../personality.js';
import { tools,ollamaTools,runTool } from '../toolRegistry.js';
import { memory } from '../MemoryStore.js';
import { skills } from '../SkillStore.js';
import { permissions } from '../PermissionPolicy.js';
import { matchFastCommand } from '../FastCommandRouter.js';
import { groundedKnowledgeAnswer } from '../GroundedKnowledge.js';
import { RunContext } from './RunContext.js';
import { ContextManager } from './ContextManager.js';
import { Planner } from './Planner.js';
import { Executor,toolHistoryMessage } from './Executor.js';
import { RecoveryEngine } from './RecoveryEngine.js';
import { ResultValidator } from './ResultValidator.js';
import { ToolResolver } from '../tools/ToolResolver.js';
import { ToolVerifier } from '../tools/ToolVerifier.js';
import { SkillValidator } from '../skills/SkillValidator.js';
import { runStore } from '../observability/RunStore.js';

const MAX_TURNS=72,MAX_STEPS=20;
const clean=text=>String(text??'').replace(/\n{3,}/g,'\n\n').trim();
const explicitCloud=options=>!['','auto','ollama','local'].includes(String(options?.provider||'auto').toLowerCase());
const unfamiliar=text=>/(نمی.?تونم|نمی.?توانم|نمی.?دونم|نمی.?دانم|بلد نیستم|not supported|can't|cannot)/i.test(String(text||''));

const V2_CHAT_SYSTEM=`تو MARIA هستی؛ دستیار هوش مصنوعی فارسی‌زبان اصلی کاربر. شخصیتت ثابت است: باهوش، سریع، گرم، مطمئن، کمی شوخ و در کار فنی بسیار دقیق. همیشه زبان کاربر را دنبال کن؛ وقتی کاربر فارسی می‌نویسد، پاسخ اصلی فارسی باشد مگر خودش زبان دیگری بخواهد.

سؤال ساده را مستقیم جواب بده. سؤال سخت، تخصصی، علمی، فنی، تحلیلی یا برنامه‌نویسی را سطحی خلاصه نکن: مسئله را درست بفهم، فرض‌های مهم را مشخص کن، پاسخ مرحله‌ای و حرفه‌ای بده و اگر عدم قطعیت وجود دارد صریح بگو. اطلاعات یا نتیجه ساختگی تولید نکن.

برای کارهای سیستم هرگز فقط از متن مدل نتیجه نگیر. موفقیت باید از Tool و در صورت امکان از postcondition/verification بیاید. اگر Tool شکست خورد، نتیجه را موفق اعلام نکن و از Recovery hint برای برنامه‌ریزی دوباره استفاده کن. اطلاعات خصوصی، فایل‌های محلی، توکن‌ها و credentialها بدون مجوز به Cloud فرستاده نمی‌شوند.`;

const publicFields=m=>{const x={role:m.role,content:m.content??''};if(m.tool_calls)x.tool_calls=m.tool_calls;if(m.tool_name)x.tool_name=m.tool_name;if(m.tool_call_id)x.tool_call_id=m.tool_call_id;return x;};

export class BrainRuntime{
  constructor({client,emit=()=>{},chatOptions={},defaultTools=[],systemContext=''}={}){
    if(!client)throw new Error('BrainRuntime requires a brain client');
    this.client=client;this.emit=emit;this.chatOptions={...chatOptions};this.defaultTools=[...new Set(defaultTools||[])].filter(n=>tools[n]);
    this.history=[{role:'system',content:`${PERSONALITY_SYSTEM}\n\n${V2_CHAT_SYSTEM}${systemContext||''}`,_private:false}];
    this.pending=new Map();
    this.contextManager=new ContextManager({memory,skills,permissions});
    this.resolver=new ToolResolver({tools,maxTools:Number(process.env.BLACK_CLOVER_MAX_CONTEXT_TOOLS)||28});
    this.planner=new Planner({resolver:this.resolver,defaultTools:this.defaultTools});
    this.verifier=new ToolVerifier({runTool});
    this.recovery=new RecoveryEngine({tools});
    this.executor=new Executor({tools,runTool,permissions,verifier:this.verifier,recovery:this.recovery,skills,emit,runStore});
    this.resultValidator=new ResultValidator({client});
    this.skillValidator=new SkillValidator({tools});
  }
  trimHistory(){if(this.history.length>MAX_TURNS)this.history=[this.history[0],...this.history.slice(-(MAX_TURNS-1))];}
  modelHistory({allowOnline,compact=false}={}){
    const source=allowOnline?this.history.filter(m=>!m._private||m.role==='system'):this.history,out=source.map(publicFields);
    if(compact&&out[0]?.role==='system')out[0]={role:'system',content:V2_CHAT_SYSTEM};
    return out;
  }
  async _recordFinish(turn,{ok=true,error=''}={}){
    await runStore.finish(turn.id,{ok,error,provider:this.client.lastProvider||'',model:this.client.model||'',profile:turn.profile,trace:turn.trace,privateContext:turn.private});
  }
  async _finish(turn,reply,{assistantMessage=null,direct=false,sources=null}={}){
    const allowOnline=!turn.private||explicitCloud(turn.chatOptions),checked=await this.resultValidator.validate({reply,userText:turn.original,turn,allowOnline});
    if(assistantMessage)assistantMessage.content=checked.text;else{const msg={role:'assistant',content:checked.text,_private:turn.private};this.history.push(msg);turn.assistantMessage=msg;}
    this.trimHistory();
    let candidate=null;
    if(!turn.private&&turn.trace.length>=2){
      const validation=this.skillValidator.validate(turn.original,turn.trace);
      if(validation.valid){candidate=await skills.createCandidate(turn.original,turn.trace,validation);if(candidate)this.emit({type:'learning',action:'skill-candidate',title:candidate.title,id:candidate.id,confidence:candidate.confidence,runId:turn.id});}
    }
    if(!turn.private&&unfamiliar(checked.text))await skills.queueImprovement(turn.original,{error:'Runtime V2 model reported unfamiliar/unsupported task'});
    await this._recordFinish(turn,{ok:checked.failures===0,error:checked.failures?`${checked.failures} step(s) were not verified`:''});
    return {ok:checked.failures===0||!turn.intent?.action,text:checked.text,brain:{mode:this.client.lastMode,model:this.client.model,provider:this.client.lastProvider||'ollama',profile:turn.profile,privacy:turn.private?'local/private-context':'online-eligible'},toolsRouted:turn.routeNames.length,verification:{verified:checked.verified,successes:checked.successes,failures:checked.failures},skillCandidate:candidate?{id:candidate.id,status:candidate.status,enabled:candidate.enabled,confidence:candidate.confidence}:null,runId:turn.id,direct,sources:sources||undefined};
  }
  async _executeFast(fast,turn){
    const call={id:`fast-${crypto.randomUUID()}`,name:fast.name,args:fast.args||{}},r=await this.executor.execute(call,turn);
    if(r.needsConfirmation){
      const id=crypto.randomUUID();this.pending.set(id,{kind:'fast',call,turn,fastReply:fast.reply,createdAt:Date.now()});
      return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این کار نیاز به تأیید دارد. اجرای «${r.name}» را تأیید می‌کنی؟`,runId:turn.id};
    }
    if(r.success)return this._finish(turn,fast.reply||r.out?.message||'انجام شد.',{direct:true});
    return null;
  }
  async _directChat(turn){
    const allowOnline=!turn.private||explicitCloud(turn.chatOptions),response=await this.client.chat(this.modelHistory({allowOnline,compact:true}),[],{...turn.chatOptions,allowOnline,privacyReason:turn.private?'private conversation':'',profile:turn.profile});
    const reply=clean(response?.message?.content)||'جوابی دریافت نشد.';
    return this._finish(turn,reply,{direct:true});
  }
  async _drive(turn,{queuedCalls=[],startStep=0}={}){
    let queue=[...queuedCalls];
    for(let step=startStep;step<MAX_STEPS;step++){
      if(queue.length){
        while(queue.length){
          const call=queue.shift(),r=await this.executor.execute(call,turn);
          if(r.needsConfirmation){
            const id=crypto.randomUUID();this.pending.set(id,{kind:'tool',call,turn,remainingCalls:queue,startStep:step,createdAt:Date.now()});
            return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این مرحله حساس یا ماندگار است. اجرای «${r.name}» را تأیید می‌کنی؟`,runId:turn.id};
          }
          this.history.push(r.history);this.trimHistory();
        }
        continue;
      }
      this.emit({type:'thinking',step,runId:turn.id,profile:turn.profile});
      const allowOnline=!turn.private||explicitCloud(turn.chatOptions),response=await this.client.chat(this.modelHistory({allowOnline,compact:false}),ollamaTools(turn.routeNames),{...turn.chatOptions,allowOnline,privacyReason:turn.private?'private computer/project context':'',profile:turn.profile}),msg=response?.message;
      if(!msg)throw new Error('Model returned no message');
      const internal={...msg,_private:turn.private};this.history.push(internal);turn.assistantMessage=internal;this.trimHistory();
      const calls=Array.isArray(msg.tool_calls)?msg.tool_calls:[];
      if(!calls.length)return this._finish(turn,clean(msg.content)||'نتیجه‌ای دریافت نشد.',{assistantMessage:internal});
      queue=[...calls];
    }
    if(!turn.private)await skills.queueImprovement(turn.original,{error:'Runtime V2 exceeded safe automatic step limit'});
    return this._finish(turn,'این کار به سقف امن مراحل خودکار رسید و هنوز کامل تأیید نشده؛ نتیجه‌های انجام‌شده حفظ شده‌اند.',{assistantMessage:turn.assistantMessage});
  }
  async chat(text,options={}){
    const original=String(text??'').trim();if(!original)return {ok:false,text:'پیام خالی است.'};
    let turn=null;
    try{
      const base=await this.contextManager.prepare(original),plan=this.planner.plan(base.canonical,{hints:base.hints}),enriched=await this.contextManager.enrich(base),effectiveChatOptions={...this.chatOptions,...(options||{})};
      turn=new RunContext({text:original,canonical:base.canonical,normalized:base.normalized,privateContext:enriched.privateContext,profile:plan.profile,intent:plan.intent,routeNames:plan.routeNames,chatOptions:effectiveChatOptions});
      turn.id=await runStore.start({text:original,privateContext:turn.private,profile:turn.profile});
      const fast=matchFastCommand(base.normalized);
      this.history.push({role:'user',content:enriched.content,_private:turn.private});this.trimHistory();
      if(fast&&tools[fast.name]){const direct=await this._executeFast(fast,turn);if(direct)return direct;}
      if(!turn.private&&plan.groundKnowledge){
        try{
          this.emit({type:'thinking',kind:'grounded-research',runId:turn.id});
          const grounded=await groundedKnowledgeAnswer(original,{client:this.client,runTool,brainOptions:effectiveChatOptions});
          if(grounded?.answer)return this._finish(turn,grounded.answer,{direct:true,sources:grounded.sources});
        }catch(e){await runStore.event(turn.id,{kind:'research-error',error:e.message},{privateContext:false});}
      }
      if(!plan.intent.action)return this._directChat(turn);
      if(!turn.routeNames.length)throw new Error('No safe tools were resolved for this computer action.');
      return this._drive(turn);
    }catch(e){
      const privateContext=Boolean(turn?.private);
      if(turn){if(!privateContext)await skills.queueImprovement(original,{error:e.message});await this._recordFinish(turn,{ok:false,error:e.message});}
      return {ok:false,text:`MARIA نتونست این درخواست رو کامل اجرا کنه. خطای ثبت‌شده: ${e.message}`,runId:turn?.id||null};
    }
  }
  async confirm({id,approved}={}){
    const p=this.pending.get(id);if(!p)return {ok:false,text:'این درخواست تأیید دیگر در دسترس نیست.'};
    this.pending.delete(id);if(Date.now()-p.createdAt>180000)return {ok:false,text:'زمان این تأیید گذشته؛ دستور را دوباره بگو تا وضعیت فعلی دوباره بررسی شود.'};
    const {turn,call}=p;
    if(!approved){
      const name=call?.function?.name||call?.name,out={tool_name:name,success:false,cancelled:true,error:'user cancelled'},verification={ok:false,level:'hard',reason:'user-cancelled'};
      turn.addTrace({name,args:call?.args||{},success:false,error:'user cancelled',verification});this.history.push(toolHistoryMessage(name,{...out,_verification:verification},call?.id,turn.private));this.trimHistory();
      if(p.kind==='fast')return this._finish(turn,'باشه، انجامش نمی‌دم.',{direct:true});
      return this._drive(turn,{queuedCalls:p.remainingCalls||[],startStep:p.startStep||0});
    }
    const r=await this.executor.execute(call,turn,{skipConfirmation:true});this.history.push(r.history);this.trimHistory();
    if(p.kind==='fast')return this._finish(turn,p.fastReply||r.out?.message||'انجام شد.',{direct:true});
    return this._drive(turn,{queuedCalls:p.remainingCalls||[],startStep:p.startStep||0});
  }
  async status(){
    const errors=await runStore.list({errorsOnly:true,limit:10});
    return {name:'BrainRuntime V2',enabled:true,pending:this.pending.size,historyTurns:this.history.length,recentErrors:errors.length,maxContextTools:this.resolver.maxTools};
  }
  recentRuns(options={}){return runStore.list(options);}
  diagnosticReport(options={}){return runStore.diagnosticReport(options);}
}
