import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {matchFastCommand} from '../src/agent/FastCommandRouter.js';

const read=rel=>fs.readFile(new URL('../'+rel,import.meta.url),'utf8');

test('generic and Google research requests retrieve evidence for their actual subject',()=>{
  const a=matchFastCommand('قیمت آهن امروز رو سرچ کن');
  assert.equal(a?.name,'grounded_factual_answer');
  assert.match(a?.args?.query||'',/قیمت آهن/);
  const b=matchFastCommand('گوگل قیمت دلار رو سرچ کن');
  assert.equal(b?.name,'grounded_factual_answer');
  assert.equal(b?.args?.query,'قیمت دلار');
  assert.equal(matchFastCommand('تو گوگل قیمت دلار رو سرچ کن')?.args?.query,'قیمت دلار');
  assert.equal(matchFastCommand('قیمت دلار رو تو گوگل سرچ کن')?.args?.query,'قیمت دلار');
  const browser=matchFastCommand('فقط تو گوگل قیمت دلار رو سرچ کن');
  assert.equal(browser?.name,'chrome_search');
  assert.equal(browser?.args?.profile,'personal');
  assert.equal(browser?.args?.query,'قیمت دلار');
});

test('WhatsApp and Rubika open as company Chrome services',()=>{
  const wa=matchFastCommand('واتساپ رو باز کن');
  assert.deepEqual({name:wa?.name,service:wa?.args?.service},{name:'chrome_open_service',service:'whatsapp'});
  const ru=matchFastCommand('روبیکا رو باز کن');
  assert.deepEqual({name:ru?.name,service:ru?.args?.service},{name:'chrome_open_service',service:'rubika'});
});

test('browser profile policy keeps personal search separate from company messengers',async()=>{
  const browser=await read('src/agent/browserTools.js');
  const messenger=await read('src/agent/messengerSupportTools.js');
  assert.match(browser,/PERSONAL_PROFILE/);
  assert.match(browser,/BUSINESS_PROFILE/);
  assert.match(browser,/Profile 1/);
  assert.match(browser,/Profile 19/);
  assert.match(browser,/search\?q=/);
  assert.match(browser,/whatsapp','rubika/);
  assert.match(messenger,/companyWeb=\['whatsapp','rubika'\]/);
  assert.match(messenger,/chromeProfileForService/);
});

test('character and motion use staged preview before apply',async()=>{
  const asset=await read('src/renderer/assetSurface.js');
  assert.match(asset,/Preview زنده/);
  assert.match(asset,/data-apply-preview/);
  assert.match(asset,/pendingAvatar/);
  assert.match(asset,/applyBuiltInAvatar/);
  assert.match(asset,/data-apply-motion/);
  assert.match(asset,/pendingMotion/);
  const previewIndex=asset.indexOf("await c.playMotion(play)");
  const mainIndex=asset.indexOf("playAvatarMotion(pendingMotion.id)");
  assert.ok(previewIndex>=0&&mainIndex>=0&&mainIndex<previewIndex,'Apply handler and preview path both exist');
});

test('chat surface always has close and minimize controls',async()=>{
  const chat=await read('src/renderer/chatSurfaceV2.js');
  assert.match(chat,/button\('closeChat'/);
  assert.match(chat,/button\('minimizeChat'/);
  assert.match(chat,/api\(\)\.hideChat/);
  assert.match(chat,/api\(\)\.minimizeChat/);
});

test('built-in character apply is persisted through explicit apply IPC',async()=>{
  const [main,preload,avatar,storage]=await Promise.all([
    read('src/main/main.js'),read('src/main/preload.cjs'),read('src/renderer/avatar.js'),read('src/renderer/avatarStorage.js')
  ]);
  assert.match(main,/avatar:apply-built-in/);
  assert.match(preload,/applyBuiltInAvatar/);
  assert.match(avatar,/saveCurrentAvatarUrl/);
  assert.match(storage,/kind:'url'/);
  assert.match(avatar,/location\.protocol==='file:'/);
  const catalog=await read('public/library/catalog.json');
  assert.match(catalog,/Libby Free/);
});
