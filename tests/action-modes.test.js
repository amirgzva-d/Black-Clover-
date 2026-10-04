import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { actionIntent, actionModeDetails, ACTION_MODES } from '../src/agent/ActionIntent.js';
import { capabilityHints } from '../src/agent/capabilities.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';
import { PermissionPolicy } from '../src/agent/PermissionPolicy.js';

test('action mode catalog has titled executable domains',()=>{
  assert.ok(ACTION_MODES.length>=15);
  for(const mode of ACTION_MODES){assert.ok(mode.id);assert.ok(mode.title);assert.ok(mode.description);}
});

test('colloquial multi-step desktop work is classified semantically',()=>{
  const text='اکسل فروش رو باز کن عکس هاش رو بردار و بعد تو تلگرام برای علی بفرست';
  const intent=actionIntent(text),details=actionModeDetails(text).map(x=>x.id);
  assert.equal(intent.action,true);
  assert.equal(intent.multiStep,true);
  assert.ok(details.includes('spreadsheet'));
  assert.ok(details.includes('social'));
  assert.ok(details.includes('files'));
});

test('execution modes are surfaced to the brain routing hints',()=>{
  const hints=capabilityHints('فتوشاپ رو بیار بالا این عکس رو باز کن و ادیتش کن');
  assert.ok(hints.includes('execution'));
  assert.ok(hints.includes('mode-creative'));
  assert.ok(hints.includes('mode-apps'));
  assert.ok(hints.some(x=>x.startsWith('mode-info-creative:')));
});

test('multi-app workflow exposes bridge, Excel, messaging and UI tools',()=>{
  const tools=selectToolNames('اکسل گزارش رو باز کن عکس های داخلش رو بردار و بعد با تلگرام بفرست');
  for(const name of ['excel_collect_images','messenger_stage_files','vision_inspect_screen','invoke_ui_element','global_find_files'])assert.ok(tools.includes(name),name);
});

test('software management can fall back to web and GUI execution',()=>{
  const tools=selectToolNames('این برنامه رو آپدیت کن اگر نشد نسخه جدیدش رو از اینترنت پیدا کن');
  for(const name of ['list_winget_upgrades','upgrade_app','web_search','vision_inspect_screen','invoke_ui_element'])assert.ok(tools.includes(name),name);
});

test('diagnostics can inspect Windows, research errors and operate the app UI',()=>{
  const tools=selectToolNames('این برنامه مشکل داره بررسی کن خطاش کجاست و درستش کن');
  for(const name of ['recent_system_errors','list_processes','web_search','vision_inspect_screen','invoke_ui_element'])assert.ok(tools.includes(name),name);
});

test('Windows settings and update requests can continue through visible UI',()=>{
  const tools=selectToolNames('برو Windows Update و آپدیت سیستم رو بررسی کن');
  for(const name of ['check_windows_update','vision_inspect_screen','invoke_ui_element'])assert.ok(tools.includes(name),name);
});

test('named local media can use the direct fast path',()=>{
  const video=matchFastCommand('فیلم ماتریکس رو پخش کن');
  assert.equal(video.name,'open_named_file');
  assert.equal(video.args.name,'ماتریکس');
  assert.ok(video.args.extensions.includes('mkv'));
  const music=matchFastCommand('آهنگ بارون رو پخش کن');
  assert.equal(music.name,'open_named_file');
  assert.ok(music.args.extensions.includes('mp3'));
});

test('more colloquial max/min controls do not need percentages',()=>{
  assert.equal(matchFastCommand('صدا رو بده بالا تا سقف').args.percent,100);
  assert.equal(matchFastCommand('صدا رو صدش کن').args.percent,100);
  assert.equal(matchFastCommand('نور رو ببر تا کف').args.percent,0);
});

test('autonomous profile documents persistent-save confirmations',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-mode-policy-'));
  try{
    const policy=new PermissionPolicy({directory:dir});
    const status=await policy.status();
    assert.equal(status.profile,'autonomous');
    assert.ok(status.alwaysConfirm.includes('install_app'));
    assert.ok(status.alwaysConfirm.some(x=>/Save\/Save As/.test(x)));
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
