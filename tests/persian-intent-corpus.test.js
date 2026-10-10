import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {createGunzip} from 'node:zlib';
import crypto from 'node:crypto';
import {allPersianCorpusActions,generateActionVariants,summarizeCorpus} from '../src/agent/PersianActionCorpus.js';

test('all registered actions have 1000 distinct utterance examples',()=>{
 const actions=allPersianCorpusActions();
 const report=summarizeCorpus();
 assert.equal(actions.length,350);
 assert.equal(report.examplesPerAction,1000);
 assert.equal(report.totalExamples,350000);
 const seen=new Set();
 for(const action of actions){
   const first=seen.size;
   for(const sentence of generateActionVariants(action,1000,{exclude:seen})){
     assert.ok(sentence.trim().length>4);
   }
   assert.equal(seen.size-first,1000,action.id);
 }
 assert.equal(seen.size,350000);
});
test('committed gzip manifest holds 347000 intact examples and each stable ID exactly 1000',async()=>{
 const directory=new URL('../data/persian-intents/',import.meta.url);
 const manifest=JSON.parse(await fsp.readFile(new URL('manifest.json',directory),'utf8'));
 assert.equal(manifest.totalExamples,350000);
 assert.equal(manifest.uniqueAcrossAllActions,350000);
 assert.equal(manifest.actions.length,350);
 const hash=crypto.createHash('sha256');
 const source=fs.createReadStream(new URL(manifest.archive,directory)).pipe(createGunzip());
 let buffer='',count=0;
 const counts=new Map(),tokens=new Set();
 for await(const chunk of source){
   const str=chunk.toString('utf8');hash.update(chunk);buffer+=str;
   let newline;
   while((newline=buffer.indexOf('\n'))>=0){
     const line=buffer.slice(0,newline);
     buffer=buffer.slice(newline+1);
     if(!line)continue;
     const row=JSON.parse(line);assert.equal(typeof row.text,'string');
     assert.ok(row.kind==='core'||row.kind==='recipe');
     const key=row.intent;
     counts.set(key,(counts.get(key)||0)+1);
     count++;
   }
 }
 assert.equal(buffer,'');
 assert.equal(count,350000);
 assert.equal(hash.digest('hex'),manifest.sha256UncompressedJsonl);
 assert.equal(counts.size,350);
 for(const [action,n] of counts)assert.equal(n,1000,action);
});
