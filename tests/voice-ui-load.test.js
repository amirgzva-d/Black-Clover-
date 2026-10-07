import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/renderer/main.js',import.meta.url),'utf8');

test('voice and luxury UI load after the active surface',()=>{
  assert.match(html,/src\/renderer\/main\.js/);
  assert.doesNotMatch(html,/voiceSettings\.js/);
  assert.doesNotMatch(html,/luxuryUI\.js/);
  assert.match(main,/afterSurface/);
  assert.match(main,/import\('\.\/voiceSettings\.js'\)/);
  assert.match(main,/then\(\(\)=>import\('\.\/luxuryUI\.js'\)\)/);
});
