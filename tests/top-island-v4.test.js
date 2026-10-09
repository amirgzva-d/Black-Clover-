import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL(path,import.meta.url),'utf8');

test('Top Island V4 is the only active island renderer',async()=>{
  const [renderer,v4,css,main]=await Promise.all([
    read('../src/renderer/main.js'),
    read('../src/renderer/topIslandV4.js'),
    read('../src/renderer/topIslandV4.css'),
    read('../src/main/main.js')
  ]);
  assert.match(renderer,/topIslandV4\.js/);
  assert.doesNotMatch(renderer,/topIslandV3\.js/);
  assert.doesNotMatch(renderer,/import\('\.\/topIsland\.js'\)/);

  for(const token of [
    "id:'home'",
    "id:'shortcuts'",
    "id:'reports'",
    "id:'pins'",
    "id:'tasks'",
    "autoHideSeconds:60",
    "data-panel-pin",
    "data-panel-sound",
    "data-context-add",
    "data-approval-allow",
    "data-approval-deny",
    "ACCOUNTING WATCH",
    "PIN LIBRARY",
    "TASKS & AUTOMATIONS"
  ]) assert.ok(v4.includes(token),token);

  for(const token of [
    "--v4-bg:#07080d",
    "--v4-violet:#8c7dff",
    "--v4-green:#38d778",
    ".v4-approval",
    ".approval-actions .allow",
    ".approval-actions .deny",
    "backdrop-filter:blur(30px)"
  ]) assert.ok(css.includes(token),token);

  assert.match(main,/width:Math\.min\(420,maxW\),height:56/);
  assert.match(main,/width:Math\.min\(920,maxW\),height:96/);
  assert.match(main,/width:Math\.min\(1120,maxW\),height:Math\.min\(640,maxH\)/);
});

test('legacy Pin and Reminder views are routed into Top Island modules',async()=>{
  const [main,ui]=await Promise.all([
    read('../src/main/main.js'),
    read('../src/renderer/luxuryUI.js')
  ]);
  assert.match(main,/showIslandModule\('pins'\)/);
  assert.match(main,/showIslandModule\('tasks'\)/);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="pins"/);
  assert.doesNotMatch(ui,/<button class="dock-btn[^"]*" data-action="reminders"/);
});
