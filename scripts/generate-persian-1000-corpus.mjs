import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createGzip} from 'node:zlib';
import {once} from 'node:events';
import {pipeline} from 'node:stream/promises';
import {
  allPersianCorpusActions,generateActionVariants,summarizeCorpus,
  UTTERANCES_PER_ACTION
} from '../src/agent/PersianActionCorpus.js';

const directory=path.resolve('data/persian-intents');
await fs.promises.mkdir(directory,{recursive:true});
const archive=path.join(directory,'maria-fa-1000-per-action.jsonl.gz');
const manifest=path.join(directory,'manifest.json');
const zipper=createGzip({level:9,mtime:0});
const output=fs.createWriteStream(archive);
const writing=pipeline(zipper,output);
const actions=allPersianCorpusActions();
const global=new Set(),hash=crypto.createHash('sha256');
const inventory=[];let bytes=0,rows=0;
for(const action of actions){
  let count=0;const examples=[];
  let batch='';
  for(const phrase of generateActionVariants(action,UTTERANCES_PER_ACTION,{exclude:global})){
    if(examples.length<3)examples.push(phrase);
    const line=JSON.stringify({
      intent:action.id,kind:action.kind,text:phrase
    })+'\n';
    hash.update(line);bytes+=Buffer.byteLength(line,'utf8');rows++;count++;
    batch+=line;
    if(batch.length>65536){if(!zipper.write(batch))await once(zipper,'drain');batch='';}
  }
  if(batch&&!zipper.write(batch))await once(zipper,'drain');
  if(count!==UTTERANCES_PER_ACTION)throw Error('Incomplete action '+action.id+' count '+count);
  inventory.push({id:action.id,count,examples});
}
zipper.end();await writing;
if(global.size!==rows)throw Error('Cross-intent string collision detected');
const summary={
  ...summarizeCorpus(),
  uniqueAcrossAllActions:global.size,
  uncompressedBytes:bytes,sha256UncompressedJsonl:hash.digest('hex'),
  archive:'maria-fa-1000-per-action.jsonl.gz',
  schema:{intent:'stable action/recipe id',kind:'core or recipe',text:'synthetic phrasing'},
  disclaimer:'Synthetic training and QA examples; this is not a claim of 100% runtime recognition or of automatic safe execution.',
  actions:inventory
};
await fs.promises.writeFile(manifest,JSON.stringify(summary,null,2)+'\n','utf8');
console.log(JSON.stringify({archive,manifest,actions:actions.length,rows,compressedBytes:(await fs.promises.stat(archive)).size,uncompressedBytes:bytes,unique:global.size,hash:summary.sha256UncompressedJsonl},null,2));
