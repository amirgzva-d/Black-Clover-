import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {BrainRouter} from '../src/agent/BrainRouter.js';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');

test('Maria Auto default and explicit model selections use the authoritative route helper',async()=>{const ui=await read('src/renderer/chatSurfaceV2.js');const {routeChosenChatModel}=await import('../src/renderer/chatProviderSelection.js');assert.match(ui,/const CHATGPT_AUTO='auto'/);assert.match(ui,/state.configuredProviders.map/);assert.match(ui,/routeChosenChatModel\(state.model\)/);assert.match(ui,/conversationId:current,\.\.\.selected/);assert.deepEqual({...routeChosenChatModel('auto')}.provider,'auto');assert.equal(routeChosenChatModel('chatgpt:auto').provider,'chatgpt');assert.equal(routeChosenChatModel('online:gemini').provider,'gemini');});

test('voice controls map to actual persisted voice settings and speech preview',async()=>{
  const s=await read('src/renderer/chatSurfaceV2.js');
  for(const token of ['voice.setEnabled(e.target.checked)','voice.configure({rate:Number(e.target.value)})','voice.configure({pitch:Number(e.target.value)})',"voice.speak('سلام! من ماریا هستم","voice.stop('user-stop')"])assert.ok(s.includes(token),token);
});

test('private tool results never leave the host automatically',async()=>{
  const s=await read('src/agent/Agent.js');
  assert.match(s,/allowOnline=!turn\.private/);
  assert.doesNotMatch(s,/allowOnline=!turn\.private\|\|explicitCloud/);
});

test('explicit ChatGPT request never routes to a configured alternative provider',async()=>{
  let otherCalled=false;
  const local={model:'local',hasModel:async()=>true,models:async()=>['local'],chat:async()=>{throw Error('local fallback forbidden')}};
  const router=new BrainRouter({local,chatLocal:local,legacyLocal:local,researchLocal:local,codingLocal:local,chatgptPlan:{available:async()=>false},online:{configured:true,chat:async()=>{otherCalled=true;return {message:{role:'assistant',content:'wrong'}};}}});
  router.network=async()=>true;
  await assert.rejects(router.chat([{role:'user',content:'سلام'}],[],{modelOverride:'chatgpt:auto',provider:'chatgpt'}),/ChatGPT/);
  assert.equal(otherCalled,false);
});
