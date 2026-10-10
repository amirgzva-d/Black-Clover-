import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ReminderStore} from '../src/agent/ReminderStore.js';
import {createReminderActionExecutor,normalizeReminderOperation} from '../src/main/ReminderActionExecutor.js';

const sandbox=async cb=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-reminder-'));
  try{return await cb(dir);}finally{await fs.rm(dir,{recursive:true,force:true});}
};
test('action runner actually executes whitelisted operations and emits results',async()=>{
  const calls=[],events=[],notifications=[];
  const executor=createReminderActionExecutor({
    openExternal:async v=>{calls.push(['url',v]);},
    openPath:async v=>{calls.push(['path',v]);return '';},
    openShortcut:async v=>{calls.push(['shortcut',v]);},
    writeClipboard:v=>calls.push(['copy',v]),
    showChatDraft:async v=>calls.push(['draft',v]),
    notify:v=>notifications.push(v),
    emit:e=>events.push(e),
    stat:async()=>({isFile:()=>true,isDirectory:()=>false})
  });
  for(const [type,target,expected] of [
    ['open_url','https://example.org/','url'],
    ['open_path','C:\\work\\demo.xlsx','path'],
    ['open_shortcut','id-22','shortcut'],
    ['copy_text','copy me','copy'],
    ['chat_draft','send a message','draft']
  ]){
    const res=await executor({id:type,title:type,operation:{type,target}});
    assert.equal(calls.at(-1)[0],expected);
    assert.equal(res.requiresConfirmation,type==='chat_draft'?true:undefined);
  }
  const executable=await executor({operation:{type:'open_path',target:'C:\\\\Tools\\\\setup.exe'}});
  assert.equal(executable.requiresConfirmation,true);
  assert.equal(calls.at(-1)[0],'draft');
  assert.equal(events.length,6);
  assert.equal(notifications.length,6);
  assert.equal((await executor({title:'Empty',operation:{type:'notify'}})).ok,true);
});
test('invalid URL/protocol/operation rejected, and missing path reported',async()=>{
  for(const value of [{type:'open_url',target:'javascript:alert(1)'},{type:'open_url',target:'file:///C:/test'},{type:'unknown',target:'x'},{type:'open_shortcut',target:''}])
    assert.throws(()=>normalizeReminderOperation(value));
  const runner=createReminderActionExecutor({stat:async()=>{throw Error('Missing file');},notify:()=>{},emit:()=>{}});
  const res=await runner({operation:{type:'open_path',target:'C:\\missing.txt'}});
  assert.equal(res.ok,false);assert.match(res.text,/Missing file/);
});
test('time-specific action saves, runs and exposes verified result',()=>sandbox(async directory=>{
  const store=new ReminderStore({directory});
  const calls=[];
  store.setActionExecutor(async item=>{calls.push(item.operation);return {ok:true,text:'workbook opened'};});
  const date=new Date(Date.now()+3600000).toISOString();
  const action=await store.createAction({
    dueAt:date,instruction:'Open Excel workbook',operation:{type:'open_path',target:'C:\\temp\\test.xlsx'},
    recurrence:{type:'once'},notifyChat:true
  });
  assert.equal(action.operation.type,'open_path');
  const reloaded=new ReminderStore({directory});
  assert.equal((await reloaded.list())[0].operation.target,'C:\\temp\\test.xlsx');
  const result=await store.runNow(action.id);
  assert.equal(result.lastResult.ok,true);assert.equal(result.runCount,1);
  assert.equal((await store.list({includeDisabled:true})).find(x=>x.id===action.id).enabled,false,'A one-time task may not execute twice');
  assert.equal(calls[0].type,'open_path');
  assert.equal((await store.list({includeDisabled:true})).find(x=>x.id===action.id).notifyChat,true);
}));
test('snooze and pause resume survive restart',()=>sandbox(async directory=>{
  const store=new ReminderStore({directory});
  const task=await store.create({message:'Wake up',dueAt:new Date(Date.now()+60000).toISOString()});
  await store.pause(task.id);assert.equal((await store.list())[0].paused,true);
  await store.resume(task.id);assert.equal((await store.list())[0].paused,false);
  await store.snooze(task.id,15);
  assert.ok(new Date((await store.list())[0].dueAt).getTime()>Date.now()+14*60000);
  await assert.rejects(store.snooze(task.id,7));
  assert.ok((await new ReminderStore({directory}).list())[0].enabled);
}));
test('recurring daily, weekly and monthly actions advance after exact due time',()=>sandbox(async directory=>{
  const store=new ReminderStore({directory});
  store.setActionExecutor(async()=>({ok:true,text:'done'}));
  const base='2026-11-09T09:34:00.000Z';
  for(const type of ['daily','weekly','monthly']){
    const action=await store.createAction({instruction:type,dueAt:base,recurrence:{type},operation:{type:'notify'}});
    assert.equal(action.recurrence.type,type);
  }
  await store.takeDue(new Date('2026-11-09T09:34:10Z').getTime());
  await store.whenIdle();
  const tasks=(await store.list()).filter(x=>x.kind==='action');
  assert.equal(tasks.length,3);
  for(const item of tasks)assert.ok(new Date(item.dueAt).getTime()>new Date('2026-11-09T09:34:10Z').getTime());
  assert.equal(tasks.find(x=>x.instruction==='daily').dueAt,'2026-11-10T09:34:00.000Z');
  assert.equal(tasks.find(x=>x.instruction==='weekly').dueAt,'2026-11-16T09:34:00.000Z');
}));
test('missed sensitive job is not blindly run after long downtime',()=>sandbox(async directory=>{
  const store=new ReminderStore({directory}),runs=[];
  store.setActionExecutor(async x=>{runs.push(x.id);return {ok:true};});
  const due=new Date(Date.now()-40*60000).toISOString();
  const action=await store.createAction({instruction:'draft',dueAt:due,missedRunPolicy:'ask'});
  const result=await store.takeDue();
  await store.whenIdle();
  assert.equal(runs.length,0);
  assert.equal(result.length,1);
  assert.match(result[0].message,/تأیید/);
  const history=(await store.list({includeDisabled:true})).find(x=>x.id===action.id);
  assert.equal(history.lastResult.requiresConfirmation,true);
}));
