import test from 'node:test';
import assert from 'node:assert/strict';
import {understandPersianIntent} from '../src/agent/PersianIntentEngine.js';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';
import {normalizePersianSurface,commandSafetyGuard} from '../src/agent/PersianSurface.js';
import {resolveConversationContext} from '../src/agent/ConversationContext.js';

// Hand-authored examples from everyday Persian, independent of the synthetic
// corpus generator and its grammar templates.
const cases=[
  ['سدا رو کم کن','audio.volume.down'],
  ['آقا ولوم رو ببر بالا','audio.volume.up'],
  ['نور صفحه رو کم کن','display.brightness.down'],
  ['نور مانیتور رو ببر بالا','display.brightness.up'],
  ['خاموش کن کامپیوتر','power.shutdown'],
  ['کامپیوتر رو قفل کن','power.lock'],
  ['سیستم رو بخوابون','power.sleep'],
  ['سیستم رو ری استارت کن','power.restart'],
  ['آهنگ بعدی رو بزن','media.next'],
  ['ترک قبلی رو پخش کن','media.previous'],
  ['صدای کروم رو کم کن','audio.app.down'],
  ['صدای فیلم رو قطع کن','audio.app.mute'],
  ['صدای یوتیوب رو زیاد کن','audio.app.up'],
  ['این پنجره رو جمع کن','windows.window.minimize'],
  ['این پنجره رو ماکسیمایز کن','windows.window.maximize'],
  ['دسکتاپ رو نمایش بده','windows.desktop.show'],
  ['از صفحه اسکرین شات بگیر','windows.screenshot'],
  ['یه پوشه بساز','files.folder.create'],
  ['این فایل رو تغییر نام بده','files.rename'],
  ['پوشه رو جابجا کن','files.move'],
  ['یه فایل رو حذف کن','files.delete'],
  ['فایل رو کپی کن','files.copy'],
  ['این فایل رو زیپ کن','files.archive.zip'],
  ['آرشیو رو استخراج کن','files.archive.extract'],
  ['تو گوگل سرچ کن','web.google.search'],
  ['در یوتیوب جستجو کن','web.youtube.search'],
  ['این سایت رو باز کن','web.open.site'],
  ['این تب رو سنجاق کن','browser.tab.pin'],
  ['تب رو از پین دربیار','browser.tab.unpin'],
  ['تب رو ببند','browser.tab.close'],
  ['متن رو یادداشت کن','notes.pin.create'],
  ['فردا یادم بنداز','reminder.create'],
  ['این عملیات رو زمان بندی کن','reminder.action.schedule'],
  ['این سلول اکسل رو ویرایش کن','excel.edit'],
  ['فایل اکسل رو بخون','excel.read'],
  ['سلول رو لینک کن','excel.hyperlink'],
  ['توی تلگرام پیام بفرست','messenger.send'],
  ['پیام رو در تلگرام فوروارد کن','messenger.forward'],
  ['این متن رو ترجمه کن','translation.selection'],
  ['کل صفحه رو فارسی کن','translation.page'],
  ['متن عکس رو معنی کن','translation.image'],
  ['تنظیمات رمز ویندوز رو باز کن','security.windows.settings'],
  ['سیستم رو عیب یابی کن','system.troubleshoot'],
  ['تلگرام رو باز کن','apps.launch'],
  ['این برنامه رو آپدیت کن','apps.update'],
  ['برنامه رو نصب کن','apps.install'],
  ['برنامه رو آن اینستال کن','apps.uninstall']
];
test('independent held-out Persian commands match their stable skill intent',()=>{
 let correct=0;const errors=[];
 for(const [text,expected] of cases){
   const item=understandPersianIntent(text);
   if(item.intent===expected)correct++;
   else errors.push({text,expected,got:item.intent});
 }
 assert.deepEqual(errors,[],'These are manually authored commands, not generated variants');
 assert.equal(correct,cases.length);
});
test('negative + quoted + conditional input never fast-executes destructive actions',()=>{
 const negatives=[
  'فایل رو حذف نکن','چطور فایل رو حذف کنم؟','این جمله رو بگو: «همه فایل‌ها رو حذف کن»',
  'اگر فردا رسید، سیستم رو خاموش کن','سر وقت به مخاطب پیام بفرست، نه الان',
  'میخوام یاد بگیرم چطوری صدای کامپیوتر رو کم کنم'
 ];
 for(const s of negatives)assert.equal(commandSafetyGuard(s).allowDirect,false,s);
});
test('referential follow-up retains media target and does not mutate system sound',()=>{
 const prior='صدای کروم رو کم کن';
 const follow=resolveConversationContext('حالا کمترش کن',[{role:'user',content:prior}]);
 assert.match(follow.text,/کروم/);
 assert.equal(commandSafetyGuard(follow.text).scopedAudio,true);
 assert.equal(commandSafetyGuard(follow.text).allowDirect,false);
});
test('native corrections are used without rewriting named payload text',()=>{
 const input='روسنایی رو کم کن و فایل C:\\Users\\Parsa\\project.xlsx رو پیدا کن';
 const fixed=normalizePersianSurface(input);
 assert.match(fixed,/روشنایی/);
 assert.match(fixed,/C:\\Users\\Parsa\\project.xlsx/);
 assert.equal(matchFastCommand('ولوم رو کم کن')?.name,'volume_down');
});
