import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePersianSurface,commandSafetyGuard} from '../src/agent/PersianSurface.js';
import {understandPersianIntent} from '../src/agent/PersianIntentEngine.js';
import {CORE_PERSIAN_INTENTS} from '../src/agent/PersianIntentCatalog.js';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';

test('fuzzy Persian commands preserve URLs, paths, filenames, quoted messages and numbers',()=>{
 const raw='ماریا سدا رو ۳۵ درصد کن بعد پوشه C:\\Users\\Ali\\Test.xlsx رو باز کن و پیام «حذف کن» رو بخون';
 const normalized=normalizePersianSurface(raw);
 assert.match(normalized,/صدا/);
 assert.match(normalized,/35 درصد/);
 assert.ok(normalized.includes('C:\\Users\\Ali\\Test.xlsx'));
 assert.ok(normalized.includes('«حذف کن»'));
 assert.equal(normalizePersianSurface('کوکل رو باز کن'),'گوگل رو باز کن');
 assert.equal(normalizePersianSurface('تلخرامو باز کن'),'تلگرام رو باز کن');
 assert.equal(normalizePersianSurface('پنجررو بزرگ کن'),'پنجره رو بزرگ کن');
});
test('well specified intent classification recognises colloquial, reordered, Persian typos',()=>{
 const positive=[
  ['سدا رو یخورده کم کن','audio.volume.down'],
  ['صوذای سیستم رو زیاد کن','audio.volume.up'],
  ['لطفا روشنایی صفحه رو ببر بالا','display.brightness.up'],
  ['روسنایی رو بیار پایین','display.brightness.down'],
  ['صدای سیستم رو تا آخر زیاد کن','audio.volume.max'],
  ['ولوم رو از بی صدا دربیار','audio.volume.unmute'],
  ['موزیک بعدی رو بزن','media.next'],
  ['ماریا، ترک رو برگرد قبلی','media.previous'],
  ['سیستم رو خاموش کن','power.shutdown'],
  ['سیستم رو ری استارت کن','power.restart'],
  ['این پنجره رو بزرگ کن','windows.window.maximize'],
  ['این پنجره رو کمینه کن','windows.window.minimize'],
  ['اسم فایل رو عوض کن','files.rename'],
  ['تب رو پین کن','browser.tab.pin'],
  ['تب رو از پین بردار','browser.tab.unpin'],
  ['تنظیمات رمز ویندوز رو باز کن','security.windows.settings'],
  ['این صفحه رو ترجمه کن','translation.page'],
  ['عکس رو ترجمه کن','translation.image'],
  ['فایل test.txt رو حزف کن','files.delete'],
  ['تلخرامو باز کن','apps.launch'],
  ['یه یادداشت رو پین کن','notes.pin.create'],
  ['اکسل رو بخون','excel.read']
 ];
 for(const [phrase,expected] of positive){
  const hit=understandPersianIntent(phrase);
  assert.equal(hit.intent,expected,`${phrase} -> ${hit.intent}`);
 }
});
test('no automatic action for negative, explanatory, quoted and conditional utterances',()=>{
 const dangerous=[
  ['سیستم رو خاموش نکن','power.shutdown'],
  ['لطفاً فایل رو حذف نکن','files.delete'],
  ['چطور میشه سیستم رو خاموش کنم؟','power.shutdown'],
  ['این جمله رو بنویس: «سیستم رو خاموش کن»','power.shutdown'],
  ['اگه فردا ساعت هشت شد سیستم رو خاموش کن','power.shutdown']
 ];
 for(const [phrase] of dangerous){
  const result=understandPersianIntent(phrase);
  assert.equal(result.guard.allowDirect,false,phrase);
  assert.notEqual(result.direct,true,phrase);
 }
 assert.equal(commandSafetyGuard('هیچ وقت عکس خانوادگی رو حذف نکن').negated,true);
});
test('missing object target never causes blind delete or message delivery',()=>{
 for(const phrase of ['فایل رو حذف کن','پیام رو در تلگرام بفرست','این فایل رو منتقل کن']){
   const parsed=understandPersianIntent(phrase);
   assert.notEqual(parsed.direct,true);
 }
 const nested='در تلگرام پیام «سیستم رو خاموش کن» را برای رضا بفرست';
 assert.equal(understandPersianIntent(nested).guard.allowDirect,false);
});
test('same meaning maps to one canonical intent and tool independent of phrasing',()=>{
 const sentences=[
  'ماریا سدا رو کم کن','ولوم رو بیار پایین','کم کن صدای سیستم','اسپیکر رو کاهش بده',
  'لطفاً صدای ویندوز رو کمتر کن','صوذا رو کم کن'
 ];
 for(const phrase of sentences){
  const hit=understandPersianIntent(phrase);
  assert.equal(hit.intent,'audio.volume.down',phrase);
  assert.equal(hit.tool,'volume_down');
  assert.equal(hit.direct,true);
  assert.equal(matchFastCommand(hit.canonical)?.name,'volume_down');
 }
});
test('stable intent catalogue never silently points to an unknown tool without being marked planning-only',async()=>{
 const {tools}=await import('../src/agent/toolRegistry.js');
 const missing=CORE_PERSIAN_INTENTS.filter(x=>!tools[x.tool]);
 assert.deepEqual(missing,[]);
 const duplicates=CORE_PERSIAN_INTENTS.map(x=>x.id);
 assert.equal(new Set(duplicates).size,duplicates.length);
 assert.ok(CORE_PERSIAN_INTENTS.length>=50);
});
