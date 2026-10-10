import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=rel=>fs.readFile(new URL('../'+rel,import.meta.url),'utf8');

test('MARIA shell uses one shared design system and runtime state bus',async()=>{
  const [bootstrap,runtime,design]=await Promise.all([
    read('src/renderer/main.js'),
    read('src/renderer/shellRuntime.js'),
    read('src/renderer/shellDesign.css')
  ]);
  assert.match(bootstrap,/shellRuntime\.js/);
  for(const mode of ['online','working','listening','executing','offline','error'])assert.match(runtime,new RegExp(mode));
  for(const token of ['--m-panel','--m-text','--m-accent','--m-green','--m-red','--m-ease'])assert.ok(design.includes(token),token);
  assert.match(design,/mariaSurfaceIn/);
  assert.match(design,/mariaSurfaceOut/);
});

test('primary avatar dock keeps character tools while pins and reminders use Top Island V4',async()=>{
  const [ui,island,bootstrap]=await Promise.all([read('src/renderer/luxuryUI.js'),read('src/renderer/topIslandV4.js'),read('src/renderer/main.js')]);
  for(const action of ['chat','avatar','projects','voice','settings'])assert.ok(ui.includes(`data-action=\\"${action}\\"`)||ui.includes(`data-action="${action}"`),action);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="pins"/);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="reminders"/);
  for(const token of ["id:'home'","id:'pins'","id:'tasks'",'میان‌برها','گزارش ثبت','PIN LIBRARY','TASKS & AUTOMATIONS','ACCOUNTING WATCH'])assert.ok(island.includes(token),token);
  assert.match(bootstrap,/topIslandV4\.js/);
  assert.doesNotMatch(bootstrap,/topIslandV3\.js/);
  assert.match(ui,/a==='wardrobe'\|\|a==='avatar'/);
  assert.match(ui,/openSettings\?\.\('voice'\)/);
  assert.match(ui,/openSettings\?\.\('general'\)/);
});

test('window shell exposes active surfaces, state IPC and animated open close',async()=>{
  const [main,preload]=await Promise.all([read('src/main/main.js'),read('src/main/preload.cjs')]);
  for(const key of ['pinsVisible','remindersVisible','projectsVisible','motionsVisible','wardrobeVisible'])assert.match(main,new RegExp(key));
  assert.match(main,/assistant:set-ui-state/);
  assert.match(main,/assistant:surface-opening/);
  assert.match(main,/assistant:surface-closing/);
  assert.match(preload,/setUiState/);
  assert.match(preload,/onSurfaceOpening/);
  assert.match(preload,/onSurfaceClosing/);
});

test('voice listening state is published to the global shell',async()=>{
  const chat=await read('src/renderer/chatSurfaceV2.js');
  assert.match(chat,/setUiState\?\.\('listening'/);
  assert.match(chat,/setUiState\?\.\('online'/);
  assert.match(chat,/payload\?\.section==='voice'/);
});
