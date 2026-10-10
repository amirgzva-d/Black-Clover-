import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-chat-store-'));
process.env.BLACK_CLOVER_DATA_DIR=dir;
const {ChatStore}=await import('../src/agent/ChatStore.js');
const store=new ChatStore();

test.after(async()=>{await fs.rm(dir,{recursive:true,force:true});});

test('chat store keeps independent conversations with searchable history',async()=>{
  const a=await store.create({title:'گفتگوی جدید'});
  const b=await store.create({title:'دوم'});
  const m1=await store.appendMessage(a.id,{role:'user',text:'درباره لپ تاپ من تحقیق کن'});
  await store.appendMessage(a.id,{role:'assistant',text:'حتما، موضوع لپ تاپ را بررسی می‌کنم.'});
  await store.appendMessage(b.id,{role:'user',text:'این چت درباره موسیقی است'});
  const loadedA=await store.get(a.id),loadedB=await store.get(b.id);
  assert.equal(loadedA.messages.length,2);
  assert.equal(loadedB.messages.length,1);
  assert.match(loadedA.title,/لپ تاپ/);
  const found=await store.list({query:'موسیقی'});
  assert.equal(found.length,1);
  assert.equal(found[0].id,b.id);
  assert.ok(m1.id);
});

test('folders pin edit delete branch and transcript work together',async()=>{
  const folder=await store.createFolder('کارهای مهم');
  const chat=await store.create({title:'تست امکانات',folderId:folder.id});
  const u=await store.appendMessage(chat.id,{role:'user',text:'نسخه اول'});
  const a=await store.appendMessage(chat.id,{role:'assistant',text:'جواب اول'});
  await store.update(chat.id,{pinned:true});
  await store.updateMessage(chat.id,u.id,{text:'نسخه ویرایش شده'});
  const branch=await store.branch(chat.id,a.id);
  assert.equal(branch.messages.length,2);
  assert.equal(branch.folderId,folder.id);
  const transcript=await store.transcript(chat.id);
  assert.match(transcript,/نسخه ویرایش شده/);
  await store.removeMessage(chat.id,a.id);
  assert.equal((await store.get(chat.id)).messages.length,1);
  await store.removeFolder(folder.id);
  assert.equal((await store.get(chat.id)).folderId,null);
});

test('truncate supports edit-and-regenerate workflow',async()=>{
  const chat=await store.create({title:'بازسازی'});
  const u1=await store.appendMessage(chat.id,{role:'user',text:'سوال یک'});
  await store.appendMessage(chat.id,{role:'assistant',text:'جواب یک'});
  const u2=await store.appendMessage(chat.id,{role:'user',text:'ادامه بده'});
  await store.appendMessage(chat.id,{role:'assistant',text:'جواب دو'});
  await store.truncateAfter(chat.id,u2.id,{include:false});
  const loaded=await store.get(chat.id);
  assert.equal(loaded.messages.at(-1).id,u2.id);
  assert.equal(loaded.messages.length,3);
  assert.equal(loaded.messages[0].id,u1.id);
});
