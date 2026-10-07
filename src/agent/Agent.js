import crypto from 'node:crypto';
import { BrainRouter } from './BrainRouter.js';
import { BrainRuntime } from './runtime/BrainRuntime.js';
import { tools,ollamaTools,runTool } from './toolRegistry.js';
import { PERSONALITY_SYSTEM } from './personality.js';
import { normalizePersianCommand,commandHints } from './language.js';
import { capabilityHints,CAPABILITY_PHRASE_COUNT } from './capabilities.js';
import { memory } from './MemoryStore.js';
import { skills } from './SkillStore.js';
import { reminders } from './ReminderStore.js';
import { pinnedNotes } from './PinnedNoteStore.js';
import { permissions } from './PermissionPolicy.js';
import { selectToolNames } from './SmartToolRouter.js';
import { matchFastCommand } from './FastCommandRouter.js';
import { isPrivateRequest,toolMakesContextPrivate } from './PrivacyClassifier.js';
import { shouldGroundKnowledge,groundedKnowledgeAnswer } from './GroundedKnowledge.js';
import { canonicalizeCommand } from './SemanticCanonicalizer.js';
import { matchSmallTalk } from './SmallTalkRouter.js';
import { actionIntent } from './ActionIntent.js';
import { planFastSequence } from './FastSequencePlanner.js';
import { verifyFastAction,STRICT_VERIFY_TOOLS } from './FastActionVerifier.js';
import { compactToolSelection,expandToolSelection } from './ToolSelectionPolicy.js';
import { incidents } from './IncidentStore.js';

