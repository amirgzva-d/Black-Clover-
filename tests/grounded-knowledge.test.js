import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldGroundKnowledge,groundedKnowledgeAnswer } from '../src/agent/GroundedKnowledge.js';

test('ordinary questions stay in chat while fresh or explicit research uses the web',()=>{
  assert.equal(shouldGroundKnowledge('پایتخت مغولستان کجاست؟'),true);
  assert.equal(shouldGroundKnowledge('جدیدترین کارت گرافیک انویدیا چیه؟'),true);
  assert.equal(shouldGroundKnowledge('پایتخت مغولستان را با منبع بررسی کن'),true);
  assert.equal(shouldGroundKnowledge('صدا رو تا ته زیاد کن'),false);
  assert.equal(shouldGroundKnowledge('فتوشاپ رو باز کن'),false);
  assert.equal(shouldGroundKnowledge('سلام ماریا خوبی؟'),false);
});

test('grounded capital answer is extracted from evidence without model hallucination',async()=>{
  const seen=[];
  const runTool=async(name,args)=>{seen.push([name,args]);return {success:true,data:{sources:[{title:'مغولستان',url:'https://example.test/mongolia',snippet:'پایتخت و بزرگترین شهر اولان‌باتور است.'}]}};};
  const out=await groundedKnowledgeAnswer('پایتخت مغولستان کجاست؟',{runTool});
  assert.ok(out.answer.startsWith('پایتخت مغولستان اولان‌باتور است.'));
  assert.ok(out.answer.includes('https://example.test/mongolia'));
  assert.equal(seen[0][0],'wikipedia_search');
  assert.equal(out.sources.length,1);
});

test('stable comparisons use fast page evidence without waiting for an LLM',async()=>{
  let modelCalls=0;const seen=[];
  const runTool=async(name,args)=>{seen.push(name);if(name==='live_web_search')return {success:true,data:{results:[{title:'SSD vs HDD',url:'https://example.test/storage',snippet:'مقایسه SSD و HDD'}]}};if(name==='read_web_page')return {success:true,data:{text:'HDD داده را روی دیسک‌های مکانیکی و چرخان ذخیره می‌کند. SSD قطعه مکانیکی ندارد، از حافظه فلش استفاده می‌کند و معمولاً سریع‌تر و بی‌صداتر است.'}};return {success:false};};
  const client={async chat(){modelCalls++;throw new Error('LLM should not be needed');}};
  const out=await groundedKnowledgeAnswer('تفاوت SSD و HDD را بگو',{runTool,client});
  assert.match(out.answer,/HDD/);assert.match(out.answer,/SSD/);assert.match(out.answer,/مکانیکی|فلش/);
  assert.equal(modelCalls,0);assert.ok(seen.includes('live_web_search'));assert.ok(seen.includes('read_web_page'));
});
