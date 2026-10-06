import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEvaluationUtterances, resolveUniversalIntent } from '../src/agent/v2/UniversalIntentEngine.js';

test('universal intent evaluation matrix contains more than 1000 natural variants',()=>{
  const cases=generateEvaluationUtterances();
  assert.ok(cases.length>1000, `expected >1000 cases, got ${cases.length}`);
});

test('common colloquial Persian variants resolve to the same goal',()=>{
  const cases=[
    ['صدا رو ببند','audio.control'],
    ['ساکتش کن','audio.control'],
    ['ولوم رو تا آخر زیاد کن','audio.control'],
    ['نور صفحه رو کم کن','display.control'],
    ['درباره هوش مصنوعی سرچ کن','web.search'],
    ['فایل گزارش فروش رو پیدا کن','files.manage'],
    ['کروم رو باز کن','apps.manage'],
    ['سیستم رو بخوابون','system.power']
  ];
  for(const [input,goal] of cases){
    const result=resolveUniversalIntent(input);
    assert.equal(result.goal,goal,input);
    assert.ok(result.confidence>0.5,input);
  }
});

test('direct plans use existing tool contracts and do not execute by themselves',()=>{
  const volume=resolveUniversalIntent('صدا رو بی‌صدا کن');
  assert.deepEqual(volume.direct,{name:'set_mute',args:{muted:true},reply:'صدا رو بی‌صدا کردم.'});
  const search=resolveUniversalIntent('درباره آب و هوا سرچ کن');
  assert.equal(search.direct.name,'web_search');
  assert.equal(search.direct.args.query,'آب و هوا');
});
