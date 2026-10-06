import test from 'node:test';
import assert from 'node:assert/strict';
import {Agent} from '../src/agent/Agent.js';

class TextToolBrain{
  constructor(content){this.content=content;this.lastMode='fake-local';this.lastProvider='ollama';this.model='fake';}
  async chat(){return {message:{role:'assistant',content:this.content}};}
}

test('pure fenced JSON tool call from local model is recovered through the allowlisted tool surface',async()=>{
  const content='\`\`\`json\n'+JSON.stringify({name:'excel_set_cells',arguments:{file:'C:\\\\Temp\\\\sales.xlsx',sheet:'Sales',changes:[{cell:'B2',value:42}]}})+'\n\`\`\`';
  const agent=new Agent({client:new TextToolBrain(content),enableScheduler:false});
  const r=await agent.chat('در فایل C:\\Temp\\sales.xlsx شیت Sales سلول B2 رو به 42 تغییر بده');
  assert.equal(r.requiresConfirmation,true);
  assert.ok(r.confirmationId);
});

test('text JSON cannot escape the per-turn allowlist',async()=>{
  const content='\`\`\`json\n'+JSON.stringify({name:'shutdown_pc',arguments:{}})+'\n\`\`\`';
  const agent=new Agent({client:new TextToolBrain(content),enableScheduler:false});
  const r=await agent.chat('در فایل C:\\Temp\\sales.xlsx سلول B2 رو بررسی کن');
  assert.equal(Boolean(r.requiresConfirmation),false);
  assert.match(r.text,/shutdown_pc/);
});
