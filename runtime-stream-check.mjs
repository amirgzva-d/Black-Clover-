import {Agent} from './src/agent/Agent.js';
const events=[];
const a=new Agent({enableScheduler:false,emit:event=>{if(event.type==='stream')events.push(event.delta);}});
const question='یک داستان کوتاه و خلاقانه درباره یک گربه بنویس.';
const started=Date.now();
const result=await a.chat(question,{modelOverride:'ollama:qwen2.5:1.5b'});
console.log(JSON.stringify({ms:Date.now()-started,streamChunks:events.length,streamPreview:events.slice(0,5),text:result.text,brain:result.brain,ok:result.ok}));
process.exit(0);
