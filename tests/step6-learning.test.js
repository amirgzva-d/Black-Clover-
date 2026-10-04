import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SkillStore } from '../src/agent/SkillStore.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';

test('successful multi-tool workflows become reusable procedural skills',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-skill-')),store=new SkillStore({file:path.join(dir,'skills.json')});
  const learned=await store.learnFromTrace('کروم رو باز کن و برو یوتیوب',[{name:'launch_app',args:{app:'chrome'},success:true},{name:'open_url',args:{url:'https://youtube.com'},success:true}]);
  assert.ok(learned?.id);
  const recalled=await store.recall('کروم یوتیوب',{limit:3});
  assert.equal(recalled[0]._kind,'skill');
  assert.deepEqual(recalled[0].plan.map(x=>x.tool),['launch_app','open_url']);
  await fs.rm(dir,{recursive:true,force:true});
});

test('user-taught workflows stay out of online-eligible automatic recall',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-taught-')),store=new SkillStore({file:path.join(dir,'skills.json')});
  await store.teach({title:'کار خصوصی',intent:'فایل مخصوص من را از مسیر شخصی باز کن',steps:[{tool:'open_file',args:{path:'C:/private/example.txt'}}]});
  assert.equal((await store.recall('فایل مخصوص من')).length,0);
  const local=await store.recall('فایل مخصوص من',{includePrivate:true});
  assert.equal(local.length,1);
  assert.equal(local[0].private,true);
  await fs.rm(dir,{recursive:true,force:true});
});

test('unresolved public tasks are queued without duplicates',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-learnq-')),store=new SkillStore({file:path.join(dir,'skills.json')});
  await store.queueImprovement('با برنامه نمونه فرم را پر کن',{tool:'invoke_ui_element',error:'button not found'});
  await store.queueImprovement('با برنامه نمونه فرم را پر کن',{tool:'invoke_ui_element',error:'still missing'});
  const stats=await store.stats(),item=await store.nextImprovement();
  assert.equal(stats.pending,1);
  assert.equal(item.count,2);
  assert.match(item.lastError,/still missing/);
  await fs.rm(dir,{recursive:true,force:true});
});

test('private tasks are not queued for internet self-improvement',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-privateq-')),store=new SkillStore({file:path.join(dir,'skills.json')});
  const item=await store.queueImprovement('فایل خصوصی من را بخوان',{privateContext:true,error:'failed'});
  assert.equal(item,null);
  assert.equal((await store.stats()).pending,0);
  await fs.rm(dir,{recursive:true,force:true});
});

test('learning requests expose learned skills and research tools',()=>{
  const names=selectToolNames('این کار رو بلد نیستی، روشش رو یاد بگیر و انجام بده');
  assert.ok(names.includes('search_learned_skills'));
  assert.ok(names.includes('research_topic'));
});
