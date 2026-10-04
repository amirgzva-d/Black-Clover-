import test from 'node:test';
import assert from 'node:assert/strict';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';

test('fast router understands many Persian master volume phrasings',()=>{
  const max=['صدای سیستم ویندوز رو تا آخر زیاد کن','صدا رو ببر تا ته','ولوم رو فول کن','اسپیکر رو صد درصد کن'];
  for(const phrase of max)assert.deepEqual(matchFastCommand(phrase)?.args,{percent:100},phrase);
  assert.equal(matchFastCommand('صدا رو روی 35 درصد تنظیم کن').name,'set_volume');
  assert.equal(matchFastCommand('ولوم ۴۲ درصد باشه').args.percent,42);
  assert.equal(matchFastCommand('صدا رو بی صدا کن').name,'set_mute');
  assert.equal(matchFastCommand('صدا رو از بی صدا دربیار').args.muted,false);
  assert.equal(matchFastCommand('صدا رو یه کم ببر بالا').name,'volume_up');
  assert.equal(matchFastCommand('اسپیکر رو آروم تر کن').name,'volume_down');
});

test('fast router understands relative and absolute brightness',()=>{
  assert.equal(matchFastCommand('نور صفحه رو بیشتر کن').name,'brightness_up');
  assert.equal(matchFastCommand('روشنایی رو بیار پایین').name,'brightness_down');
  assert.equal(matchFastCommand('نور رو روی 65 درصد بذار').args.percent,65);
  assert.equal(matchFastCommand('brightness رو تا آخر ببر').args.percent,100);
});

test('fast router recognizes common and generic app launch phrases',()=>{
  assert.deepEqual(matchFastCommand('تلگرام رو باز کن').args,{name:'Telegram'});
  assert.deepEqual(matchFastCommand('وی اس کد رو اجرا کن').args,{name:'Visual Studio Code'});
  assert.deepEqual(matchFastCommand('فتوشاپ رو راه بنداز').args,{name:'Adobe Photoshop'});
  assert.deepEqual(matchFastCommand('برنامه VLC رو باز کن').args,{name:'vlc'});
});

test('fast router recognizes media and search variants',()=>{
  assert.equal(matchFastCommand('آهنگ بعدی رو بزن').name,'media_next');
  assert.equal(matchFastCommand('موزیک رو نگه دار').name,'media_play_pause');
  assert.equal(matchFastCommand('گربه بامزه رو سرچ کن').name,'web_search');
  assert.equal(matchFastCommand('تو یوتیوب موسیقی لوفای سرچ کن').name,'youtube_search');
});

test('fast router recognizes important power actions',()=>{
  assert.equal(matchFastCommand('سیستم رو خاموش کن').name,'shutdown_pc');
  assert.equal(matchFastCommand('کامپیوتر رو ری استارت کن').name,'restart_pc');
  assert.equal(matchFastCommand('سیستم رو قفل کن').name,'lock_pc');
  assert.equal(matchFastCommand('لپتاپ رو ببر حالت خواب').name,'sleep_pc');
});
