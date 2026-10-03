import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPABILITY_GROUPS,CAPABILITY_PHRASE_COUNT,capabilityHints} from '../src/agent/capabilities.js';

test('capability vocabulary has broad coverage',()=>{assert.ok(CAPABILITY_GROUPS.length>=20);assert.ok(CAPABILITY_PHRASE_COUNT>=140);});
test('routes colloquial Persian phrases',()=>{
  assert.ok(capabilityHints('یه سرچ بزن ببین هوا چطوره').includes('web'));
  assert.ok(capabilityHints('صداشو یه کم بیار پایین').includes('volume'));
  assert.ok(capabilityHints('سیستم رو خاموش کن').includes('power'));
  assert.ok(capabilityHints('یوتیوب یه آهنگ پیدا کن').includes('youtube'));
  assert.ok(capabilityHints('از صفحه یه عکس بگیر').includes('screenshot'));
  assert.ok(capabilityHints('این برنامه رو پاک کن').includes('uninstall'));
});
test('ordinary companion phrases are recognized as conversation',()=>{assert.ok(capabilityHints('سلام خوبی چه خبر').includes('conversation'));assert.ok(capabilityHints('حوصلم سر رفته با من حرف بزن').includes('conversation'));});
