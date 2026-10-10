import test from 'node:test';
import assert from 'node:assert/strict';
import {BrainRouter} from '../src/agent/BrainRouter.js';

const localClient=(label='local')=>({
  model:'qwen2.5:3b',
  async hasModel(){return true;},
  async models(){return ['qwen2.5:3b'];},
  async health(){return true;},
  async chat(){return {message:{role:'assistant',content:label}};},
  async chatStream(_messages,_tools,onDelta){onDelta?.(label);return {message:{role:'assistant',content:label}};},
  cancel(){}
});
const chatgptStub=()=>({
  calls:[],
  cancelled:false,
  async available(){return true;},
  async catalog(){return [{id:'chatgpt:gpt-test',provider:'chatgpt',model:'gpt-test',label:'ChatGPT • Test',available:true,configured:true}];},
  async chat(messages,{model='auto',onDelta}={}){this.calls.push({messages,model});onDelta?.('سنگین');return {message:{role:'assistant',content:'پاسخ سنگین'},provider:'chatgpt',model:model==='auto'?'gpt-test':model};},
  cancel(){this.cancelled=true;}
});

test('smart router prefers connected ChatGPT for complex public no-tool questions',async()=>{
  const local=localClient(),plan=chatgptStub();
  const brain=new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,online:{configured:false,catalog(){return[];},cancel(){}},chatgptPlan:plan,networkTtlMs:0});
  brain.network=async()=>true;
  const deltas=[];
  const out=await brain.chat([{role:'user',content:'تحلیل عمیق بده'}],[],{allowOnline:true,profile:'complex',onDelta:d=>deltas.push(d)});
  assert.equal(out.message.content,'پاسخ سنگین');
  assert.equal(brain.lastProvider,'chatgpt');
  assert.equal(brain.lastMode,'chatgpt-plan');
  assert.equal(plan.calls.length,1);
  assert.deepEqual(deltas,['سنگین']);
});

test('private context never auto-routes to ChatGPT plan',async()=>{
  const local=localClient('خصوصی محلی'),plan=chatgptStub();
  const brain=new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,online:{configured:false,catalog(){return[];},cancel(){}},chatgptPlan:plan,networkTtlMs:0});
  brain.network=async()=>true;
  const out=await brain.chat([{role:'user',content:'این فایل شخصی من'}],[],{allowOnline:false,profile:'complex'});
  assert.equal(out.message.content,'خصوصی محلی');
  assert.equal(plan.calls.length,0);
  assert.equal(brain.lastProvider,'ollama');
});

test('tool-using turns forward allowlisted tools to connected ChatGPT plan',async()=>{
  const local=localClient('ابزار محلی'),plan=chatgptStub();
  const brain=new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,online:{configured:false,catalog(){return[];},cancel(){}},chatgptPlan:plan,networkTtlMs:0});
  brain.network=async()=>true;
  const tools=[{type:'function',function:{name:'set_volume',description:'x',parameters:{type:'object',properties:{}}}}];
  const out=await brain.chat([{role:'user',content:'صدا را کم کن'}],tools,{allowOnline:true,profile:'general'});
  assert.equal(out.message.content,'پاسخ سنگین');
  assert.equal(plan.calls.length,1);
  assert.equal(brain.lastProvider,'chatgpt');
});

test('brain cancellation reaches all configured brain backends',()=>{
  const local=localClient(),plan=chatgptStub(),online={configured:false,catalog(){return[];},cancelled:false,cancel(){this.cancelled=true;}};
  const brain=new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,online,chatgptPlan:plan});
  brain.cancel();
  assert.equal(plan.cancelled,true);
  assert.equal(online.cancelled,true);
});
