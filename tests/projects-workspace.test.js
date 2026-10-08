import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root=path.resolve('.');
test('Projects workspace, model picker and IPC contracts are wired',async()=>{
  const [ui,chat,preload,main,service,brain]=await Promise.all([
    fs.readFile(path.join(root,'src/renderer/luxuryUI.js'),'utf8'),
    fs.readFile(path.join(root,'src/renderer/chatSurfaceV2.js'),'utf8'),
    fs.readFile(path.join(root,'src/main/preload.cjs'),'utf8'),
    fs.readFile(path.join(root,'src/main/main.js'),'utf8'),
    fs.readFile(path.join(root,'src/agent/ProjectService.js'),'utf8'),
    fs.readFile(path.join(root,'src/agent/BrainRouter.js'),'utf8')
  ]);
  assert.match(ui,/surface==='projects'/);assert.match(ui,/project-model/);assert.match(ui,/openProjectVsCode/);assert.match(ui,/publishProjectGithub/);
  assert.match(chat,/const CHATGPT_AUTO='chatgpt:auto'/);assert.match(chat,/id="modelSelect"/);assert.match(chat,/chatgptStatus\(\)/);assert.match(chat,/conversationId:current/);assert.doesNotMatch(chat,/MODEL_ID='ollama:qwen2\.5:3b'/);assert.doesNotMatch(ui,/chat-model-select/);
  assert.match(preload,/projects:list/);assert.match(preload,/projects:chat/);assert.match(preload,/projects:git-status/);assert.match(preload,/projects:publish-github/);
  assert.match(main,/createProjectsWindow/);assert.match(main,/projects:publish-github/);assert.match(service,/openVsCode/);assert.match(service,/publishGithub/);
  assert.match(brain,/async catalog\(\)/);assert.match(brain,/modelOverride/);
});

test('ProjectStore keeps independent project history',async()=>{
  const old=process.env.BLACK_CLOVER_DATA_DIR,tmp=await fs.mkdtemp(path.join(os.tmpdir(),'maria-projects-'));process.env.BLACK_CLOVER_DATA_DIR=tmp;
  try{const {ProjectStore}=await import(`../src/agent/ProjectStore.js?test=${Date.now()}`),store=new ProjectStore(),p=await store.create({name:'Test Site',type:'website',model:'auto'});await store.appendMessage(p.id,{role:'user',content:'یک سایت بساز'});await store.appendMessage(p.id,{role:'assistant',content:'باشه'});const item=await store.get(p.id);assert.equal(item.name,'Test Site');assert.equal(item.messages.length,2);assert.equal(item.messages[0].content,'یک سایت بساز');await store.remove(p.id);assert.equal((await store.list()).length,0);}finally{if(old===undefined)delete process.env.BLACK_CLOVER_DATA_DIR;else process.env.BLACK_CLOVER_DATA_DIR=old;await fs.rm(tmp,{recursive:true,force:true});}
});