import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {routeChosenChatModel,executionStatus} from '../src/renderer/chatProviderSelection.js';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';
import {understandPersianIntent} from '../src/agent/PersianIntentEngine.js';
import {parseWebRequest} from '../src/agent/WebRequest.js';
import {Agent} from '../src/agent/Agent.js';
import {tools} from '../src/agent/toolRegistry.js';
import {summarizeCorpus} from '../src/agent/PersianActionCorpus.js';

test('Auto, ChatGPT, Gemini and Ollama are forwarded to their real provider instead of all being ChatGPT',()=>{
  assert.deepEqual(routeChosenChatModel('auto'),{modelOverride:'auto',provider:'auto',label:'Auto • MARIA'});
  assert.equal(routeChosenChatModel('chatgpt:auto').provider,'chatgpt');
  assert.equal(routeChosenChatModel('online:gemini').provider,'gemini');
  assert.equal(routeChosenChatModel('online:deepseek').provider,'deepseek');
  assert.equal(routeChosenChatModel('ollama:qwen2.5:3b').provider,'ollama');
  assert.equal(routeChosenChatModel('ollama-cloud:qwen:cloud').provider,'ollama-cloud');
  assert.throws(()=>routeChosenChatModel('online:../../bad'),/معتبر/);
});

test('Misspelled app name does not execute a different sample/canonical app',async()=>{
  const intent=understandPersianIntent('کرم و بازکن');
  assert.equal(intent.corrected,'کروم و باز کن');
  assert.equal(intent.intent,'apps.launch');
  assert.equal(intent.requiresTarget,true);
  // A static catalog example (e.g. Telegram) must NEVER fill the app target.
  const invoked=[];
  const brain={chat:async()=>({message:{role:'assistant',content:'انجام شد.'}}),
    chatStream:async()=>({message:{role:'assistant',content:'انجام شد.'}}),
    chatgptPlan:{available:async()=>false},lastProvider:'test',lastMode:'test',model:'fake'};
  const agent=new Agent({enableScheduler:false,client:brain,toolRunner:async(name,args)=>{invoked.push({name,args});return {success:true,message:'simulated'};}});
  const response=await agent.chat('کرم و بازکن');
  assert.equal(invoked.some(x=>x.name==='launch_any_app'&&/Telegram/i.test(x.args?.name||'')),false);
  assert.equal(invoked.some(x=>x.name==='launch_any_app'&&x.args?.name==='Google Chrome'),true);
  assert.ok(response);
});

test('A local file lookup never invokes public web research by accident',()=>{
  assert.equal(parseWebRequest('فایلی رو توی پوشه پیدا کن'),null);
  assert.equal(parseWebRequest('فایل اکسل فلان را پیدا کن'),null);
  assert.ok(parseWebRequest('در گوگل فایل PDF آموزشی را سرچ کن'));
});
test('Real matched app open uses the intended app, not a different catalog example',()=>{
  assert.equal(matchFastCommand('کروم رو باز کن')?.args?.name,'Google Chrome');
  assert.equal(matchFastCommand('اکسل رو باز کن')?.args?.name,'Excel');
  assert.equal(matchFastCommand('تلگرام رو باز کن')?.args?.name,'Telegram');
});
test('A model answer without actual tool evidence is not an executed Windows command',()=>{
  assert.equal(executionStatus({ok:false,toolsRouted:9}).kind,'error');
  assert.equal(executionStatus({ok:true,toolsRouted:9,toolSummary:{successes:0}}).label,'پاسخ بدون اجرای عملیات');
  assert.equal(executionStatus({ok:true,toolSummary:{successes:2}}).kind,'success');
  assert.equal(executionStatus({requiresConfirmation:true}).kind,'pending');
});
test('Both backends expose capabilities and assistant metadata for transparent UI statuses',async()=>{
  const main=await fs.readFile(new URL('../src/main/main.js',import.meta.url),'utf8');
  const preload=await fs.readFile(new URL('../src/main/preload.cjs',import.meta.url),'utf8');
  const ui=await fs.readFile(new URL('../src/renderer/chatSurfaceV2.js',import.meta.url),'utf8');
  assert.match(main,/agent:capabilities/);
  assert.match(main,/toolSummary:response.toolSummary/);
  assert.match(preload,/skillCapabilities:/);
  assert.match(ui,/routeChosenChatModel\(state.model\)/);
  assert.match(ui,/id="skillsInfo"/);
  assert.match(ui,/messageExecutionMarkup/);
  assert.match(ui,/chatBootPromise=/);
  assert.ok(Object.keys(tools).length>=200);
  const info=summarizeCorpus();
  assert.ok(info.totalExamples>=300000);
  assert.equal(info.isSynthetic,true);
});

test('An explicitly selected ChatGPT model safely falls back to a local planner for private computer tasks',async()=>{
  const {BrainRouter}=await import('../src/agent/BrainRouter.js');
  let cloudCalls=0,localCalls=0;
  const local={model:'test-local',hasModel:async()=>true,
    chat:async()=>{localCalls++;return {message:{role:'assistant',content:'برای ادامه ابزار محلی را بررسی می‌کنم.'}};}};
  const cloud={configured:true,available:async()=>true,chat:async()=>{cloudCalls++;throw Error('Private data must not leave device');}};
  const router=new BrainRouter({local,chatLocal:local,legacyLocal:local,codingLocal:local,researchLocal:local,
    online:{configured:false},chatgptPlan:cloud});
  router.chooseLocal=async()=>local;
  router.localCandidates=()=>[local];
  const result=await router.chat([{role:'user',content:'فایل روی کامپیوتر من را باز کن'}],[],{
    provider:'chatgpt',allowOnline:false,privacyReason:'local document',
    profile:'chat'
  });
  assert.equal(result.message.content.includes('ابزار محلی'),true);
  assert.equal(localCalls,1);
  assert.equal(cloudCalls,0);
  assert.equal(router.lastProvider,'ollama');
  assert.match(router.lastFallbackReason,/private/);
});

test('Looking up Skill documentation without running the requested action is not a verified execution',async()=>{
  let modelTurns=0;
  const brain={
    model:'mock',lastMode:'mock',lastProvider:'mock',chatgptPlan:{available:async()=>false},
    async chat(){
      modelTurns++;
      if(modelTurns===1)return {message:{role:'assistant',content:'',
        tool_calls:[{id:'lookup1',type:'function',function:{name:'search_action_book',arguments:JSON.stringify({query:'اکسل رو بخون'})}}]}};
      return {message:{role:'assistant',content:'اکسل را خواندم و کار تمام شد.'}};
    }
  };
  const agent=new Agent({enableScheduler:false,client:brain,
    toolRunner:async(name)=>({success:true,data:{items:[]},message:'recipe found',tool_name:name})});
  const reply=await agent.chat('اکسل را بخوان');
  assert.equal(reply.ok,false);
  assert.equal(reply.toolSummary?.taskExecutions,0);
  assert.match(reply.text,/هنوز هیچ دستوری/);
});
