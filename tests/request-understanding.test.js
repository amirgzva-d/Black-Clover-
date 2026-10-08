import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWebRequest } from '../src/agent/WebRequest.js';
import { resolveConversationContext } from '../src/agent/ConversationContext.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';
import { planFastSequence } from '../src/agent/FastSequencePlanner.js';
import { resolveNamedWebsite } from '../src/agent/browserTools.js';
import { verifyFastAction } from '../src/agent/FastActionVerifier.js';
import { assessTaskOutcome } from '../src/agent/TaskOutcome.js';

test('search extracts the subject rather than sending the instruction to Google',()=>{
  for(const phrase of ['هوش مصنوعی رو سرچ کن بیار','سرچ کن درباره هوش مصنوعی','لطفاً هوش مصنوعی رو سرچ کن و توضیح بده','تو گوگل هوش مصنوعی رو سرچ کن']){
    const request=parseWebRequest(phrase);
    assert.equal(request?.query,'هوش مصنوعی',phrase);
    assert.equal(matchFastCommand(phrase)?.name,'grounded_factual_answer',phrase);
  }
  assert.equal(parseWebRequest('سایت رسمی OpenAI رو سرچ کن بیار')?.site,'OpenAI');
  assert.equal(matchFastCommand('سایت رسمی OpenAI رو سرچ کن بیار')?.name,'chrome_open_named_site');
  assert.equal(parseWebRequest('سرچ کن در سایت دیجی کالا گوشی سامسونگ')?.domain,'digikala.com');
  assert.equal(matchFastCommand('سرچ کن چطور صدا رو قطع کنم')?.name,'grounded_factual_answer');
});
test('audio separates maximum, a little, relative percentages, mute and unmute',()=>{
  const cases=[
    ['صدا رو تا آخرین درجه زیاد کن','set_volume',{percent:100}],
    ['صدا رو یه کم زیاد کن','volume_up',{amount:3}],
    ['یه کم صدا رو بکش بالا','volume_up',{amount:3}],
    ['صدا رو ۱۵ درصد کم کن','volume_down',{amount:15}],
    ['صدا رو روی ۱۵ درصد بذار','set_volume',{percent:15}],
    ['صدا رو کاملاً قطع کن','set_mute',{muted:true}],
    ['صدا رو باز کن','set_mute',{muted:false}],
    ['صدا رو صفر کن','set_volume',{percent:0}]
  ];
  for(const [phrase,name,args] of cases){const actual=matchFastCommand(phrase);assert.equal(actual?.name,name,phrase);assert.deepEqual(actual?.args,args,phrase);}
  assert.equal(matchFastCommand('چرا صدا رو زیاد می‌کنه؟'),null);
});
test('immediate follow-ups reuse the correct subject and its privacy',()=>{
  const history=[{role:'user',content:'صدا رو کم کن',_private:true}];
  const next=resolveConversationContext('همونو یه کم بیشتر کن',history);
  assert.equal(next.private,true);assert.equal(matchFastCommand(next.text)?.name,'volume_up');
  assert.equal(resolveConversationContext('کمی کمش کن',[{role:'user',content:'صدا و نور رو زیاد کن'}]).ambiguous,true);
  const research=resolveConversationContext('همونو سرچ کن بیار',[{role:'user',content:'هوش مصنوعی رو سرچ کن'}]);
  assert.equal(parseWebRequest(research.text)?.query,'هوش مصنوعی');
  assert.ok(resolveConversationContext('مزایاش چیه؟',[{role:'user',content:'درباره SSD توضیح بده'}]).text.includes('SSD'));
  const storage=resolveConversationContext('حالا از نظر قیمت چطور؟',[{role:'user',content:'در یک جمله تفاوت SSD و HDD را بگو',_resolvedGoal:'در یک جمله تفاوت SSD و HDD را بگو'}]);
  assert.match(storage.text,/SSD/i);assert.match(storage.text,/HDD/i);assert.match(storage.text,/قیمت/);
});
test('an unsupported second action prevents partial fast execution',()=>{
  const sequence=planFastSequence('نوت پد رو باز کن و بعد گزارش فروش رو ویرایش کن');
  assert.equal(sequence.multi,true);assert.equal(sequence.complete,false);
  const audio=planFastSequence('صدا رو کمی زیاد کن و بعد کاملاً قطعش کن');
  assert.equal(audio.complete,true);assert.equal(audio.steps[1].command.name,'set_mute');
  const quoted=planFastSequence('«هوا، آب و غذا» رو سرچ کن');
  assert.equal(quoted.multi,false);
});
test('a messenger transfer is never reduced to simply opening the app',()=>{
  for(const service of ['واتساپ','روبیکا','تلگرام']){
    assert.equal(matchFastCommand(`${service} رو باز کن و پیام علی رو بردار برای رضا بفرست`),null);
    assert.equal(assessTaskOutcome(`${service} پیام رو برای رضا بفرست`,[{name:'messenger_open',success:true}],'ارسال شد').complete,false);
  }
});
test('missing audio state cannot verify a mute or relative-volume action',async()=>{
  assert.equal((await verifyFastAction({name:'set_mute',args:{muted:false}},{success:true},async()=>({success:false}))).verified,false);
  assert.equal((await verifyFastAction({name:'volume_up',args:{amount:3}},{success:true,data:{expected:33}},async()=>({success:true,data:{percent:33}}))).verified,true);
});
test('an unknown website is searched and read before returning its URL',async()=>{
  const calls=[];
  const resolved=await resolveNamedWebsite('Example Labs',{runResearch:async(name,args)=>{calls.push({name,args});return name==='live_web_search'?{success:true,data:{results:[{title:'Example Labs official website',url:'https://example.org/',snippet:''}]}}:{success:true,data:{url:'https://example.org/',text:'Example Labs'}};}});
  assert.equal(resolved.ok,true);assert.equal(resolved.url,'https://example.org/');
  assert.deepEqual(calls.map(x=>x.name),['live_web_search','read_web_page']);
  const ambiguous=await resolveNamedWebsite('Example',{runResearch:async()=>({success:true,data:{results:[{title:'Example',url:'https://example.org/'},{title:'Example',url:'https://example.com/'}]}})});
  assert.equal(ambiguous.ok,false);
});
