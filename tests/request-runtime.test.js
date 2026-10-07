import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const isolated=await fs.mkdtemp(path.join(os.tmpdir(),'maria-request-runtime-'));
const previousDataDir=process.env.BLACK_CLOVER_DATA_DIR;
process.env.BLACK_CLOVER_DATA_DIR=isolated;
const {Agent}=await import('../src/agent/Agent.js');
after(async()=>{if(previousDataDir===undefined)delete process.env.BLACK_CLOVER_DATA_DIR;else process.env.BLACK_CLOVER_DATA_DIR=previousDataDir;await fs.rm(isolated,{recursive:true,force:true});});
test('audio fast paths retain the previous subject and verify their resulting state',async()=>{
  let percent=40,muted=false,modelCalls=0;const actions=[];
  const agent=new Agent({enableScheduler:false,client:{chat:async()=>{modelCalls++;throw new Error('No model required');}},toolRunner:async(name,args)=>{
    if(name==='get_volume')return {success:true,data:{percent,muted}};
    actions.push({name,args});let before=percent;
    if(name==='set_volume')percent=args.percent;
    if(name==='volume_up')percent=Math.min(100,percent+args.amount);
    if(name==='volume_down')percent=Math.max(0,percent-args.amount);
    if(name==='set_mute')muted=args.muted;
    return {success:true,data:{percent,muted,before,expected:percent}};
  }});
  assert.equal((await agent.chat('صدا رو کمی زیاد کن')).ok,true);
  assert.equal((await agent.chat('همونو یه کم کمتر کن')).ok,true);
  assert.equal(percent,40);
  assert.equal((await agent.chat('صدا رو تا آخرین درجه ببر بالا')).ok,true);assert.equal(percent,100);
  assert.equal((await agent.chat('صدا رو کامل قطع کن')).ok,true);assert.equal(muted,true);
  assert.equal((await agent.chat('بازش کن')).ok,true);assert.equal(muted,false);
  assert.equal(modelCalls,0);assert.equal(actions.length,5);
});
test('research retrieves cleaned queries, exposes sources and keeps conversational context',async()=>{
  const searches=[],prompts=[];
  const client={chat:async(messages)=>{prompts.push(messages);return {message:{role:'assistant',content:'پاسخ فارسی با شواهد [1]'}};}};
  const agent=new Agent({enableScheduler:false,client,toolRunner:async(name,args)=>{
    assert.equal(name,'research_topic');searches.push(args.query);
    return {success:true,data:{sources:[{title:'هوش مصنوعی',url:'https://example.org/ai',text:'شواهد درباره هوش مصنوعی و مزایای آن.'}]}};
  }});
  const first=await agent.chat('هوش مصنوعی رو سرچ کن بیار');
  assert.equal(first.ok,true);assert.deepEqual(searches,['هوش مصنوعی']);assert.equal(first.sources.length,1);
  const next=await agent.chat('همونو سرچ کن بیار');
  assert.equal(next.ok,true);assert.deepEqual(searches,['هوش مصنوعی','هوش مصنوعی']);
  assert.ok(prompts[1].some(m=>m.role==='user'&&m.content.includes('هوش مصنوعی رو سرچ کن بیار')));
});
test('a multi-step goal with an unsupported action is passed intact to the model',async()=>{
  let observed=null;const actions=[];
  const agent=new Agent({enableScheduler:false,client:{chat:async(messages)=>{observed=messages;return {message:{role:'assistant',content:'ویرایش گزارش هنوز انجام نشده است.'}};}},toolRunner:async(name)=>{actions.push(name);throw new Error('Should not execute just the first action');}});
  await agent.chat('نوت پد رو باز کن و بعد گزارش فروش رو ویرایش کن');
  assert.deepEqual(actions,[]);
  assert.ok(observed?.some(m=>m.role==='user'&&m.content.includes('نوت پد')&&m.content.includes('گزارش فروش')));
});
test('opening a messenger alone cannot yield a successful transfer report',async()=>{
  let calls=0;const actions=[];
  const agent=new Agent({enableScheduler:false,client:{chat:async()=>++calls===1?{message:{role:'assistant',content:'',tool_calls:[{id:'open-1',function:{name:'messenger_open',arguments:{service:'whatsapp'}}}]}}:{message:{role:'assistant',content:'پیام ارسال شد'}}},toolRunner:async(name)=>{actions.push(name);return {success:true,data:{mode:'web-chrome'}};}});
  const response=await agent.chat('واتساپ رو باز کن و پیام علی رو برای رضا بفرست');
  assert.deepEqual(actions,['messenger_open']);assert.equal(response.ok,false);assert.equal(response.complete,false);
  assert.ok(response.text.includes('تأیید نشده'));
});
test('cloud histories never contain orphaned tools or a private prior turn',()=>{
  const agent=new Agent({enableScheduler:false,client:{}});
  agent.history.push({role:'user',content:'فایل شرکت',_private:true},{role:'assistant',content:'',tool_calls:[{id:'private-1',function:{name:'inspect_ui',arguments:'{}'}}],_private:true},{role:'tool',content:'PRIVATE',tool_call_id:'private-1',_private:true},{role:'assistant',content:'پاسخ خصوصی',_private:true},{role:'user',content:'سلام',_private:false});
  const messages=agent.modelHistory({allowOnline:true});
  assert.deepEqual(messages.map(m=>m.role),['system','user']);
  assert.ok(!JSON.stringify(messages).includes('PRIVATE'));
});
