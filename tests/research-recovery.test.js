import test from 'node:test';
import assert from 'node:assert/strict';
import {researchTopic} from '../src/agent/researchTools.js';
import {groundedKnowledgeAnswer} from '../src/agent/GroundedKnowledge.js';
test('research tries additional results when initial source pages cannot be read',async()=>{
  const seen=[];
  const data=await researchTopic('topic',{sources:2,search:async()=>[1,2,3,4].map(i=>({title:'Source '+i,url:'https://example.org/'+i,snippet:'snippet'})),read:async url=>{seen.push(url);if(/\/[12]$/.test(url))throw new Error('HTTP 403');return {url,text:'<p>Full source content</p>'};}});
  assert.equal(data.quality,'full-text');assert.equal(data.sources.length,2);assert.ok(data.sources.every(s=>s.text));assert.equal(seen.length,4);
});
test('snippet-only research is explicitly disclosed in the answer',async()=>{
  const out=await groundedKnowledgeAnswer('topic',{forceResearch:true,runTool:async()=>({success:true,data:{sources:[{title:'Source',url:'https://example.org/',snippet:'Evidence snippet about the topic.',text:'',readFailed:true}]}}),client:{chat:async()=>({message:{content:'پاسخ بر اساس شواهد موجود.'}})}});
  assert.ok(out.answer.includes('متن کامل این صفحات قابل دریافت نبود'));
});
