import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePersianCommand,commandHints,looksLikeComputerAction} from '../src/agent/language.js';

test('normalizes Persian and Arabic digits',()=>{assert.equal(normalizePersianCommand('صدا رو روی ۵۰ بزار'),'صدا رو روی 50 بزار');});
test('normalizes colloquial power and media commands',()=>{assert.match(normalizePersianCommand('سیستم رو خاموش کن'),/کامپیوتر را خاموش کن/);assert.match(normalizePersianCommand('آهنگو نگه دار'),/pause/);assert.match(normalizePersianCommand('ببرش رو اسلیپ'),/حالت خواب/);});
test('understands colloquial app names',()=>{assert.match(normalizePersianCommand('کرومو باز کن'),/Chrome/);assert.match(normalizePersianCommand('تلگرامو باز کن'),/Telegram/);assert.match(normalizePersianCommand('وی اس کدو باز کن'),/VS Code/);});
test('detects capability categories',()=>{assert.ok(commandHints('یه سرچ بزن گربه').includes('web'));assert.ok(commandHints('نور رو کم کن').includes('brightness'));assert.ok(commandHints('کرومو باز کن').includes('apps'));assert.ok(commandHints('صداشو بیارش پایین').includes('volume'));});
test('recognizes computer actions but not ordinary conversation',()=>{assert.equal(looksLikeComputerAction('تلگرامو باز کن'),true);assert.equal(looksLikeComputerAction('یه سرچ بزن درباره فضا'),true);assert.equal(looksLikeComputerAction('سلام امروز چطوری؟'),false);assert.equal(looksLikeComputerAction('به نظرت موسیقی خوبه؟'),false);});
test('normalizer preserves ordinary conversation',()=>{assert.equal(normalizePersianCommand('سلام امروز چطوری؟'),'سلام امروز چطوری؟');});
