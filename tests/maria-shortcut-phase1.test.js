import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveShortcutTarget,shortcutIdentity } from '../src/agent/ShortcutTargetResolver.js';
import { QuickShortcutStore } from '../src/agent/QuickShortcutStore.js';

test('classifies browser URLs and rejects unsafe protocols',async()=>{
  assert.equal((await resolveShortcutTarget('https://example.org/a')).kind,'url');
  assert.throws(()=>shortcutIdentity('javascript:alert(1)'),/HTTP/);
  await assert.rejects(resolveShortcutTarget('file:///C:/Windows'),/HTTP/);
});
test('discovers files, applications, directories and media without moving targets',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-target-'));
  try{
    for(const file of ['app.exe','sheet.xlsx','movie.mp4','shortcut.lnk'])await fs.writeFile(path.join(dir,file),'fixture');
    assert.equal((await resolveShortcutTarget(dir)).kind,'folder');
    assert.equal((await resolveShortcutTarget(path.join(dir,'app.exe'))).kind,'app');
    assert.equal((await resolveShortcutTarget(path.join(dir,'sheet.xlsx'))).kind,'file');
    assert.equal((await resolveShortcutTarget(path.join(dir,'movie.mp4'))).kind,'media');
    assert.equal((await resolveShortcutTarget(path.join(dir,'shortcut.lnk'),{readLink:()=>({target:path.join(dir,'sheet.xlsx')})})).kind,'file');
    const original=await fs.readFile(path.join(dir,'sheet.xlsx'),'utf8');
    assert.equal(original,'fixture');
    await assert.rejects(resolveShortcutTarget(path.join(dir,'missing.exe')),/پیدا نشد/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('shortcut store keeps the real target and does not mutate source file',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-shortcut-'));
  try{
    const target=path.join(dir,'گزارش.txt');
    await fs.writeFile(target,'original');
    const store=new QuickShortcutStore({directory:path.join(dir,'data')});
    const item=await store.create({target,label:'گزارش',kind:'file'});
    assert.equal(item.target,target);
    assert.equal((await store.list())[0].target,target);
    await store.remove(item.id);
    assert.equal(await fs.readFile(target,'utf8'),'original');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('top island provides contextual add and native drag-and-drop wiring',async()=>{
  const [ui,preload,main]=await Promise.all([
    fs.readFile(new URL('../src/renderer/topIslandV4.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/main/preload.cjs',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/main/main.js',import.meta.url),'utf8')
  ]);
  for(const text of ['انتخاب فایل','افزودن پین','افزودن یادآور','getDroppedFilePath','createSmartShortcutEditor'])assert.ok(ui.includes(text));
  assert.match(preload,/webUtils\.getPathForFile/);
  assert.match(main,/shortcuts:pick-target/);
  assert.match(main,/shortcuts:resolve/);
  assert.match(main,/shortcuts:file-icon/);
  assert.match(preload,/shortcutFileIcon/);
  assert.ok(ui.includes('hydrateShortcutIcons'));
  assert.ok(ui.includes('quickAddShortcut'));
});

test('pin and reminder stores persist newly added items in isolated test data',async()=>{
  const { PinnedNoteStore }=await import('../src/agent/PinnedNoteStore.js');
  const { ReminderStore }=await import('../src/agent/ReminderStore.js');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-add-'));
  try{
    const pins=new PinnedNoteStore({directory:dir});
    const added=await pins.create({title:'تست',text:'متن پین',pinned:true});
    assert.equal((await pins.list())[0].id,added.id);
    const reminders=new ReminderStore({directory:dir});
    const task=await reminders.create({message:'یادآوری تست',dueAt:new Date(Date.now()+3600000).toISOString()});
    assert.equal((await reminders.list())[0].id,task.id);
    assert.equal((await new ReminderStore({directory:dir}).list())[0].message,'یادآوری تست');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