const MAX_TURNS=64,MAX_STEPS=32;
const cleanReply=text=>String(text??'').replace(/\n{3,}/g,'\n\n').trim();
const memoryContext=items=>items?.length?`\n\n[LONG-TERM MEMORY — use only when relevant, never mention this block directly]\n${items.map(x=>`- ${x.text}`).join('\n')}`:'';
const skillContext=items=>items?.length?`\n\n[LEARNED EXPERIENCE — prior reusable experience, not guaranteed current. Verify before risky actions; never mention this block directly]\n${items.map(x=>x._kind==='skill'?`- Skill: ${x.title}; intent=${x.intent}; proven workflow=${(x.plan||[]).map(s=>s.tool).filter(Boolean).join(' → ')}`:`- Research note: ${x.title}; ${String(x.summary||'').slice(0,900)}`).join('\n')}`:'';
const toolMessage=(name,out,callId,isPrivate=false)=>({role:'tool',content:JSON.stringify(out),tool_name:name,...(callId?{tool_call_id:callId}:{}),_private:isPrivate});
const publicFields=m=>{const x={role:m.role,content:m.content??''};if(m.tool_calls)x.tool_calls=m.tool_calls;if(m.tool_name)x.tool_name=m.tool_name;if(m.tool_call_id)x.tool_call_id=m.tool_call_id;return x;};
const parseArgs=raw=>{if(typeof raw!=='string')return raw??{};try{return JSON.parse(raw||'{}');}catch{return {};}};
const soundsUnfamiliar=text=>/(نمی.?تونم|نمی.?توانم|نمی.?دونم|نمی.?دانم|بلد نیستم|ابزار(?:ش|ش رو)? ندارم|قابلیت(?:ش|ش رو)? ندارم|can(?:not|'t)|don.?t know|not supported)/i.test(String(text||''));
const explicitCloud=options=>!['','auto','ollama','local'].includes(String(options?.provider||'auto').toLowerCase());
const COMPACT_CHAT_SYSTEM=`تو MARIA هستی؛ یک دستیار هوش مصنوعی فارسی‌زبان با شخصیت ثابت، باهوش، گرم، کمی شوخ و اعتمادبه‌نفس‌دار. ربات فرمان ثابت نیستی و باید سؤال‌های عمومی، تخصصی، ساده، سخت، تحلیلی، آموزشی، علمی، فنی، برنامه‌نویسی، مقایسه‌ای و خلاقانه را با بیشترین کیفیتی که مدل در اختیار دارد پاسخ بدهی.

پاسخ را بر اساس سختی سؤال تنظیم کن: سؤال ساده را بی‌دلیل پیچیده نکن، اما برای سؤال سخت یا حرفه‌ای سطحی و کوتاه جواب نده؛ مسئله را دقیق بفهم، نکات مهم و فرض‌ها را بررسی کن و توضیح منظم و کافی بده. فارسی باید طبیعی، روان و درست باشد؛ اصطلاحات انگلیسی فنی را فقط وقتی مفید است نگه دار. از جواب‌های قالبی، تکرار، حاشیه و جمله‌های رباتیک دوری کن.

شخصیت MARIA را حفظ کن: صمیمی، دقیق، قابل اتکا، گاهی یک شوخی یا واکنش کوتاه و بامزه، ولی شخصیت هرگز نباید کیفیت جواب را کم کند. ادعا نکن انسان هستی و چیزی را که نمی‌دانی نساز. اگر اطلاعات ممکن است قدیمی یا نامطمئن باشد، واضح بگو که نیاز به بررسی تازه دارد. وقتی داده یا منبع معتبر در زمینه گفتگو وجود دارد، بر همان تکیه کن. اگر کاربر سؤال را ناقص یا محاوره‌ای گفت، از زمینه مکالمه منظور را تا جای معقول استنباط کن.

هدف اصلی: تجربه چت نزدیک به یک دستیار حرفه‌ای همه‌منظوره، با درک خوب فارسی، پاسخ عمیق در سؤال‌های سخت، و رفتار شخصیتی ثابت MARIA.`;

export class Agent{
  constructor({emit=()=>{},client=new BrainRouter(),systemContext='',chatOptions={},defaultTools=[],enableScheduler=true}={}){
    this.emit=emit;this.client=client;this.runtime=new BrainRuntime({brain:this.client,emit:this.emit});this.chatOptions={...chatOptions};this.defaultTools=[...new Set(defaultTools||[])].filter(n=>tools[n]);this.history=[{role:'system',content:`${PERSONALITY_SYSTEM}${systemContext||''}`,_private:false}];this.pending=new Map();this.improving=false;
    if(enableScheduler)reminders.setActionExecutor(async item=>{
      this.emit({type:'scheduled-action',state:'running',id:item.id,label:item.label||item.instruction});
      let response=await this.chat(item.instruction);let blocked=false,guard=0;
      while(response?.requiresConfirmation&&response?.confirmationId&&guard++<4){blocked=true;response=await this.confirm({id:response.confirmationId,approved:false});}
      if(blocked){const out={ok:true,requiresConfirmation:true,text:'بخش‌های امن کار زمان‌بندی‌شده اجرا شدند، اما یک مرحله حساس به تأیید دستی نیاز داشت و خودکار تأیید نشد.'};this.emit({type:'scheduled-action',state:'needs-confirmation',id:item.id,label:item.label||item.instruction,text:out.text});return out;}
      this.emit({type:'scheduled-action',state:response?.ok===false?'error':'done',id:item.id,label:item.label||item.instruction,text:response?.text||''});return response;
    });
  }
  trimHistory(){if(this.history.length>MAX_TURNS)this.history=[this.history[0],...this.history.slice(-(MAX_TURNS-1))];}
  modelHistory({allowOnline,compact=false}){const source=allowOnline?this.history.filter(m=>!m._private||m.role==='system'):this.history;const out=source.map(publicFields);if(compact&&out[0]?.role==='system')out[0]={role:'system',content:COMPACT_CHAT_SYSTEM};return out;}
  async modelCatalog(){return this.client.catalog();}
  async status(){const [brain,policy,memories,learning,activeReminders,notes]=await Promise.all([this.client.health(),permissions.status(),memory.list(500),skills.stats(),reminders.list(),pinnedNotes.list({limit:100})]);return {ollama:brain.local,brain,model:this.client.model,models:brain.installedLocalModels||await this.client.models(),pending:this.pending.size,tools:Object.keys(tools).length,languagePatterns:CAPABILITY_PHRASE_COUNT,memoryItems:memories.length,permissions:policy,learning,personal:{reminders:activeReminders,notes}};}
  fastReply(turn,text,name,extra={}){const reply=cleanReply(text)||'انجام شد.';this.history.push({role:'assistant',content:reply,_private:turn.private});this.trimHistory();return {ok:extra.ok!==false,text:reply,brain:{mode:'direct',model:'windows-fast-path',privacy:turn.private?'local-private':'local',runtime:'v2'},toolsRouted:turn.routeNames?.length||0,direct:true,tool:name,...extra};}
  async tryFastCommand(fast,turn,routeNames){
    if(!fast||!tools[fast.name])return null;
    const {name,args={}}=fast,tool=tools[name];turn.routeNames=routeNames;
    const protectedMatch=await permissions.protectedMatch(name,args);
    if(protectedMatch)return this.fastReply(turn,`این مورد با قانون دائمی خودت محافظت شده: ${protectedMatch.label}`,name,{ok:false,blocked:true});

    if(await permissions.shouldConfirm(name,tool,args)){
      const id=crypto.randomUUID();
      this.pending.set(id,{fast:true,name,args,createdAt:Date.now(),turn,routeNames,fastReply:fast.reply});
      return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این کار روی وضعیت سیستم اثر مهم می‌گذارد. اجرای «${name}» را تأیید می‌کنی؟`};
    }

    try{
      this.emit({type:'tool',name});
      await permissions.assertAllowed(name,args);
      const out=await runTool(name,args);
      if(out?.success===false){
        await incidents.record({kind:'tool',phase:'fast-action',error:out?.error||out?.message||'tool failed',tool:name,input:turn.original,privateContext:turn.private,model:'windows-fast-path'});
        return this.fastReply(turn,`نتونستم این کار رو کامل انجام بدم: ${out?.error||out?.message||'خطای ابزار'}`,name,{ok:false});
      }
      const verification=await verifyFastAction({name,args},out,runTool);
      const strictFail=verification?.verified===false&&STRICT_VERIFY_TOOLS.has(name);
      turn.trace.push({name,args,success:!strictFail,error:strictFail?'verification failed':'',verification});
      if(strictFail){
        await incidents.record({kind:'verification',phase:'fast-action',error:verification?.reason||'postcondition failed',tool:name,input:turn.original,privateContext:turn.private,model:'windows-fast-path'});
        return this.fastReply(turn,'دستور اجرا شد، ولی نتیجه نهایی روی ویندوز تأیید نشد؛ موفقیت اعلام نمی‌کنم.',name,{ok:false,verification});
      }
      return this.fastReply(turn,fast.reply||out?.message||'انجام شد.',name,{verification});
    }catch(error){
      await incidents.record({kind:'runtime',phase:'fast-action',error:error.message,tool:name,input:turn.original,privateContext:turn.private,model:'windows-fast-path'}).catch(()=>{});
      return null;
    }
  }

  async tryFastSequence(sequence,turn,routeNames){
    if(!sequence?.complete||!sequence?.multi)return null;
    turn.routeNames=routeNames;
    const actions=sequence.steps.filter(step=>step.type==='action');

    for(const step of actions){
      const {name,args={}}=step.command||{},tool=tools[name];
      if(!tool)return null;
      const protectedMatch=await permissions.protectedMatch(name,args);
      if(protectedMatch)return this.fastReply(turn,`این مورد با قانون دائمی خودت محافظت شده: ${protectedMatch.label}`,'fast-sequence',{ok:false,blocked:true});
      if(await permissions.shouldConfirm(name,tool,args))return null;
    }

    const results=[],replies=[];
    let lastVerification=null;
    for(const step of sequence.steps){
      if(step.type==='verify'){
        if(lastVerification?.verified===false)return this.fastReply(turn,'بررسی کردم؛ مرحله قبلی واقعاً تأیید نشد.','fast-sequence',{ok:false,sequence:true,results});
        continue;
      }
      const {name,args={}}=step.command;
      try{
        this.emit({type:'tool',name});
        await permissions.assertAllowed(name,args);
        const out=await runTool(name,args);
        if(out?.success===false)return this.fastReply(turn,`مرحله «${name}» انجام نشد: ${out.error||out.message||'خطای ابزار'}`,'fast-sequence',{ok:false,sequence:true,results});
        lastVerification=await verifyFastAction({name,args},out,runTool);
        const strictFail=lastVerification?.verified===false&&STRICT_VERIFY_TOOLS.has(name);
        turn.trace.push({name,args,success:!strictFail,error:strictFail?'verification failed':'',verification:lastVerification});
        results.push({name,args,verification:lastVerification});
        if(strictFail)return this.fastReply(turn,`مرحله «${name}» اجرا شد ولی نتیجه‌اش تأیید نشد.`,'fast-sequence',{ok:false,sequence:true,results});
        if(step.command.reply)replies.push(step.command.reply);
      }catch(error){
        await incidents.record({kind:'runtime',phase:'fast-sequence',error:error.message,tool:name,input:turn.original,privateContext:turn.private,model:'windows-fast-path'}).catch(()=>{});
        return this.fastReply(turn,`در مرحله «${name}» خطا شد: ${error.message}`,'fast-sequence',{ok:false,sequence:true,results});
      }
    }
    const verified=results.some(x=>x.verification?.verified===true);
    return this.fastReply(turn,replies.length>1?`انجام شد: ${replies.join(' ')}`:(replies[0]||'انجام شد.')+(verified?' نتیجه هم بررسی شد.':''),'fast-sequence',{sequence:true,results});
  }
  async executeToolCall(call,turn){
    const name=call.function?.name,args=parseArgs(call.function?.arguments),tool=tools[name],callId=call.id;
    if(!tool){const out={success:false,error:'Unknown tool'};this.history.push(toolMessage(name,out,callId,turn.private));turn.trace.push({name,args,success:false,error:out.error});if(!turn.private){await skills.queueImprovement(turn.original,{tool:name,error:out.error});this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error:out.error});}return {continue:true};}
    const privateTool=toolMakesContextPrivate(name);if(privateTool){turn.private=true;if(turn.assistantMessage)turn.assistantMessage._private=true;}
    const protectedMatch=await permissions.protectedMatch(name,args);if(protectedMatch){const out={tool_name:name,success:false,blocked:true,error:`Protected by permanent user rule: ${protectedMatch.label}`};this.history.push(toolMessage(name,out,callId,true));turn.trace.push({name,args,success:false,error:out.error});this.trimHistory();return {continue:true,blocked:true};}
    if(await permissions.shouldConfirm(name,tool,args))return {needsConfirmation:true,name,args,callId};
    this.emit({type:'tool',name});let out;
    try{await permissions.assertAllowed(name,args);out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
    let verification=null;
    if(out?.success!==false)verification=await verifyFastAction({name,args},out,runTool);
    const strictFail=verification?.verified===false&&STRICT_VERIFY_TOOLS.has(name);
    const success=out?.success!==false&&!strictFail;
    turn.trace.push({name,args,success,error:success?'':String(out?.error||out?.message||verification?.reason||'verification failed').slice(0,700),verification});
    if(!success){
      await incidents.record({kind:strictFail?'verification':'tool',phase:'agent-tool',error:out?.error||out?.message||verification?.reason||'tool failed',tool:name,input:turn.original,privateContext:turn.private||privateTool,model:this.client.model}).catch(()=>{});
      if(!turn.private){await skills.queueImprovement(turn.original,{tool:name,error:out?.error||out?.message||verification?.reason||'tool failed'});this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error:out?.error||out?.message||verification?.reason||'tool failed'});}
    }
    const toolOut=strictFail?{...out,success:false,error:verification?.reason||'Postcondition verification failed',verification}:verification?{...out,verification}:out;
    this.history.push(toolMessage(name,toolOut,callId,turn.private||privateTool));this.trimHistory();return {continue:true,out:toolOut};
  }
  async finishTurn(turn,reply){
    const successes=turn.trace.filter(x=>x.success).length,failures=turn.trace.filter(x=>!x.success).length,verified=turn.trace.filter(x=>x.success&&x.verification?.verified===true).length;
    let learned=false;
    if(!turn.private&&successes>=2&&failures===0&&verified>=1){
      try{const item=await skills.learnFromTrace(turn.original,turn.trace);if(item){learned=true;this.emit({type:'learning',action:'workflow-learned',title:item.title});}}catch{}
    }
    if(!turn.private&&soundsUnfamiliar(reply)){try{await skills.queueImprovement(turn.original,{error:'Model reported an unfamiliar or unsupported task'});this.emit({type:'learning',action:'gap-queued',title:turn.original});}catch{}}
    return {ok:true,text:reply,brain:{mode:this.client.lastMode,model:this.client.model,provider:this.client.lastProvider,privacy:turn.private?'local/private-context':'online-eligible',runtime:'v2'},toolsRouted:turn.routeNames?.length||0,learned,verification:{verifiedSteps:verified,failedSteps:failures}};
  }
  async drive({routeNames,turn,queuedCalls=[],startStep=0}={}){
    turn.routeNames=routeNames;let queue=[...queuedCalls];
    for(let step=startStep;step<MAX_STEPS;step++){
      if(queue.length){while(queue.length){const call=queue.shift(),r=await this.executeToolCall(call,turn);if(r?.out){routeNames=expandToolSelection(routeNames,r.out,{max:30}).filter(n=>tools[n]);turn.routeNames=routeNames;}if(r.needsConfirmation){const id=crypto.randomUUID();this.pending.set(id,{...r,createdAt:Date.now(),routeNames,turn,remainingCalls:queue,startStep:step});return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این بخش حساس یا برگشت‌ناپذیر است. اجرای «${r.name}» را تأیید می‌کنی؟`};}}continue;}
      this.emit({type:'thinking',step});const options=turn.chatOptions||this.chatOptions,allowOnline=!turn.private||explicitCloud(options);const response=await this.client.chat(this.modelHistory({allowOnline,compact:routeNames.length===0}),ollamaTools(routeNames),{...options,allowOnline,privacyReason:turn.private?'private computer/project context':''}),msg=response?.message;
      if(!msg)throw new Error('Model returned no message');const internal={...msg,_private:turn.private};this.history.push(internal);turn.assistantMessage=internal;this.trimHistory();const calls=msg.tool_calls??[];if(!calls.length){const reply=cleanReply(msg.content)||'انجام شد.';return this.finishTurn(turn,reply);}queue=[...calls];
    }
    if(!turn.private)await skills.queueImprovement(turn.original,{error:'Agent exceeded safe automatic step limit'});return {ok:false,text:'این کار بیش از حدِ امنِ مراحل خودکار طول کشید. بخش‌های انجام‌شده حفظ شده‌اند؛ از وضعیت فعلی دوباره برنامه‌ریزی می‌کنم.'};
  }
  async chat(text,options={}){
    const original=String(text??'').trim();if(!original)return {ok:false,text:'پیام خالی است.'};const effectiveChatOptions={...this.chatOptions,...(options||{})};
    try{
      const rule=await permissions.parseUserRule(original);
      const canonical=canonicalizeCommand(original),normalized=normalizePersianCommand(canonical);
      const hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])];
      const basePrivate=isPrivateRequest(original,hints),intent=actionIntent(canonical);
      const rawRouteNames=[...new Set([...this.defaultTools,...selectToolNames(canonical,hints)])].filter(n=>tools[n]);
      const routeNames=compactToolSelection(canonical,rawRouteNames,{modes:intent.modes,action:intent.action,multiStep:intent.multiStep,max:18}).filter(n=>tools[n]);
      const fast=matchFastCommand(original)||matchFastCommand(canonical)||matchFastCommand(normalized);
      const sequenceOriginal=planFastSequence(original),sequenceNormalized=planFastSequence(normalized),sequence=sequenceOriginal?.complete?sequenceOriginal:sequenceNormalized;
      const fastTurn={private:basePrivate,assistantMessage:null,original,trace:[],routeNames,chatOptions:effectiveChatOptions};

      // Privacy is classified before durable memory. Obvious local actions execute
      // deterministically and are verified before MARIA claims success.
      if(sequence?.complete&&sequence.multi){
        this.history.push({role:'user',content:original,_private:basePrivate});this.trimHistory();
        const direct=await this.tryFastSequence(sequence,fastTurn,routeNames);
        if(direct)return direct;
        this.history.pop();
      }
      if(fast){
        this.history.push({role:'user',content:original,_private:basePrivate});this.trimHistory();
        const direct=await this.tryFastCommand(fast,fastTurn,routeNames);
        if(direct)return direct;
        this.history.pop();
      }

      await memory.maybeRememberUserStatement(original);
      const small=matchSmallTalk(original);if(small&&!intent.action){this.history.push({role:'user',content:original,_private:false},{role:'assistant',content:small,_private:false});this.trimHistory();return {ok:true,text:small,brain:{mode:'direct-smalltalk',model:'maria-local',privacy:'local'},toolsRouted:0,direct:true};}
      const needsGround=!basePrivate&&shouldGroundKnowledge(original);
      if(!intent.action&&!needsGround&&!fast&&this.defaultTools.length===0){
        const privateChat=basePrivate;
        this.history.push({role:'user',content:original,_private:privateChat});
        this.trimHistory();
        const run=await this.runtime.answer({
          text:original,
          messages:this.modelHistory({allowOnline:!privateChat,compact:true}),
          hints,
          options:{...effectiveChatOptions,allowOnline:!privateChat}
        });
        const reply=cleanReply(run?.message?.content)||'جوابی دریافت نشد.';
        this.history.push({role:'assistant',content:reply,_private:privateChat});
        this.trimHistory();
        return {
          ok:run?.ok!==false,
          text:reply,
          brain:{
            mode:this.client.lastMode,
            model:run?.model||this.client.model,
            provider:run?.provider||this.client.lastProvider||'ollama',
            profile:run?.profile||this.client.lastProfile,
            privacy:privateChat?'local-private':'online-eligible',
            runtime:'v2'
          },
          validation:run?.validation,
          verification:run?.verification,
          runId:run?.run?.id,
          toolsRouted:0,
          directChat:true
        };
      }
      if(!routeNames.length){const small=matchSmallTalk(original);if(small){this.history.push({role:'user',content:original,_private:basePrivate},{role:'assistant',content:small,_private:basePrivate});this.trimHistory();return {ok:true,text:small,brain:{mode:'direct-smalltalk',model:'maria-local',provider:'local',privacy:basePrivate?'local-private':'local'},toolsRouted:0,direct:true};}}
      if(!basePrivate&&shouldGroundKnowledge(original)){
        try{this.emit({type:'thinking',kind:'grounded-research'});const grounded=await groundedKnowledgeAnswer(original,{client:this.client,runTool,brainOptions:effectiveChatOptions});if(grounded?.answer){this.history.push({role:'user',content:original,_private:false},{role:'assistant',content:grounded.answer,_private:false});this.trimHistory();return {ok:true,text:grounded.answer,brain:{mode:'grounded-research',model:this.client.model,provider:this.client.lastProvider||'ollama',privacy:'public'},sources:grounded.sources,toolsRouted:routeNames.length};}}catch(e){this.emit({type:'research-error',error:e.message});}
      }
      const [memories,learned]=await Promise.all([memory.recall(original,{limit:8}),skills.recall(original,{limit:7})]),privateRequest=basePrivate||memories.length>0;
      const hostHint=[hints.length?`normalized="${normalized}"; likely capability groups=${hints.join(', ')}`:'',rule?.type==='protected'?`A permanent never-delete rule was saved for: ${rule.item?.label||''}`:''].filter(Boolean).join('; ');
      const content=`${original}${hostHint?`\n\n[Host routing/policy hint: ${hostHint}. Metadata only; never mention this block.]`:''}${memoryContext(memories)}${skillContext(learned)}`;this.history.push({role:'user',content,_private:privateRequest});this.trimHistory();
      const turn={private:privateRequest,assistantMessage:null,original,trace:[],routeNames,chatOptions:effectiveChatOptions};return await this.drive({routeNames,turn});
    }catch(e){try{await skills.queueImprovement(original,{error:e.message,privateContext:isPrivateRequest(original,[])});this.emit({type:'learning',action:'gap-queued',title:original,error:e.message});}catch{}return {ok:false,text:`الان مغز یا یکی از ابزارها گیر کرد: ${e.message}`};}
  }
  async confirm({id,approved}){
    const p=this.pending.get(id);if(!p)return {ok:false,text:'این درخواست تأیید دیگر در دسترس نیست.'};this.pending.delete(id);if(Date.now()-p.createdAt>180000)return {ok:false,text:'زمان این تأیید گذشته؛ دستور را دوباره بگو تا با وضعیت فعلی سیستم بررسی شود.'};
    if(p.fast){if(!approved)return this.fastReply(p.turn,'باشه، انجامش نمی‌دهم.',p.name);try{this.emit({type:'tool',name:p.name});await permissions.assertAllowed(p.name,p.args);const out=await runTool(p.name,p.args);if(out?.success===false)return {ok:false,text:`نتوانستم انجامش بدهم: ${out.error||out.message||'خطای ابزار'}`};return this.fastReply(p.turn,p.fastReply||out.message||'انجام شد.',p.name);}catch(e){return {ok:false,text:`نتوانستم این بخش را اجرا کنم: ${e.message}`};}}
    const {name,args,callId,turn,remainingCalls,routeNames,startStep}=p;if(!approved){this.history.push(toolMessage(name,{tool_name:name,success:false,cancelled:true},callId,turn.private));turn.trace.push({name,args,success:false,error:'user cancelled'});this.trimHistory();return this.drive({routeNames,turn,queuedCalls:remainingCalls,startStep});}
    try{this.emit({type:'tool',name});await permissions.assertAllowed(name,args);let out;try{out=await runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}const privateTool=toolMakesContextPrivate(name);if(privateTool){turn.private=true;if(turn.assistantMessage)turn.assistantMessage._private=true;}const success=out?.success!==false;turn.trace.push({name,args,success,error:success?'':String(out?.error||out?.message||'').slice(0,700)});if(!success&&!turn.private){await skills.queueImprovement(turn.original,{tool:name,error:out?.error||out?.message||'tool failed'});this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error:out?.error||out?.message||'tool failed'});}this.history.push(toolMessage(name,out,callId,turn.private||privateTool));this.trimHistory();return await this.drive({routeNames,turn,queuedCalls:remainingCalls,startStep});}catch(e){return {ok:false,text:`نتوانستم این بخش را اجرا کنم: ${e.message}`};}
  }
  async improveOne({allowCurriculum=true}={}){
    if(this.improving)return {ok:false,skipped:'already-running'};this.improving=true;
    try{if(!await this.client.network({fresh:true}))return {ok:false,skipped:'offline'};const pending=await skills.nextImprovement(),due=await skills.shouldIdleLearn({minIntervalMs:pending?10*60*1000:4*60*60*1000});if(!due)return {ok:false,skipped:'cooldown'};if(!pending&&!allowCurriculum)return {ok:false,skipped:'nothing-to-learn'};const topic=pending?pending.task:await skills.nextCurriculum(),query=pending?`${topic} Windows 11 reliable automation official documentation troubleshooting ${pending.tool||''}`:topic;this.emit({type:'self-improvement',state:'researching',topic});const research=await runTool('research_topic',{query,sources:4});if(research?.success===false||!research?.data?.sources?.length){if(pending)await skills.markImprovement(pending.id,{status:'pending',error:'No research sources available'});return {ok:false,skipped:'no-sources'};}const sources=research.data.sources.slice(0,4),evidence=sources.map((s,i)=>`SOURCE ${i+1}: ${s.title}\nURL: ${s.url}\n${String(s.text||s.snippet||'').slice(0,2400)}`).join('\n\n');const prompt=[{role:'system',content:'Extract practical reusable verifiable operational knowledge from the public sources. Do not invent capabilities, credentials, APIs, commands, selectors, or facts. Return prerequisites, procedure, failure modes, and verification.'},{role:'user',content:`Learning topic: ${topic}\n\n${evidence}`}];const response=await this.client.chat(prompt,[],{allowOnline:true,profile:'research'}),summary=cleanReply(response?.message?.content);if(!summary)throw new Error('Learning brain returned no summary');const note=await skills.saveKnowledge({title:topic,query,summary,sources,kind:pending?'failure-research':'curriculum'});if(pending)await skills.markImprovement(pending.id,{status:'done',noteId:note.id});await skills.markIdleLearning();this.emit({type:'self-improvement',state:'learned',topic,noteId:note.id});return {ok:true,topic,noteId:note.id};}catch(e){this.emit({type:'self-improvement',state:'error',error:e.message});return {ok:false,error:e.message};}finally{this.improving=false;}
  }
}
