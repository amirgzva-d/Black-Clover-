import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Agent } from '../src/agent/Agent.js';
import { PermissionPolicy } from '../src/agent/PermissionPolicy.js';

test('destructive colloquial fast command reaches confirmation before any model wait',async()=>{
  const agent=new Agent({enableScheduler:false});
  const result=await Promise.race([
    agent.chat('سطل زباله رو خالی کن'),
    new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),1500))
  ]);
  assert.equal(result?.timeout,undefined);
  assert.equal(result?.requiresConfirmation,true);
  assert.ok(result?.confirmationId);
});

test('permission policy persists protected resources on disk',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-policy-'));
  try{
    const a=new PermissionPolicy({directory:dir});
    await a.protect('نمونه مهم',{note:'test'});
    const b=new PermissionPolicy({directory:dir});
    const status=await b.status();
    assert.equal(status.protectedResources.some(x=>x.label==='نمونه مهم'),true);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});