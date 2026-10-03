import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePersianCommand,commandHints} from '../src/agent/language.js';

test('normalizes Persian and Arabic digits',()=>{assert.equal(normalizePersianCommand('صدا رو روی ۵۰ بزار'),'صدا رو روی 50 بزار');});
test('normalizes common colloquial Windows commands',()=>{assert.match(normalizePersianCommand('سیستم رو خاموش کن'),/کامپیوتر را خاموش کن/);assert.match(normalizePersianCommand('آهنگو نگه دار'),/pause/);});
test('detects likely capabilities without executing anything',()=>{assert.ok(commandHints('یه سرچ بزن گربه').includes('web/search tools'));assert.ok(commandHints('نور رو کم کن').includes('display brightness'));assert.ok(commandHints('کرومو باز کن').includes('application/window tools'));});
test('normalizer preserves ordinary conversation',()=>{assert.equal(normalizePersianCommand('سلام امروز چطوری؟'),'سلام امروز چطوری؟');});
