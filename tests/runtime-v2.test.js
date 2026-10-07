import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextManager,inferTextProfile } from '../src/agent/runtime/ContextManager.js';
import { ResultValidator } from '../src/agent/runtime/ResultValidator.js';
import { ModelRouter } from '../src/agent/providers/ModelRouter.js';
import { ToolResolver } from '../src/agent/tools/ToolResolver.js';
import { ToolVerifier } from '../src/agent/tools/ToolVerifier.js';
import { BrainRuntime } from '../src/agent/runtime/BrainRuntime.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';
import { chromeProfileForService } from '../src/agent/browserTools.js';

test('runtime v2 classifies chat complexity coding research and privacy',()=>{
  const cm=new ContextManager();
  assert.equal(inferTextProfile('سلام، درباره نظریه بازی توضیح بده','chat'),'chat');
  assert.equal(inferTextProfile('یک تحلیل عمیق و معماری کامل برای این سیستم بده','chat'),'complex');
  assert.equal(inferTextProfile('این کد جاوااسکریپت را دیباگ کن','chat'),'coding');
  assert.equal(cm.build({text:'آخرین اطلاعات درباره یک فناوری را با منبع بررسی کن'}).profile,'research');
  const privateRun=cm.build({text:'فایل پروژه من روی کامپیوترم را بررسی کن'});
  assert.equal(privateRun.privateContext,true);
  assert.equal(privateRun.allowOnline,false);
});

test('private context forces local routing even when cloud is requested',()=>{
  const cm=new ContextManager(),router=new ModelRouter();
  const context=cm.build({text:'فایل شخصی من روی دسکتاپ را بررسی کن'});
  const route=router.route(context,{provider:'groq'});
  assert.equal(route.allowOnline,false);
  assert.equal(route.provider,'ollama');
});

test('Persian input rejects accidental English-only final answers',()=>{
  const validator=new ResultValidator();
  const result=validator.validateText('لطفاً این موضوع را کامل توضیح بده','This is a detailed answer written entirely in English and it should be repaired before the user sees it.');
  assert.equal(result.needsRepair,true);
  assert.equal(result.reason,'unexpected-english');
});

test('brain runtime repairs accidental English response once',async()=>{
  const calls=[];
  const brain={
    lastMode:'online',lastProvider:'groq',lastProfile:'chat',lastFallbackReason:'',model:'mock',
    async chat(messages,toolDefs,route){
      calls.push(route);
      if(calls.length===1)return {message:{role:'assistant',content:'This answer is unexpectedly in English and should not be shown to the Persian user.'},provider:'groq',model:'mock'};
      return {message:{role:'assistant',content:'این پاسخ به فارسی طبیعی و درست بازنویسی شد و برای کاربر قابل نمایش است.'},provider:'groq',model:'mock'};
    },
    async health(){return {ok:true};},
    async catalog(){return [];}
  };
  const runtime=new BrainRuntime({brain});
  const out=await runtime.answer({
    text:'این موضوع را دقیق توضیح بده',
    messages:[{role:'system',content:'فارسی جواب بده'},{role:'user',content:'این موضوع را دقیق توضیح بده'}]
  });
  assert.equal(out.repaired,true);
  assert.match(out.message.content,/فارسی/);
  assert.equal(calls.length,2);
});

test('tool resolver keeps common actions lazy and bounded',()=>{
  const resolver=new ToolResolver({maxTools:18});
  const search=resolver.resolve('سرچ کن قیمت آهن امروز',{mode:'action'});
  assert.equal(search.fast?.name,'chrome_search');
  assert.ok(search.names.includes('chrome_search'));
  assert.ok(search.names.length<=18);
});

test('Chrome routing uses Amir for search and company for WhatsApp and Rubika',()=>{
  assert.equal(matchFastCommand('سرچ کن قیمت آهن امروز')?.name,'chrome_search');
  assert.equal(chromeProfileForService('whatsapp'),'Profile 19');
  assert.equal(chromeProfileForService('rubika'),'Profile 19');
  assert.equal(chromeProfileForService('google'),'Profile 1');
});

test('tool verifier checks Google results URL and personal profile',async()=>{
  const verifier=new ToolVerifier();
  const check=await verifier.verify({
    name:'chrome_search',
    args:{query:'قیمت آهن'},
    result:{success:true,data:{url:'https://www.google.com/search?q=%D9%82%DB%8C%D9%85%D8%AA',profile:'Profile 1',profileRole:'personal',query:'قیمت آهن'}}
  });
  assert.equal(check.ok,true);
  assert.equal(check.verified,true);
});
