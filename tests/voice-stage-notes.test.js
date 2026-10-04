import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const notes=fs.readFileSync(new URL('../VOICE_STAGE_NOTES.md',import.meta.url),'utf8');
test('voice stage notes keep the online/offline contract explicit',()=>{
  assert.match(notes,/DilaraNeural/);
  assert.match(notes,/Piper/);
  assert.match(notes,/non-blocking/);
});
