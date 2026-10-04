import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('voice settings module loads after the main renderer',()=>{
  assert.ok(html.indexOf('/src/renderer/main.js')<html.indexOf('/src/renderer/voiceSettings.js'));
});
