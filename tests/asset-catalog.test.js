import test from 'node:test';
import assert from 'node:assert/strict';
import { MARIA_ASSET_CATALOG,ASSET_COUNTS } from '../src/renderer/assetCatalog.js';

test('all 31 supplied Maria asset files remain cataloged',()=>{
  assert.equal(MARIA_ASSET_CATALOG.length,31);
  assert.equal(ASSET_COUNTS.packs,31);
  for(const name of ['7903223404901736379.vrm','VRMA_MotionPack.zip','EvilFallArmar_v1.22.zip','sea_themed_accessory_pack.zip','Wolfchan_XAvatar_Ver.1.0.0.zip','Cookies.zip','1658678464118441614.vrm','8505292573653795333.vrm']){
    assert.ok(MARIA_ASSET_CATALOG.some(x=>x.name===name),name);
  }
});

test('direct, convertible and blocked assets have explicit states',()=>{
  assert.equal(MARIA_ASSET_CATALOG.find(x=>x.name==='VRMA_MotionPack.zip')?.status,'importable');
  assert.equal(MARIA_ASSET_CATALOG.find(x=>x.name==='EvilFallArmar_v1.22.zip')?.status,'convert');
  assert.equal(MARIA_ASSET_CATALOG.find(x=>x.name==='大星蒼-sirius-.zip')?.status,'blocked-license');
  assert.equal(ASSET_COUNTS.blocked,1);
});
