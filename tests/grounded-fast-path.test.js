import test from 'node:test';
import assert from 'node:assert/strict';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';
import { tools } from '../src/agent/toolRegistry.js';

test('plain factual Persian questions use grounded evidence fast path',()=>{
  const hit=matchFastCommand('پایتخت مغولستان کجاست؟');
  assert.equal(hit?.name,'grounded_factual_answer');
  assert.equal(hit?.args?.query,'پایتخت مغولستان کجاست؟');
  assert.ok(tools.grounded_factual_answer);
});

test('computer troubleshooting is not mistaken for generic factual Q&A',()=>{
  assert.notEqual(matchFastCommand('چرا سیستم من کند شده؟')?.name,'grounded_factual_answer');
});

test('small talk is not sent to grounded web research',()=>{
  assert.equal(matchFastCommand('سلام ماریا خوبی؟'),null);
});
