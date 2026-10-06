import test from 'node:test';
import assert from 'node:assert/strict';
import { BrainRouter } from '../src/agent/BrainRouter.js';

const localClient=(model='qwen2.5:3b')=>({
  model,
  async hasModel(){return true;},
  async models(){return [model];},
  async health(){return true;},
  async chat(){return {message:{role:'assistant',content:'پاسخ محلی آماده است.'}};}
});
const routerWith=(online)=>{
  const local=localClient();
  return new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,online,networkTtlMs:0});
};

test('an unavailable explicitly selected provider falls back to the local brain',async()=>{
  const brain=routerWith({configured:false,async chat(){throw new Error('should not be called');}});
  const result=await brain.chat([{role:'user',content:'سلام'}],[],{provider:'deepseek',allowOnline:true,profile:'chat'});
  assert.equal(result.message.content,'پاسخ محلی آماده است.');
  assert.equal(brain.lastProvider,'ollama');
  assert.equal(brain.lastMode,'local-chat');
  assert.match(brain.lastFallbackReason,/not configured/);
});

test('a failing online provider falls back to the local brain',async()=>{
  const brain=routerWith({configured:true,async chat(){throw new Error('HTTP 503');}});
  const result=await brain.chat([{role:'user',content:'سلام'}],[],{provider:'deepseek',allowOnline:true,profile:'chat'});
  assert.equal(result.message.content,'پاسخ محلی آماده است.');
  assert.equal(brain.lastProvider,'ollama');
  assert.match(brain.lastFallbackReason,/online-failed/);
});

test('an unauthorized Ollama Cloud model falls back to a local model',async()=>{
  const brain=routerWith({configured:false});
  brain.chooseLocal=async(profile,model)=>{
    if(model==='minimax-m2.7:cloud')return {model,async hasModel(){return true;},async chat(){throw new Error('Ollama HTTP 403');}};
    return brain.local;
  };
  const result=await brain.chat([{role:'user',content:'سلام'}],[],{provider:'ollama-cloud',model:'minimax-m2.7:cloud',allowOnline:true,profile:'chat'});
  assert.equal(result.message.content,'پاسخ محلی آماده است.');
  assert.equal(brain.lastProvider,'ollama');
  assert.match(brain.lastFallbackReason,/ollama-cloud-failed/);
});
