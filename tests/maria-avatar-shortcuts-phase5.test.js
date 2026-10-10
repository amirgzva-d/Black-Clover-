import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AvatarVisibilityPreferences } from '../src/main/AvatarVisibilityPreferences.js';
import { resolveShortcutTarget } from '../src/agent/ShortcutTargetResolver.js';

const read=rel=>fs.readFile(new URL('../'+rel,import.meta.url),'utf8');

test('large floating avatar is hidden by default and can be toggled persistently',async()=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'maria-avatar-pref-'));
  try{
    const file=path.join(folder,'avatar-visibility.json'),state=new AvatarVisibilityPreferences(file);
    assert.equal(state.load(),false);
    assert.equal(state.save(true),true);
    assert.equal(new AvatarVisibilityPreferences(file).load(),true);
    assert.equal(state.save(false),false);
    assert.equal(new AvatarVisibilityPreferences(file).load(),false);
    await fs.writeFile(file,'not json');
    assert.equal(state.load(),false);
  }finally{await fs.rm(folder,{recursive:true,force:true});}
});
test('Electron only shows full-body avatar when enabled, never automatically with chat',async()=>{
  const [main,preload,ui]=await Promise.all([
    read('src/main/main.js'),read('src/main/preload.cjs'),read('src/renderer/topIslandV4.js')
  ]);
  assert.match(main,/avatarVisiblePreference=avatarVisibilityPrefs\(\)\.load\(\)/);
  assert.match(main,/if\(avatarVisiblePreference\)createAvatarWindow\(\)/);
  assert.match(main,/function createAvatarWindow\(\)[^\n]*show:false/);
  assert.match(main,/function showChat\(\{focus=true\}=\{\}\)\{const w=/);
  assert.match(main,/function hideChat\(\)\{hideAnimated\(chatWin\);\}/);
  assert.match(main,/assistant:set-avatar-visibility/);
  assert.match(preload,/setAvatarVisibility:enabled/);
  assert.match(preload,/avatarVisibility:\(\)=>ipcRenderer/);
  assert.match(ui,/data-setting-avatar/);
  assert.match(ui,/await window\.blackClover\.setAvatarVisibility/);
});
test('mini gaze reacts to pointer but opening requires a click',async()=>{
  const [controller,ui]=await Promise.all([read('src/renderer/islandHoverController.js'),read('src/renderer/topIslandV4.js')]);
  assert.doesNotMatch(controller,/this\.setMode\('preview'\)[\s\S]*?this\.scheduleCollapse\(\);\s*}\s*},this\.openDelay\)/);
  assert.match(controller,/clickCharacter\(\)/);
  assert.match(ui,/\[data-character\]'\)\.onclick/);
  assert.match(ui,/--head-x/);
  assert.match(ui,/onIslandWindowBlur/);
  assert.match(ui,/hoverController\?\.collapseNow\(\)/);
});
test('shortcuts use original paths, show type, name and extension before saving',async()=>{
  const [ui,editor,preload]=await Promise.all([
    read('src/renderer/topIslandV4.js'),read('src/renderer/shortcutEditorV4.js'),read('src/main/preload.cjs')
  ]);
  assert.doesNotMatch(ui,/v4-shortcut-drop-hint/,'Native drag/drop needs no extra bulky drop box');
  assert.match(ui,/root\.addEventListener\('drop'/);
  assert.match(ui,/return openShortcutQuickMenu\(\)/);
  assert.match(ui,/await quickAddShortcut\(chosen\)/);
  assert.match(ui,/getDroppedFilePath\(file\)/);
  assert.match(editor,/data-shortcut-meta/);
  assert.match(editor,/فرمت:/);
  assert.match(editor,/pickShortcutTarget\(kind\)/);
  assert.match(preload,/webUtils\.getPathForFile/);
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'maria-shortcut-proof-'));
  try{
    const source=path.join(folder,'گزارش.xlsx');
    await fs.writeFile(source,'untouched');
    const data=await resolveShortcutTarget(source);
    assert.equal(data.kind,'file');assert.equal(data.target,source);
    assert.equal(await fs.readFile(source,'utf8'),'untouched');
  }finally{await fs.rm(folder,{recursive:true,force:true});}
});
