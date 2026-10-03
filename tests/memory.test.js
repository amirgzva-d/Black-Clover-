import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MemoryStore } from '../src/agent/MemoryStore.js';

test('memory persists and recalls relevant facts',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-memory-'));
  try{
    const first=new MemoryStore({directory:dir,maxItems:20});
    await first.remember('favorite drink is dark coffee',{kind:'preference',importance:.9});
    await first.remember('main project is Black Clover',{kind:'project',importance:.8});
    const recalled=await first.recall('coffee preference',{limit:3});
    assert.ok(recalled.some(x=>x.text.includes('coffee')));
    const second=new MemoryStore({directory:dir,maxItems:20});
    await second.load();
    assert.equal((await second.list()).length,2);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
