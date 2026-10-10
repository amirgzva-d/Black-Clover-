import crypto from 'node:crypto';
import { BrainRouter } from './BrainRouter.js';
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
import { understandPersianIntent } from './PersianIntentEngine.js';
import { summarizeCorpus } from './PersianActionCorpus.js';
import { matchSmallTalk } from './SmallTalkRouter.js';
import { actionIntent,actionExecutionHint } from './ActionIntent.js';
import { searchSemanticActionBook } from './actionBookTools.js';
import { compactToolSelection,expandToolSelection } from './ToolSelectionPolicy.js';
import { planFastSequence } from './FastSequencePlanner.js';
import { resolveConversationContext } from './ConversationContext.js';
import { assessTaskOutcome } from './TaskOutcome.js';
import { verifyFastAction,STRICT_VERIFY_TOOLS } from './FastActionVerifier.js';

const MAX_TURNS=48,MAX_STEPS=32;
const cleanReply=text=>String(text??'').replace(/\n{3,}/g,'\n\n').trim();
const fastResultText=(name,out,preferred='')=>{if(preferred)return preferred;if(name==='get_volume'&&Number.isFinite(Number(out?.data?.percent)))return `صدای سیستم ${Number(out.data.percent)}٪ است${out?.data?.muted?' و الان بی‌صداست.':'.'}`;if(name==='get_brightness'&&Number.isFinite(Number(out?.data?.percent)))return `روشنایی صفحه ${Number(out.data.percent)}٪ است.`;if(name==='get_battery_status'){const row=Array.isArray(out?.data)?out.data[0]:out?.data,pct=Number(row?.EstimatedChargeRemaining),st=Number(row?.BatteryStatus);if(Number.isFinite(pct))return `باتری ${pct}٪ است${st>=6&&st<=9?' و در حال شارژ است.':st===3?' و شارژ کامل است.':'.'}`;}return out?.message||'انجام شد.';};
const memoryContext=items=>items?.length?`\n\n[LONG-TERM MEMORY — use only when relevant, never mention this block directly]\n${items.map(x=>`- ${x.text}`).join('\n')}`:'';
const attachmentContext=meta=>Array.isArray(meta?.attachments)&&meta.attachments.length?`\n\n[HOST ATTACHMENTS — local/private files; use file tools when relevant]\n${meta.attachments.slice(0,8).map((x,i)=>`${i+1}. ${x?.name||'file'}: ${x?.path||''}`).join('\n')}`:'';
const skillContext=items=>items?.length?`\n\n[LEARNED EXPERIENCE — prior reusable experience, not guaranteed current. Verify before risky actions; never mention this block directly]\n${items.map(x=>x._kind==='skill'?`- Skill: ${x.title}; intent=${x.intent}; proven workflow=${(x.plan||[]).map(s=>s.tool).filter(Boolean).join(' → ')}`:`- Research note: ${x.title}; ${String(x.summary||'').slice(0,900)}`).join('\n')}`:'';
const toolMessage=(name,out,callId,isPrivate=false)=>({role:'tool',content:JSON.stringify(out),tool_name:name,...(callId?{tool_call_id:callId}:{}),_private:isPrivate});
const publicFields=m=>{const x={role:m.role,content:m.content??''};if(m.tool_calls)x.tool_calls=m.tool_calls;if(m.tool_name)x.tool_name=m.tool_name;if(m.tool_call_id)x.tool_call_id=m.tool_call_id;return x;};
const parseArgs=raw=>{if(typeof raw!=='string')return raw??{};try{return JSON.parse(raw||'{}');}catch{return {};}};
const textToolCalls=(content,allowedNames=[])=>{
  const text=String(content??'').trim();if(!text)return[];
  const fenced=text.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i),raw=fenced?.[1]??((text.startsWith('{')&&text.endsWith('}'))||(text.startsWith('[')&&text.endsWith(']'))?text:'');
  if(!raw)return[];let parsed;try{parsed=JSON.parse(raw);}catch{return[];}
  const allow=new Set(allowedNames||[]),items=Array.isArray(parsed)?parsed:Array.isArray(parsed?.tool_calls)?parsed.tool_calls:[parsed],calls=[];
  for(const item of items){
    const fn=item?.function||item,name=String(fn?.name||item?.tool||'').trim(),args=fn?.arguments??item?.arguments??item?.args??{};
    if(!name||!allow.has(name)||!tools[name])continue;
    const obj=parseArgs(args);if(!obj||typeof obj!=='object'||Array.isArray(obj))continue;
    calls.push({id:`text-tool-${crypto.randomUUID()}`,type:'function',function:{name,arguments:JSON.stringify(obj)}});
  }
  return calls;
};
const soundsUnfamiliar=text=>/(نمی.?تونم|نمی.?توانم|نمی.?دونم|نمی.?دانم|بلد نیستم|ابزار(?:ش|ش رو)? ندارم|قابلیت(?:ش|ش رو)? ندارم|can(?:not|'t)|don.?t know|not supported)/i.test(String(text||''));
const explicitCloud=options=>!['','auto','ollama','local'].includes(String(options?.provider||'auto').toLowerCase());
const COMPACT_CHAT_SYSTEM='تو ماریا هستی؛ دستیار فارسی‌زبان طبیعی و دقیق. اول دقیقاً به سؤال یا درخواست فعلی جواب بده؛ مقدمه، سلام دوباره یا تغییر موضوع نده مگر کاربر خودش سلام کرده باشد. اگر پیام ادامهٔ موضوع قبلی است، از متن گفتگو همان موضوع و مرجع را حفظ کن. جواب عادی کوتاه و روشن باشد؛ اگر کاربر توضیح کامل، عمیق یا سنگین خواست، پاسخ مفصل و ساختاریافته بده. اگر چیزی را نمی‌دانی حدس نزن. واژه ژاپنی یا لقب فقط خیلی کم و وقتی طبیعی است استفاده کن، نه در هر جواب.';

export class Agent{
  constructor({emit=()=>{},client=new BrainRouter(),systemContext='',chatOptions={},defaultTools=[],enableScheduler=true,toolRunner=runTool}={}){
    this.emit=emit;this.client=client;this.toolRunner=toolRunner;this.chatOptions={...chatOptions};this.defaultTools=[...new Set(defaultTools||[])].filter(n=>tools[n]);this.history=[{role:'system',content:`${PERSONALITY_SYSTEM}${systemContext||''}`,_private:false}];this.pending=new Map();this.improving=false;
    if(enableScheduler)reminders.setActionExecutor(async item=>{
      this.emit({type:'scheduled-action',state:'running',id:item.id,label:item.label||item.instruction});
      let response=await this.chat(item.instruction);let blocked=false,guard=0;
      while(response?.requiresConfirmation&&response?.confirmationId&&guard++<4){blocked=true;response=await this.confirm({id:response.confirmationId,approved:false});}
      if(blocked){const out={ok:true,requiresConfirmation:true,text:'بخش‌های امن کار زمان‌بندی‌شده اجرا شدند، اما یک مرحله حساس به تأیید دستی نیاز داشت و خودکار تأیید نشد.'};this.emit({type:'scheduled-action',state:'needs-confirmation',id:item.id,label:item.label||item.instruction,text:out.text});return out;}
      this.emit({type:'scheduled-action',state:response?.ok===false?'error':'done',id:item.id,label:item.label||item.instruction,text:response?.text||''});return response;
    });
  }
  loadConversation(messages=[]){const system=this.history[0]||{role:'system',content:PERSONALITY_SYSTEM,_private:false},all=(Array.isArray(messages)?messages:[]).filter(m=>['user','assistant'].includes(m?.role)&&String(m?.text??m?.content??'').trim()),older=all.slice(0,Math.max(0,all.length-12));this.conversationSummary=older.length?'\n\n[OLDER CONVERSATION CONTEXT — compressed; preserve topic, entities and user intent]\n'+older.slice(-18).map(m=>`${m.role==='user'?'User':'Maria'}: ${String(m.text??m.content).replace(/\s+/g,' ').slice(0,140)}`).join('\n'):'';const rows=all.slice(-40).map(m=>{const visible=String(m.text??m.content);return {role:m.role,content:visible+(m.role==='user'?attachmentContext(m?.meta):''),_original:m.role==='user'?visible:undefined,_resolvedGoal:m.role==='user'?visible:undefined,_private:Boolean(m?.meta?.private)||Boolean(m?.meta?.attachments?.length)};});this.history=[system,...rows];this.trimHistory();return this.history.length-1;}
  trimHistory(){const starts=this.history.flatMap((m,i)=>m.role==='user'?[i]:[]);if(starts.length>MAX_TURNS/2)this.history=[this.history[0],...this.history.slice(starts.at(-MAX_TURNS/2))];}
  modelHistory({allowOnline,compact=false}){const groups=[];for(const m of this.history.slice(1)){if(m.role==='user'||!groups.length)groups.push([]);groups.at(-1).push(m);}const eligible=allowOnline?groups.filter(group=>!group.some(m=>m._private)):groups;const recentGroups=compact?eligible.slice(-3):eligible.slice(-6),out=[this.history[0],...recentGroups.flat()].map(publicFields);if(compact&&out[0]?.role==='system')out[0]={role:'system',content:COMPACT_CHAT_SYSTEM+(this.conversationSummary||'')};else if(out[0]?.role==='system'&&this.conversationSummary)out[0]={...out[0],content:String(out[0].content||'')+this.conversationSummary};return out;}
  async modelCatalog(){return this.client.catalog();}
  cancelCurrent(){this.client?.cancel?.();return {ok:true,cancelled:true};}
  async status(){const [brain,policy,memories,learning,activeReminders,notes]=await Promise.all([this.client.health(),permissions.status(),memory.list(500),skills.stats(),reminders.list(),pinnedNotes.list({limit:100})]);return {ollama:brain.local,brain,model:this.client.model,models:brain.installedLocalModels||await this.client.models(),pending:this.pending.size,tools:Object.keys(tools).length,languagePatterns:CAPABILITY_PHRASE_COUNT,languageCorpus:summarizeCorpus(),memoryItems:memories.length,permissions:policy,learning,personal:{reminders:activeReminders,notes}};}
  fastReply(turn,text,name,extra={}){const reply=cleanReply(text)||'انجام شد.';this.history.push({role:'assistant',content:reply,_private:turn.private});this.trimHistory();const knowledge=name==='grounded_factual_answer';return {ok:extra.ok??true,text:reply,brain:{mode:knowledge?'grounded-fact':'direct',model:knowledge?'maria-grounded':'windows-fast-path',privacy:turn.private?'local-private':knowledge?'public-grounded':'local'},toolsRouted:turn.routeNames?.length||0,direct:true,tool:name,...extra};}
  async tryFastCommand(fast,turn,routeNames){
    if(!fast||!tools[fast.name])return null;const {name,args={}}=fast,tool=tools[name];turn.routeNames=routeNames;
    if(name==='grounded_factual_answer'&&turn.private)return null;
    const protectedMatch=await permissions.protectedMatch(name,args);if(protectedMatch)return this.fastReply(turn,`این مورد با قانون دائمی خودت محافظت شده: ${protectedMatch.label}`,name);
    if(await permissions.shouldConfirm(name,tool,args)){const id=crypto.randomUUID();this.pending.set(id,{fast:true,name,args,createdAt:Date.now(),turn,routeNames,fastReply:fast.reply});return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این کار روی وضعیت سیستم اثر مهم می‌گذارد. اجرای «${name}» را تأیید می‌کنی؟`};}
    try{this.emit({type:'tool',name});await permissions.assertAllowed(name,args);let out;
      if(name==='grounded_factual_answer'){
        this.emit({type:'thinking',kind:'grounded-research'});
        const grounded=await groundedKnowledgeAnswer(args.query,{runTool:this.toolRunner,client:this.client,brainOptions:turn.chatOptions,conversation:this.history.slice(0,-1),forceResearch:true});
        out=grounded?{success:true,message:grounded.answer,data:{sources:grounded.sources,searchQuery:grounded.searchQuery}}:{success:false,message:'منبع قابل اتکایی دریافت نشد؛ نتیجه جستجو را نمی‌توانم تأیید کنم.'};
      }else out=await this.toolRunner(name,args);
      if(out?.success===false)return this.fastReply(turn,out.error||out.message||'این مرحله انجام نشد.',name,{ok:false,details:out.data});const verification=await verifyFastAction({name,args},out,this.toolRunner);const verifiedFail=verification?.verified!==true&&STRICT_VERIFY_TOOLS.has(name);turn.trace.push({name,args,success:!verifiedFail,error:verifiedFail?'verification failed':''});if(verifiedFail)return this.fastReply(turn,'دستور اجرا شد ولی نتیجهٔ درخواست از Windows تأیید نشد.',name,{ok:false,verification});return this.fastReply(turn,fastResultText(name,out,fast.reply),name,{verification,sources:out?.data?.sources||[]});}catch(error){return this.fastReply(turn,'این مرحله انجام نشد: '+error.message,name,{ok:false});}
  }
  async tryFastSequence(sequence,turn,routeNames){
    if(!sequence?.complete||!sequence?.multi)return null;turn.routeNames=routeNames;const actions=sequence.steps.filter(x=>x.type==='action');
    for(const step of actions){const {name,args={}}=step.command||{},tool=tools[name];if(!tool)return null;const protectedMatch=await permissions.protectedMatch(name,args);if(protectedMatch)return this.fastReply(turn,`این مورد با قانون دائمی خودت محافظت شده: ${protectedMatch.label}`,'fast-sequence',{ok:false,blocked:true});if(await permissions.shouldConfirm(name,tool,args))return null;}
    const results=[],replies=[];let lastVerification=null;
    for(const step of sequence.steps){if(step.type==='verify'){if(lastVerification?.verified===false)return this.fastReply(turn,'اجرا انجام شد ولی نتیجه نهایی تأیید نشد.','fast-sequence',{ok:false,sequence:true,results});continue;}const {name,args={}}=step.command;try{this.emit({type:'tool',name});await permissions.assertAllowed(name,args);const out=await this.toolRunner(name,args);if(out?.success===false)return this.fastReply(turn,`مرحله «${name}» انجام نشد: ${out.error||out.message||'خطای ابزار'}`,'fast-sequence',{ok:false,sequence:true,results});lastVerification=await verifyFastAction({name,args},out,this.toolRunner);const strictFail=lastVerification?.verified!==true&&STRICT_VERIFY_TOOLS.has(name);turn.trace.push({name,args,success:!strictFail,error:strictFail?'verification failed':''});results.push({name,args,out,verification:lastVerification});if(strictFail)return this.fastReply(turn,`مرحله «${name}» اجرا شد ولی Windows نتیجه را تأیید نکرد.`,'fast-sequence',{ok:false,sequence:true,results});if(step.command.reply)replies.push(step.command.reply);}catch(error){return this.fastReply(turn,`در مرحله «${name}» گیر کردم: ${error.message}`,'fast-sequence',{ok:false,sequence:true,results});}}
    const verified=results.some(x=>x.verification?.verified===true),text=replies.length>1?`انجام شد: ${replies.join(' ')}`:(replies[0]||'انجام شد.')+(verified?' نتیجه هم تأیید شد.':'');return this.fastReply(turn,text,'fast-sequence',{sequence:true,results:results.map(x=>({name:x.name,verification:x.verification}))});
  }
  async executeToolCall(call,turn){
    const name=call.function?.name,args=parseArgs(call.function?.arguments),tool=tools[name],callId=call.id;
    if(!tool){const out={success:false,error:'Unknown tool'};this.history.push(toolMessage(name,out,callId,turn.private));turn.trace.push({name,args,success:false,error:out.error});if(!turn.private){await skills.queueImprovement(turn.original,{tool:name,error:out.error});this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error:out.error});}return {continue:true};}
    const privateTool=toolMakesContextPrivate(name);if(privateTool){turn.private=true;if(turn.assistantMessage)turn.assistantMessage._private=true;}
    const conditionalAllowed=new Set(['create_reminder','create_scheduled_action','get_time','search_action_book','search_learned_skills']);
    const blockedForScope=Boolean(turn?.explanationOnly)
      ||(turn?.conditional&&!conditionalAllowed.has(name))
      ||(turn?.scopedAudio&&['set_volume','volume_up','volume_down','set_mute','toggle_mute'].includes(name));
    if(blockedForScope){
      const out={tool_name:name,success:false,blocked:true,error:'This tool is not allowed for an explanation-only or per-app-audio request.'};
      this.history.push(toolMessage(name,out,callId,true));
      turn.trace.push({name,args,success:false,error:out.error});
      return {continue:true,blocked:true};
    }
    const protectedMatch=await permissions.protectedMatch(name,args);if(protectedMatch){const out={tool_name:name,success:false,blocked:true,error:`Protected by permanent user rule: ${protectedMatch.label}`};this.history.push(toolMessage(name,out,callId,true));turn.trace.push({name,args,success:false,error:out.error});this.trimHistory();return {continue:true,blocked:true};}
    if(await permissions.shouldConfirm(name,tool,args))return {needsConfirmation:true,name,args,callId};
    this.emit({type:'tool',name});let out;try{await permissions.assertAllowed(name,args);out=await this.toolRunner(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
    const success=out?.success!==false;turn.trace.push({name,args,success,...(name==='messenger_verify_delivery'?{verification:out?.data?.verification}:{}),error:success?'':String(out?.error||out?.message||'').slice(0,700)});
    if(!success&&!turn.private){await skills.queueImprovement(turn.original,{tool:name,error:out?.error||out?.message||'tool failed'});this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error:out?.error||out?.message||'tool failed'});}
    this.history.push(toolMessage(name,out,callId,turn.private||privateTool));this.trimHistory();return {continue:true,out};
  }
  async finishTurn(turn,reply){
    const successes=turn.trace.filter(x=>x.success).length,failures=turn.trace.filter(x=>!x.success).length;
    const outcome=assessTaskOutcome(turn.original,turn.trace,reply);
    if(!turn.private&&successes>=2&&failures===0&&outcome.complete===true){try{const learned=await skills.learnFromTrace(turn.original,turn.trace);if(learned)this.emit({type:'learning',action:'workflow-learned',title:learned.title});}catch{}}
    if(!turn.private&&soundsUnfamiliar(reply)){try{await skills.queueImprovement(turn.original,{error:'Model reported an unfamiliar or unsupported task'});this.emit({type:'learning',action:'gap-queued',title:turn.original});}catch{}}
    const ok=failures===0&&outcome.complete!==false;return {ok,text:outcome.text||reply,complete:outcome.complete,brain:{mode:this.client.lastMode,model:this.client.model,provider:this.client.lastProvider,privacy:turn.private?'local/private-context':'online-eligible'},toolsRouted:turn.routeNames?.length||0,learned:!turn.private&&successes>=2&&failures===0&&outcome.complete===true,toolSummary:{successes,failures}};
  }
  async drive({routeNames,turn,queuedCalls=[],startStep=0}={}){
    turn.routeNames=routeNames;let queue=[...queuedCalls];
    for(let step=startStep;step<MAX_STEPS;step++){
      if(queue.length){while(queue.length){const call=queue.shift(),r=await this.executeToolCall(call,turn);if(r?.out){routeNames=expandToolSelection(routeNames,r.out,{max:30}).filter(n=>tools[n]);turn.routeNames=routeNames;}if(r.needsConfirmation){const id=crypto.randomUUID();this.pending.set(id,{...r,createdAt:Date.now(),routeNames,turn,remainingCalls:queue,startStep:step});return {ok:true,requiresConfirmation:true,confirmationId:id,text:`این بخش حساس یا برگشت‌ناپذیر است. اجرای «${r.name}» را تأیید می‌کنی؟`};}}continue;}
      this.emit({type:'thinking',step});const options=turn.chatOptions||this.chatOptions,allowOnline=!turn.private;const response=await this.client.chat(this.modelHistory({allowOnline,compact:routeNames.length===0}),ollamaTools(routeNames),{...options,allowOnline,privacyReason:turn.private?'private computer/project context':''}),msg=response?.message;
      if(!msg)throw new Error('Model returned no message');const nativeCalls=Array.isArray(msg.tool_calls)?msg.tool_calls:[],syntheticCalls=nativeCalls.length?[]:textToolCalls(msg.content,routeNames),calls=nativeCalls.length?nativeCalls:syntheticCalls;const internal={...msg,...(syntheticCalls.length?{content:'',tool_calls:syntheticCalls}:{}),_private:turn.private};this.history.push(internal);turn.assistantMessage=internal;this.trimHistory();if(!calls.length){const reply=cleanReply(msg.content)||'انجام شد.';return this.finishTurn(turn,reply);}queue=[...calls];
    }
    if(!turn.private)await skills.queueImprovement(turn.original,{error:'Agent exceeded safe automatic step limit'});return {ok:false,text:'این کار بیش از حدِ امنِ مراحل خودکار طول کشید. بخش‌های انجام‌شده حفظ شده‌اند؛ از وضعیت فعلی دوباره برنامه‌ریزی می‌کنم.'};
  }
  async chat(text,options={}){
    const rawOriginal=String(text??'').trim();if(!rawOriginal)return {ok:false,text:'پیام خالی است.'};
    const requestUnderstanding=understandPersianIntent(rawOriginal);
    if(requestUnderstanding.guard.negated){
      const rule=await permissions.parseUserRule(rawOriginal);
      const reply=rule?.type==='protected'?`این مورد رو به فهرست محافظت‌شده اضافه کردم: ${rule.item?.label||''}`:'باشه، این دستور رو اجرا نمی‌کنم.';
      this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_private:true},
        {role:'assistant',content:reply,_private:true});
      this.trimHistory();
      return {ok:true,text:reply,executed:false,direct:true,brain:{mode:'negative-imperative-guard',model:'maria-intents',privacy:'local'}};
    }
    const resolved=resolveConversationContext(rawOriginal,this.history),original=resolved.text;const effectiveChatOptions={...this.chatOptions,...(options||{})},attachments=(Array.isArray(effectiveChatOptions.attachments)?effectiveChatOptions.attachments:[]).filter(x=>x?.path).slice(0,8),attachmentHint=attachmentContext({attachments});if(!effectiveChatOptions.profile&&/(عمیق|جامع|کامل|حرفه.?ای|سنگین|با جزئیات|دقیق بررسی|تحلیل کامل|deep|comprehensive)/i.test(original))effectiveChatOptions.profile='complex';
    if(resolved.ambiguous){const reply='منظورت صداست یا روشنایی؟ در درخواست قبلی هر دو را تغییر دادی.';return {ok:false,needsClarification:true,text:reply};}
    try{
      const rule=await permissions.parseUserRule(rawOriginal);
      const intentUnderstanding=understandPersianIntent(original);
      const routingOriginal=attachments.length?`${intentUnderstanding.corrected} فایل پیوست را بررسی کن`:intentUnderstanding.corrected,
        canonical=canonicalizeCommand(routingOriginal),normalized=normalizePersianCommand(canonical);
      const sequenceOriginal=planFastSequence(original),sequenceNormalized=planFastSequence(normalized),
        sequence=intentUnderstanding.guard.allowDirect
          ?(sequenceOriginal.multi||sequenceOriginal.complete?sequenceOriginal:sequenceNormalized)
          :{steps:[],unknown:[],multi:false,complete:false};
      // No inferred tool is ever executed directly if user asked a question,
      // quoted another command, or set a future condition.
      const directAllowed=intentUnderstanding.guard.allowDirect&&!attachments.length&&!intentUnderstanding.needsClarification;
      const originalFast=directAllowed&&!sequence.multi
        ?(matchFastCommand(original)||matchFastCommand(canonical)||matchFastCommand(normalized)):null;
      const inferredFast=directAllowed&&intentUnderstanding.direct&&!sequence.multi
        ?(matchFastCommand(intentUnderstanding.canonical)
          ||(['restore_foreground_window','restart_pc'].includes(intentUnderstanding.tool)
             &&tools[intentUnderstanding.tool] ?{name:intentUnderstanding.tool,args:{}}:null))
        :null;
      const fast=originalFast||inferredFast;
      const fastHints=[...new Set([...commandHints(normalized),...capabilityHints(normalized),...(intentUnderstanding.mode?[intentUnderstanding.mode]:[])])],fastPrivate=resolved.private||attachments.length>0||isPrivateRequest(original,fastHints),fastTurn={private:fastPrivate,assistantMessage:null,original,trace:[],routeNames:[],chatOptions:effectiveChatOptions};

      // New chat execution path: obvious Windows actions never wait for an AI model.
      // Match the user's original wording first, then canonical/normalized variants.
      if(sequence?.complete&&sequence.multi){this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_resolvedGoal:original,_private:fastPrivate});this.trimHistory();const direct=await this.tryFastSequence(sequence,fastTurn,[]);if(direct)return direct;this.history.pop();}
      if(fast){this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_resolvedGoal:original,_private:fastPrivate});this.trimHistory();const direct=await this.tryFastCommand(fast,fastTurn,[]);if(direct)return direct;this.history.pop();}

      await memory.maybeRememberUserStatement(rawOriginal);
      const hints=fastHints,basePrivate=fastPrivate,intent=actionIntent(canonical),
        recipes=intent.action?searchSemanticActionBook(canonical,6):[],
        recipeTools=recipes.flatMap(r=>(r.steps||[]).flatMap(x=>String(x).split('|'))).filter(n=>tools[n]),
        prioritizedTool=intentUnderstanding.confidence>=0.9&&tools[intentUnderstanding.tool]?intentUnderstanding.tool:null,
        rawRouteNames=[...new Set([...this.defaultTools,...selectToolNames(canonical,hints),...recipeTools,...(prioritizedTool?[prioritizedTool]:[])])].filter(n=>tools[n]),
        shortlist=compactToolSelection(canonical,rawRouteNames,{modes:[...new Set([...intent.modes,...(intentUnderstanding.mode?[intentUnderstanding.mode]:[])])],action:intent.action||Boolean(prioritizedTool),multiStep:intent.multiStep,max:16}).filter(n=>tools[n]),
        requestedNames=prioritizedTool?[...new Set([prioritizedTool,...shortlist])].slice(0,17):shortlist,
        explanationOnly=intentUnderstanding.guard.explanatory||intentUnderstanding.guard.questionForm,
        routeNames=explanationOnly?[]:(intentUnderstanding.guard.conditional||intentUnderstanding.guard.deferred)
          ?['create_reminder','create_scheduled_action','get_time','search_action_book','search_learned_skills'].filter(name=>tools[name])
          :intentUnderstanding.guard.scopedAudio
          ?requestedNames.filter(name=>!['set_volume','volume_up','volume_down','set_mute','toggle_mute'].includes(name))
          :requestedNames;
      const small=matchSmallTalk(original);if(small&&!intent.action&&!attachments.length&&!String(effectiveChatOptions.modelOverride||'').startsWith('chatgpt:')&&!(await this.client.chatgptPlan?.available?.().catch(()=>false))){this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_resolvedGoal:original,_private:false},{role:'assistant',content:small,_private:false});this.trimHistory();return {ok:true,text:small,brain:{mode:'direct-smalltalk',model:'maria-local',privacy:'local'},toolsRouted:0,direct:true};}
      const needsGround=!basePrivate&&(Boolean(effectiveChatOptions.webSearch)||shouldGroundKnowledge(original));
      if(!intent.action&&!needsGround&&!fast&&!attachments.length&&this.defaultTools.length===0){const privateChat=basePrivate;this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_resolvedGoal:original,_private:privateChat});this.trimHistory();let response;
        const streamOptions={...effectiveChatOptions,allowOnline:!privateChat,privacyReason:privateChat?'private conversation':'',profile:effectiveChatOptions.profile||'chat'};
        if(typeof this.client.chatStream==='function')response=await this.client.chatStream(this.modelHistory({allowOnline:!privateChat,compact:true}),[],streamOptions,delta=>{if(delta)this.emit({type:'stream',delta});});
        else response=await this.client.chat(this.modelHistory({allowOnline:!privateChat,compact:true}),[],streamOptions);
        const reply=cleanReply(response?.message?.content)||'جوابی دریافت نشد.';this.history.push({role:'assistant',content:reply,_private:privateChat});this.trimHistory();return {ok:true,text:reply,brain:{mode:this.client.lastMode,model:this.client.model,provider:this.client.lastProvider||'ollama',privacy:privateChat?'local-private':'online-eligible'},toolsRouted:0,directChat:true};}
      if(!routeNames.length){const small=matchSmallTalk(original);if(small&&!String(effectiveChatOptions.modelOverride||'').startsWith('chatgpt:')&&!(await this.client.chatgptPlan?.available?.().catch(()=>false))){this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_resolvedGoal:original,_private:basePrivate},{role:'assistant',content:small,_private:basePrivate});this.trimHistory();return {ok:true,text:small,brain:{mode:'direct-smalltalk',model:'maria-local',provider:'local',privacy:basePrivate?'local-private':'local'},toolsRouted:0,direct:true};}}
      if(!basePrivate&&(Boolean(effectiveChatOptions.webSearch)||shouldGroundKnowledge(original))){
        try{this.emit({type:'thinking',kind:'grounded-research'});const grounded=await groundedKnowledgeAnswer(original,{client:this.client,runTool:this.toolRunner,brainOptions:effectiveChatOptions,conversation:this.history});if(grounded?.answer){this.history.push({role:'user',content:rawOriginal,_original:rawOriginal,_resolvedGoal:original,_private:false},{role:'assistant',content:grounded.answer,_private:false});this.trimHistory();const usedModel=grounded.strategy==='model';return {ok:true,text:grounded.answer,brain:{mode:usedModel?'grounded-research':'grounded-extract',model:usedModel?this.client.model:'maria-grounded',provider:usedModel?(this.client.lastProvider||'ollama'):'web',privacy:'public'},sources:grounded.sources,toolsRouted:routeNames.length};}}catch(e){this.emit({type:'research-error',error:e.message});}
      }
      const [memories,learned]=await Promise.all([memory.recall(original,{limit:8}),skills.recall(original,{limit:7})]),privateRequest=basePrivate||memories.length>0;
      const execHint=intent.action?actionExecutionHint(canonical):'';const referenceHint=resolved.reference?'Reference from the immediately preceding user request: '+resolved.reference:'';
      const languageIntentHint=intentUnderstanding.intent?`Normalized action intent=${intentUnderstanding.intent}; suggested skill/tool=${intentUnderstanding.tool}; confidence=${intentUnderstanding.confidence}; missing user-selected target must be resolved before execution; never assume an arbitrary filesystem path or recipient.`:'';
      const scopedAudioHint=intentUnderstanding.guard.scopedAudio?
        'The user asks about PER-APPLICATION OR PER-MEDIA audio, not system-wide volume. Never use global set_volume/volume_up/volume_down/set_mute. Target the named app with inspected and verified UI actions, or clearly explain the limitation.':'';
      const explanatoryHint=explanationOnly?'This is a question or explanation request. Do not execute any command.':'';
      const conditionalHint=(intentUnderstanding.guard.conditional||intentUnderstanding.guard.deferred)?'This is conditional/future automation. Never execute the resulting system action now. Use a supported scheduler only when its condition is representable, otherwise ask for missing requirements.':'';
      const hostHint=[referenceHint,languageIntentHint,scopedAudioHint,explanatoryHint,conditionalHint,hints.length?`normalized="${normalized}"; likely capability groups=${hints.join(', ')}`:'',execHint,rule?.type==='protected'?`A permanent never-delete rule was saved for: ${rule.item?.label||''}`:''].filter(Boolean).join('; ');
      const content=`${rawOriginal}${attachmentHint}${hostHint?`\n\n[Host routing/policy hint: ${hostHint}. Metadata only; never mention this block.]`:''}${memoryContext(memories)}${skillContext(learned)}`;this.history.push({role:'user',content,_original:rawOriginal,_resolvedGoal:original,_private:privateRequest});this.trimHistory();
      const turn={private:privateRequest,assistantMessage:null,original,trace:[],routeNames,scopedAudio:intentUnderstanding.guard.scopedAudio,conditional:(intentUnderstanding.guard.conditional||intentUnderstanding.guard.deferred),explanationOnly,chatOptions:effectiveChatOptions};return await this.drive({routeNames,turn});
    }catch(e){if(/Request cancelled/i.test(String(e?.message||e)))return {ok:false,cancelled:true,text:''};try{await skills.queueImprovement(original,{error:e.message,privateContext:isPrivateRequest(original,[])});this.emit({type:'learning',action:'gap-queued',title:original,error:e.message});}catch{}return {ok:false,text:`الان مغز یا یکی از ابزارها گیر کرد: ${e.message}`};}
  }
  async confirm({id,approved}){
    const p=this.pending.get(id);if(!p)return {ok:false,text:'این درخواست تأیید دیگر در دسترس نیست.'};this.pending.delete(id);if(Date.now()-p.createdAt>180000)return {ok:false,text:'زمان این تأیید گذشته؛ دستور را دوباره بگو تا با وضعیت فعلی سیستم بررسی شود.'};
    if(p.fast){if(!approved)return this.fastReply(p.turn,'باشه، انجامش نمی‌دهم.',p.name);try{this.emit({type:'tool',name:p.name});await permissions.assertAllowed(p.name,p.args);const out=await this.toolRunner(p.name,p.args);if(out?.success===false)return {ok:false,text:`نتوانستم انجامش بدهم: ${out.error||out.message||'خطای ابزار'}`};const verification=await verifyFastAction({name:p.name,args:p.args},out,this.toolRunner);if(verification?.verified!==true&&STRICT_VERIFY_TOOLS.has(p.name))return this.fastReply(p.turn,'عمل انجام شد ولی نتیجه نهایی تأیید نشد.',p.name,{ok:false,verification});return this.fastReply(p.turn,p.fastReply||out.message||'انجام شد.',p.name,{verification});}catch(e){return {ok:false,text:`نتوانستم این بخش را اجرا کنم: ${e.message}`};}}
    const {name,args,callId,turn,remainingCalls,routeNames,startStep}=p;if(!approved){this.history.push(toolMessage(name,{tool_name:name,success:false,cancelled:true},callId,turn.private));turn.trace.push({name,args,success:false,error:'user cancelled'});this.trimHistory();return this.drive({routeNames,turn,queuedCalls:remainingCalls,startStep});}
    try{this.emit({type:'tool',name});await permissions.assertAllowed(name,args);let out;try{out=await this.toolRunner(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}const privateTool=toolMakesContextPrivate(name);if(privateTool){turn.private=true;if(turn.assistantMessage)turn.assistantMessage._private=true;}const success=out?.success!==false;turn.trace.push({name,args,success,error:success?'':String(out?.error||out?.message||'').slice(0,700)});if(!success&&!turn.private){await skills.queueImprovement(turn.original,{tool:name,error:out?.error||out?.message||'tool failed'});this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error:out?.error||out?.message||'tool failed'});}this.history.push(toolMessage(name,out,callId,turn.private||privateTool));this.trimHistory();return await this.drive({routeNames,turn,queuedCalls:remainingCalls,startStep});}catch(e){return {ok:false,text:`نتوانستم این بخش را اجرا کنم: ${e.message}`};}
  }
  async improveOne({allowCurriculum=true}={}){
    if(this.improving)return {ok:false,skipped:'already-running'};this.improving=true;
    try{if(!await this.client.network({fresh:true}))return {ok:false,skipped:'offline'};const pending=await skills.nextImprovement(),due=await skills.shouldIdleLearn({minIntervalMs:pending?10*60*1000:4*60*60*1000});if(!due)return {ok:false,skipped:'cooldown'};if(!pending&&!allowCurriculum)return {ok:false,skipped:'nothing-to-learn'};const topic=pending?pending.task:await skills.nextCurriculum(),query=pending?`${topic} Windows 11 reliable automation official documentation troubleshooting ${pending.tool||''}`:topic;this.emit({type:'self-improvement',state:'researching',topic});const research=await this.toolRunner('research_topic',{query,sources:4});if(research?.success===false||!research?.data?.sources?.length){if(pending)await skills.markImprovement(pending.id,{status:'pending',error:'No research sources available'});return {ok:false,skipped:'no-sources'};}const sources=research.data.sources.slice(0,4),evidence=sources.map((s,i)=>`SOURCE ${i+1}: ${s.title}\nURL: ${s.url}\n${String(s.text||s.snippet||'').slice(0,2400)}`).join('\n\n');const prompt=[{role:'system',content:'Extract practical reusable verifiable operational knowledge from the public sources. Do not invent capabilities, credentials, APIs, commands, selectors, or facts. Return prerequisites, procedure, failure modes, and verification.'},{role:'user',content:`Learning topic: ${topic}\n\n${evidence}`}];const response=await this.client.chat(prompt,[],{allowOnline:true,profile:'research'}),summary=cleanReply(response?.message?.content);if(!summary)throw new Error('Learning brain returned no summary');const note=await skills.saveKnowledge({title:topic,query,summary,sources,kind:pending?'failure-research':'curriculum'});if(pending)await skills.markImprovement(pending.id,{status:'done',noteId:note.id});await skills.markIdleLearning();this.emit({type:'self-improvement',state:'learned',topic,noteId:note.id});return {ok:true,topic,noteId:note.id};}catch(e){this.emit({type:'self-improvement',state:'error',error:e.message});return {ok:false,error:e.message};}finally{this.improving=false;}
  }
}
