import test from 'node:test';
import assert from 'node:assert/strict';
import { compactToolSelection,expandToolSelection } from '../src/agent/ToolSelectionPolicy.js';

test('complex tasks expose a compact focused tool surface',()=>{
  const names=Array.from({length:70},(_,i)=>'tool_'+i).concat(['global_find_files','excel_collect_images','messenger_open','inspect_ui','vision_inspect_screen','copy_files_to_clipboard','search_action_book','search_learned_skills']);
  const out=compactToolSelection('اکسل فروش رو پیدا کن عکس‌هاشو تو تلگرام بفرست',names,{modes:['spreadsheet','social'],action:true,multiStep:true,max:22});
  assert.ok(out.length<=22);
  for(const n of ['search_action_book','search_learned_skills','resolve_resource'])assert.ok(out.includes(n),n);
  assert.ok(out.includes('global_find_files'));
  assert.ok(out.includes('messenger_open'));
});

test('action-book output can expand the planner surface on demand',()=>{
  const out=expandToolSelection(['search_action_book'],{data:{items:[{steps:['global_find_files|open_named_file','inspect_ui','invoke_ui_element']}]}});
  for(const n of ['global_find_files','open_named_file','inspect_ui','invoke_ui_element'])assert.ok(out.includes(n),n);
});
