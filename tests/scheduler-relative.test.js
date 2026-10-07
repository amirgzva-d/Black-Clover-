import test from 'node:test';
import assert from 'node:assert/strict';
import { dueFrom } from '../src/agent/schedulerTools.js';

test('scheduler accepts natural relative delays at the tool layer',()=>{
  const before=Date.now(),due=Date.parse(dueFrom({minutes_from_now:10}));
  assert.ok(due-before>=9.9*60_000);
  assert.ok(due-before<=10.1*60_000);
});
