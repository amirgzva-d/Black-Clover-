import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';
import {archiveTools} from '../src/agent/archiveTools.js';
import {PermissionPolicy} from '../src/agent/PermissionPolicy.js';

test('ZIP and Extract skills preserve original and reject output collision',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-zip-'));
 try{
   const source=path.join(dir,'source');
   await fs.mkdir(source);
   await fs.writeFile(path.join(source,'گزارش.txt'),'گزارش ماریا');
   const z=await archiveTools.zip_files.run({source});
   assert.equal(z.success,true,z.message);
   assert.ok(z.data.output.endsWith('.zip'));
   assert.equal(await fs.readFile(path.join(source,'گزارش.txt'),'utf8'),'گزارش ماریا');
   const old=await archiveTools.zip_files.run({source});
   assert.equal(old.success,false,'existing output must never be clobbered');
   const ex=await archiveTools.extract_archive.run({archive:z.data.output});
   assert.equal(ex.success,true,ex.message);
   assert.equal(await fs.readFile(path.join(ex.data.destination,'گزارش.txt'),'utf8'),'گزارش ماریا');
   const collision=await archiveTools.extract_archive.run({archive:z.data.output});
   assert.equal(collision.success,false);
 }finally{await fs.rm(dir,{force:true,recursive:true});}
});
test('malicious ZIP paths cannot escape extraction destination',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-zip-slip-'));
 try{
   const zip=new JSZip();
   zip.file('../../outside.txt','malicious');
   const file=path.join(dir,'payload.zip');
   await fs.writeFile(file,await zip.generateAsync({type:'nodebuffer'}));
   const target=path.join(dir,'extracted');
   const result=await archiveTools.extract_archive.run({archive:file,destination:target});
   assert.equal(result.success,false,result.message);
   await assert.rejects(fs.access(path.join(dir,'outside.txt')));
 }finally{await fs.rm(dir,{force:true,recursive:true});}
});
test('archive writes require explicit confirmation even with autonomous profile',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-zip-permissions-'));
 try{
   const policy=new PermissionPolicy({directory:dir});
   assert.equal(await policy.shouldConfirm('zip_files',archiveTools.zip_files,{source:'C:\\temp'}),true);
   assert.equal(await policy.shouldConfirm('extract_archive',archiveTools.extract_archive,{archive:'C:\\test.zip'}),true);
 }finally{await fs.rm(dir,{force:true,recursive:true});}
});
