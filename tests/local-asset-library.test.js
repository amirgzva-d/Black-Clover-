import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalAssetLibrary } from '../src/main/LocalAssetLibrary.js';

test('local asset library discovers 21 folder and classifies local packs',async()=>{
  const desktop=await fs.mkdtemp(path.join(os.tmpdir(),'maria-desktop-'));
  const root=path.join(desktop,'21 عدد فایل');
  await fs.mkdir(root);
  const files=[
    ['girl.vrm','avatar','avatar'],
    ['VRMA_MotionPack.zip','motion','motion'],
    ['PoseAnimation.zip','animation',null],
    ['FaceAnimation.zip','expression',null],
    ['EvilFallArmar_v1.22.zip','wardrobe',null],
    ['MatCap_Sample3.zip','material',null],
    ['preview_Set.zip','preview',null],
    ['VN3_filer.rar','docs',null],
    ['大星蒼-sirius-.zip','blocked',null]
  ];
  for(const [name] of files)await fs.writeFile(path.join(root,name),'x');
  const lib=new LocalAssetLibrary(()=>desktop),out=await lib.list();
  assert.equal(out.root,root);
  assert.equal(out.items.length,files.length);
  for(const [name,category,direct] of files){
    const item=out.items.find(x=>x.name===name);
    assert.equal(item?.category,category,name);
    assert.equal(item?.direct,direct,name);
  }
  await assert.rejects(()=>lib.read('大星蒼-sirius-.zip'),/مجوز/);
  await assert.rejects(()=>lib.read('../secret.txt'),/نام Asset نامعتبر/);
});
