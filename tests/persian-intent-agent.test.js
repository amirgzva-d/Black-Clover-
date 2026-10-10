import test from 'node:test';
import assert from 'node:assert/strict';
import {Agent} from '../src/agent/Agent.js';
import {searchSemanticActionBook} from '../src/agent/actionBookTools.js';
import {CORE_PERSIAN_INTENTS} from '../src/agent/PersianIntentCatalog.js';
import {understandPersianIntent} from '../src/agent/PersianIntentEngine.js';

const fakeBrain={
  health:async()=>({local:{}}),catalog:async()=>[],
  chat:async()=>({message:{role:'assistant',content:'برای این کار از تنظیمات ویندوز استفاده کن.'}}),
  chatStream:async()=>({message:{role:'assistant',content:'برای این کار از تنظیمات ویندوز استفاده کن.'}}),
  network:async()=>false,models:async()=>[],model:'fake',lastMode:'mock'
};
test('Agent executes typo-rich safe command through existing verified tool pipeline',async()=>{
 const calls=[];
 const agent=new Agent({enableScheduler:false,client:fakeBrain,toolRunner:async(name,args)=>{
   calls.push({name,args});
   return {tool_name:name,success:true,data:{percent:35,muted:false,expected:35},message:'OK'};
 }});
 const out=await agent.chat('ماریا صوذا رو یه کم بیار پایین');
 assert.equal(out.direct,true);
 assert.equal(out.tool,'volume_down');
 assert.ok(calls.some(x=>x.name==='volume_down'));
 assert.equal(out.ok,true);
});
test('Agent never executes a negative imperative and records a natural acknowledgement',async()=>{
 const calls=[];
 const agent=new Agent({enableScheduler:false,client:fakeBrain,toolRunner:async(name)=>{
   calls.push(name);throw Error('NO execution allowed');
 }});
 const out=await agent.chat('لطفا سیستم رو خاموش نکن');
 assert.equal(out.executed,false);
 assert.equal(calls.length,0);
 assert.match(out.text,/اجرا نمی‌کنم/);
});
test('Agent requires user confirmation for dangerous power action even when typo corrected',async()=>{
 const calls=[];
 const agent=new Agent({enableScheduler:false,client:fakeBrain,toolRunner:async name=>{
   calls.push(name);return {tool_name:name,success:true};
 }});
 const out=await agent.chat('کامپیوتر رو شات داون کن');
 assert.equal(out.requiresConfirmation,true);
 assert.ok(out.confirmationId);
 assert.equal(calls.length,0);
 const cancelled=await agent.confirm({id:out.confirmationId,approved:false});
 assert.equal(cancelled.ok,true);
 assert.equal(calls.length,0);
});
test('source message content and quoted dangerous commands do not trigger fast execution',async()=>{
 const calls=[];
 const agent=new Agent({enableScheduler:false,client:fakeBrain,toolRunner:async(name)=>{
   calls.push(name);return {success:true};
 }});
 const phrase='این جمله رو بنویس: «سیستم رو خاموش کن»';
 const hit=understandPersianIntent(phrase);
 assert.equal(hit.guard.allowDirect,false);
 // Model may explain or draft text but no immediate Windows action is allowed.
 const answer=await agent.chat(phrase);
 assert.ok(answer.text);
 assert.ok(!calls.includes('shutdown_pc'));
});
test('fuzzy lookup improves discovery of existing ActionBook recipes',()=>{
 const output=searchSemanticActionBook('تلخرام رو باز کن',7);
 assert.ok(Array.isArray(output));
 assert.ok(output.length>0);
 assert.ok(output.some(item=>/تلگرام|telegram|پیام|بازکردن/i.test(String(item.title)+' '+(item.triggers||[]).join(' '))));
});
test('Agent status reports corpus counts without loading full examples into memory',async()=>{
 const agent=new Agent({enableScheduler:false,client:fakeBrain});
 const result=await agent.status();
 assert.equal(result.languageCorpus.examplesPerAction,1000);
 assert.equal(result.languageCorpus.totalExamples,350000);
 assert.equal(result.languageCorpus.coreIntentCount,CORE_PERSIAN_INTENTS.length);
});

test('per-app media volume never falls back to master-volume tools',async()=>{
 const calls=[];
 const client={...fakeBrain,chat:async()=>({message:{role:'assistant',content:'تنظیم صدای همین برنامه به کنترل اختصاصی نیاز دارد.'}})};
 const agent=new Agent({enableScheduler:false,client,toolRunner:async name=>{
   calls.push(name);return {tool_name:name,success:true};
 }});
 assert.equal(understandPersianIntent('صدای فیلم رو کم کن').intent,'audio.app.down');
 const first=await agent.chat('صدای فیلم رو کم کن');
 assert.ok(first.text);
 assert.equal(calls.filter(x=>['set_volume','volume_up','volume_down','set_mute','toggle_mute'].includes(x)).length,0);
 const second=await agent.chat('حالا کمترش کن');
 assert.ok(second.text);
 assert.equal(calls.filter(x=>['set_volume','volume_up','volume_down','set_mute','toggle_mute'].includes(x)).length,0);
});
test('question about a Windows command does not execute that command',async()=>{
 const calls=[];
 const agent=new Agent({enableScheduler:false,client:fakeBrain,toolRunner:async name=>{
   calls.push(name);return {success:true};
 }});
 const out=await agent.chat('چطور صدا رو کم کنم؟');
 assert.ok(out.text);
 assert.equal(calls.length,0);
});

test('deferred messaging request never fires a delivery tool immediately',async()=>{
 const calls=[];
 const agent=new Agent({enableScheduler:false,client:fakeBrain,toolRunner:async name=>{
   calls.push(name);return {success:true};
 }});
 const input='سر وقت به مخاطب پیام بفرست، نه الان';
 const hit=understandPersianIntent(input);
 assert.equal(hit.guard.deferred,true);
 assert.notEqual(hit.direct,true);
 const response=await agent.chat(input);
 assert.ok(response.text);
 for(const tool of ['messenger_open','messenger_stage_files','messenger_delivery_checkpoint','messenger_verify_delivery','type_text','press_key','shutdown_pc'])
   assert.equal(calls.includes(tool),false,tool);
});
