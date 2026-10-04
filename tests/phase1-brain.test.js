import test from 'node:test';
import assert from 'node:assert/strict';
import { BrainRouter } from '../src/agent/BrainRouter.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { tools } from '../src/agent/toolRegistry.js';

test('phase 1 defaults to the responsive Qwen3 instruct chat model',()=>{
  const brain=new BrainRouter();
  assert.equal(brain.local.model,'qwen3:4b-instruct');
  assert.equal(brain.local.think,false);
});

test('context-only Persian follow ups keep basic Windows controls available',()=>{
  const names=selectToolNames('خب همونو یه کم ببر بالاتر');
  for(const name of ['volume_up','volume_down','set_volume','brightness_up','brightness_down','launch_app'])assert.ok(names.includes(name),name);
});

test('phase 1 registry contains resilient audio and relative brightness tools',()=>{
  for(const name of ['get_volume','set_volume','set_mute','toggle_mute','brightness_up','brightness_down'])assert.ok(tools[name],name);
});

test('plain conversation remains tool-light',()=>{
  assert.deepEqual(selectToolNames('سلام ماریا امروز حالت چطوره؟'),[]);
});
