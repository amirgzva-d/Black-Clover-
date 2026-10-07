import test from 'node:test';
import assert from 'node:assert/strict';
import { planFastSequence } from '../src/agent/FastSequencePlanner.js';

test('fast sequence planner composes multiple obvious actions without an LLM',()=>{
  const p=planFastSequence('نوت پد رو باز کن، بعد صدا رو روی 25 درصد بذار');
  assert.equal(p.complete,true);
  assert.equal(p.steps.length,2);
  assert.equal(p.steps[0].command.name,'launch_any_app');
  assert.equal(p.steps[1].command.name,'set_volume');
});

test('verification tail can follow an obvious action',()=>{
  const p=planFastSequence('نوت پد رو باز کن و بعد بگو واقعاً باز شده یا نه');
  assert.equal(p.complete,true);
  assert.equal(p.steps[0].command.name,'launch_any_app');
  assert.equal(p.steps.at(-1).type,'verify');
});
