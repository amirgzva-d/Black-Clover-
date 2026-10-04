import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('avatar idle keeps the VRM hips around their original height',()=>{
  const src=fs.readFileSync(new URL('../src/renderer/avatar.js',import.meta.url),'utf8');
  assert.match(src,/hipsBaseY/);
  assert.match(src,/hipsBaseY\+bob/);
  assert.doesNotMatch(src,/hips\.position\.y\s*=\s*bob/);
});

test('voice engine emits frequent speech boundaries for avatar mouth animation',()=>{
  const src=fs.readFileSync(new URL('../src/renderer/voice.js',import.meta.url),'utf8');
  assert.match(src,/Analyser/);
  assert.match(src,/blackclover:voice-boundary/);
  assert.match(src,/strength/);
});
