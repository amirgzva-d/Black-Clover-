import test from 'node:test';
import assert from 'node:assert/strict';
import { isRemovedAvatar, isRemovedAvatarRecord, removedAvatarBytes } from '../src/main/RemovedAvatars.js';
function glb(meta, modern=false) {
  const json=Buffer.from(JSON.stringify({extensions:{[modern?'VRMC_vrm':'VRM']:{meta}}}));
  const bytes=Buffer.alloc(20+Math.ceil(json.length/4)*4,0x20);
  bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(bytes.length-20,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);
  return bytes;
}
test('removed models are rejected even in renamed cached GLB records',()=>{
  assert.equal(isRemovedAvatar({url:'/models/4475429325269774311.vrm'}),true);
  assert.equal(isRemovedAvatarRecord({name:'cached.vrm',bytes:glb({title:'モブ子β',author:'moncyuke'})}),true);
  assert.equal(removedAvatarBytes(glb({name:'bunnnygirl',authors:['k1ttyxkush']},true)),true);
});
test('other models, including those by the same author, remain available',()=>{
  assert.equal(isRemovedAvatar({meta:{title:'another girl',author:'k1ttyxkush'}}),false);
  assert.equal(removedAvatarBytes(glb({title:'Libby_free',author:'rurune'})),false);
  assert.equal(isRemovedAvatarRecord({name:'7903223404901736379.vrm'}),false);
  assert.equal(removedAvatarBytes(Buffer.alloc(32)),false);
});
