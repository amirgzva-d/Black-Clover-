import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { actionIntent } from '../src/agent/ActionIntent.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';
import { tools } from '../src/agent/toolRegistry.js';

const permissionSource=fs.readFileSync(new URL('../src/agent/PermissionPolicy.js',import.meta.url),'utf8');

test('colloquial max volume and brightness wording resolves without exact percentages',()=>{
  assert.deepEqual(matchFastCommand('صدا رو ببر انتهاش'),{name:'set_volume',args:{percent:100},reply:'صدا رو تا آخر بردم بالا، رئیس.'});
  assert.equal(matchFastCommand('نور رو تا نهایت زیاد کن')?.name,'set_brightness');
  assert.equal(matchFastCommand('نور رو تا نهایت زیاد کن')?.args?.percent,100);
});

test('colloquial application launch wording is accepted',()=>{
  const r=matchFastCommand('فتوشاپ رو بنداز بالا');
  assert.equal(r?.name,'launch_app');
  assert.equal(r?.args?.name,'Adobe Photoshop');
});

test('multi-step Excel to Telegram request exposes bridge tools instead of requiring a fixed phrase',()=>{
  const text='اکسل فروش رو پیدا کن، عکس های لینک شده رو بردار و بعد برای علی تو تلگرام بفرست';
  assert.equal(actionIntent(text).multiStep,true);
  const names=selectToolNames(text,[]);
  for(const name of ['excel_collect_images','copy_files_to_clipboard','global_find_files','messenger_open','inspect_ui','search_learned_skills','launch_any_app'])assert.ok(names.includes(name),name);
});

test('desktop personalization actions are directly routable',()=>{
  assert.ok(selectToolNames('پس زمینه دسکتاپ رو با این عکس عوض کن',[]).includes('set_wallpaper'));
  assert.ok(selectToolNames('دسکتاپم رو مرتب کن',[]).includes('organize_desktop'));
});

test('universal installed-app discovery and desktop management tools are registered',()=>{
  for(const name of ['find_any_app','launch_any_app','set_wallpaper','organize_desktop'])assert.ok(tools[name],name);
});

test('autonomous policy still confirms install, deletion and persistent spreadsheet writes',()=>{
  for(const name of ['install_app','excel_set_cells','excel_append_rows','excel_add_image'])assert.match(permissionSource,new RegExp(`['\"]${name}['\"]`));
  assert.match(permissionSource,/CTRL\+S/);
  assert.match(permissionSource,/photoshop\|illustrator\|excel/i);
  assert.match(permissionSource,/shutdown_pc/);
});
