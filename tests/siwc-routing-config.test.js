import test from 'node:test';
import assert from 'node:assert/strict';
import { BrainRouter } from '../src/agent/BrainRouter.js';
import { OnlineBrainClient } from '../src/agent/OnlineBrainClient.js';

const fakeLocal={model:'local-test',hasModel:async()=>false,models:async()=>[],chat:async()=>{throw Error('local should not be invoked')}};
function makeRouter(available=true){
  const calls=[];
  const plan={
    available:async()=>available,
    chat:async (messages,options)=>{
      calls.push({messages,options});
      return {message:{role:'assistant',content:options.tools?.length?'{"name":"audio_mute","arguments":{}}':'سلام!'},model:'gpt-test'};
    }
  };
  const router=new BrainRouter({local:fakeLocal,chatLocal:fakeLocal,legacyLocal:fakeLocal,researchLocal:fakeLocal,codingLocal:fakeLocal,online:{configured:false,cancel(){}},chatgptPlan:plan});
  router.network=async()=>true;
  return {router,calls};
}
test('ChatGPT plan powers ordinary conversation through Auto',async()=>{
  const {router,calls}=makeRouter();
  const response=await router.chat([{role:'user',content:'سلام'}],[],{profile:'chat'});
  assert.equal(response.message.content,'سلام!');
  assert.equal(calls.length,1);
  assert.equal(router.lastProvider,'chatgpt');
});
test('ChatGPT plan interprets allowlisted host tools (host executes them)',async()=>{
  const {router,calls}=makeRouter();
  const tools=[{type:'function',function:{name:'audio_mute',description:'Mute Windows sound',parameters:{type:'object',properties:{}}}}];
  const response=await router.chat([{role:'user',content:'صدا رو قطع کن'}],tools,{profile:'general'});
  assert.match(response.message.content,/audio_mute/);
  assert.equal(calls[0].options.tools.length,1);
  assert.equal(router.lastProvider,'chatgpt');
});
test('explicit ChatGPT model cannot silently fall back when disconnected',async()=>{
  const {router}=makeRouter(false);
  await assert.rejects(()=>router.chat([{role:'user',content:'سلام'}],[],{modelOverride:'chatgpt:gpt-test'}),/ChatGPT/);
});
test('paid GPT-6 API tool calls use supported Chat Completions reasoning settings',()=>{
  const c=new OnlineBrainClient({provider:'openai',apiKey:'test-key',baseUrl:'https://api.openai.com/v1',model:'gpt-6-luna'});
  const plain=c.body([{role:'user',content:'سلام'}]);
  assert.equal(plain.temperature,undefined);
  const tool=c.body([{role:'user',content:'صدا رو قطع کن'}],[{type:'function',function:{name:'audio_mute',parameters:{type:'object',properties:{}}}}]);
  assert.equal(tool.reasoning_effort,'none');
  assert.equal(tool.tools.length,1);
});
