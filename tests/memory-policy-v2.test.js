import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MemoryStore } from '../src/agent/MemoryStore.js';
import { memoryPolicy } from '../src/agent/memory/MemoryPolicy.js';
import { IncidentStore } from '../src/agent/IncidentStore.js';

test('memory policy rejects secrets before durable storage',async()=>{
  const decision=memoryPolicy.evaluate('یادت باشه API_KEY=sk-super-secret-value-123456',{explicit:true});
  assert.equal(decision.eligible,false);
  assert.equal(decision.reason,'secret');
});

test('automatic memory keeps explicit preferences but skips transient private contents',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-memory-policy-'));
  try{
    const memory=new MemoryStore({directory:dir,maxItems:20});
    const preference=await memory.maybeRememberUserStatement('یادت باشه من جواب‌های فارسی و دقیق رو ترجیح می‌دم');
    assert.ok(preference);
    const clipboard=await memory.maybeRememberUserStatement('یادت باشه متن کلیپ بورد من abc123 هست');
    assert.equal(clipboard,null);
    const items=await memory.list();
    assert.equal(items.length,1);
    assert.match(items[0].text,/فارسی/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('failure reports redact secrets and omit private request text',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-incidents-'));
  try{
    const store=new IncidentStore({directory:dir,limit:10});
    const item=await store.record({
      kind:'runtime',
      phase:'test',
      error:'api key = sk-abcdefghijk123456 password=hunter2',
      input:'فایل خصوصی من را باز کن',
      privateContext:true,
      model:'test'
    });
    assert.equal(item.input,'[private request omitted]');
    assert.doesNotMatch(item.error,/sk-abcdefghijk123456|hunter2/);
    assert.match(item.error,/\[REDACTED\]/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
