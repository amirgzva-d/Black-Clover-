import test from 'node:test';import assert from 'node:assert/strict';
import { actionBookTools } from '../src/agent/actionBookTools.js';

test('action book exposes at least 250 semantic recipes',async()=>{const out=await actionBookTools.action_book_status.run({});assert.equal(out.success,true);assert.ok(out.data.recipes>=250,`expected >=250 recipes, got ${out.data.recipes}`);assert.equal(out.data.semanticMatching,true);});

test('colloquial requests find useful recipes',async()=>{for(const q of ['این پنجره رو جمعش کن','یه جوری اون فایل اکسل فروش رو پیدا کن','آخرین عکس تلگرام رو بردار بفرست روبیکا','سیستم خیلی کند شده ببین مشکلش چیه','فتوشاپ رو بیار بالا','فردا این گزارش رو آماده کن']){const out=await actionBookTools.search_action_book.run({query:q,limit:8});assert.equal(out.success,true);assert.ok(out.data.items.length>0,`no recipe for: ${q}`);}});
