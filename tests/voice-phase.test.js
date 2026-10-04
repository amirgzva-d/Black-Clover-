import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const speech=fs.readFileSync(new URL('../src/main/SpeechService.js',import.meta.url),'utf8');
const voice=fs.readFileSync(new URL('../src/renderer/voice.js',import.meta.url),'utf8');
const presence=fs.readFileSync(new URL('../src/main/SystemPresence.js',import.meta.url),'utf8');
const cue=fs.readFileSync(new URL('../src/renderer/notificationSound.js',import.meta.url),'utf8');

test('voice phase prefers a natural Persian female voice with offline fallback',()=>{
  assert.match(speech,/fa-IR-DilaraNeural/);
  assert.match(speech,/edge_tts/);
  assert.match(speech,/synthesizePiper/);
  assert.match(speech,/ttsAvailable/);
});

test('all synthesized speech keeps avatar mouth pulse events',()=>{
  assert.match(voice,/blackclover:voice-boundary/);
  assert.match(voice,/emitBoundary/);
  assert.match(voice,/startAudioMeter/);
});

test('wellbeing and idle companion timing match the requested phase',()=>{
  assert.match(presence,/45\*60\*1000/);
  assert.match(presence,/15\*60/);
  assert.match(presence,/idle-companion/);
  assert.match(presence,/wellbeing-break/);
  assert.match(presence,/nonBlocking:true/);
});

test('user-provided notification cue is embedded for reminder-style speech',()=>{
  assert.match(cue,/data:audio\/mpeg;base64,/);
  assert.match(voice,/shouldPlayMariaCue/);
  assert.match(voice,/playCue/);
});
