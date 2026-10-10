import {allPersianCorpusActions,generateActionVariants} from '../src/agent/PersianActionCorpus.js';
import {understandPersianIntent} from '../src/agent/PersianIntentEngine.js';
import fs from 'node:fs/promises';
const start=Date.now(),results=[];
for(const action of allPersianCorpusActions().filter(x=>x.kind==='core')){
 let matched=0,other=0,unknown=0;
 const sampleErrors=[];
 for(const phrase of generateActionVariants(action,1000)){
   const hit=understandPersianIntent(phrase);
   if(hit.intent===action.source.id)matched++;
   else{
     if(hit.intent)other++;else unknown++;
     if(sampleErrors.length<3)sampleErrors.push({phrase,got:hit.intent,normalized:hit.corrected});
   }
 }
 results.push({id:action.source.id,matched,other,unknown,sampleErrors});
}
const report={count:results.length,examples:results.length*1000,
  correct:results.reduce((n,r)=>n+r.matched,0),
  wrongAction:results.reduce((n,r)=>n+r.other,0),
  unmatched:results.reduce((n,r)=>n+r.unknown,0),
  elapsedMs:Date.now()-start,
  worst:results.filter(x=>x.matched<980).sort((a,b)=>a.matched-b.matched).slice(0,20),
  results
};
await fs.writeFile('data/persian-intents/benchmark-core.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined},null,2));
