import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');

test('MARIA Dev Session is a dedicated Remote coding monitor surface',async()=>{
  const [main,preload,bootstrap,ui,css]=await Promise.all([read('src/main/main.js'),read('src/main/preload.cjs'),read('src/renderer/main.js'),read('src/renderer/devSession.js'),read('src/renderer/devSession.css')]);
  for(const token of ['createDevWindow','showDevSession','dev:status','dev:run-check','BLACK_CLOVER_REMOTE_DEV'])assert.ok(main.includes(token),token);
  for(const token of ['showDevSession','devStatus','runDevCheck','openDevVsCode'])assert.ok(preload.includes(token),token);
  assert.match(bootstrap,/surface==='dev'/);
  for(const token of ['MARIA Dev Session','Inspect','Edit','Test','Verify','Sync','data-approval','Deny','Allow'])assert.ok(ui.includes(token),token);
  for(const token of ['.terminal-output','.approval-buttons .allow','.approval-buttons .deny','.dev-character'])assert.ok(css.includes(token),token);
});

test('avatar lighting is adaptive and local to the Three VRM renderer',async()=>{
  const [avatar,lighting]=await Promise.all([read('src/renderer/avatar.js'),read('src/renderer/avatarLighting.js')]);
  assert.match(avatar,/createAvatarLighting/);
  assert.match(avatar,/blackclover:lighting/);
  for(const token of ['HemisphereLight','DirectionalLight','normalMap','setEmotion','setMode','updateClock'])assert.ok(lighting.includes(token),token);
});