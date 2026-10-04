import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ReminderStore } from '../src/agent/ReminderStore.js';
import { searchActionBook,ACTION_BOOK } from '../src/agent/ActionBook.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { tools } from '../src/agent/toolRegistry.js';

test('action book contains reusable cross-app recipes',()=>{
  assert.ok(ACTION_BOOK.length>=30);
  const found=searchActionBook('آخرین عکس تلگرام رو دانلود کن و تو روبیکا بفرست',{limit:8});
  assert.ok(found.some(x=>x.id==='download-last-photo-relay'));
  assert.ok(found.some(x=>x.steps.some(s=>String(s).includes('vision_inspect_screen'))));
});

test('future DO requests expose executable scheduler tool',()=>{
  const names=selectToolNames('فردا ساعت 8 درباره کارت گرافیک تحقیق کن و نتیجه رو آماده کن');
  assert.ok(names.includes('create_scheduled_action'));
  assert.ok(names.includes('research_topic'));
  assert.ok(names.includes('search_action_book'));
});

test('scheduled actions execute through registered agent executor instead of becoming notification only',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-scheduled-action-'));
  try{
    const store=new ReminderStore({directory:dir}),seen=[];
    store.setActionExecutor(async item=>{seen.push(item.instruction);return {ok:true,text:'done'};});
    await store.createAction({instruction:'تحقیق کن و گزارش بساز',label:'تحقیق',dueAt:new Date(Date.now()-1000).toISOString()});
    const reminders=await store.takeDue(Date.now());
    assert.equal(reminders.length,0);
    await new Promise(r=>setTimeout(r,80));
    assert.deepEqual(seen,['تحقیق کن و گزارش بساز']);
    const active=await store.list();
    assert.ok(active.some(x=>x.kind==='reminder'&&/اجرا شد/.test(x.message)));
    assert.ok(!active.some(x=>x.kind==='action'));
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('Chrome-specific workflows are routed for web messengers and AI sites',()=>{
  const rubika=selectToolNames('روبیکا وب رو حتما تو کروم باز کن و برو چت شرکت');
  assert.ok(rubika.includes('chrome_open_service'));
  assert.ok(rubika.includes('vision_inspect_screen'));
  const ai=selectToolNames('چت جی پی تی رو تو کروم باز کن و این سوال رو بپرس');
  assert.ok(ai.includes('chrome_open_service'));
  assert.ok(ai.includes('set_ui_value'));
});

test('direct Adobe bridge is available alongside UI and vision fallback',()=>{
  for(const name of ['adobe_status','photoshop_open_document','illustrator_open_document'])assert.ok(tools[name],name);
  const names=selectToolNames('فتوشاپ رو باز کن این عکس رو ادیت کن');
  assert.ok(names.includes('vision_inspect_screen'));
  assert.ok(names.includes('invoke_ui_element'));
});

test('complex messaging recipe keeps file, messenger, UI and vision tools together',()=>{
  const names=selectToolNames('آخرین عکس چت شرکت در تلگرام وب رو دانلود کن و برای شرکت تو روبیکا وب کروم بفرست');
  for(const name of ['chrome_open_service','global_find_files','copy_files_to_clipboard','vision_inspect_screen','invoke_ui_element','search_action_book'])assert.ok(names.includes(name),name);
});
