import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const js = read('../src/renderer/referenceUI.js');
const css = [read('../src/renderer/referenceUI.css'), read('../src/renderer/referenceUI-chat.css'), read('../src/renderer/referenceUI-model-dock.css'), read('../src/renderer/referenceUI-customizer.css')].join('\n');
const html = read('../index.html');

test('reference chat layer includes the supplied MARIA navigation structure', () => {
  for (const label of ['چت', 'یادآوری‌ها', 'پین‌شده‌ها', 'برنامه‌ریزی روزانه', 'ایده‌های محتوا', 'پروژه وبسایت', 'دستورهای من']) {
    assert.match(js, new RegExp(label));
  }
  assert.match(css, /reference-chat-tabs/);
  assert.match(css, /reference-quick-row/);
});

test('model experience surfaces local and cloud families without pretending unavailable models are ready', () => {
  for (const model of ['qwen2.5:3b', 'llama3.2:3b', 'deepseek-r1:7b', 'llama3.1:8b', 'ChatGPT \/ OpenAI', 'DeepSeek Cloud', 'Claude']) {
    assert.match(js, new RegExp(model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(js, /data-available/);
  assert.match(js, /هنوز روی Ollama نصب نیست/);
});

test('avatar dock and visual customizer are game-like rather than filename-only lists', () => {
  for (const label of ['خانه', 'صدا', 'پین‌شده', 'یادآور', 'ابزارها', 'تنظیمات', 'کاراکتر', 'لباس', 'اکسسوری', 'انیمیشن']) {
    assert.match(js, new RegExp(label));
  }
  assert.match(css, /visual-grid/);
  assert.match(css, /ref-voice-button/);
});

test('index loads reference UI after the legacy luxury layer so it can safely override styling', () => {
  const luxury = html.indexOf('/src/renderer/luxuryUI.js');
  const reference = html.indexOf('/src/renderer/referenceUI.js');
  assert.ok(luxury >= 0 && reference > luxury);
});
