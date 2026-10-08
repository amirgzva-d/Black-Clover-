import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');

test('ChatGPT account selector uses official multiple profiles without exposing tokens',async()=>{
  const [service,main,preload,ui]=await Promise.all([
    read('src/main/ChatGPTPlanService.js'),read('src/main/main.js'),read('src/main/preload.cjs'),read('src/renderer/chatSurfaceV2.js')]);
  assert.match(service,/async selectProfile\(profileId\)/);
  assert.match(service,/this\.ensure\(\)\.selectProfile\(profileId\)/);
  assert.match(service,/email:s\.identity\.email/);
  assert.match(main,/'chatgpt:select-profile'/);
  assert.match(preload,/selectChatGPTProfile:/);
  assert.match(ui,/newProfile:true/);
  assert.match(ui,/accountPicker/);
  assert.match(ui,/selectChatGPTProfile\(id\)/);
  assert.doesNotMatch(preload,/accessToken|refreshToken|idToken/);
});
test('Chat operations have explicit inline dialogs instead of native prompt/confirm',async()=>{
  const ui=await read('src/renderer/chatSurfaceV2.js');
  assert.match(ui,/showDialog\(\{title:'تغییر نام گفتگو'/);
  assert.match(ui,/showDialog\(\{title:'حذف گفتگو'/);
  assert.match(ui,/danger:true/);
  assert.match(ui,/dialog.*?modal/);
  assert.doesNotMatch(ui,/(?<!\.)\b(?:confirm|prompt)\(/);
});
test('Project dialog saves instructions and invalidates active conversation sessions',async()=>{
  const [ui,main,preload]=await Promise.all([read('src/renderer/chatSurfaceV2.js'),read('src/main/main.js'),read('src/main/preload.cjs')]);
  assert.match(ui,/editProjectDialog\(f\)/);
  assert.match(ui,/updateChatFolder\(id,changes\)/);
  assert.match(main,/'chats:folder-update'/);
  assert.match(main,/projectInstructions=.*?folder\.instructions/);
  assert.match(preload,/updateChatFolder:/);
});
test('Real ChatStore saves project instructions and preserves conversations on folder deletion',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-project-store-'));
  process.env.BLACK_CLOVER_DATA_DIR=dir;
  try{
    const {ChatStore}=await import('../src/agent/ChatStore.js');
    const chat=new ChatStore();
    const f=await chat.createFolder('تست پروژه');
    await chat.updateFolder(f.id,{instructions:'پاسخ دقیق بده',name:'پروژه حرفه‌ای'});
    let stored=(await chat.folders()).find(x=>x.id===f.id);
    assert.equal(stored.instructions,'پاسخ دقیق بده');
    assert.equal(stored.name,'پروژه حرفه‌ای');
    const c=await chat.create({folderId:f.id});
    await chat.appendMessage(c.id,{role:'user',text:'سلام'});
    assert.equal((await chat.get(c.id)).messages.length,1);
    await chat.removeFolder(f.id);
    assert.equal((await chat.get(c.id)).folderId,null);
    assert.equal((await chat.get(c.id)).messages[0].text,'سلام');
  }finally{
    delete process.env.BLACK_CLOVER_DATA_DIR;
    await fs.rm(dir,{recursive:true,force:true});
  }
});
