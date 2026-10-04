import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const settings=fs.readFileSync(new URL('../src/renderer/voiceSettings.js',import.meta.url),'utf8');
const presets=fs.readFileSync(new URL('../src/renderer/voicePresets.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main/main.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('voice personality panel exposes requested moods and natural voice install',()=>{
  for(const label of ['بازیگوش و انیمه‌ای','آرام و همدل','خنک و جدی','پرانرژی','طبیعی و متعادل'])assert.match(presets,new RegExp(label));
  assert.match(settings,/natural_tts/);
  assert.match(settings,/fa-IR-DilaraNeural/);
  assert.match(index,/voiceSettings\.js/);
});

test('Japanese flavor is displayed as Japanese but pronounced cleanly by Persian TTS',()=>{
  for(const phrase of ['あらあら','やれやれ','ばか','なんで','どこ'])assert.match(settings,new RegExp(phrase));
  assert.match(settings,/pronounceJapanese/);
});

test('pitch setting reaches the speech service IPC',()=>{
  assert.match(main,/pitch:payload\?\.pitch/);
});
