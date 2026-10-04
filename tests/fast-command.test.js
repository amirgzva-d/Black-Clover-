import test from 'node:test';
import assert from 'node:assert/strict';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';

test('fast router understands Persian master volume commands',()=>{
  assert.deepEqual(matchFastCommand('صدای سیستم ویندوز رو تا آخر زیاد کن'),{name:'set_volume',args:{percent:100},reply:'صدا رو تا آخر بردم بالا، رئیس.'});
  assert.equal(matchFastCommand('صدا رو روی 35 درصد تنظیم کن').name,'set_volume');
  assert.equal(matchFastCommand('صدا رو بی صدا کن').name,'set_mute');
  assert.equal(matchFastCommand('صدا رو از بی صدا دربیار').args.muted,false);
});

test('fast router recognizes common app launch phrases',()=>{
  assert.deepEqual(matchFastCommand('تلگرام رو باز کن').args,{name:'Telegram'});
  assert.deepEqual(matchFastCommand('وی اس کد رو اجرا کن').args,{name:'Visual Studio Code'});
});

test('fast router recognizes important power actions',()=>{
  assert.equal(matchFastCommand('سیستم رو خاموش کن').name,'shutdown_pc');
  assert.equal(matchFastCommand('کامپیوتر رو ری استارت کن').name,'restart_pc');
  assert.equal(matchFastCommand('سیستم رو قفل کن').name,'lock_pc');
});
