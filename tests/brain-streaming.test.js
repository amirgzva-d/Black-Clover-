import test from 'node:test';
import assert from 'node:assert/strict';
import { BrainRouter } from '../src/agent/BrainRouter.js';
import { OnlineBrainPool } from '../src/agent/OnlineBrainPool.js';

test('local brain streaming forwards deltas and returns one final answer',async()=>{
  const deltas=[];
  const local={
    model:'qwen2.5:3b',
    async hasModel(){return true;},
    async models(){return ['qwen2.5:3b'];},
    async health(){return true;},
    async chat(){return {message:{role:'assistant',content:'fallback'}};},
    async chatStream(_messages,_tools,onDelta){onDelta('سلام');onDelta('، ماریا');return {message:{role:'assistant',content:'سلام، ماریا'},model:this.model};}
  };
  const brain=new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,online:{configured:false},networkTtlMs:0});
  const out=await brain.chatStream([{role:'user',content:'سلام'}],[],{allowOnline:false,profile:'chat'},delta=>deltas.push(delta));
  assert.equal(out.message.content,'سلام، ماریا');
  assert.deepEqual(deltas,['سلام','، ماریا']);
  assert.equal(brain.lastMode,'local-chat');
});

test('online provider cooldown skips a provider that just failed',async()=>{
  let failingCalls=0,healthyCalls=0;
  const pool=new OnlineBrainPool({clients:[
    {provider:'bad',model:'bad',async chat(){failingCalls++;throw new Error('503');},async health(){return false;}},
    {provider:'good',model:'good',async chat(){healthyCalls++;return {message:{role:'assistant',content:'ok'},provider:'good',model:'good'};},async health(){return true;}}
  ]});
  const first=await pool.chat([{role:'user',content:'x'}],[],{provider:'auto'});
  const second=await pool.chat([{role:'user',content:'y'}],[],{provider:'auto'});
  assert.equal(first.message.content,'ok');
  assert.equal(second.message.content,'ok');
  assert.equal(failingCalls,1);
  assert.equal(healthyCalls,2);
});
