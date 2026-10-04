import test from 'node:test';
import assert from 'node:assert/strict';
import { BrainRouter,pickBestLocalModel } from '../src/agent/BrainRouter.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { tools } from '../src/agent/toolRegistry.js';

test('phase 1 defaults to the responsive Qwen3 instruct chat model',()=>{
  const brain=new BrainRouter();
  assert.equal(brain.local.model,'qwen3:4b-instruct');
  assert.equal(brain.local.think,false);
});

test('local brain selector prefers capable chat models instead of failing on one hard-coded name',()=>{
  const models=['nomic-embed-text:latest','llama3.2:3b','qwen3:8b','qwen3.5:4b'];
  assert.equal(pickBestLocalModel(models,'general'),'qwen3.5:4b');
  assert.equal(pickBestLocalModel(['qwen3:4b','qwen2.5-coder:3b'],'coding'),'qwen2.5-coder:3b');
  assert.equal(pickBestLocalModel(['nomic-embed-text:latest'],'general'),null);
});

test('context-only Persian follow ups keep basic Windows controls available',()=>{
  const names=selectToolNames('خب همونو یه کم ببر بالاتر');
  for(const name of ['volume_up','volume_down','set_volume','brightness_up','brightness_down','launch_app'])assert.ok(names.includes(name),name);
});

test('broad factual questions can use free live research without paid AI API',()=>{
  const names=selectToolNames('پایتخت مغولستان کجاست؟');
  for(const name of ['live_web_search','read_web_page','wikipedia_search','research_topic'])assert.ok(names.includes(name),name);
});

test('phase 1 registry contains resilient audio and relative brightness tools',()=>{
  for(const name of ['get_volume','set_volume','set_mute','toggle_mute','brightness_up','brightness_down'])assert.ok(tools[name],name);
});

test('plain conversation remains tool-light',()=>{
  assert.deepEqual(selectToolNames('سلام ماریا امروز حالت چطوره؟'),[]);
});
