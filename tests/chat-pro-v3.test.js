import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=relative=>fs.readFile(new URL('../'+relative,import.meta.url),'utf8');

test('professional chat surface exposes ChatGPT-like conversation controls',async()=>{
  const [chat,preload,main,css]=await Promise.all([
    read('src/renderer/chatSurfaceV2.js'),
    read('src/main/preload.cjs'),
    read('src/main/main.js'),
    read('src/renderer/chatSurfaceV2.css')
  ]);
  for(const token of ['newChat','chatSearch','folderList','modelSelect','depthSelect','webToggle','pinChat','shareChat','exportChat'])assert.ok(chat.includes(token),token);
  for(const action of ["data-msg-action=\"copy\"","data-msg-action=\"speak\"","data-msg-action=\"branch\"","data-msg-action=\"edit\"","data-msg-action=\"delete\"","data-msg-action=\"retry\""])assert.ok(chat.includes(action),action);
  for(const token of ['listChats','getChat','createChat','updateChat','removeChat','branchChat','createChatFolder','renameChatFolder','removeChatFolder','copyChat','exportChat','cancelChat'])assert.ok(preload.includes(token),token);
  for(const channel of ["'chats:list'","'chats:get'","'chats:create'","'chats:update'","'chats:remove'","'chats:branch'","'agent:replay'","'agent:cancel'"])assert.ok(main.includes(channel),channel);
  assert.match(chat,/DOMPurify\.sanitize/);
  assert.match(chat,/marked\.parse/);
  assert.match(chat,/source-chip/);
  assert.match(chat,/openExternal/);
  assert.match(chat,/voice\.speak\(message\.text\)/);
  assert.match(chat,/window\.blackClover\.cancelChat/);
  assert.match(chat,/model:'auto'/);
  assert.doesNotMatch(chat,/MODEL_ID='ollama:qwen2\.5:3b'/);
  assert.match(css,/\.sidebar/);
  assert.match(css,/\.message-sources/);
  assert.match(css,/\.composer/);
});

test('official ChatGPT connection stays in main process and exposes safe account actions only',async()=>{
  const [service,main,preload,pkg]=await Promise.all([
    read('src/main/ChatGPTPlanService.js'),
    read('src/main/main.js'),
    read('src/main/preload.cjs'),
    read('package.json')
  ]);
  assert.match(service,/createChatGPT/);
  assert.match(service,/safeStorage/);
  assert.match(service,/auth\.openai\.com/);
  assert.match(service,/streamResponse/);
  assert.match(service,/storageDir:path\.join\(app\.getPath\('userData'\),'chatgpt'\)/);
  assert.doesNotMatch(preload,/accessToken|refreshToken|credentialsForRequest/);
  for(const channel of ["'chatgpt:status'","'chatgpt:sign-in'","'chatgpt:disconnect'","'chatgpt:usage'"])assert.ok(main.includes(channel),channel);
  for(const token of ['signInChatGPT','disconnectChatGPT','openChatGPTUsage','chatgptStatus'])assert.ok(preload.includes(token),token);
  assert.match(pkg,/"@siwc\/local"\s*:\s*"file:vendor\/siwc-local"/);
});

test('conversation context can be restored and compressed for long-running chats',async()=>{
  const agent=await read('src/agent/Agent.js');
  assert.match(agent,/loadConversation\(messages=\[\]\)/);
  assert.match(agent,/OLDER CONVERSATION CONTEXT/);
  assert.match(agent,/compact\?eligible\.slice\(-3\):eligible\.slice\(-6\)/);
  assert.match(agent,/MAX_TURNS=48/);
});

test('web research UI is wired from request through persisted sources',async()=>{
  const [chat,main,agent,grounded]=await Promise.all([
    read('src/renderer/chatSurfaceV2.js'),
    read('src/main/main.js'),
    read('src/agent/Agent.js'),
    read('src/agent/GroundedKnowledge.js')
  ]);
  assert.match(chat,/webSearch:state\.web/);
  assert.match(agent,/Boolean\(effectiveChatOptions\.webSearch\)/);
  assert.match(main,/sources:response\.sources\|\|\[\]/);
  assert.match(chat,/message\?\.meta\?\.sources/);
  assert.match(grounded,/research_topic/);
});
