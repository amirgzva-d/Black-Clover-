import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=f=>fs.readFile(new URL('../'+f,import.meta.url),'utf8');

test('Pending OpenAI OAuth is displayed distinctly from disconnected',async()=>{
  const ui=await read('src/renderer/chatSurfaceV2.js');
  assert.match(ui,/s\.status==='connecting'/);
  assert.match(ui,/ChatGPT · در حال اتصال/);
  assert.match(ui,/ورود در مرورگر هنوز کامل نشده است/);
  assert.match(ui,/cancelChatGPTSignIn/);
  assert.match(ui,/cancelChatGPTSignIn\(\)/);
});
test('Check status does not falsely report success for unapproved scope',async()=>{
  const ui=await read('src/renderer/chatSurfaceV2.js');
  assert.match(ui,/s\.status==='connected'&&s\.sharing===true&&!s\.error/);
  assert.match(ui,/s\.status==='connected'\?'حساب شناسایی شد؛ مجوز استفاده از ChatGPT هنوز فعال نیست/);
  assert.match(ui,/testChatGPTConnection/);
  assert.match(ui,/async function checkAccountStatus/);
});
test('Usage-sharing response smoke test stays in trusted Electron process',async()=>{
  const [main,preload]=await Promise.all([read('src/main/main.js'),read('src/main/preload.cjs')]);
  assert.match(main,/'chatgpt:test-response'/);
  assert.match(main,/chatgptPlan\.available\(\)/);
  assert.match(preload,/testChatGPTConnection/);
  assert.doesNotMatch(preload,/accessToken|refreshToken|idToken/);
});
test('ChatGPT preserved and optional providers configurable',async()=>{const ui=await read('src/renderer/chatSurfaceV2.js');assert.match(ui,/const CHATGPT_AUTO='chatgpt:auto'/);assert.match(ui,/PROVIDERS=/);assert.match(ui,/saveBrainProvider/);assert.match(ui,/removeBrainProvider/);assert.match(ui,/testBrainProvider/);});
