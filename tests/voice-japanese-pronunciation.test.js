import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const settings=fs.readFileSync(new URL('../src/renderer/voiceSettings.js',import.meta.url),'utf8');
test('Japanese interjections keep anime wording while Persian TTS gets phonetic forms',()=>{
  for(const token of ['あらあら','やれやれ','ばか','なんで','どこ','آرا آرا','یاره یاره','باکا','نانده','دوکو'])assert.ok(settings.includes(token),token);
});
