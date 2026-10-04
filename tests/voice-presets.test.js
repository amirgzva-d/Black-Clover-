import test from 'node:test';
import assert from 'node:assert/strict';
import { MARIA_VOICE_PRESETS } from '../src/renderer/voicePresets.js';

test('Maria voice presets stay in safe speaking ranges',()=>{
  assert.deepEqual(Object.keys(MARIA_VOICE_PRESETS),['playful','caring','cool','energetic','natural']);
  for(const preset of Object.values(MARIA_VOICE_PRESETS)){
    assert.ok(preset.rate>=.75&&preset.rate<=1.3);
    assert.ok(preset.pitch>=.75&&preset.pitch<=1.3);
    assert.ok(preset.volume>=0&&preset.volume<=1);
  }
});
