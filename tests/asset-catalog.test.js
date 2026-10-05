import test from 'node:test';
import assert from 'node:assert/strict';
import { MARIA_ASSET_CATALOG,ASSET_COUNTS } from '../src/renderer/assetCatalog.js';

test('all 21 supplied Maria asset packs remain cataloged',()=>{
  assert.equal(MARIA_ASSET_CATALOG.length,21);
  assert.equal(ASSET_COUNTS.packs,21);
  for(const name of ['VRMA_MotionPack.zip','7903223404901736379.vrm','_VRoid_Free_Alien_Girl.zip','sea_themed_accessory_pack.zip','大星蒼-sirius-.zip']){
    assert.ok(MARIA_ASSET_CATALOG.some(x=>x.name===name),name);
  }
});

test('catalog distinguishes direct assets from conversion-required Unity/XWear assets',()=>{
  assert.ok(ASSET_COUNTS.direct>=4);
  assert.ok(ASSET_COUNTS.conversion>=10);
  assert.equal(MARIA_ASSET_CATALOG.find(x=>x.name==='VRMA_MotionPack.zip')?.status,'importable');
  assert.equal(MARIA_ASSET_CATALOG.find(x=>x.name==='EvilFallArmar_v1.22.zip')?.status,'convert');
});
