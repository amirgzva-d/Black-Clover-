import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldGroundKnowledge,groundedKnowledgeAnswer } from '../src/agent/GroundedKnowledge.js';

test('ordinary questions stay in chat while fresh or explicit research uses the web',()=>{
  assert.equal(shouldGroundKnowledge('پایتخت مغولستان کجاست؟'),false);
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
  assert.equal(seen[0][0],'research_topic');
  assert.equal(out.sources.length,1);
});
