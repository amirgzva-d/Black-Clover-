import test from 'node:test';
import assert from 'node:assert/strict';
import {Agent} from '../src/agent/Agent.js';
import {canonicalizeCommand} from '../src/agent/SemanticCanonicalizer.js';
import {parseWebRequest} from '../src/agent/WebRequest.js';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';
import {matchSmallTalk} from '../src/agent/SmallTalkRouter.js';

test('common Persian typo chat is answered directly without an LLM',async()=>{
  let modelCalls=0;
  const client={
    model:'never',
    lastMode:'never',
    lastProvider:'never',
    async chat(){modelCalls++;throw new Error('model should not be used');},
    async chatStream(){modelCalls++;throw new Error('model should not be used');}
  };
  const agent=new Agent({client,enableScheduler:false});
  const out=await agent.chat('چخبر');
  assert.equal(out.direct,true);
  assert.match(out.text,/همه.?چیز آماده/);
  assert.equal(modelCalls,0);
  assert.ok(matchSmallTalk('چخبر'));
});

test('mistyped named-site request normalizes to a direct website action',()=>{
  const raw='سایت فولاد مهاجر ذو در کوکل باز ن خود سایت شو';
  const canonical=canonicalizeCommand(raw);
  assert.equal(canonical,'سایت فولاد مهاجر رو در گوگل باز کن خود سایت شو');
  const web=parseWebRequest(canonical);
  assert.equal(web?.mode,'website');
  assert.equal(web?.site,'فولاد مهاجر');
  assert.equal(web?.domain,'mohajer-steel.com');
  const fast=matchFastCommand(canonical);
  assert.equal(fast?.name,'chrome_open_named_site');
  assert.equal(fast?.args?.site,'فولاد مهاجر');
});

test('direct chat does not retry the same prompt after a streaming timeout',async()=>{
  let streamCalls=0,plainCalls=0;
  const client={
    model:'qwen2.5:1.5b',lastMode:'local-chat',lastProvider:'ollama',
    async chatStream(){streamCalls++;throw new Error('Ollama response timed out');},
    async chat(){plainCalls++;return {message:{role:'assistant',content:'should not happen'}};}
  };
  const agent=new Agent({client,enableScheduler:false});
  const out=await agent.chat('یک جمله کوتاه درباره باران بگو');
  assert.equal(streamCalls,1);
  assert.equal(plainCalls,0);
  assert.equal(out.ok,false);
  assert.match(out.text,/timed out/);
});

test('attached local files force private routing and enter hidden agent context',async()=>{
  let seen=null;
  const client={
    model:'fake-local',lastMode:'local',lastProvider:'ollama',
    async chat(messages,toolDefs,options){
      seen={messages,toolDefs,options};
      return {message:{role:'assistant',content:'فایل را بررسی کردم.'}};
    }
  };
  const agent=new Agent({client,enableScheduler:false});
  const out=await agent.chat('این فایل را بررسی کن',{attachments:[{path:'C:\\Temp\\report.txt',name:'report.txt'}]});
  assert.equal(out.ok,true);
  assert.equal(seen?.options?.allowOnline,false);
  assert.ok(seen?.toolDefs?.length>0);
  assert.match(JSON.stringify(seen?.messages),/HOST ATTACHMENTS/);
  assert.match(JSON.stringify(seen?.messages),/report\.txt/);
});
