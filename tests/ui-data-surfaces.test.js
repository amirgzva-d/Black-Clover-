import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PinnedNoteStore } from '../src/agent/PinnedNoteStore.js';
import { ReminderStore } from '../src/agent/ReminderStore.js';

test('universal pin store remains backward compatible while serving the top hub',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-pins-'));
  const store=new PinnedNoteStore({directory:dir});
  const a=await store.create({title:'تست',text:'متن پین'});
  assert.equal((await store.list()).length,1);
  const b=await store.update(a.id,{title:'ویرایش',text:'متن جدید'});
  assert.equal(b.title,'ویرایش');
  assert.equal(await store.remove(a.id),true);
  assert.equal((await store.list()).length,0);
});

test('reminder store supports manual reminders and scheduled actions',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-rem-'));
  const store=new ReminderStore({directory:dir});
  await store.create({message:'یادآوری تست',dueAt:new Date(Date.now()+60000)});
  await store.createAction({instruction:'Notepad باز کن',dueAt:new Date(Date.now()+120000),label:'تست اکشن'});
  const items=await store.list();
  assert.equal(items.length,2);
  assert.ok(items.some(x=>x.kind==='action'));
  assert.equal(await store.cancel(items[0].id),true);
});

test('desktop UI keeps legacy pin/reminder migration APIs but moves their visible controls into top island',async()=>{
  const [main,preload,ui,renderer,chat,island]=await Promise.all([
    fs.readFile(new URL('../src/main/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/main/preload.cjs',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/renderer/luxuryUI.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/renderer/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/renderer/chatSurfaceV2.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/renderer/topIsland.js',import.meta.url),'utf8')
  ]);
  for(const token of ["surface==='pins'","surface==='reminders'","pins:list","reminders:list"])assert.ok(main.includes(token),token);
  for(const token of ['showPins','showReminders','listPins','listReminders'])assert.ok(preload.includes(token),token);
  assert.match(ui,/mountDataSurface/); // migration-only legacy surface remains until local data is verified
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="pins"/);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="reminders"/);
  assert.match(island,/pins-automation/);
  assert.match(island,/گزارش ثبت/);
  assert.match(island,/میان‌برها/);
  assert.match(renderer,/chatSurfaceV2/);
  assert.match(chat,/const queue=\[\]/);
  assert.doesNotMatch(chat,/input\.disabled\s*=\s*true/);
  assert.match(chat,/modelOverride:selectedModel/);
  assert.match(chat,/HISTORY_KEY/);
  assert.match(chat,/event\.type==='stream'/);
  assert.match(chat,/voice\.speak\(response\.text\)/);
});


test('motions wardrobe and projects remain in the avatar surfaces while pins/reminders are migration-only',async()=>{
  const [main,preload,ui,assets]=await Promise.all([
    fs.readFile(new URL('../src/main/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/main/preload.cjs',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/renderer/luxuryUI.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/renderer/assetSurface.js',import.meta.url),'utf8')
  ]);
  for(const token of ["surface==='motions'","surface==='wardrobe'","surface==='projects'","surface==='pins'","surface==='reminders'"])assert.ok(main.includes(token),token);
  for(const token of ['showMotions','showWardrobe','showProjects','showPins','showReminders','listLocalAssets'])assert.ok(preload.includes(token),token);
  assert.match(ui,/showMotions/);
  assert.match(ui,/showWardrobe/);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="pins"/);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="reminders"/);
  assert.match(assets,/Pose \/ Animation/);
  assert.match(assets,/Expression/);
  assert.match(assets,/XWear/);
  assert.match(assets,/liveStage/);
  assert.match(assets,/data-lock-current/);
  assert.match(assets,/data-apply-preview/);
  assert.match(assets,/data-apply-motion/);
  assert.match(preload,/avatarLockState/);
  assert.match(main,/avatar:lock-state/);
});
