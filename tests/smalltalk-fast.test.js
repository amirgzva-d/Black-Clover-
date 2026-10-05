import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSmallTalk } from '../src/agent/SmallTalkRouter.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';

test('common Persian small talk has instant natural local replies',()=>{
  for(const text of ['سلام','سلام ماریا','حالت چطوره ماریا','مرسی','شب بخیر','تو کی هستی'])assert.ok(matchSmallTalk(text),text);
});

test('project context becomes a file-search path hint',()=>{
  const r=matchFastCommand('فایل package.json پروژه Black-Clover-Live رو پیدا کن');
  assert.equal(r.name,'global_find_files');
  assert.equal(r.args.path_hint,'Black-Clover-Live');
});
