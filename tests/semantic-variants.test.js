import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeCommand,SEMANTIC_VARIANT_RULE_COUNT } from '../src/agent/SemanticCanonicalizer.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';

test('shared semantic canonicalizer covers colloquial Persian phrasing families',()=>{
  assert.ok(SEMANTIC_VARIANT_RULE_COUNT>=20);
  assert.match(canonicalizeCommand('کرومو بنداز بالا'),/باز کن/);
  assert.match(canonicalizeCommand('این پنجره رو جمع کن'),/کمینه/);
  assert.match(canonicalizeCommand('تو کروم بگرد دنبال OpenAI'),/سرچ/);
});

test('colloquial app file web and control variants resolve to executable fast actions',()=>{
  const cases=[
    ['کرومو بنداز بالا','launch_any_app'],['تلگرامو بیار بالا','launch_any_app'],['یه نوت پد راه بنداز','launch_any_app'],
    ['فایل package.json رو بازش کن','open_named_file'],['این پنجره رو جمع کن','minimize_foreground_window'],
    ['یه کم صدا رو بکش بالا','volume_up'],['تو کروم بگرد دنبال openai','chrome_search'],['سطل زباله رو تمیز کن','empty_recycle_bin']
  ];
  for(const [text,name] of cases)assert.equal(matchFastCommand(text)?.name,name,text);
});

test('semantic routing stays broad when wording is not an exact fast command',()=>{
  const files=selectToolNames('اون فایل قرارداد رو یه جوری گیر بیار و بیارش بالا');
  assert.ok(files.includes('global_find_files')||files.includes('open_named_file'));
  const social=selectToolNames('تلگرامو بیار بالا بعد آخرین عکس رو بردار بفرست روبیکا');
  for(const name of ['messenger_stage_files','vision_inspect_screen','global_find_files'])assert.ok(social.includes(name),name);
});
